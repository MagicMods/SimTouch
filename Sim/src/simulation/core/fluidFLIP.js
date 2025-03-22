class FluidFLIP {
  constructor({
    gridSize = 64,
    picFlipRatio = 0.95,
    dt = 1 / 60,
    iterations = 20,
    overRelaxation = 1.5,
    boundary = null,
    restDensity = 1.0,
    particleSystem = null,
    // Remove gasConstant parameter
    ...params
  } = {}) {
    this.gridSize = gridSize;
    this.h = 1.0 / gridSize;
    this.picFlipRatio = picFlipRatio;
    this.dt = dt;
    this.iterations = iterations;
    this.overRelaxation = overRelaxation;
    this.boundary = boundary;
    this.restDensity = restDensity;
    this.particleSystem = particleSystem;
    // Remove gasConstant property

    // Initialize simulation arrays
    const size = gridSize * gridSize;
    this.u = new Array(size).fill(0);
    this.v = new Array(size).fill(0);
    this.newU = new Array(size).fill(0);
    this.newV = new Array(size).fill(0);
    this.pressure = new Array(size).fill(0);
    this.divergence = new Array(size).fill(0);
    this.solid = new Array(size).fill(false);

    // Initialize boundary conditions
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
    const n = this.gridSize;
    const h = this.h;

    // Reset grid velocities to zero first
    // REPLACE the .set() calls with direct array filling
    for (let i = 0; i < this.u.length; i++) {
      this.u[i] = 0;
    }

    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = 0;
    }

    // Also zero out cell weights
    const cellU = new Array(this.u.length).fill(0);
    const cellV = new Array(this.v.length).fill(0);

    // Transfer particle velocities to grid
    for (let i = 0; i < particles.length / 2; i++) {
      const x = particles[i * 2];
      const y = particles[i * 2 + 1];

      if (x < 0 || x >= 1 || y < 0 || y >= 1) continue;

      // Get grid cell coordinates
      const gx = Math.floor(x / h);
      const gy = Math.floor(y / h);

      // Safety check before accessing array
      if (gx >= 0 && gx < n && gy >= 0 && gy < n) {
        const idx = gy * n + gx;
        this.u[idx] += velocitiesX[i];
        this.v[idx] += velocitiesY[i];
        cellU[idx] += 1;
        cellV[idx] += 1;
      }
    }

    // Normalize grid velocities
    for (let i = 0; i < n * n; i++) {
      if (cellU[i] > 0) this.u[i] /= cellU[i];
      if (cellV[i] > 0) this.v[i] /= cellV[i];
    }
  }

  transferToParticles(particles, velocitiesX, velocitiesY) {
    const n = this.gridSize;
    const h = this.h;

    // Get dragged particle if any
    const draggedIndex = this.particleSystem?.draggedParticleIndex ?? -1;

    // Get maximum velocity from particle system or use default
    const maxVelocity = this.particleSystem?.maxVelocity ?? 0.05;

    for (let i = 0; i < particles.length / 2; i++) {
      // Skip dragged particles
      if (i === draggedIndex) continue;

      const x = particles[i * 2];
      const y = particles[i * 2 + 1];

      // Skip out-of-bounds particles
      if (x < 0 || x >= 1 || y < 0 || y >= 1) continue;

      // Get grid cell containing particle
      const gx = Math.min(Math.max(Math.floor(x * n), 0), n - 1);
      const gy = Math.min(Math.max(Math.floor(y * n), 0), n - 1);

      // Get grid velocities
      const center = gy * n + gx;
      const gridVx = this.u[center] || 0;
      const gridVy = this.v[center] || 0;

      // Store old velocities
      const oldVx = velocitiesX[i];
      const oldVy = velocitiesY[i];

      // CORRECT PIC/FLIP IMPLEMENTATION (without gas effect)
      if (this.picFlipRatio <= 0) {
        // Pure FLIP - use velocity changes
        velocitiesX[i] = oldVx + gridVx;
        velocitiesY[i] = oldVy + gridVy;
      }
      else if (this.picFlipRatio >= 1.0) {
        // Pure PIC - use grid velocity directly
        velocitiesX[i] = gridVx;
        velocitiesY[i] = gridVy;
      }
      else {
        // Blend PIC and FLIP
        const picVx = gridVx;
        const picVy = gridVy;
        const flipVx = oldVx + gridVx;
        const flipVy = oldVy + gridVy;

        velocitiesX[i] = this.picFlipRatio * picVx + (1 - this.picFlipRatio) * flipVx;
        velocitiesY[i] = this.picFlipRatio * picVy + (1 - this.picFlipRatio) * flipVy;
      }

      // Velocity clamping to prevent instability
      velocitiesX[i] = Math.max(-maxVelocity, Math.min(maxVelocity, velocitiesX[i]));
      velocitiesY[i] = Math.max(-maxVelocity, Math.min(maxVelocity, velocitiesY[i]));
    }

    // Apply rest density effect only if rest density is significant
    if (this.restDensity > 0.01) {
      this.applyRestDensityEffect(particles, velocitiesX, velocitiesY);
    }
  }

  applyRestDensityEffect(particles, velocitiesX, velocitiesY) {
    // Rest density controls particle spacing preference
    // Lower rest density = more spacing between particles
    const restEffect = 1.0 / Math.max(0.01, this.restDensity);
    const repulsionStrength = 0.002 * restEffect;

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

    // console.log(`Effective pressure coefficient: ${pressureCoefficient}`);

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

  // Simplify setParameters to only handle rest density
  setParameters(restDensity) {
    this.restDensity = restDensity;
    // console.log(`Rest density set to: ${this.restDensity}`);
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
    const maxVelocity = this.particleSystem?.maxVelocity ?? 1.0;
    const vMag = Math.sqrt(vx * vx + vy * vy);

    if (vMag > maxVelocity) {
      return [vx / vMag * maxVelocity, vy / vMag * maxVelocity];
    }

    return [vx, vy];
  }
}

export { FluidFLIP };
