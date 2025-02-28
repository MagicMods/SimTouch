class StateManager {
  constructor() {
    this.metrics = {
      frameCount: 0,
      lastTime: performance.now(),
      fps: 0,
    };
  }

  // Basic timing methods
  startFrame() {
    this.metrics.frameStart = performance.now();
  }

  endFrame() {
    const now = performance.now();
    const dt = now - this.metrics.lastTime;
    this.metrics.lastTime = now;
    this.metrics.fps = Math.round(1000 / dt);
    this.metrics.frameCount++;
  }

  getMetrics() {
    return {
      fps: this.metrics.fps,
      frameCount: this.metrics.frameCount,
    };
  }

  reset() {
    this.metrics = {
      frameCount: 0,
      lastTime: performance.now(),
      fps: 0,
    };
  }

  // Timing methods
  startTiming(metric) {
    this.metrics[`_${metric}Start`] = performance.now();
  }

  endTiming(metric) {
    const end = performance.now();
    const start = this.metrics[`_${metric}Start`];
    if (start) {
      this.metrics[`_${metric}Time`] = end - start;
    }
    this.metrics.lastTime = end;
  }

  getTimingMetrics() {
    return {
      pressureSolveTime: this.metrics._pressureSolveTime,
      particleAdvectTime: this.metrics._particleAdvectTime,
      totalSimTime: this.metrics._totalSimTime,
    };
  }

  // State management
  getState(grid) {
    return {
      velocityField: {
        u: Array.from(grid.u),
        v: Array.from(grid.v),
      },
      pressure: Array.from(grid.p),
      solid: Array.from(grid.s),
      settings: {
        gravity: grid.gravity,
        flipRatio: grid.flipRatio,
        overRelaxation: grid.overRelaxation,
      },
    };
  }

  setState(grid, state) {
    if (!this.validateState(grid, state)) {
      throw new Error("Invalid state object");
    }
    grid.u.set(state.velocityField.u);
    grid.v.set(state.velocityField.v);
    grid.p.set(state.pressure);
    grid.s.set(state.solid);
    Object.assign(grid, state.settings);
  }

  // Validation methods
  validateState(grid, state) {
    return (
      state.velocityField &&
      state.velocityField.u &&
      state.velocityField.v &&
      state.pressure &&
      state.solid &&
      state.settings &&
      typeof state.settings.gravity === "number" &&
      typeof state.settings.flipRatio === "number" &&
      typeof state.settings.overRelaxation === "number" &&
      this.validateArrays(grid, state)
    );
  }

  validateArrays(grid, state) {
    const expectedLength = grid.numX * grid.numY;
    return (
      state.velocityField.u.length === expectedLength &&
      state.velocityField.v.length === expectedLength &&
      state.pressure.length === expectedLength &&
      state.solid.length === expectedLength
    );
  }

  // Performance metrics
  getPerformanceMetrics(grid) {
    // Basic metrics only
    const now = performance.now();
    const dt = now - this.metrics.lastTime;
    this.metrics.lastTime = now;

    return {
      fps: Math.round(1000 / dt),
    };
  }

  getDebugStats(grid) {
    return {
      gridCells: grid.numX * grid.numY,
      activeParticles: grid.particleSystem.getParticles().length,
      pressureIterations: grid.numPressureIters,
      timings: {
        pressureSolve: this.metrics._pressureSolveTime,
        particleAdvect: this.metrics._particleAdvectTime,
        totalSim: this.metrics._totalSimTime,
      },
      memoryUsage: ((grid.u.length + grid.v.length + grid.p.length) * 4) / 1024,
      maxVelocity: Math.max(...Array.from(grid.u), ...Array.from(grid.v)),
    };
  }

  resetMetrics() {
    Object.keys(this.metrics).forEach((key) => {
      this.metrics[key] = key === "lastTime" ? performance.now() : 0;
    });
  }
}

export { StateManager };
