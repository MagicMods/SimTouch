class Grid {
  constructor(gl, width, height) {
    // WebGL context
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Grid layout - GridGen style
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.baseXs = [64, 40, 24, 16, 8, 0, 0, 0, 0, 8, 16, 24, 40, 64];
    this.numX = Math.max(...this.rowCounts);
    this.numY = this.rowCounts.length;

    // Calculate total cells for irregular grid
    const totalCells = this.rowCounts.reduce((a, b) => a + b, 0);

    // Arrays initialization - adjust for irregular grid
    this.u = new Float32Array(totalCells);
    this.v = new Float32Array(totalCells);
    this.p = new Float32Array(totalCells);
    this.s = new Float32Array(totalCells).fill(1.0);
    this.oldU = new Float32Array(totalCells);
    this.oldV = new Float32Array(totalCells);
    this.velocities = new Float32Array(totalCells); // Initialize once with correct size

    // Cell dimensions - scale based on canvas size
    const scale = Math.min(width, height) / 400; // Base scale on 400px reference
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;

    // FLIP parameters
    this.gravity = -9.81;
    this.gravityScale = 1000;
    this.velocityDamping = 1;
    this.flipRatio = 0.95;
    this.overRelaxation = 1.9;
    this.numPressureIters = 40;
    this.dt = 1 / 60;
    this.maxVelocity = 30.0;

    // Circle obstacle
    this.circleCenter = { x: width * 0.25, y: height * 0.5 };
    this.circleRadius = Math.min(width, height) * 0.15;

    // Define container circle
    this.aspectRatio = width / height;
    this.containerRadius = Math.min(width, height) * 0.45; // 90% of smallest dimension
    this.containerCenter = {
      x: width * 0.5,
      y: height * 0.5,
    };

    // Scale Y coordinates to maintain circular shape
    this.scaleY = this.aspectRatio;

    // Cell size must be defined before setupParticles
    this.h = Math.min(width, height) / this.numX;

    // Initialize in correct order
    this.initBuffers();
    this.reset(); // This calls setupParticles

    // Initialize timing metrics
    this._pressureSolveTime = 0;
    this._particleAdvectTime = 0;
    this._totalSimTime = 0;
    this._lastUpdateTime = performance.now();

    // Initialize velocities array
    this.velocities = new Float32Array(this.numX * this.numY);

    this.particleCount = 1000; // Default particle count
  }

  // Initialization methods
  initBuffers() {
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
  }

  setParticleCount(count) {
    this.particleCount = count;
    this.setupParticles();
  }

  setupParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      let x, y, dist;
      do {
        // Use angle-based spawning for circular distribution
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * this.containerRadius * 0.4; // Reduced to 40% for better distribution

        x = this.containerCenter.x + radius * Math.cos(angle);
        y = this.containerCenter.y + radius * Math.sin(angle);

        // Check actual distance without aspect ratio scaling
        const dx = x - this.containerCenter.x;
        const dy = y - this.containerCenter.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      } while (dist > this.containerRadius * 0.4);

      this.particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
      });
    }
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
    // Add frame counter
    // if (!this._frameCount) this._frameCount = 0;
    // this._frameCount++;

    // // Only log every 60 frames
    // if (this._frameCount % 60 === 0) {
    //   console.clear(); // Clear previous logs
    //   console.log("%c=== Grid State ===", "font-weight: bold");
    //   console.table({
    //     dimensions: {
    //       width: this.width,
    //       height: this.height,
    //       gridWidth: this.numX,
    //       gridHeight: this.numY,
    //     },
    //     cells: {
    //       totalCells: this.rowCounts.reduce((a, b) => a + b, 0),
    //       firstRowCount: this.rowCounts[0],
    //       lastRowCount: this.rowCounts[this.numY - 1],
    //     },
    //     spacing: {
    //       rectWidth: this.rectWidth,
    //       rectHeight: this.rectHeight,
    //       stepX: this.stepX,
    //       stepY: this.stepY,
    //     },
    //   });
    // }

    // Rest of draw method
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const rectangles = this.generateRectangles();
    rectangles.forEach((rect) => {
      this.drawRectangle(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        rect.color,
        programInfo
      ); // Add programInfo
    });

    // Draw circle overlay
    const circleVertices = this.drawCircle(
      this.circleCenter.x,
      this.circleCenter.y,
      this.circleRadius,
      [0, 0, 0, 1]
    );
    this.drawCircleImplementation(circleVertices, [0, 0, 0, 1], programInfo); // Add programInfo

    // Draw particles
    for (const p of this.particles) {
      const vertices = this.drawCircle(p.x, p.y, 2, [0.2, 0.6, 1.0, 1.0]);
      this.drawCircleImplementation(
        vertices,
        [0.2, 0.6, 1.0, 1.0],
        programInfo
      );
    }
  }

  generateRectangles() {
    const rectangles = [];
    const verticalOffset = (this.height - this.numY * this.stepY) / 2;
    const horizontalScale = this.width / 400;

    // // Debug
    // console.log("Drawing grid:", {
    //   width: this.width,
    //   height: this.height,
    //   scale: horizontalScale,
    //   rectWidth: this.rectWidth,
    //   rectHeight: this.rectHeight,
    //   stepX: this.stepX,
    //   stepY: this.stepY,
    // });

    for (let row = 0; row < this.numY; row++) {
      const rowCount = this.rowCounts[row];
      const baseX = (this.width - rowCount * this.stepX) / 2; // Center horizontally
      const y = verticalOffset + row * this.stepY;

      for (let col = 0; col < rowCount; col++) {
        const x = baseX + col * this.stepX;
        const idx = this.getCellIndex(col, row);
        const vel = Math.sqrt(
          this.u[idx] * this.u[idx] + this.v[idx] * this.v[idx]
        );

        rectangles.push({
          x: x,
          y: y,
          width: this.rectWidth,
          height: this.rectHeight,
          color: [0.8, 0.8, 0.8, 1.0], // Light gray for visibility testing
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

  drawRectangle(x, y, width, height, color, programInfo) {
    // Use program before setting uniforms
    this.gl.useProgram(programInfo.program);

    // Convert screen coordinates to clip space (-1 to 1)
    const normalizedX = (x / this.width) * 2 - 1;
    const normalizedY = -((y / this.height) * 2 - 1); // Flip Y coordinate
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

    this.gl.useProgram(programInfo.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this.gl.STATIC_DRAW
    );

    // Set uniforms after using program
    this.gl.uniform4fv(programInfo.uniformLocations.color, color);
    this.gl.uniform2f(
      programInfo.uniformLocations.resolution,
      this.width,
      this.height
    );

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

    const numSegments = 100;
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

  drawCircleImplementation(vertices, color, programInfo) {
    this.gl.useProgram(programInfo.program);
    // Bind and upload vertex data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Set uniforms
    this.gl.uniform4fv(programInfo.uniformLocations.color, color);
    this.gl.uniform2f(
      programInfo.uniformLocations.resolution,
      this.width,
      this.height
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

    // Draw circle using TRIANGLE_FAN
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);
  }

  drawParticles(programInfo) {
    for (const p of this.particles) {
      this.drawCircle(p.x, p.y, 2, [0.2, 0.6, 1.0, 1.0]);
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
    const n = this.numX;

    // Wall boundaries
    for (let i = 0; i < this.numX; i++) {
      this.u[i] = this.u[i + n] = 0;
      this.u[i + (this.numY - 1) * n] = this.u[i + (this.numY - 2) * n] = 0;
    }

    for (let j = 0; j < this.numY; j++) {
      this.v[j * n] = this.v[1 + j * n] = 0;
      this.v[this.numX - 1 + j * n] = this.v[this.numX - 2 + j * n] = 0;
    }

    // Circle obstacle
    const cx = Math.floor(this.circleCenter.x / this.h);
    const cy = Math.floor(this.circleCenter.y / this.h);
    const r = this.circleRadius / this.h;

    for (let i = 0; i < this.numX; i++) {
      for (let j = 0; j < this.numY; j++) {
        const dx = i - cx;
        const dy = j - cy;
        if (dx * dx + dy * dy < r * r) {
          this.s[i + j * n] = 0;
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
    // Container boundary check
    const dx = particle.x - this.containerCenter.x;
    const dy = (particle.y - this.containerCenter.y) * this.scaleY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.containerRadius * 0.95) {
      const angle = Math.atan2(dy, dx);
      particle.x =
        this.containerCenter.x + Math.cos(angle) * this.containerRadius * 0.95;
      particle.y =
        this.containerCenter.y +
        (Math.sin(angle) * this.containerRadius * 0.95) / this.scaleY;

      // Add velocity dampening
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = particle.vx * nx + particle.vy * ny;
      particle.vx = (particle.vx - 2 * dot * nx) * 0.8; // Increased damping
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
}

export { Grid };
