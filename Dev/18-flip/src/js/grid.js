import { ParticleSystem } from "./particleSystem.js";
import { StateManager } from "./stateManager.js";
import { FluidSolver } from "./fluidSolver.js";

class Grid {
  constructor(gl, width, height) {
    // Core properties
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Grid layout parameters
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.baseXs = [64, 40, 24, 16, 8, 0, 0, 0, 0, 8, 16, 24, 40, 64];
    this.numX = Math.max(...this.rowCounts);
    this.numY = this.rowCounts.length;

    // Calculate total cells and cell size
    const totalCells = this.rowCounts.reduce((a, b) => a + b, 0);
    const h = width / this.numX;

    // Initialize FluidSolver
    this.fluidSolver = new FluidSolver({
      numX: this.numX,
      numY: this.numY,
      h: h,
      totalCells: totalCells,
    });

    // Grid visualization
    this.density = new Float32Array(totalCells).fill(0);
    this.maxDensity = 5.0;

    // Grid dimensions
    const scale = Math.min(width, height) / 400;
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;
    this.verticalOffset = (this.height - this.numY * this.stepY) / 2;

    // Container bounds
    const maxRowWidth = Math.max(...this.rowCounts) * this.stepX;
    const gridHeight = this.rowCounts.length * this.stepY;
    this.containerRadius = Math.min(maxRowWidth / 2, gridHeight / 2);
    this.containerCenter = { x: width * 0.5, y: height * 0.5 };

    // Obstacle parameters
    this.circleCenter = { x: width * 0.5, y: height * 0.5 };
    this.circleRadius = this.containerRadius * 0.3;
    this.isObstacleActive = false;
    this.obstacleColor = [0, 0, 0, 1.0];

    // Visual elements
    this.gradient = this.createGradient();
    this.initBuffers();

    // State management
    this.stateManager = new StateManager();

    // Initialize particle system
    this.particleSystem = new ParticleSystem({
      width: this.width,
      height: this.height,
      rowCounts: this.rowCounts,
      stepX: this.stepX,
      stepY: this.stepY,
      verticalOffset: this.verticalOffset,
      velocityDamping: this.fluidSolver.velocityDamping,
      particleCount: 338,
      particleRadius: 4.0,
      collisionDamping: 0.5,
      repulsionStrength: 0.3,
      collisionIterations: 3,
      containerRadius: this.containerRadius,
      containerCenter: this.containerCenter,
      circleCenter: this.circleCenter,
      circleRadius: this.circleRadius,
      isObstacleActive: this.isObstacleActive,
    });

    this.reset();
  }
  // Initialization methods
  initBuffers() {
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
  }

  setParticleCount(count) {
    this.particleSystem.particleCount = count;
    this.reset();
  }

  reset() {
    // Reset arrays
    this.u.fill(0);
    this.v.fill(0);
    this.oldU.fill(0);
    this.oldV.fill(0);
    this.p.fill(0);
    this.velocities.fill(0);

    // Use particle system reset
    this.particleSystem.setupParticles();

    // Reset metrics
    this.stateManager.resetMetrics();
  }
  // Drawing methods
  draw(programInfo) {
    this.gl.useProgram(programInfo.program);

    // Only draw obstacle when active
    if (this.isObstacleActive) {
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

  getCellIndex(col, row) {
    // Validate row and column bounds
    if (
      row < 0 ||
      row >= this.rowCounts.length ||
      col < 0 ||
      col >= this.rowCounts[row]
    ) {
      return -1;
    }

    // Calculate offset for this row
    let index = 0;
    for (let i = 0; i < row; i++) {
      index += this.rowCounts[i];
    }
    return index + col;
  }

  updateGridDensity() {
    this.density.fill(0);
    const particles = this.particleSystem.getParticles();
    for (const p of particles) {
      // Calculate relative position to grid origin
      const relY = p.y - this.verticalOffset;
      const row = Math.floor(relY / this.stepY);

      // Check if we're near any row (including edge rows)
      for (
        let j = Math.max(0, row - 2);
        j < Math.min(this.numY, row + 3);
        j++
      ) {
        const rowWidth = this.rowCounts[j] * this.stepX;
        const rowBaseX = (this.width - rowWidth) / 2;
        const relX = p.x - rowBaseX;
        const col = Math.floor(relX / this.stepX);

        // Check cells in this row
        for (
          let i = Math.max(0, col - 2);
          i < Math.min(this.rowCounts[j], col + 3);
          i++
        ) {
          const idx = this.getCellIndex(i, j);
          if (idx === -1) continue;

          // Calculate cell center
          const cellCenterX = rowBaseX + (i + 0.5) * this.stepX;
          const cellCenterY = this.verticalOffset + (j + 0.5) * this.stepY;

          // Calculate influence
          const dx = p.x - cellCenterX;
          const dy = p.y - cellCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / (this.stepX * 1.5));

          this.density[idx] += influence;
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

  setObstacleActive(active) {
    this.isObstacleActive = active;
    this.particleSystem.isObstacleActive = active;
  }
  // Simulation methods

  simulate(dt) {
    this.stateManager.startTiming("totalSim");

    // Transfer to grid
    this.transferToGrid();

    // Use fluid solver
    this.fluidSolver.simulate(dt);

    // Transfer back to particles
    this.transferFromGrid();

    // Update particles
    this.particleSystem.handleParticleCollisions();
    this.particleSystem.advectParticles(dt);

    this.stateManager.endTiming("totalSim");
  }

  transferToGrid() {
    this.u.fill(0);
    this.v.fill(0);
    const weights = new Float32Array(
      this.fluidSolver.numX * this.fluidSolver.numY
    ).fill(0);
    const particles = this.particleSystem.getParticles();

    for (const p of particles) {
      const x = p.x / this.fluidSolver.h;
      const y = p.y / this.fluidSolver.h;

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
    const particles = this.particleSystem.getParticles();
    for (const p of particles) {
      // Sample velocities from fluid solver
      const vx = this.fluidSolver.sampleField(p.x, p.y, this.fluidSolver.u);
      const vy = this.fluidSolver.sampleField(p.x, p.y, this.fluidSolver.v);
      const oldVx = this.fluidSolver.sampleField(
        p.x,
        p.y,
        this.fluidSolver.oldU
      );
      const oldVy = this.fluidSolver.sampleField(
        p.x,
        p.y,
        this.fluidSolver.oldV
      );

      // FLIP update using fluid solver parameters
      p.vx =
        (this.fluidSolver.flipRatio * (p.vx + vx - oldVx) +
          (1.0 - this.fluidSolver.flipRatio) * vx) *
        this.fluidSolver.velocityDamping;
      p.vy =
        (this.fluidSolver.flipRatio * (p.vy + vy - oldVy) +
          (1.0 - this.fluidSolver.flipRatio) * vy) *
        this.fluidSolver.velocityDamping;

      // Clamp velocities
      p.vx = Math.max(
        -this.fluidSolver.maxVelocity,
        Math.min(this.fluidSolver.maxVelocity, p.vx)
      );
      p.vy = Math.max(
        -this.fluidSolver.maxVelocity,
        Math.min(this.fluidSolver.maxVelocity, p.vy)
      );
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
    const stats = this.stateManager.getDebugStats(this);
    const timings = this.stateManager.getTimingMetrics();

    console.log(`Grid size: ${this.numX}x${this.numY}`);
    console.log(`Cell size: ${this.h}`);
    console.log(`Max velocity: ${stats.maxVelocity}`);
    console.log(`Memory usage: ${stats.memoryUsage} KB`);
    console.log(`Grid cells: ${stats.gridCells}`);
    console.log(`Active particles: ${stats.activeParticles}`);
    console.log(`Pressure solve: ${timings.pressureSolveTime.toFixed(2)}ms`);
    console.log(`Total simulation: ${timings.totalSimTime.toFixed(2)}ms`);
  }

  // Add timing metrics

  checkWebGLError() {
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      console.error("WebGL error:", error);
      return false;
    }
    return true;
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

  validateSimulationState() {
    if (!this.validateGridState()) {
      throw new Error("Invalid grid state");
    }
    if (!this.checkWebGLError()) {
      throw new Error("WebGL error detected");
    }
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
      ...this.stateManager.getPerformanceMetrics(this),
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
      cellSize: this.fluidSolver.h,
      circleObstacle: {
        x: this.circleCenter.x,
        y: this.circleCenter.y,
        radius: this.circleRadius,
      },
      simulation: {
        gravity: this.fluidSolver.gravity,
        gravityScale: this.fluidSolver.gravityScale,
        flipRatio: this.fluidSolver.flipRatio,
        overRelaxation: this.fluidSolver.overRelaxation,
        pressureIterations: this.fluidSolver.numPressureIters,
        velocityDamping: this.fluidSolver.velocityDamping,
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
    this.particleSystem.setupParticles();
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
