class Grid {
  constructor(gl, width, height) {
    // Core properties
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Grid layout parameters first
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.baseXs = [64, 40, 24, 16, 8, 0, 0, 0, 0, 8, 16, 24, 40, 64];
    this.numX = Math.max(...this.rowCounts);
    this.numY = this.rowCounts.length;

    // Then initialize arrays
    const totalCells = this.rowCounts.reduce((a, b) => a + b, 0);
    this.u = new Float32Array(totalCells);
    this.v = new Float32Array(totalCells);
    this.p = new Float32Array(totalCells);
    this.s = new Float32Array(totalCells);
    this.oldU = new Float32Array(totalCells);
    this.oldV = new Float32Array(totalCells);
    this.velocities = new Float32Array(totalCells);

    // Simulation parameters
    this.h = width / this.numX; // Grid cell size
    this.gravity = 9.81;
    this.gravityScale = 1.0;
    this.flipRatio = 0.95;
    this.overRelaxation = 1.9;
    this.numPressureIters = 40;
    this.velocityDamping = 0.8;
    this.maxVelocity = 100.0;

    // Particle parameters
    this.particleCount = 338;
    this.particleRadius = 4.0;
    this.collisionDamping = 0.5;
    this.repulsionStrength = 0.3;
    this.collisionIterations = 2;

    // Add density field for grid coloring
    this.density = new Float32Array(totalCells).fill(0);
    this.maxDensity = 3.0; // Adjust sensitivity

    // Calculate dimensions
    const scale = Math.min(width, height) / 400;
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;
    this.verticalOffset = (this.height - this.numY * this.stepY) / 2;

    // Calculate bounds
    const maxRowWidth = Math.max(...this.rowCounts) * this.stepX;
    const gridHeight = this.rowCounts.length * this.stepY;
    this.containerRadius = Math.min(maxRowWidth / 2, gridHeight / 2);
    this.containerCenter = { x: width * 0.5, y: height * 0.5 };

    // Add circle obstacle parameters
    this.circleCenter = { x: width * 0.5, y: height * 0.5 };
    this.circleRadius = this.containerRadius * 0.3; // 15% of container radius

    // Add particle rendering parameters
    this.particleLineWidth = 2.0;
    this.particleColor = [0.2, 0.6, 1.0, 1.0];
    this.obstacleColor = [0, 0, 0, 1.0];

    // Add gradient lookup table
    this.gradient = this.createGradient();

    // Initialize arrays and WebGL
    this.initBuffers();
    // Finally reset simulation
    this.reset();
  }

  // Initialization methods
  initBuffers() {
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
  }

  setParticleCount(count) {
    this.particleCount = count;
    this.reset(); // Full reset instead of just setupParticles()
  }

  setupParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      let x, y, dist;
      do {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * this.containerRadius * 0.8;

        x = this.containerCenter.x + radius * Math.cos(angle);
        y = this.containerCenter.y + radius * Math.sin(angle);

        const dx = x - this.containerCenter.x;
        const dy = y - this.containerCenter.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      } while (dist > this.containerRadius || !this.isInsideGrid(x, y));

      this.particles.push({ x, y, vx: 0, vy: 0 });
    }
  }

  isInsideGrid(x, y) {
    const row = Math.floor((y - this.verticalOffset) / this.stepY);
    if (row < 0 || row >= this.rowCounts.length) return false;

    const rowWidth = this.rowCounts[row] * this.stepX;
    const baseX = (this.width - rowWidth) / 2;
    return x >= baseX && x <= baseX + rowWidth;
  }

  reset() {
    // Reset arrays
    this.u.fill(0);
    this.v.fill(0);
    this.oldU.fill(0);
    this.oldV.fill(0);
    this.p.fill(0);
    this.velocities.fill(0);

    // Reset particles with proper initialization
    this.setupParticles();

    // Reset metrics
    this._pressureSolveTime = 0;
    this._particleAdvectTime = 0;
    this._totalSimTime = 0;
    this._lastUpdateTime = performance.now();
  }

  // Drawing methods
  draw(programInfo) {
    // Clear canvas once at start
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(programInfo.program);

    // Draw grid rectangles first
    const rectangles = this.generateRectangles();
    rectangles.forEach((rect) => {
      this.drawRectangle(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        rect.color,
        programInfo
      );
    });

    // Draw obstacle circle
    const obstacleVertices = this.drawCircle(
      this.circleCenter.x,
      this.circleCenter.y,
      this.circleRadius,
      this.obstacleColor
    );
    this.drawCircleImplementation(
      obstacleVertices,
      this.obstacleColor,
      programInfo
    );

    // Draw particles last
    for (const p of this.particles) {
      const vertices = this.drawCircle(
        p.x,
        p.y,
        this.particleRadius,
        this.particleColor
      );
      this.drawCircleImplementation(vertices, this.particleColor, programInfo);
    }
  }

  generateRectangles() {
    // Update density field before generating rectangles
    this.updateGridDensity();

    const rectangles = [];
    const verticalOffset = this.verticalOffset;

    for (let row = 0; row < this.numY; row++) {
      const rowCount = this.rowCounts[row];
      const baseX = (this.width - rowCount * this.stepX) / 2;
      const y = verticalOffset + row * this.stepY;

      for (let col = 0; col < rowCount; col++) {
        const x = baseX + col * this.stepX;
        const idx = this.getCellIndex(col, row);

        // Normalize density and create color
        const density = Math.min(this.density[idx] / this.maxDensity, 1);
        const gradientIdx = Math.floor(density * 255);
        const color = this.gradient[gradientIdx];

        rectangles.push({
          x: x,
          y: y,
          width: this.rectWidth,
          height: this.rectHeight,
          color: [color.r, color.g, color.b, 1.0],
        });
      }
    }

    return rectangles;
  }

  getCellIndex(x, row) {
    let index = 0;
    // Sum up cells in previous rows
    for (let i = 0; i < row; i++) {
      index += this.rowCounts[i];
    }
    return index + x;
  }

  updateGridDensity() {
    this.density.fill(0);

    for (const p of this.particles) {
      const col = Math.floor(
        (p.x - (this.width - this.numX * this.stepX) / 2) / this.stepX
      );
      const row = Math.floor((p.y - this.verticalOffset) / this.stepY);

      // Influence radius (in cells)
      const radius = 2;

      // Add influence to nearby cells
      for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
          const targetRow = row + j;
          const targetCol = col + i;

          if (
            targetRow >= 0 &&
            targetRow < this.numY &&
            targetCol >= 0 &&
            targetCol < this.rowCounts[targetRow]
          ) {
            const cellCenterX =
              (this.width - this.rowCounts[targetRow] * this.stepX) / 2 +
              targetCol * this.stepX +
              this.stepX / 2;
            const cellCenterY =
              this.verticalOffset + targetRow * this.stepY + this.stepY / 2;

            const dx = p.x - cellCenterX;
            const dy = p.y - cellCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const influence = Math.max(0, 1 - dist / (this.stepX * 2));

            const idx = this.getCellIndex(targetCol, targetRow);
            this.density[idx] += influence;
          }
        }
      }
    }
  }

  drawRectangle(x, y, width, height, color, programInfo) {
    // Convert to clip space
    const normalizedX = (x / this.width) * 2 - 1;
    const normalizedY = -((y / this.height) * 2 - 1);
    const normalizedWidth = (width / this.width) * 2;
    const normalizedHeight = (height / this.height) * 2;

    const positions = [
      normalizedX,
      normalizedY,
      normalizedX + normalizedWidth,
      normalizedY,
      normalizedX,
      normalizedY - normalizedHeight,
      normalizedX + normalizedWidth,
      normalizedY - normalizedHeight,
    ];

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this.gl.STATIC_DRAW
    );

    // Set uniforms
    this.gl.uniform4fv(programInfo.uniformLocations.color, color);

    const positionLocation = this.gl.getAttribLocation(
      programInfo.program,
      "aPosition"
    );
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  drawCircle(cx, cy, radius, color) {
    // Convert to clip space coordinates (-1 to 1)
    const normalizedCX = (cx / this.width) * 2 - 1;
    const normalizedCY = -((cy / this.height) * 2 - 1); // Flip Y
    const normalizedRadius = (radius / Math.min(this.width, this.height)) * 2;

    const numSegments = 32; // Reduced for performance
    const vertices = [];

    // Add center vertex in clip space
    vertices.push(normalizedCX, normalizedCY);

    // Add circumference vertices in clip space
    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * 2 * Math.PI;
      vertices.push(
        normalizedCX + normalizedRadius * Math.cos(angle),
        normalizedCY + normalizedRadius * Math.sin(angle)
      );
    }

    return vertices;
  }

  drawCircleImplementation(vertices, colors, programInfo) {
    // No need to use program again - already set in draw()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Set vertex attributes
    const positionLocation = this.gl.getAttribLocation(
      programInfo.program,
      "aPosition"
    );
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set uniforms
    this.gl.uniform4fv(programInfo.uniformLocations.color, colors.slice(0, 4)); // Use first color
    this.gl.uniform2f(
      programInfo.uniformLocations.resolution,
      this.width,
      this.height
    );

    // Draw using TRIANGLE_FAN
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);
  }

  drawParticles(programInfo) {
    for (const p of this.particles) {
      this.drawCircle(p.x, p.y, 2, [0.2, 0.6, 4, 1.0]);
    }
  }

  // Simulation methods
  update(dt) {
    this.startTiming("totalSim");

    // Main simulation loop
    this.transferToGrid();
    this.applyExternalForces(dt);
    this.enforceBoundaries();

    this.startTiming("pressureSolve");
    this.solveIncompressibility(dt);
    this.endTiming("pressureSolve");

    this.startTiming("particleAdvect");
    this.advectParticles(dt);
    this.endTiming("particleAdvect");

    this.endTiming("totalSim");
  }
  simulate(dt) {
    this.startTiming("totalSim");

    this.storeVelocities();
    this.transferToGrid();
    this.applyExternalForces(dt);
    this.enforceBoundaries();
    this.solveIncompressibility(dt);
    this.transferFromGrid();
    this.handleParticleCollisions(); // Add collision handling
    this.advectParticles(dt);

    this.endTiming("totalSim");
  }
  solveIncompressibility(dt) {
    const n = this.numX;
    const cp = this.overRelaxation / (this.h * this.h);

    for (let iter = 0; iter < this.numPressureIters; iter++) {
      for (let i = 1; i < this.numX - 1; i++) {
        for (let j = 1; j < this.numY - 1; j++) {
          if (this.s[i + j * n] === 0) continue;
          const s0 = this.s[i - 1 + j * n];
          const s1 = this.s[i + 1 + j * n];
          const s2 = this.s[i + (j - 1) * n];
          const s3 = this.s[i + (j + 1) * n];

          const sx = s0 + s1;
          const sy = s2 + s3;

          const div =
            this.u[i + 1 + j * n] -
            this.u[i + j * n] +
            this.v[i + (j + 1) * n] -
            this.v[i + j * n];

          this.p[i + j * n] =
            ((div / dt -
              (this.u[i + 1 + j * n] - this.u[i + j * n]) / this.h -
              (this.v[i + (j + 1) * n] - this.v[i + j * n]) / this.h) /
              (sx + sy)) *
            cp;
        }
      }
    }
  }
  enforceBoundaries() {
    for (const p of this.particles) {
      // Container boundary check
      const dx = p.x - this.containerCenter.x;
      const dy = p.y - this.containerCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const containerLimit = this.containerRadius - this.particleRadius;

      if (dist > containerLimit) {
        const angle = Math.atan2(dy, dx);
        p.x = this.containerCenter.x + Math.cos(angle) * containerLimit;
        p.y = this.containerCenter.y + Math.sin(angle) * containerLimit;

        const nx = dx / dist;
        const ny = dy / dist;
        const dot = p.vx * nx + p.vy * ny;
        p.vx = (p.vx - 2 * dot * nx) * this.velocityDamping;
        p.vy = (p.vy - 2 * dot * ny) * this.velocityDamping;
      }

      // Obstacle collision
      const odx = p.x - this.circleCenter.x;
      const ody = p.y - this.circleCenter.y;
      const odist = Math.sqrt(odx * odx + ody * ody);
      const obstacleLimit = this.circleRadius + this.particleRadius;

      if (odist < obstacleLimit) {
        // Push particle outside obstacle
        const angle = Math.atan2(ody, odx);
        p.x = this.circleCenter.x + Math.cos(angle) * obstacleLimit;
        p.y = this.circleCenter.y + Math.sin(angle) * obstacleLimit;

        // Reflect velocity with proper normal
        const nx = odx / odist;
        const ny = ody / odist;
        const dot = p.vx * nx + p.vy * ny;

        // Only reflect if moving toward obstacle
        if (dot < 0) {
          p.vx = (p.vx - 2 * dot * nx) * this.velocityDamping;
          p.vy = (p.vy - 2 * dot * ny) * this.velocityDamping;
        }
      }
    }
  }

  transferToGrid() {
    this.u.fill(0);
    this.v.fill(0);
    const weights = new Float32Array(this.numX * this.numY).fill(0);

    for (const p of this.particles) {
      const x = p.x / this.h;
      const y = p.y / this.h;

      const i = Math.floor(x);
      const j = Math.floor(y);

      const fx = x - i;
      const fy = y - j;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const n = this.numX;
      const idx = i + j * n;

      this.u[idx] += w00 * p.vx;
      this.u[idx + 1] += w10 * p.vx;
      this.u[idx + n] += w01 * p.vx;
      this.u[idx + n + 1] += w11 * p.vx;

      this.v[idx] += w00 * p.vy;
      this.v[idx + 1] += w10 * p.vy;
      this.v[idx + n] += w01 * p.vy;
      this.v[idx + n + 1] += w11 * p.vy;

      weights[idx] += w00;
      weights[idx + 1] += w10;
      weights[idx + n] += w01;
      weights[idx + n + 1] += w11;
    }

    // Normalize velocities
    for (let i = 0; i < this.numX * this.numY; i++) {
      if (weights[i] > 0) {
        this.u[i] /= weights[i];
        this.v[i] /= weights[i];
      }
    }
  }
  transferFromGrid() {
    for (const p of this.particles) {
      const x = p.x / this.h;
      const y = p.y / this.h;

      // Sample velocities
      const vx = this.sampleField(p.x, p.y, this.u);
      const vy = this.sampleField(p.x, p.y, this.v);
      const oldVx = this.sampleField(p.x, p.y, this.oldU);
      const oldVy = this.sampleField(p.x, p.y, this.oldV);

      // FLIP update
      p.vx =
        (this.flipRatio * (p.vx + vx - oldVx) + (1.0 - this.flipRatio) * vx) *
        this.velocityDamping;
      p.vy =
        (this.flipRatio * (p.vy + vy - oldVy) + (1.0 - this.flipRatio) * vy) *
        this.velocityDamping;

      // Clamp velocities
      p.vx = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, p.vx));
      p.vy = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, p.vy));
    }
  }

  advectParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.checkBoundaries(p);
    }
  }

  // Utility methods
  getVelocityColor(vel) {
    const maxVel = 2.0;
    const t = Math.min(vel / maxVel, 1.0);
    return [t, 0.2 + 0.8 * (1.0 - t), 1.0 - 0.8 * t, 1.0];
  }
  interpolate(x, y, field) {
    const n = this.numX;
    const h = this.h;
    const i = Math.floor(x / h);
    const j = Math.floor(y / h);
    const fx = x / h - i;
    const fy = y / h - j;

    return (
      (1 - fx) * (1 - fy) * field[i + j * n] +
      fx * (1 - fy) * field[i + 1 + j * n] +
      (1 - fx) * fy * field[i + (j + 1) * n] +
      fx * fy * field[i + 1 + (j + 1) * n]
    );
  }
  debug() {
    const n = this.numX;
    console.log(`Grid size: ${this.numX}x${this.numY}`);
    console.log(`Cell size: ${this.h}`);
    console.log(`Particle count: ${this.particles.length}`);
    console.log(
      `Max velocity: ${Math.max(...Array.from(this.u), ...Array.from(this.v))}`
    );
    console.log(
      `Memory usage: ${
        ((this.u.length + this.v.length + this.p.length) * 4) / 1024
      } KB`
    );
    console.log(`Performance metrics:`);
    console.log(`- Pressure iterations: ${this.numPressureIters}`);
    console.log(`- Grid cells: ${this.numX * this.numY}`);
    console.log(`- Active particles: ${this.particles.length}`);

    // Add timing metrics
    console.log(`\nTiming metrics:`);
    console.log(`- Pressure solve: ${this._pressureSolveTime.toFixed(2)}ms`);
    console.log(
      `- Particle advection: ${this._particleAdvectTime.toFixed(2)}ms`
    );
    console.log(`- Total simulation: ${this._totalSimTime.toFixed(2)}ms`);
  }

  getState() {
    return {
      particles: this.particles,
      velocityField: {
        u: Array.from(this.u),
        v: Array.from(this.v),
      },
      pressure: Array.from(this.p),
      solid: Array.from(this.s),
      settings: {
        gravity: this.gravity,
        flipRatio: this.flipRatio,
        overRelaxation: this.overRelaxation,
      },
    };
  }

  setState(state) {
    if (!this.validateState(state)) {
      throw new Error("Invalid state object");
    }
    this.u.set(state.velocityField.u);
    this.v.set(state.velocityField.v);
    this.p.set(state.pressure);
    this.s.set(state.solid);
    this.particles = state.particles;
    Object.assign(this, state.settings);
  }

  validateState(state) {
    return (
      state.velocityField &&
      state.velocityField.u &&
      state.velocityField.v &&
      state.pressure &&
      state.solid &&
      state.particles &&
      state.settings &&
      typeof state.settings.gravity === "number" &&
      typeof state.settings.flipRatio === "number" &&
      typeof state.settings.overRelaxation === "number"
    );
  }

  validateArrays(state) {
    const expectedLength = this.numX * this.numY;
    return (
      state.velocityField.u.length === expectedLength &&
      state.velocityField.v.length === expectedLength &&
      state.pressure.length === expectedLength &&
      state.solid.length === expectedLength
    );
  }

  validateTypes(state) {
    return (
      Array.isArray(state.particles) &&
      state.particles.every(
        (p) =>
          typeof p.x === "number" &&
          typeof p.y === "number" &&
          typeof p.vx === "number" &&
          typeof p.vy === "number"
      )
    );
  }

  validateGridState() {
    const n = this.numX * this.numY;
    return (
      this.u.length === n &&
      this.v.length === n &&
      this.p.length === n &&
      this.s.length === n &&
      Array.isArray(this.particles)
    );
  }

  // Add performance tracking
  getPerformanceMetrics() {
    return {
      gridCells: this.numX * this.numY,
      activeParticles: this.particles.length,
      pressureIterations: this.numPressureIters,
      timings: {
        pressureSolve: this._pressureSolveTime,
        particleAdvect: this._particleAdvectTime,
        totalSim: this._totalSimTime,
      },
    };
  }

  // Add save/load state
  saveState() {
    const state = this.getState();
    return JSON.stringify(state);
  }

  loadState(jsonState) {
    const state = JSON.parse(jsonState);
    if (!this.validateArrays(state)) {
      throw new Error("Invalid array lengths in state object");
    }
    this.setState(state);
  }

  // Add timing metrics
  getTimingMetrics() {
    return {
      pressureSolveTime: this._pressureSolveTime,
      particleAdvectTime: this._particleAdvectTime,
      totalSimTime: this._totalSimTime,
    };
  }

  startTiming(metric) {
    this[`_${metric}Start`] = performance.now();
  }

  endTiming(metric) {
    const end = performance.now();
    this[`_${metric}Time`] = end - this[`_${metric}Start`];
  }

  checkWebGLError() {
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      console.error("WebGL error:", error);
      return false;
    }
    return true;
  }

  // Add applyExternalForces method
  applyExternalForces(dt) {
    const gravity = this.gravity * this.gravityScale;
    const n = this.numX;

    for (let i = 0; i < this.numX; i++) {
      for (let j = 0; j < this.numY; j++) {
        if (this.s[i + j * n] !== 0) {
          this.v[i + j * n] += gravity * dt;
        }
      }
    }
  }
  // Add integrate method
  integrate(dt) {
    this.storeVelocities();
    this.transferToGrid();
    this.applyExternalForces(dt);
    this.enforceBoundaries();
    this.solveIncompressibility(dt);
    this.transferFromGrid();
    this.advectParticles(dt);
  }

  // Add updateGrid method
  updateGrid() {
    const n = this.numX;
    for (let i = 0; i < this.numX; i++) {
      for (let j = 0; j < this.numY; j++) {
        const idx = i + j * n;
        const vel = Math.sqrt(
          this.u[idx] * this.u[idx] + this.v[idx] * this.v[idx]
        );
        this.velocities[idx] = vel;
      }
    }
  }

  storeVelocities() {
    this.oldU.set(this.u);
    this.oldV.set(this.v);
  }

  handleBoundaries() {
    const n = this.numX;
    for (const p of this.particles) {
      // Keep particles in bounds
      p.x = Math.max(this.h, Math.min(this.width - this.h, p.x));
      p.y = Math.max(this.h, Math.min(this.height - this.h, p.y));

      // Handle circle obstacle
      const dx = p.x - this.circleCenter.x;
      const dy = p.y - this.circleCenter.y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r < this.circleRadius) {
        const scale = this.circleRadius / r;
        p.x = this.circleCenter.x + dx * scale;
        p.y = this.circleCenter.y + dy * scale;

        // Reflect velocity
        const dot = (dx * p.vx + dy * p.vy) / (r * r);
        p.vx -= 2 * dot * dx;
        p.vy -= 2 * dot * dy;
      }
    }
  }

  updateSimulationState() {
    this.startTiming("totalSim");

    // Main simulation loop
    this.storeVelocities();
    this.transferToGrid();
    this.applyExternalForces(this.dt);
    this.enforceBoundaries();

    this.startTiming("pressureSolve");
    this.solveIncompressibility(this.dt);
    this.endTiming("pressureSolve");

    this.startTiming("particleAdvect");
    this.transferFromGrid();
    this.advectParticles(this.dt);
    this.endTiming("particleAdvect");

    this.handleBoundaries();
    this.updateGrid();

    this.endTiming("totalSim");
  }

  validateSimulationState() {
    if (!this.validateGridState()) {
      throw new Error("Invalid grid state");
    }
    if (!this.checkWebGLError()) {
      throw new Error("WebGL error detected");
    }
  }

  getDebugStats() {
    return {
      ...this.getPerformanceMetrics(),
      ...this.getTimingMetrics(),
      memoryUsage: ((this.u.length + this.v.length + this.p.length) * 4) / 1024,
      maxVelocity: Math.max(...Array.from(this.u), ...Array.from(this.v)),
    };
  }

  validateWebGLState() {
    const gl = this.gl;
    if (!gl) {
      throw new Error("WebGL context is null");
    }
    if (!this.vertexBuffer) {
      throw new Error("Vertex buffer not initialized");
    }
    return this.checkWebGLError();
  }

  initWebGLState() {
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.viewport(0, 0, this.width, this.height);
    this.initBuffers();
    return this.validateWebGLState();
  }

  getStats() {
    return {
      frameTime: performance.now() - this._lastUpdateTime,
      memoryUsage: ((this.u.length + this.v.length + this.p.length) * 4) / 1024,
      ...this.getPerformanceMetrics(),
    };
  }

  sampleField(x, y, field) {
    const n = this.numX;
    const h = this.h;
    const i = Math.min(Math.max(Math.floor(x / h), 0), this.numX - 2);
    const j = Math.min(Math.max(Math.floor(y / h), 0), this.numY - 2);
    const fx = x / h - i;
    const fy = y / h - j;

    return (
      (1 - fx) * (1 - fy) * field[i + j * n] +
      fx * (1 - fy) * field[i + 1 + j * n] +
      (1 - fx) * fy * field[i + (j + 1) * n] +
      fx * fy * field[i + 1 + (j + 1) * n]
    );
  }

  // Finalize class
  validateBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getConfig() {
    return {
      gridSize: {
        width: this.numX,
        height: this.numY,
      },
      cellSize: this.h || this.width / this.numX, // Ensure h is defined
      circleObstacle: {
        x: this.circleCenter.x,
        y: this.circleCenter.y,
        radius: this.circleRadius,
      },
      simulation: {
        gravity: this.gravity,
        gravityScale: this.gravityScale, // Add missing parameter
        flipRatio: this.flipRatio,
        overRelaxation: this.overRelaxation,
        pressureIterations: this.numPressureIters,
        velocityDamping: this.velocityDamping, // Add missing parameter
      },
    };
  }

  validateConfig(config) {
    return (
      config.gridSize &&
      typeof config.gridSize.width === "number" &&
      typeof config.gridSize.height === "number" &&
      typeof config.cellSize === "number" &&
      config.simulation &&
      typeof config.simulation.gravity === "number" &&
      typeof config.simulation.gravityScale === "number" && // Add validation
      typeof config.simulation.flipRatio === "number" &&
      typeof config.simulation.overRelaxation === "number" &&
      typeof config.simulation.velocityDamping === "number" // Add validation
    );
  }

  setConfig(config) {
    if (!this.validateConfig(config)) {
      throw new Error("Invalid configuration object");
    }

    // Update grid properties
    this.numX = config.gridSize.width;
    this.numY = config.gridSize.height;
    this.h = config.cellSize;

    // Update circle obstacle
    if (config.circleObstacle) {
      this.circleCenter = {
        x: config.circleObstacle.x,
        y: config.circleObstacle.y,
      };
      this.circleRadius = config.circleObstacle.radius;
    }

    // Update simulation parameters
    Object.assign(this, config.simulation);

    // Reinitialize arrays if grid size changed
    const numCells = this.numX * this.numY;
    if (this.u.length !== numCells) {
      this.initializeArrays(numCells);
    }
  }

  initializeArrays(numCells) {
    this.u = new Float32Array(numCells);
    this.v = new Float32Array(numCells);
    this.p = new Float32Array(numCells);
    this.s = new Float32Array(numCells).fill(1.0);
    this.oldU = new Float32Array(numCells);
    this.oldV = new Float32Array(numCells);
  }

  sampleField(x, y, field) {
    const n = this.numX;
    const h = this.h;

    // Clamp coordinates to grid bounds
    const i = Math.min(Math.max(Math.floor(x / h), 0), this.numX - 2);
    const j = Math.min(Math.max(Math.floor(y / h), 0), this.numY - 2);

    const fx = x / h - i;
    const fy = y / h - j;

    // Bilinear interpolation
    return (
      (1 - fx) * (1 - fy) * field[i + j * n] +
      fx * (1 - fy) * field[i + 1 + j * n] +
      (1 - fx) * fy * field[i + (j + 1) * n] +
      fx * fy * field[i + 1 + (j + 1) * n]
    );
  }

  validateBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  resetSimulation() {
    this.initializeArrays(this.numX * this.numY);
    this.setupParticles();
    this._lastUpdateTime = performance.now();
  }

  dispose() {
    // Clean up WebGL resources
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
    }

    // Clear arrays
    this.u = null;
    this.v = null;
    this.p = null;
    this.s = null;
    this.oldU = null;
    this.oldV = null;
    this.particles = null;
  }

  validateAllState() {
    return (
      this.validateGridState() &&
      this.validateWebGLState() &&
      this.validateBounds(this.circleCenter.x, this.circleCenter.y)
    );
  }

  validateSimulation() {
    const valid = this.validateAllState();
    if (!valid) {
      throw new Error("Invalid simulation state detected");
    }
    return true;
  }

  cleanup() {
    this.dispose();
    this._lastUpdateTime = null;
    this._pressureSolveTime = null;
    this._particleAdvectTime = null;
    this._totalSimTime = null;
  }

  /**
   * Validates and cleans up simulation resources
   * @throws {Error} If simulation state is invalid
   * @returns {boolean} True if cleanup successful
   */
  finalizeSimulation() {
    try {
      this.validateSimulation();
      this.cleanup();
      return true;
    } catch (error) {
      console.error("Simulation cleanup failed:", error);
      return false;
    }
  }

  /**
   * Validates simulation parameters for physical correctness
   * @returns {boolean} True if parameters are valid
   * @throws {Error} If parameters are invalid
   */
  validateParameters() {
    // Check physical parameters
    if (this.h <= 0) throw new Error("Grid cell size must be positive");
    if (this.flipRatio < 0 || this.flipRatio > 1)
      throw new Error("FLIP ratio must be between 0 and 1");
    if (this.overRelaxation <= 0 || this.overRelaxation > 2)
      throw new Error("Over-relaxation must be between 0 and 2");
    if (this.numPressureIters < 1)
      throw new Error("Pressure iterations must be positive");

    // Check grid dimensions
    if (this.numX < 2 || this.numY < 2)
      throw new Error("Grid dimensions must be at least 2x2");

    // Check obstacle parameters
    if (this.circleRadius <= 0)
      throw new Error("Circle radius must be positive");

    return true;
  }

  checkBoundaries(particle) {
    // Container boundary check with adjusted radius
    const dx = particle.x - this.containerCenter.x;
    const dy = particle.y - this.containerCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.containerRadius) {
      const angle = Math.atan2(dy, dx);
      particle.x =
        this.containerCenter.x + Math.cos(angle) * this.containerRadius;
      particle.y =
        this.containerCenter.y + Math.sin(angle) * this.containerRadius;

      // Reflect velocity with dampening
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = particle.vx * nx + particle.vy * ny;
      particle.vx = (particle.vx - 2 * dot * nx) * 0.8;
      particle.vy = (particle.vy - 2 * dot * ny) * 0.8;
    }

    // Obstacle collision with separation
    const odx = particle.x - this.circleCenter.x;
    const ody = particle.y - this.circleCenter.y;
    const odist = Math.sqrt(odx * odx + ody * ody);

    if (odist < this.circleRadius + 2.0) {
      // Add small separation distance
      const angle = Math.atan2(ody, odx);
      particle.x =
        this.circleCenter.x + Math.cos(angle) * (this.circleRadius + 2.0);
      particle.y =
        this.circleCenter.y + Math.sin(angle) * (this.circleRadius + 2.0);

      // Reflect velocity with dampening
      const nx = odx / odist;
      const ny = ody / odist;
      const dot = particle.vx * nx + particle.vy * ny;
      particle.vx = (particle.vx - 2 * dot * nx) * 0.8;
      particle.vy = (particle.vy - 2 * dot * ny) * 0.8;
    }
  }

  updateVelocities() {
    const n = this.numX;
    for (let i = 1; i < this.numX - 1; i++) {
      for (let j = 1; j < this.numY - 1; j++) {
        if (this.s[i + j * n] != 0.0) {
          this.u[i + j * n] -= this.p[i + j * n] - this.p[i - 1 + j * n];
          this.v[i + j * n] -= this.p[i + j * n] - this.p[i + (j - 1) * n];
        }
      }
    }
  }

  applyForce(x, y, fx, fy) {
    const n = this.numX;
    const h = this.h;

    // Convert to grid coordinates
    const gx = Math.floor(x / h);
    const gy = Math.floor(y / h);

    // Radius of influence
    const radius = 3;

    // Apply force to grid velocities
    for (
      let i = Math.max(1, gx - radius);
      i <= Math.min(this.numX - 2, gx + radius);
      i++
    ) {
      for (
        let j = Math.max(1, gy - radius);
        j <= Math.min(this.numY - 2, gy + radius);
        j++
      ) {
        if (this.s[i + j * n] !== 0) {
          const dx = (i - gx) * h;
          const dy = (j - gy) * h;
          const d = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.max(0, 1 - d / (radius * h));

          this.u[i + j * n] += fx * weight;
          this.v[i + j * n] += fy * weight;
        }
      }
    }
  }

  handleParticleCollisions() {
    const cellSize = this.particleRadius * 4;
    const spatialGrid = new Map();

    // Insert particles into spatial grid
    this.particles.forEach((p, i) => {
      const col = Math.floor(p.x / cellSize);
      const row = Math.floor(p.y / cellSize);
      const key = `${row},${col}`;
      if (!spatialGrid.has(key)) spatialGrid.set(key, []);
      spatialGrid.get(key).push(i);
    });

    // Check collisions
    for (let iter = 0; iter < this.collisionIterations; iter++) {
      for (let i = 0; i < this.particles.length; i++) {
        const p1 = this.particles[i];
        const col = Math.floor(p1.x / cellSize);
        const row = Math.floor(p1.y / cellSize);

        // Check neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${row + dy},${col + dx}`;
            const cell = spatialGrid.get(key) || [];

            for (const j of cell) {
              if (i >= j) continue; // Avoid double processing

              const p2 = this.particles[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const distSq = dx * dx + dy * dy;
              const minDist = this.particleRadius * 2;

              if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;

                // Position correction
                const overlap = minDist - dist;
                const correction = overlap * 0.5;
                p1.x -= nx * correction;
                p1.y -= ny * correction;
                p2.x += nx * correction;
                p2.y += ny * correction;

                // Collision response
                const relVelX = p2.vx - p1.vx;
                const relVelY = p2.vy - p1.vy;
                const relVelDotNormal = relVelX * nx + relVelY * ny;

                if (relVelDotNormal < 0) {
                  const restitution = 1.0 + this.collisionDamping;
                  const j = -(relVelDotNormal * restitution) * 0.5;

                  p1.vx -= j * nx;
                  p1.vy -= j * ny;
                  p2.vx += j * nx;
                  p2.vy += j * ny;
                }

                // Apply repulsion force
                const repulsionScale =
                  this.repulsionStrength * (1.0 - dist / minDist);
                const repulsionX = nx * repulsionScale;
                const repulsionY = ny * repulsionScale;

                p1.vx -= repulsionX;
                p1.vy -= repulsionY;
                p2.vx += repulsionX;
                p2.vy += repulsionY;
              }
            }
          }
        }
      }
    }
  }

  createGradient() {
    const gradient = new Array(256).fill(0).map(() => ({ r: 0, g: 0, b: 0 }));

    // Convert C++ gradient to JavaScript (normalized to 0-1)
    const rawGradient = [
      { pos: 0, r: 0, g: 0, b: 0 },
      { pos: 60, r: 144 / 255, g: 3 / 255, b: 0 },
      { pos: 80, r: 1, g: 6 / 255, b: 0 },
      { pos: 95, r: 1, g: 197 / 255, b: 0 },
      { pos: 100, r: 1, g: 1, b: 1 },
    ];

    // Interpolate between control points
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let lower = rawGradient[0];
      let upper = rawGradient[rawGradient.length - 1];

      // Find surrounding control points
      for (let j = 0; j < rawGradient.length - 1; j++) {
        if (t * 100 >= rawGradient[j].pos && t * 100 < rawGradient[j + 1].pos) {
          lower = rawGradient[j];
          upper = rawGradient[j + 1];
          break;
        }
      }

      // Interpolate color
      const range = upper.pos - lower.pos;
      const localT = (t * 100 - lower.pos) / range;
      gradient[i] = {
        r: this.lerp(lower.r, upper.r, localT),
        g: this.lerp(lower.g, upper.g, localT),
        b: this.lerp(lower.b, upper.b, localT),
      };
    }

    return gradient;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

export { Grid };
