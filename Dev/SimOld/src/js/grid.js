import { ParticleSystem } from "./particleSystem.js";
import { StateManager } from "./stateManager.js";
import { FluidSolver } from "./fluidSolver.js";
import { VerificationSystem } from "./verificationSystem.js";

class Grid {
  constructor(gl, width, height) {
    this.verificationSystem = new VerificationSystem(false);

    // Basic validation before full initialization
    if (!gl || width <= 0 || height <= 0) {
      throw new Error("Invalid Grid parameters");
    }

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

    // Verify initial state
    const verification = this.verificationSystem.validateGrid(this);
    if (!verification?.valid) {
      const error = verification?.error || "Grid validation failed";
      console.error("Validation details:", verification);
      throw new Error(error);
    }
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

  reset(finalize = false) {
    try {
      // Reset simulation components
      this.fluidSolver?.reset();
      this.density?.fill(0);
      this.particleSystem?.setupParticles();
      this.stateManager?.resetMetrics();

      // Mark for validation on next simulate
      this._needsValidation = true;

      return true;
    } catch (error) {
      console.error("Reset failed:", error);
      throw new Error(`Grid reset failed: ${error.message}`);
    }
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
    if (this._needsValidation) {
      const state = this.verificationSystem.validateSimulationState(this);
      if (!state.valid) {
        throw new Error(`Invalid simulation state: ${state.errors.join(", ")}`);
      }
      this._needsValidation = false;
    }

    this.stateManager.startTiming("totalSim");

    // Use FluidSolver methods directly
    this.fluidSolver.transferFromParticles(
      this.particleSystem.getParticles(),
      this.fluidSolver.h
    );
    this.fluidSolver.simulate(dt);
    this.fluidSolver.transferToParticles(this.particleSystem.getParticles());

    this.particleSystem.handleParticleCollisions();
    this.particleSystem.advectParticles(dt);
    this.stateManager.endTiming("totalSim");
  }

  // Utility methods
  getVelocityColor(vel) {
    const maxVel = 2.0;
    const t = Math.min(vel / maxVel, 1.0);
    return [t, 0.2 + 0.8 * (1.0 - t), 1.0 - 0.8 * t, 1.0];
  }

  logDebugInfo() {
    const stats = this.stateManager.getDebugStats(this);
    console.log(`Debug Info:`, stats);
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

  getMetrics() {
    return this.stateManager.getPerformanceMetrics(this);
  }

  // Finalize class

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
      particles: {
        count: this.particleSystem.particleCount,
        radius: this.particleSystem.particleRadius,
        collisionDamping: this.particleSystem.collisionDamping,
        repulsionStrength: this.particleSystem.repulsionStrength,
        collisionIterations: this.particleSystem.collisionIterations,
      },
    };
  }
  setConfig(config) {
    const validConfig = this.verificationSystem.validateConfig(config);
    if (!validConfig.valid) {
      throw new Error(
        `Invalid configuration: ${validConfig.errors.join(", ")}`
      );
    }

    // Update grid properties
    this.numX = config.gridSize.width;
    this.numY = config.gridSize.height;

    // Update simulation parameters - This is where the error occurs
    if (config.simulation) {
      // Update FluidSolver properties instead of Grid
      this.fluidSolver.gravity = config.simulation.gravity;
      this.fluidSolver.gravityScale = config.simulation.gravityScale;
      this.fluidSolver.flipRatio = config.simulation.flipRatio;
      this.fluidSolver.overRelaxation = config.simulation.overRelaxation;
      this.fluidSolver.numPressureIters = config.simulation.pressureIterations;
      this.fluidSolver.velocityDamping = config.simulation.velocityDamping;
    }

    // Update particle system parameters
    if (config.particles) {
      Object.assign(this.particleSystem, config.particles);
    }
  }

  dispose() {
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
    }
    this.density = null;
  }

  /**
   * Validates simulation parameters for physical correctness
   * @returns {boolean} True if parameters are valid
   * @throws {Error} If parameters are invalid
   */

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
