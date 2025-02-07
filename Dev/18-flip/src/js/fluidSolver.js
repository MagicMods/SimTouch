class FluidSolver {
  constructor(config) {
    // Grid properties
    this.numX = config.numX;
    this.numY = config.numY;
    this.h = config.h;

    // Simulation arrays
    const totalCells = config.totalCells;
    this.u = new Float32Array(totalCells);
    this.v = new Float32Array(totalCells);
    this.p = new Float32Array(totalCells);
    this.s = new Float32Array(totalCells);
    this.oldU = new Float32Array(totalCells);
    this.oldV = new Float32Array(totalCells);
    this.velocities = new Float32Array(totalCells);

    // Simulation parameters
    this.gravity = config.gravity || 9.81;
    this.gravityScale = config.gravityScale || 1.0;
    this.flipRatio = config.flipRatio || 0.95;
    this.overRelaxation = config.overRelaxation || 1.9;
    this.numPressureIters = config.numPressureIters || 40;
    this.velocityDamping = config.velocityDamping || 0.8;
    this.maxVelocity = config.maxVelocity || 100.0;
  }

  simulate(dt) {
    this.storeVelocities();
    this.applyExternalForces(dt);
    this.solveIncompressibility(dt);
    this.updateVelocities();
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

  storeVelocities() {
    this.oldU.set(this.u);
    this.oldV.set(this.v);
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

  reset() {
    this.u.fill(0);
    this.v.fill(0);
    this.oldU.fill(0);
    this.oldV.fill(0);
    this.p.fill(0);
    this.velocities.fill(0);
  }

  dispose() {
    this.u = null;
    this.v = null;
    this.p = null;
    this.s = null;
    this.oldU = null;
    this.oldV = null;
    this.velocities = null;
  }
}

export { FluidSolver };
