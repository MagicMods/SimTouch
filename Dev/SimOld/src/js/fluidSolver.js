class FluidSolver {
  constructor(config) {
    if (!config) {
      throw new Error("FluidSolver config is required");
    }

    // Initialize arrays BEFORE using them in reset()
    const totalCells = config.numX * config.numY;
    this.u = new Float32Array(totalCells);
    this.v = new Float32Array(totalCells);
    this.p = new Float32Array(totalCells);
    this.s = new Float32Array(totalCells).fill(1);
    this.oldU = new Float32Array(totalCells);
    this.oldV = new Float32Array(totalCells);
    this.velocities = new Float32Array(totalCells);

    // Grid properties
    this.numX = config.numX;
    this.numY = config.numY;
    this.h = config.h;

    // Simulation parameters with defaults
    this.gravity = config.gravity || 0;
    this.gravityScale = config.gravityScale || 10.0;
    this.flipRatio = config.flipRatio || 0.95;
    this.overRelaxation = config.overRelaxation || 1.9;
    this.numPressureIters = config.numPressureIters || 40;
    this.velocityDamping = config.velocityDamping || 0.8;
    this.maxVelocity = config.maxVelocity || 100.0;

    // Initialize arrays to starting values
    this.reset();
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

  transferFromParticles(particles, h) {
    this.u.fill(0);
    this.v.fill(0);
    const weights = new Float32Array(this.numX * this.numY).fill(0);

    for (const p of particles) {
      const x = p.x / h;
      const y = p.y / h;

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

  transferToParticles(particles) {
    for (const p of particles) {
      const vx = this.sampleField(p.x, p.y, this.u);
      const vy = this.sampleField(p.x, p.y, this.v);
      const oldVx = this.sampleField(p.x, p.y, this.oldU);
      const oldVy = this.sampleField(p.x, p.y, this.oldV);

      p.vx =
        (this.flipRatio * (p.vx + vx - oldVx) + (1.0 - this.flipRatio) * vx) *
        this.velocityDamping;
      p.vy =
        (this.flipRatio * (p.vy + vy - oldVy) + (1.0 - this.flipRatio) * vy) *
        this.velocityDamping;

      p.vx = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, p.vx));
      p.vy = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, p.vy));
    }
  }
}

export { FluidSolver };
