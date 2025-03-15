class FluidFLIP {
  constructor({
    gridSize = 32,
    picFlipRatio = 0.95,
    dt = 1 / 60,
    iterations = 20,
    overRelaxation = 1.5,  // LOWER THIS to 1.5 for stability
    boundary = null,
    restDensity = 1.0,
    gasConstant = 2.0,
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
      this.centerX = this.boundary.centerX;
      this.centerY = this.boundary.centerY;
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

    // Add new parameters
    this.restDensity = restDensity;
    this.gasConstant = gasConstant;
    this.pressureMultiplier = this.gasConstant / (this.restDensity * this.restDensity);

    // Add these properties
    this.centerX = this.boundary.centerX;
    this.centerY = this.boundary.centerY;
    this.boundaryMargin = 0.05; // Default value

    // Add this - critical for stability
    this.velocityDampingFLIP = 0.98;
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
    const n = this.gridSize;
    const h = this.h;

    for (let i = 0; i < particles.length / 2; i++) {
      const x = particles[i * 2];
      const y = particles[i * 2 + 1];

      // Ensure coordinates are within grid bounds
      if (x < 0 || x > 1 || y < 0 || y > 1) continue;

      // Get grid cell containing particle
      const gx = Math.min(Math.max(Math.floor(x * n), 0), n - 1);
      const gy = Math.min(Math.max(Math.floor(y * n), 0), n - 1);

      // Use interpolation instead of cell-center for better results
      const [gridVx, gridVy] = this.interpolateVelocity(x, y);

      // PIC/FLIP mixing with proper damping
      velocitiesX[i] = this.picFlipRatio * gridVx +
        (1 - this.picFlipRatio) * velocitiesX[i] * this.velocityDampingFLIP;
      velocitiesY[i] = this.picFlipRatio * gridVy +
        (1 - this.picFlipRatio) * velocitiesY[i] * this.velocityDampingFLIP;
    }

    // After transferring velocities, apply rest density effect
    // Higher rest density = more space between particles
    const restEffect = Math.sqrt(this.restDensity);
    const repulsionStrength = 0.005 * restEffect;

    // Apply mild repulsion based on rest density
    for (let i = 0; i < particles.length / 2; i++) {
      const x = particles[i * 2];
      const y = particles[i * 2 + 1];

      for (let j = i + 1; j < particles.length / 2; j++) {
        const x2 = particles[j * 2];
        const y2 = particles[j * 2 + 1];

        const dx = x - x2;
        const dy = y - y2;
        const distSq = dx * dx + dy * dy;

        if (distSq < 0.01) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Apply repulsion proportional to rest density
          velocitiesX[i] += nx * repulsionStrength;
          velocitiesY[i] += ny * repulsionStrength;
          velocitiesX[j] -= nx * repulsionStrength;
          velocitiesY[j] -= ny * repulsionStrength;
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

    // Solve pressure Poisson equation ONCE
    this.pressure.fill(0);

    // Compute base scale and density effect
    const baseScale = this.dt / (this.h * this.h);
    const densityScaling = Math.pow(this.gasConstant, 1.5) / this.restDensity;
    const pressureCoefficient = baseScale * Math.min(Math.max(densityScaling * 0.5, 0.1), 10.0);

    console.log(`Effective pressure coefficient: ${pressureCoefficient}`);

    // ONE pressure solve loop
    for (let iter = 0; iter < this.iterations; iter++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (this.solid[i * n + j]) continue;

          const center = i * n + j;
          const right = i * n + (j + 1);
          const left = i * n + (j - 1);
          const top = (i + 1) * n + j;
          const bottom = (i - 1) * n + j;

          let s = 0;
          let weightSum = 0;

          // Check and add contributions from neighboring cells
          if (j < n - 1 && !this.solid[right]) {
            s += this.pressure[right];
            weightSum++;
          }
          if (j > 0 && !this.solid[left]) {
            s += this.pressure[left];
            weightSum++;
          }
          if (i < n - 1 && !this.solid[top]) {
            s += this.pressure[top];
            weightSum++;
          }
          if (i > 0 && !this.solid[bottom]) {
            s += this.pressure[bottom];
            weightSum++;
          }

          // Calculate new pressure with proper scaling
          if (weightSum > 0) {
            const densityDeviation = -this.divergence[center];
            const newP = (s / weightSum) + pressureCoefficient * densityDeviation;
            this.pressure[center] = this.pressure[center] * (1 - this.overRelaxation) +
              newP * this.overRelaxation;
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

            // THIS IS THE CRITICAL LINE - Apply pressure scale directly to gradient
            this.u[uIdx] -= gradP * this.dt * this.pressureScale;
          }
        }

        // Similarly for vertical velocities
        if (i < n - 1) {
          const top = (i + 1) * n + j;
          const vIdx = top;

          if (!this.solid[center] && !this.solid[top]) {
            const gradP = (this.pressure[top] - this.pressure[center]) / h;

            // THIS IS THE CRITICAL LINE - Apply pressure scale directly to gradient 
            this.v[vIdx] -= gradP * this.dt * this.pressureScale;
          }
        }
      }
    }

    // Add this AFTER applying pressure to velocities
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n * n; j++) {
        if (this.u[j] !== undefined) {
          // Scale velocity based on gas constant (more dramatic effect)
          this.u[j] *= 1.0 + (this.gasConstant - 1.0) * 0.1;
        }
        if (this.v[j] !== undefined) {
          // Scale velocity based on gas constant (more dramatic effect)
          this.v[j] *= 1.0 + (this.gasConstant - 1.0) * 0.1;
        }
      }
    }

    // Add Direct Parameter Effect - creates visible difference
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n * n; j++) {
        if (this.u[j] !== undefined) {
          // Directly scale velocities with gas constant
          const gasEffect = Math.max(0.8, Math.min(1.5, this.gasConstant / 50));
          this.u[j] *= gasEffect;
        }
        if (this.v[j] !== undefined) {
          // Directly scale velocities with gas constant
          const gasEffect = Math.max(0.8, Math.min(1.5, this.gasConstant / 50));
          this.v[j] *= gasEffect;
        }
      }
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
          // Make this a softer drop-off
          const factor = Math.pow(
            1 - (dist - this.radius * 0.9) / (this.radius * 0.2), // Changed from 0.1 to 0.2
            1.5 // Changed from 2 to 1.5 for a gentler curve
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

  setParameters(restDensity, gasConstant) {
    this.restDensity = restDensity;
    this.gasConstant = gasConstant;

    // Use a more conservative scaling that maintains visible effects
    // without causing instability
    this.pressureScale = 0.05 * this.gasConstant / Math.max(0.5, this.restDensity);

    console.log(`Pressure scale: ${this.pressureScale} (from gasConstant=${this.gasConstant}, restDensity=${this.restDensity})`);
  }

  // Fix the interpolateVelocity function with proper boundary checking
  interpolateVelocity(x, y) {
    const n = this.gridSize;
    const h = this.h;

    // Force coordinates to stay well within grid bounds (2 cells in from edge)
    const gx = Math.min(Math.max(Math.floor(x / h), 1), n - 3);
    const gy = Math.min(Math.max(Math.floor(y / h), 1), n - 3);

    // Safe grid access with bounds checks
    const getU = (i, j) => {
      if (i < 0 || i >= n || j < 0 || j >= n) return 0;
      return this.u[i * n + j] || 0;
    };

    const getV = (i, j) => {
      if (i < 0 || i >= n || j < 0 || j >= n) return 0;
      return this.v[i * n + j] || 0;
    };

    // Calculate fractional position within cell
    const fx = (x / h) - gx;
    const fy = (y / h) - gy;

    // Safely get velocity values with bounds checking
    const u00 = getU(gy, gx);
    const u01 = getU(gy, gx + 1);
    const u10 = getU(gy + 1, gx);
    const u11 = getU(gy + 1, gx + 1);

    const v00 = getV(gy, gx);
    const v01 = getV(gy, gx + 1);
    const v10 = getV(gy + 1, gx);
    const v11 = getV(gy + 1, gx + 1);

    // Bilinear interpolation as before
    const vx = (1 - fx) * (1 - fy) * u00 +
      fx * (1 - fy) * u01 +
      (1 - fx) * fy * u10 +
      fx * fy * u11;

    const vy = (1 - fx) * (1 - fy) * v00 +
      fx * (1 - fy) * v01 +
      (1 - fx) * fy * v10 +
      fx * fy * v11;

    // Velocity magnitude clamping to prevent explosions
    const maxVelocity = 1.0;
    const vMag = Math.sqrt(vx * vx + vy * vy);

    if (vMag > maxVelocity) {
      return [vx / vMag * maxVelocity, vy / vMag * maxVelocity];
    }

    return [vx, vy];
  }
}

export { FluidFLIP };
