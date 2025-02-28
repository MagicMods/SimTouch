class FluidFLIP {
  constructor({
    gridSize = 32,
    picFlipRatio = 0.97, // Default should be high for FLIP
    dt = 1 / 60,
    iterations = 20,
    overRelaxation = 1.9,
    boundary = null,
    ...params
  } = {}) {
    // Core parameters
    this.gridSize = gridSize;
    this.picFlipRatio = picFlipRatio;
    this.dt = dt;

    // Store boundary reference
    if (!boundary) {
      throw new Error("FluidFLIP requires a boundary reference");
    }
    this.boundary = boundary;
    this.radius = boundary.getRadius();

    // Add update listener
    this.boundary.addUpdateCallback(() => {
      this.radius = this.boundary.getRadius();
    });

    // Add missing scale factors
    this.gridToWorldScale = 1.0 / gridSize;
    this.worldToGridScale = gridSize;

    // Grid cell size (assuming [0,1] space)
    this.h = 1.0 / gridSize;

    // Initialize grid quantities
    this.u = new Float32Array((gridSize + 1) * gridSize); // Horizontal velocities
    this.v = new Float32Array(gridSize * (gridSize + 1)); // Vertical velocities
    this.oldU = new Float32Array(this.u.length); // Previous velocities
    this.oldV = new Float32Array(this.v.length);

    // Add weight grids for velocity interpolation
    this.weightU = new Float32Array(this.u.length);
    this.weightV = new Float32Array(this.v.length);

    // Add pressure solve parameters
    this.pressure = new Float32Array(gridSize * gridSize);
    this.divergence = new Float32Array(gridSize * gridSize);
    this.solid = new Uint8Array(gridSize * gridSize);

    // Solver parameters
    this.iterations = iterations;
    this.overRelaxation = overRelaxation;
    this.pressureScale = 1.0;
    this.velocityScale = 1.0;

    // Add boundary parameters
    this.safetyMargin = 0.01;
    this.boundaryDamping = 0.85;
    this.velocityDamping = 0.999;

    // Initialize solid cells for circular boundary
    this.initializeBoundary();
  }

  worldToGrid(x, y) {
    return {
      x: x * this.worldToGridScale,
      y: y * this.worldToGridScale,
    };
  }

  gridToWorld(x, y) {
    return {
      x: x * this.gridToWorldScale,
      y: y * this.gridToWorldScale,
    };
  }

  initializeBoundary() {
    const n = this.gridSize;
    const h = this.h;

    // Use boundary properties
    const centerX = this.boundary.centerX;
    const centerY = this.boundary.centerY;
    const radius = this.boundary.getRadius();

    // Mark solid cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (j + 0.5) * h;
        const y = (i + 0.5) * h;
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;

        this.solid[i * n + j] = distSq > radius * radius ? 1 : 0;
      }
    }
  }

  transferToGrid(particles, velocitiesX, velocitiesY) {
    // Store current velocities before update
    this.oldU.set(this.u);
    this.oldV.set(this.v);

    // Clear velocity and weight grids
    this.u.fill(0);
    this.v.fill(0);
    this.weightU.fill(0);
    this.weightV.fill(0);

    // Transfer particle velocities to grid using linear interpolation
    for (let i = 0; i < particles.length; i += 2) {
      const x = particles[i]; // World space position
      const y = particles[i + 1];
      const pIndex = i / 2;

      // Convert particle velocity to grid scale
      const vx = velocitiesX[pIndex];
      const vy = velocitiesY[pIndex];

      // Get grid cell
      const cellX = Math.floor(x * this.gridSize);
      const cellY = Math.floor(y * this.gridSize);

      // Compute weights
      const fx = x * this.gridSize - cellX;
      const fy = y * this.gridSize - cellY;

      // Accumulate to U grid (staggered in x)
      for (let ix = 0; ix <= 1; ix++) {
        for (let iy = 0; iy <= 1; iy++) {
          const wx = ix === 0 ? 1 - fx : fx;
          const wy = iy === 0 ? 1 - fy : fy;
          const weight = wx * wy;

          const idx = cellY * (this.gridSize + 1) + cellX + ix;
          if (idx < this.u.length) {
            this.u[idx] += vx * weight;
            this.weightU[idx] += weight;
          }
        }
      }

      // Accumulate to V grid (staggered in y)
      for (let ix = 0; ix <= 1; ix++) {
        for (let iy = 0; iy <= 1; iy++) {
          const wx = ix === 0 ? 1 - fx : fx;
          const wy = iy === 0 ? 1 - fy : fy;
          const weight = wx * wy;

          const idx = (cellY + iy) * this.gridSize + cellX;
          if (idx < this.v.length) {
            this.v[idx] += vy * weight;
            this.weightV[idx] += weight;
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
  }

  transferToParticles(particles, velocitiesX, velocitiesY) {
    // Transfer grid velocities back to particles using PIC/FLIP blend
    for (let i = 0; i < particles.length; i += 2) {
      const x = particles[i];
      const y = particles[i + 1];
      const pIndex = i / 2;

      // Get grid cell
      const cellX = Math.floor(x * this.gridSize);
      const cellY = Math.floor(y * this.gridSize);

      // Compute weights
      const fx = x * this.gridSize - cellX;
      const fy = y * this.gridSize - cellY;

      // Interpolate current and old velocities
      let picVelX = 0,
        picVelY = 0;
      let oldVelX = 0,
        oldVelY = 0;

      // Sample from U grid
      for (let ix = 0; ix <= 1; ix++) {
        for (let iy = 0; iy <= 1; iy++) {
          const wx = ix === 0 ? 1 - fx : fx;
          const wy = iy === 0 ? 1 - fy : fy;
          const weight = wx * wy;

          const idx = cellY * (this.gridSize + 1) + cellX + ix;
          if (idx < this.u.length) {
            picVelX += this.u[idx] * weight;
            oldVelX += this.oldU[idx] * weight;
          }
        }
      }

      // Sample from V grid
      for (let ix = 0; ix <= 1; ix++) {
        for (let iy = 0; iy <= 1; iy++) {
          const wx = ix === 0 ? 1 - fx : fx;
          const wy = iy === 0 ? 1 - fy : fy;
          const weight = wx * wy;

          const idx = (cellY + iy) * this.gridSize + cellX;
          if (idx < this.v.length) {
            picVelY += this.v[idx] * weight;
            oldVelY += this.oldV[idx] * weight;
          }
        }
      }

      // Convert grid velocities to world space
      picVelX *= this.gridToWorldScale;
      picVelY *= this.gridToWorldScale;
      oldVelX *= this.gridToWorldScale;
      oldVelY *= this.gridToWorldScale;

      // FLIP update
      const flipVelX = velocitiesX[pIndex] + (picVelX - oldVelX);
      const flipVelY = velocitiesY[pIndex] + (picVelY - oldVelY);

      // Corrected PIC/FLIP blend
      // FLIP = 1.0, pure FLIP behavior
      // FLIP = 0.0, pure PIC behavior
      velocitiesX[pIndex] =
        picVelX * (1.0 - this.picFlipRatio) + // PIC contribution
        flipVelX * this.picFlipRatio; // FLIP contribution

      velocitiesY[pIndex] =
        picVelY * (1.0 - this.picFlipRatio) + // PIC contribution
        flipVelY * this.picFlipRatio; // FLIP contribution

      // Apply damping
      velocitiesX[pIndex] *= this.velocityDamping;
      velocitiesY[pIndex] *= this.velocityDamping;
    }

    // Modified boundary handling
    for (let i = 0; i < particles.length; i += 2) {
      const pIndex = i / 2;
      const x = particles[i];
      const y = particles[i + 1];

      const dx = x - this.centerX;
      const dy = y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only apply boundary correction when very close to boundary
      if (dist > this.radius * (1.0 - this.boundaryMargin)) {
        // CORRECT
        const nx = dx / dist;
        const ny = dy / dist;

        const vx = velocitiesX[pIndex];
        const vy = velocitiesY[pIndex];

        // Only remove radial component if moving outward
        const radialVel = vx * nx + vy * ny;
        if (radialVel > 0) {
          // Remove radial component and apply soft damping
          velocitiesX[pIndex] = (vx - radialVel * nx) * this.boundaryDamping;
          velocitiesY[pIndex] = (vy - radialVel * ny) * this.boundaryDamping;
        }
      }

      // Additional boundary handling for particles very close to or outside boundary
      if (dist > this.radius * 0.95) {
        const nx = dx / dist;
        const ny = dy / dist;
        const radialVel = velocitiesX[pIndex] * nx + velocitiesY[pIndex] * ny;

        if (radialVel > 0) {
          // Remove outward velocity and add small inward push
          const inwardFactor =
            (0.1 * (dist - this.radius * 0.95)) / (this.radius * 0.05);
          velocitiesX[pIndex] =
            (velocitiesX[pIndex] - radialVel * nx) * 0.8 - nx * inwardFactor;
          velocitiesY[pIndex] =
            (velocitiesY[pIndex] - radialVel * ny) * 0.8 - ny * inwardFactor;
        }
      }
    }
  }

  solveIncompressibility() {
    const n = this.gridSize;
    const h = this.h;

    // Compute divergence
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (this.solid[i * n + j]) continue;

        const center = i * n + j;
        const right = i * n + (j + 1);
        const top = (i + 1) * n + j;

        // Fixed divergence calculation
        let div = 0;
        if (j < n - 1) div += this.u[center + i * 1];
        if (j > 0) div -= this.u[center + i * 1 - 1];
        if (i < n - 1) div += this.v[top];
        if (i > 0) div -= this.v[center - n];

        this.divergence[center] = div / h;
      }
    }

    // Add boundary conditions before pressure solve
    this.applyBoundaryConditions();

    // Solve pressure Poisson equation
    this.pressure.fill(0);
    const scale = (this.dt / (h * h)) * this.gridToWorldScale;

    // Modified pressure solve near boundaries
    for (let iter = 0; iter < this.iterations; iter++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (this.solid[i * n + j]) continue;

          const center = i * n + j;
          const wx = (j + 0.5) * this.gridToWorldScale;
          const wy = (i + 0.5) * this.gridToWorldScale;
          const dx = wx - this.centerX;
          const dy = wy - this.centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Reduce pressure influence near boundary
          const boundaryFactor =
            dist > this.radius * 0.9
              ? Math.pow(
                  1 - (dist - this.radius * 0.9) / (this.radius * 0.1),
                  2
                )
              : 1.0;

          const left = i * n + (j - 1);
          const right = i * n + (j + 1);
          const bottom = (i - 1) * n + j;
          const top = (i + 1) * n + j;

          let p = 0;
          let numNeighbors = 0;

          // Add pressure from non-solid neighbors
          if (j > 0 && !this.solid[left]) {
            p += this.pressure[left];
            numNeighbors++;
          }
          if (j < n - 1 && !this.solid[right]) {
            p += this.pressure[right];
            numNeighbors++;
          }
          if (i > 0 && !this.solid[bottom]) {
            p += this.pressure[bottom];
            numNeighbors++;
          }
          if (i < n - 1 && !this.solid[top]) {
            p += this.pressure[top];
            numNeighbors++;
          }

          // Update pressure using over-relaxation
          if (numNeighbors > 0) {
            p =
              (p - this.divergence[center] * scale * boundaryFactor) /
              numNeighbors;
            this.pressure[center] =
              p * this.overRelaxation +
              this.pressure[center] * (1 - this.overRelaxation);
          }
        }
      }
    }

    // Apply scaled pressure gradient to velocities
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const center = i * n + j;

        // Update horizontal velocities
        if (j < n - 1) {
          const right = i * n + (j + 1);
          const uIdx = center + i * 1;

          if (!this.solid[center] && !this.solid[right]) {
            const gradP = (this.pressure[right] - this.pressure[center]) / h;
            this.u[uIdx] -= gradP * this.dt * this.pressureScale;
          }
        }

        // Update vertical velocities
        if (i < n - 1) {
          const top = (i + 1) * n + j;
          const vIdx = center;

          if (!this.solid[center] && !this.solid[top]) {
            const gradP = (this.pressure[top] - this.pressure[center]) / h;
            this.v[vIdx] -= gradP * this.dt * this.pressureScale;
          }
        }
      }
    }

    // Reapply boundary conditions after velocity update
    this.applyBoundaryConditions();

    // Add velocity damping after pressure solve
    for (let i = 0; i < this.u.length; i++) {
      this.u[i] *= this.velocityDamping;
    }
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] *= this.velocityDamping;
    }
  }

  applyBoundaryConditions() {
    const n = this.gridSize;
    const h = this.h;

    // Softer boundary conditions
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!this.solid[i * n + j]) continue;

        const x = (j + 0.5) * h;
        const y = (i + 0.5) * h;
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const center = i * n + j;

          // Gradually reduce velocities near boundary
          const factor = Math.pow(
            1 - Math.min(1, (dist - this.radius) / (0.1 * this.radius)),
            2
          );

          // Handle velocities with gradual reduction
          if (j < n && this.u[center + i] !== undefined) {
            const dot = this.u[center + i] * nx;
            if (dot > 0) {
              this.u[center + i] *= factor;
            }
          }

          if (i < n && this.v[center] !== undefined) {
            const dot = this.v[center] * ny;
            if (dot > 0) {
              this.v[center] *= factor;
            }
          }
        }
      }
    }

    // Apply boundary conditions to grid velocities
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (j + 0.5) * h;
        const y = (i + 0.5) * h;
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.radius * 0.9) {
          const factor = Math.pow(
            1 - (dist - this.radius * 0.9) / (this.radius * 0.1),
            2
          );
          const center = i * n + j;

          // Gradually reduce velocities near boundary
          if (j < n && this.u[center + i] !== undefined) {
            this.u[center + i] *= factor;
          }
          if (i < n && this.v[center] !== undefined) {
            this.v[center] *= factor;
          }
        }
      }
    }
  }

  reset() {
    // Reset grid and pressure fields
    this.velocityField = new Float32Array(this.gridSize * this.gridSize * 2);
    this.pressureField = new Float32Array(this.gridSize * this.gridSize);
  }
}

export { FluidFLIP };
