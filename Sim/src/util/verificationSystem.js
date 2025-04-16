export class VerificationSystem {
  constructor(enabled = false, debugFlags) {
    this.enabled = enabled;
    this.errors = [];
    this.debug = debugFlags;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  validateGrid(grid) {
    if (!this.enabled) return { valid: true };
    // Early validation since we're in constructor
    if (!grid || !grid.gl) {
      return {
        valid: false,
        error: "Invalid grid initialization",
      };
    }

    const checks = {
      dimensions: this.validateDimensions(grid),
      webgl: this.validateWebGLState(grid.gl),
      visual: this.validateVisualElements(grid),
      layout: this.validateGridLayout(grid),
      density: this.validateDensityField(grid),
    };

    return {
      valid: Object.values(checks).every((check) => check.valid),
      checks,
      error: Object.values(checks)
        .filter((check) => !check.valid)
        .map((check) => check.error)
        .join(", "),
    };
  }

  validateDimensions(grid) {
    const checks = {
      numX: grid.numX > 0,
      numY: grid.numY > 0,
      width: grid.width > 0,
      height: grid.height > 0,
      rectWidth: grid.rectWidth > 0,
      rectHeight: grid.rectHeight > 0,
      stepX: grid.stepX > 0,
      stepY: grid.stepY > 0,
    };

    const valid = Object.values(checks).every((v) => v);

    return {
      valid,
      checks,
      error: valid ? null : "Invalid grid dimensions",
    };
  }

  validateWebGLState(gl) {
    if (!gl) return { valid: false, error: "WebGL context is null" };
    const error = gl.getError();
    return {
      valid: error === gl.NO_ERROR,
      error: error !== gl.NO_ERROR ? `WebGL error: ${error}` : null,
    };
  }

  validateVisualElements(grid) {
    const checks = {
      gradient: grid.gradient && grid.gradient.length === 256,
      vertexBuffer: grid.vertexBuffer !== null,
      obstacleColor:
        Array.isArray(grid.obstacleColor) && grid.obstacleColor.length === 4,
    };

    return {
      valid: Object.values(checks).every((v) => v),
      checks,
    };
  }

  validateGridLayout(grid) {
    const checks = {
      rowCounts: Array.isArray(grid.rowCounts) && grid.rowCounts.length > 0,
      baseXs:
        Array.isArray(grid.baseXs) &&
        grid.baseXs.length === grid.rowCounts.length,
      verticalOffset: typeof grid.verticalOffset === "number",
      containerRadius: grid.containerRadius > 0,
      containerCenter:
        grid.containerCenter && typeof grid.containerCenter.x === "number",
    };

    return {
      valid: Object.values(checks).every((v) => v),
      checks,
    };
  }

  validateDensityField(grid) {
    return {
      valid:
        grid.density instanceof Float32Array &&
        grid.density.length === grid.rowCounts.reduce((a, b) => a + b, 0) &&
        grid.maxDensity > 0,
      error: "Invalid density field configuration",
    };
  }

  validateFluidSolver(solver) {
    if (!this.enabled) return { valid: true };
    if (!solver) {
      return { valid: false, error: "Fluid solver is undefined" };
    }

    const arrayChecks = this.validateSolverArrays(solver);
    const paramChecks = this.validateFluidSolverParameters(solver);

    return {
      valid: arrayChecks.valid && paramChecks.valid,
      arrays: arrayChecks,
      parameters: paramChecks,
      error: !arrayChecks.valid
        ? "Invalid solver arrays"
        : !paramChecks.valid
          ? "Invalid solver parameters"
          : null,
    };
  }

  validateSolverArrays(solver) {
    const expectedLength = solver.numX * solver.numY;
    if (this.debug.verif) console.log("Expected array length:", expectedLength);
    if (this.debug.verif) console.log("Solver arrays:", {
      u: solver.u?.length,
      v: solver.v?.length,
      p: solver.p?.length,
      s: solver.s?.length,
      oldU: solver.oldU?.length,
      oldV: solver.oldV?.length,
    });
    const arrays = ["u", "v", "p", "s", "oldU", "oldV"];

    const checks = arrays.map((name) => ({
      name,
      valid: solver[name] && solver[name].length === expectedLength,
      error: `Array ${name} invalid or wrong length`,
    }));

    return {
      valid: checks.every((c) => c.valid),
      checks,
    };
  }

  validateFluidSolverParameters(solver) {
    const params = {
      flipRatio: solver.flipRatio >= 0 && solver.flipRatio <= 1,
      overRelaxation: solver.overRelaxation > 0 && solver.overRelaxation <= 2,
      numPressureIters: solver.numPressureIters > 0,
      velocityDamping:
        solver.velocityDamping >= 0 && solver.velocityDamping <= 1,
    };

    return {
      valid: Object.values(params).every((v) => v),
      checks: params,
    };
  }

  validateNumericProperty(obj, propertyName) {
    return {
      valid:
        obj &&
        typeof obj[propertyName] === "number" &&
        Number.isFinite(obj[propertyName]),
      error: `Invalid numeric property: ${propertyName}`,
    };
  }

  validateSolverParameters(solver) {
    const checks = {
      flipRatio: solver.flipRatio >= 0 && solver.flipRatio <= 1,
      overRelaxation: solver.overRelaxation > 0 && solver.overRelaxation <= 2,
      numPressureIters: solver.numPressureIters > 0,
      velocityDamping:
        solver.velocityDamping >= 0 && solver.velocityDamping <= 1,
    };

    return {
      valid: Object.values(checks).every((v) => v),
      checks,
    };
  }

  validateParticleSystem(ps) {
    return {
      valid:
        this.validateParticleArrays(ps).valid &&
        this.validateParticleParameters(ps).valid,
      arrays: this.validateParticleArrays(ps),
      parameters: this.validateParticleParameters(ps),
    };
  }

  validateParticleArrays(ps) {
    const particles = ps.getParticles();
    const valid = particles && particles.length > 0;

    return {
      valid,
      error: valid ? null : "Invalid or empty particle array",
    };
  }

  validateParticleParameters(ps) {
    const checks = {
      radius: ps.particleRadius > 0,
      damping: ps.collisionDamping >= 0 && ps.collisionDamping <= 1,
      repulsion: ps.repulsionStrength >= 0,
    };

    return {
      valid: Object.values(checks).every((v) => v),
      checks,
    };
  }

  validateConfig(config) {
    if (!config) return { valid: false, errors: ["Configuration is null"] };

    const errors = [];

    // Grid size validation
    const gridSizeValid =
      config.gridSize &&
      this.validateConfigNumeric(config.gridSize.width, 2).valid &&
      this.validateConfigNumeric(config.gridSize.height, 2).valid;

    if (!gridSizeValid) errors.push("Invalid grid dimensions");

    // Cell size validation
    if (!this.validateConfigNumeric(config.cellSize, 0).valid) {
      errors.push("Invalid cell size");
    }

    // Circle obstacle validation
    if (config.circleObstacle) {
      const obstacleValid =
        this.validateConfigNumeric(config.circleObstacle.x).valid &&
        this.validateConfigNumeric(config.circleObstacle.y).valid &&
        this.validateConfigNumeric(config.circleObstacle.radius, 0).valid;

      if (!obstacleValid) errors.push("Invalid obstacle configuration");
    }

    // Simulation parameters validation
    if (config.simulation) {
      const simValid =
        this.validateConfigNumeric(config.simulation.gravity).valid &&
        this.validateConfigNumeric(config.simulation.gravityScale).valid &&
        this.validateConfigNumeric(config.simulation.flipRatio, 0, 1).valid &&
        this.validateConfigNumeric(config.simulation.overRelaxation, 0, 2)
          .valid &&
        this.validateConfigNumeric(config.simulation.velocityDamping, 0, 1)
          .valid;

      if (!simValid) errors.push("Invalid simulation parameters");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateConfigNumeric(value, min = null, max = null) {
    const isValid =
      typeof value === "number" &&
      Number.isFinite(value) &&
      (min === null || value >= min) &&
      (max === null || value <= max);

    return {
      valid: isValid,
      error: isValid ? null : `Value ${value} outside range [${min}, ${max}]`,
    };
  }

  isValidNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  validateSimulationState(grid) {
    if (!this.enabled) return { valid: true };
    const gridValid = this.validateGrid(grid);
    const solverValid = this.validateFluidSolver(grid.fluidSolver);

    if (this.debug.verif) console.log("Grid validation:", gridValid);
    if (this.debug.verif) console.log("Solver validation:", solverValid);

    return {
      valid: gridValid.valid && solverValid.valid,
      errors: [
        ...(!gridValid.valid
          ? [`Grid validation failed: ${JSON.stringify(gridValid.checks)}`]
          : []),
        ...(!solverValid.valid
          ? [`Solver validation failed: ${JSON.stringify(solverValid.checks)}`]
          : []),
      ],
    };
  }

  validateGridState(grid) {
    return {
      visual: this.validateVisualElements(grid),
      layout: this.validateGridLayout(grid),
      dimensions: this.validateDimensions(grid),
      parameters: this.validateGridParameters(grid),
    };
  }

  validateResourceState(grid) {
    return {
      webgl: this.validateWebGLContext(grid.gl),
      buffers: this.validateBuffers(grid),
      memory: this.validateMemoryUsage(grid),
    };
  }

  validateMemoryUsage(grid) {
    const totalArrays = [
      grid.density,
      grid.fluidSolver.u,
      grid.fluidSolver.v,
      grid.fluidSolver.p,
      grid.fluidSolver.s,
      grid.fluidSolver.oldU,
      grid.fluidSolver.oldV,
    ];

    const memoryUsage = totalArrays.reduce(
      (sum, arr) => sum + (arr ? arr.length * 4 : 0),
      0
    );

    return {
      valid: memoryUsage < 1024 * 1024 * 100, // 100MB limit
      memoryUsage,
    };
  }

  validateBounds(x, y, width, height) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  validateBuffers(grid) {
    return {
      valid:
        grid.vertexBuffer !== null && this.validateWebGLState(grid.gl).valid,
      error: "Invalid WebGL buffers",
    };
  }

  validateGridParameters(grid) {
    const checks = {
      cellSize: grid.h > 0,
      dimensions: grid.numX >= 2 && grid.numY >= 2,
      obstacle: grid.circleRadius > 0,
    };

    return {
      valid: Object.values(checks).every((v) => v),
      checks,
    };
  }
}
