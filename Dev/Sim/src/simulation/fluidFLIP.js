class FluidFLIP {
  constructor({
    gridSize = 32,
    picFlipRatio = 0.97, // FLIP (1.0) to PIC (0.0) ratio
    dt = 1 / 60,
  } = {}) {
    this.gridSize = gridSize;
    this.picFlipRatio = picFlipRatio;
    this.dt = dt;

    // Grid cell size (assuming [0,1] space)
    this.h = 1.0 / gridSize;

    // Initialize grid quantities
    this.u = new Float32Array(gridSize * (gridSize + 1)); // Horizontal velocities
    this.v = new Float32Array((gridSize + 1) * gridSize); // Vertical velocities
    this.newU = new Float32Array(this.u.length); // Temporary velocity storage
    this.newV = new Float32Array(this.v.length);
    this.pressure = new Float32Array(gridSize * gridSize);

    // Add weight grids for velocity interpolation
    this.weightU = new Float32Array(this.u.length);
    this.weightV = new Float32Array(this.v.length);
  }

  transferToGrid(particles, velocitiesX, velocitiesY) {
    // Clear velocity and weight grids
    this.u.fill(0);
    this.v.fill(0);
    this.weightU.fill(0);
    this.weightV.fill(0);

    // Transfer particle velocities to grid using linear interpolation
    for (let i = 0; i < particles.length; i += 2) {
      const x = particles[i];
      const y = particles[i + 1];
      const vx = velocitiesX[i / 2];
      const vy = velocitiesY[i / 2];

      // Get cell coordinates
      const cellX = Math.floor(x / this.h);
      const cellY = Math.floor(y / this.h);

      // Compute interpolation weights
      const fx = x / this.h - cellX;
      const fy = y / this.h - cellY;

      // Distribute horizontal velocity to u-grid
      for (let ix = 0; ix <= 1; ix++) {
        const wx = ix === 0 ? 1 - fx : fx;
        if (cellX + ix < this.gridSize + 1) {
          for (let iy = 0; iy <= 1; iy++) {
            const wy = iy === 0 ? 1 - fy : fy;
            if (cellY + iy < this.gridSize) {
              const weight = wx * wy;
              const idx = (cellY + iy) * (this.gridSize + 1) + (cellX + ix);
              this.u[idx] += vx * weight;
              this.weightU[idx] += weight;
            }
          }
        }
      }

      // Distribute vertical velocity to v-grid
      for (let ix = 0; ix <= 1; ix++) {
        const wx = ix === 0 ? 1 - fx : fx;
        if (cellX + ix < this.gridSize) {
          for (let iy = 0; iy <= 1; iy++) {
            const wy = iy === 0 ? 1 - fy : fy;
            if (cellY + iy < this.gridSize + 1) {
              const weight = wx * wy;
              const idx = (cellY + iy) * this.gridSize + (cellX + ix);
              this.v[idx] += vy * weight;
              this.weightV[idx] += weight;
            }
          }
        }
      }
    }

    // Normalize velocities by weights
    for (let i = 0; i < this.u.length; i++) {
      if (this.weightU[i] > 0) {
        this.u[i] /= this.weightU[i];
      }
    }
    for (let i = 0; i < this.v.length; i++) {
      if (this.weightV[i] > 0) {
        this.v[i] /= this.weightV[i];
      }
    }

    // Store current velocities for FLIP update
    this.newU.set(this.u);
    this.newV.set(this.v);
  }

  transferToParticles(particles, velocitiesX, velocitiesY) {
    // Transfer grid velocities back to particles using PIC/FLIP blend
    for (let i = 0; i < particles.length; i += 2) {
      const x = particles[i];
      const y = particles[i + 1];
      const pIndex = i / 2;

      // Get cell coordinates
      const cellX = Math.floor(x / this.h);
      const cellY = Math.floor(y / this.h);

      // Compute interpolation weights
      const fx = x / this.h - cellX;
      const fy = y / this.h - cellY;

      // Interpolate velocities from grid
      let picVelX = 0;
      let picVelY = 0;
      let oldVelX = 0;
      let oldVelY = 0;

      // Interpolate horizontal velocity
      for (let ix = 0; ix <= 1; ix++) {
        const wx = ix === 0 ? 1 - fx : fx;
        if (cellX + ix < this.gridSize + 1) {
          for (let iy = 0; iy <= 1; iy++) {
            const wy = iy === 0 ? 1 - fy : fy;
            if (cellY + iy < this.gridSize) {
              const idx = (cellY + iy) * (this.gridSize + 1) + (cellX + ix);
              const weight = wx * wy;
              picVelX += this.u[idx] * weight;
              oldVelX += this.newU[idx] * weight;
            }
          }
        }
      }

      // Interpolate vertical velocity
      for (let ix = 0; ix <= 1; ix++) {
        const wx = ix === 0 ? 1 - fx : fx;
        if (cellX + ix < this.gridSize) {
          for (let iy = 0; iy <= 1; iy++) {
            const wy = iy === 0 ? 1 - fy : fy;
            if (cellY + iy < this.gridSize + 1) {
              const idx = (cellY + iy) * this.gridSize + (cellX + ix);
              const weight = wx * wy;
              picVelY += this.v[idx] * weight;
              oldVelY += this.newV[idx] * weight;
            }
          }
        }
      }

      // FLIP velocity = current velocity + (new grid velocity - old grid velocity)
      const flipVelX = velocitiesX[pIndex] + (picVelX - oldVelX);
      const flipVelY = velocitiesY[pIndex] + (picVelY - oldVelY);

      // Blend PIC and FLIP
      velocitiesX[pIndex] =
        picVelX * (1 - this.picFlipRatio) + flipVelX * this.picFlipRatio;
      velocitiesY[pIndex] =
        picVelY * (1 - this.picFlipRatio) + flipVelY * this.picFlipRatio;
    }
  }

  solveIncompressibility() {}
}

export { FluidFLIP };
