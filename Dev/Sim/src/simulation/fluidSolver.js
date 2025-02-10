class FluidSolver {
  constructor(width, height) {
    // Grid layout parameters
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.width = width;
    this.height = height;
    this.cells = this.rowCounts.reduce((sum, count) => sum + count, 0);
    this.timeStep = 1 / 60;

    // Initialize arrays for velocity and pressure
    this.velocityX = new Float32Array(this.cells);
    this.velocityY = new Float32Array(this.cells);
    this.pressure = new Float32Array(this.cells);
    this.divergence = new Float32Array(this.cells);

    // Temporary arrays for advection
    this.tempX = new Float32Array(this.cells);
    this.tempY = new Float32Array(this.cells);

    // Initialize particles array
    this.particles = [];

    // Physics parameters
    this.gravity = 9.8; // Gravity force
    this.timeStep = 1 / 60;

    console.log("FluidSolver initialized:", {
      dimensions: `${width}x${height}`,
      cells: this.cells,
      timeStep: this.timeStep,
    });
  }

  isCellInBounds(x, y) {
    if (y < 0 || y >= this.rowCounts.length) return false;

    const rowWidth = this.rowCounts[y];
    const rowStart = Math.floor((this.width - rowWidth) / 2);
    const rowEnd = rowStart + rowWidth;

    // Check both row bounds and circular boundary
    if (x < rowStart || x >= rowEnd) return false;

    // Additional circular boundary check
    const dx = x - this.width / 2;
    const dy = y - this.height / 2;
    const maxRadius = Math.min(this.width, this.height * 2) * 0.4;

    return dx * dx + dy * dy <= maxRadius * maxRadius;
  }

  getCellIndex(x, y) {
    if (!this.isCellInBounds(x, y)) return -1;
    let index = 0;
    for (let row = 0; row < y; row++) {
      index += this.rowCounts[row];
    }
    const rowStart = (this.width - this.rowCounts[y]) / 2;
    return index + (x - rowStart);
  }

  initializeParticles(count) {
    this.particles = new Float32Array(count * 2);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxRadius = Math.min(this.width, this.height * 2) * 0.4; // Slightly smaller radius

    let particleCount = 0;
    const maxAttempts = count * 2; // Prevent infinite loops
    let attempts = 0;

    while (particleCount < count && attempts < maxAttempts) {
      // Generate random angle and radius (sqrt for uniform distribution)
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * maxRadius;

      // Convert to Cartesian coordinates
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      // Check if position is valid
      if (this.isCellInBounds(Math.floor(x), Math.floor(y))) {
        this.particles[particleCount * 2] = x;
        this.particles[particleCount * 2 + 1] = y;
        particleCount++;
      }
      attempts++;
    }

    console.log(`Initialized ${particleCount} particles`);
  }

  // Get array index from grid coordinates
  IX(x, y) {
    return x + y * this.width;
  }

  // Basic simulation step
  step() {
    // Apply external forces
    this.applyGravity();

    // Update velocity fields
    this.advect();
    this.project();

    // Move particles
    this.moveParticles();

    console.log("Solver step complete");
  }

  moveParticles() {
    if (!this.particles || this.particles.length === 0) return;

    const dt = this.timeStep;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height * 2) * 0.47;

    for (let i = 0; i < this.particles.length; i += 2) {
      let x = this.particles[i];
      let y = this.particles[i + 1];

      const cellX = Math.floor(x);
      const cellY = Math.floor(y);

      if (this.isCellInBounds(cellX, cellY)) {
        const idx = this.getCellIndex(cellX, cellY);
        if (idx !== -1) {
          // Update position
          x += this.velocityX[idx] * dt;
          y += (this.velocityY[idx] + this.gravity) * dt;

          // Check circular boundary
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > radius) {
            // Calculate bounce on circular boundary
            const angle = Math.atan2(dy, dx);
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);

            // Position on boundary
            x = centerX + nx * radius * 0.99; // Slight inset
            y = centerY + ny * radius * 0.99;

            // Reflect velocity
            const dot = this.velocityX[idx] * nx + this.velocityY[idx] * ny;
            this.velocityX[idx] -= 2 * dot * nx * 0.5; // 0.5 for damping
            this.velocityY[idx] -= 2 * dot * ny * 0.5;
          }

          this.particles[i] = x;
          this.particles[i + 1] = y;
        }
      }
    }
  }

  constrainParticle(i) {
    let x = this.particles[i];
    let y = this.particles[i + 1];

    // Keep trying positions until we find one in bounds
    let attempts = 0;
    while (!this.isCellInBounds(Math.floor(x), Math.floor(y)) && attempts < 4) {
      if (x < 0) x = 0;
      if (x >= this.width) x = this.width - 0.01;
      if (y < 0) y = 0;
      if (y >= this.height) y = this.height - 0.01;
      attempts++;
    }

    this.particles[i] = x;
    this.particles[i + 1] = y;
  }

  applyForces() {
    const dt = this.timeStep;

    // Apply gravity to vertical velocity field
    for (let i = 0; i < this.numCells; i++) {
      if (this.s[i] !== 1.0) {
        // Skip solid cells
        this.v[i] += this.gravity * dt;
      }
    }
  }

  applyForce(x, y, forceX, forceY) {
    // Convert screen coordinates to grid coordinates
    const gridX = Math.floor(x * this.width);
    const gridY = Math.floor(y * this.height);

    if (this.isCellInBounds(gridX, gridY)) {
      const index = this.getCellIndex(gridX, gridY);
      this.velocityX[index] += forceX;
      this.velocityY[index] += forceY;
    }
  }

  applyGravity() {
    for (let y = 0; y < this.height; y++) {
      const rowWidth = this.rowCounts[y];
      const rowStart = Math.floor((this.width - rowWidth) / 2);

      for (let x = 0; x < rowWidth; x++) {
        const idx = this.getCellIndex(x + rowStart, y);
        if (idx !== -1) {
          this.velocityY[idx] += this.gravity * this.timeStep;
        }
      }
    }
  }

  project() {
    // Calculate divergence
    for (let y = 0; y < this.height; y++) {
      const rowWidth = this.rowCounts[y];
      const rowStart = Math.floor((this.width - rowWidth) / 2);

      for (let x = 0; x < rowWidth; x++) {
        const idx = this.getCellIndex(x + rowStart, y);
        if (idx === -1) continue;

        // Get neighboring cells
        const left = this.getCellIndex(x + rowStart - 1, y);
        const right = this.getCellIndex(x + rowStart + 1, y);
        const top = this.getCellIndex(x + rowStart, y - 1);
        const bottom = this.getCellIndex(x + rowStart, y + 1);

        // Calculate divergence
        let div = 0;
        if (right !== -1) div += this.velocityX[right];
        if (left !== -1) div -= this.velocityX[left];
        if (bottom !== -1) div += this.velocityY[bottom];
        if (top !== -1) div -= this.velocityY[top];

        this.divergence[idx] = div;
        this.pressure[idx] = 0;
      }
    }

    // Solve pressure
    for (let i = 0; i < 20; i++) {
      for (let y = 0; y < this.height; y++) {
        const rowWidth = this.rowCounts[y];
        const rowStart = Math.floor((this.width - rowWidth) / 2);

        for (let x = 0; x < rowWidth; x++) {
          const idx = this.getCellIndex(x + rowStart, y);
          if (idx === -1) continue;

          // Get neighboring pressures
          let pressure = 0;
          let count = 0;

          const neighbors = [
            this.getCellIndex(x + rowStart - 1, y),
            this.getCellIndex(x + rowStart + 1, y),
            this.getCellIndex(x + rowStart, y - 1),
            this.getCellIndex(x + rowStart, y + 1),
          ];

          for (const nIdx of neighbors) {
            if (nIdx !== -1) {
              pressure += this.pressure[nIdx];
              count++;
            }
          }

          if (count > 0) {
            this.pressure[idx] = (pressure - this.divergence[idx]) / count;
          }
        }
      }
    }

    // Apply pressure
    for (let y = 0; y < this.height; y++) {
      const rowWidth = this.rowCounts[y];
      const rowStart = Math.floor((this.width - rowWidth) / 2);

      for (let x = 0; x < rowWidth; x++) {
        const idx = this.getCellIndex(x + rowStart, y);
        if (idx === -1) continue;

        const left = this.getCellIndex(x + rowStart - 1, y);
        const right = this.getCellIndex(x + rowStart + 1, y);
        const top = this.getCellIndex(x + rowStart, y - 1);
        const bottom = this.getCellIndex(x + rowStart, y + 1);

        if (right !== -1)
          this.velocityX[idx] -= this.pressure[right] - this.pressure[idx];
        if (bottom !== -1)
          this.velocityY[idx] -= this.pressure[bottom] - this.pressure[idx];
      }
    }
  }

  advect() {
    // Copy current velocities
    this.tempX.set(this.velocityX);
    this.tempY.set(this.velocityY);

    const dt = this.timeStep;

    for (let y = 0; y < this.height; y++) {
      const rowWidth = this.rowCounts[y];
      const rowStart = Math.floor((this.width - rowWidth) / 2);

      for (let x = 0; x < rowWidth; x++) {
        const idx = this.getCellIndex(x + rowStart, y);
        if (idx === -1) continue;

        // Backtrace
        const px = x + rowStart - this.tempX[idx] * dt;
        const py = y - this.tempY[idx] * dt;

        // Get interpolated velocity
        this.velocityX[idx] = this.sampleField(px, py, this.tempX);
        this.velocityY[idx] = this.sampleField(px, py, this.tempY);
      }
    }
  }

  sampleField(x, y, field) {
    // Get cell coordinates
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    // Get interpolation factors
    const sx = x - x0;
    const sy = y - y0;

    // Get cell indices
    const i00 = this.getCellIndex(x0, y0);
    const i10 = this.getCellIndex(x1, y0);
    const i01 = this.getCellIndex(x0, y1);
    const i11 = this.getCellIndex(x1, y1);

    // Interpolate values
    let value = 0;
    let weight = 0;

    if (i00 !== -1) {
      value += field[i00] * (1 - sx) * (1 - sy);
      weight += (1 - sx) * (1 - sy);
    }
    if (i10 !== -1) {
      value += field[i10] * sx * (1 - sy);
      weight += sx * (1 - sy);
    }
    if (i01 !== -1) {
      value += field[i01] * (1 - sx) * sy;
      weight += (1 - sx) * sy;
    }
    if (i11 !== -1) {
      value += field[i11] * sx * sy;
      weight += sx * sy;
    }

    return weight > 0 ? value / weight : 0;
  }

  interpolate(x, y, field) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const fx = x - x0;
    const fy = y - y0;

    const v00 = field[this.IX(x0, y0)];
    const v10 = field[this.IX(x1, y0)];
    const v01 = field[this.IX(x0, y1)];
    const v11 = field[this.IX(x1, y1)];

    return (
      (1 - fx) * ((1 - fy) * v00 + fy * v01) + fx * ((1 - fy) * v10 + fy * v11)
    );
  }

  // Verification methods
  verifyState() {
    return {
      velocityBounds: this.checkVelocityBounds(),
      pressureBounds: this.checkPressureBounds(),
      boundaryConditions: this.checkBoundaryConditions(),
    };
  }

  checkVelocityBounds() {
    const maxVel = 100.0; // Maximum allowed velocity
    for (let i = 0; i < this.numCells; i++) {
      if (Math.abs(this.u[i]) > maxVel || Math.abs(this.v[i]) > maxVel) {
        console.error("Velocity exceeds bounds at cell:", i);
        return false;
      }
    }
    return true;
  }

  checkPressureBounds() {
    const maxPressure = 1000.0; // Maximum allowed pressure
    for (let i = 0; i < this.numCells; i++) {
      if (Math.abs(this.p[i]) > maxPressure) {
        console.error("Pressure exceeds bounds at cell:", i);
        return false;
      }
    }
    return true;
  }

  checkBoundaryConditions() {
    // Check if boundaries are properly enforced
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.s[this.IX(x, y)] === 1.0) {
          if (this.u[this.IX(x, y)] !== 0.0 || this.v[this.IX(x, y)] !== 0.0) {
            console.error("Boundary violation at:", x, y);
            return false;
          }
        }
      }
    }
    return true;
  }

  // Debug methods
  getDebugInfo() {
    return {
      gridSize: {
        width: this.width,
        height: this.height,
        cells: this.numCells,
      },
      parameters: {
        density: this.density,
        timeStep: this.timeStep,
        iterations: this.numIterations,
      },
      stats: {
        maxVelocityU: Math.max(...this.u),
        maxVelocityV: Math.max(...this.v),
        maxPressure: Math.max(...this.p),
        solidCells: this.s.filter((x) => x === 1.0).length,
      },
    };
  }
}

export { FluidSolver };
