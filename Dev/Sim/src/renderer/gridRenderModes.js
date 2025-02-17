// Add at the top of the file
export const GridField = {
  DENSITY: "Density",
  VELOCITY: "Velocity",
  PRESSURE: "Pressure",
  VORTICITY: "Vorticity",
  COLLISION: "Collision", // New field
};

class GridRenderModes {
  constructor(geometryInfo) {
    // Grid layout info
    this.rowCounts = geometryInfo.rowCounts;
    this.numX = geometryInfo.numX;
    this.numY = geometryInfo.numY;
    this.stepX = geometryInfo.stepX;
    this.stepY = geometryInfo.stepY;

    // Canvas info needed for coordinate transformation
    this.canvas = geometryInfo.canvas;

    // Update modes to use enum
    this.modes = GridField;
    this.currentMode = this.modes.DENSITY;

    // Create value buffer
    this.values = new Float32Array(this.getTotalCells());

    // Debug init info
    console.log("GridRenderModes initialized:", {
      cells: this.getTotalCells(),
      dimensions: { numX: this.numX, numY: this.numY },
      canvas: this.canvas ? "present" : "missing",
    });
  }

  getTotalCells() {
    return this.rowCounts.reduce((sum, count) => sum + count, 0);
  }

  getCellIndex(col, row) {
    if (
      row < 0 ||
      row >= this.rowCounts.length ||
      col < 0 ||
      col >= this.rowCounts[row]
    ) {
      return -1;
    }

    let index = 0;
    for (let i = 0; i < row; i++) {
      index += this.rowCounts[i];
    }
    return index + col;
  }

  calculateDensity(particleSystem) {
    this.values.fill(0);
    const particles = particleSystem.getParticles();
    if (!particles || !particles.length) return this.values;

    for (const p of particles) {
      // Calculate grid cell influence
      const relY = (1 - p.y) * this.canvas.height;
      const row = Math.floor(relY / this.stepY);

      // Check neighboring rows
      for (
        let j = Math.max(0, row - 2);
        j < Math.min(this.numY, row + 3);
        j++
      ) {
        const rowWidth = this.rowCounts[j] * this.stepX;
        const rowBaseX = (this.canvas.width - rowWidth) / 2;
        const relX = p.x * this.canvas.width - rowBaseX;
        const col = Math.floor(relX / this.stepX);

        // Check neighboring cells
        for (
          let i = Math.max(0, col - 2);
          i < Math.min(this.rowCounts[j], col + 3);
          i++
        ) {
          const idx = this.getCellIndex(i, j);
          if (idx === -1) continue;

          // Calculate influence
          const cellCenterX = rowBaseX + (i + 0.5) * this.stepX;
          const cellCenterY = j * this.stepY + this.stepY * 0.5;
          const dx = p.x * this.canvas.width - cellCenterX;
          const dy = (1 - p.y) * this.canvas.height - cellCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / (this.stepX * 1.5));

          this.values[idx] += influence;
        }
      }
    }

    // // Debug output
    // const nonZero = this.values.filter((v) => v > 0);
    // console.log("Density calculation:", {
    //   nonZeroCells: nonZero.length,
    //   maxValue: Math.max(...this.values),
    //   minValue: Math.min(...nonZero),
    // });

    return this.values;
  }

  calculateVelocity(particleSystem) {
    // Initialize arrays
    const velocityX = new Float32Array(this.getTotalCells());
    const velocityY = new Float32Array(this.getTotalCells());
    const weights = new Float32Array(this.getTotalCells());
    this.values.fill(0);

    const particles = particleSystem.getParticles();
    // Access velocity directly from particle properties
    if (!particles || !particles.length) return this.values;

    // Accumulate velocities
    for (const p of particles) {
      // Calculate grid position
      const relY = (1 - p.y) * this.canvas.height;
      const row = Math.floor(relY / this.stepY);

      // Use particle velocity components
      const vx = p.vx || 0;
      const vy = p.vy || 0;

      // Rest of the accumulation logic...
      for (
        let j = Math.max(0, row - 2);
        j < Math.min(this.numY, row + 3);
        j++
      ) {
        const rowWidth = this.rowCounts[j] * this.stepX;
        const rowBaseX = (this.canvas.width - rowWidth) / 2;
        const relX = p.x * this.canvas.width - rowBaseX;
        const col = Math.floor(relX / this.stepX);

        // Check neighboring cells
        for (
          let i = Math.max(0, col - 2);
          i < Math.min(this.rowCounts[j], col + 3);
          i++
        ) {
          const idx = this.getCellIndex(i, j);
          if (idx === -1) continue;

          // Calculate weight based on distance
          const cellCenterX = rowBaseX + (i + 0.5) * this.stepX;
          const cellCenterY = j * this.stepY + this.stepY * 0.5;
          const dx = p.x * this.canvas.width - cellCenterX;
          const dy = (1 - p.y) * this.canvas.height - cellCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.max(0, 1 - dist / (this.stepX * 1.5));

          // Accumulate weighted velocities
          velocityX[idx] += vx * weight;
          velocityY[idx] += vy * weight;
          weights[idx] += weight * 0.1;
        }
      }
    }

    // Calculate final velocities and magnitudes
    for (let i = 0; i < this.values.length; i++) {
      if (weights[i] > 0) {
        const vx = velocityX[i] / weights[i];
        const vy = velocityY[i] / weights[i];
        this.values[i] = Math.sqrt(vx * vx + vy * vy);
      }
    }

    // // Debug output
    // const nonZero = this.values.filter((v) => v > 0);
    // console.log("Velocity calculation:", {
    //   nonZeroCells: nonZero.length,
    //   maxMagnitude: Math.max(...this.values),
    //   avgMagnitude: nonZero.reduce((a, b) => a + b, 0) / nonZero.length,
    // });

    return this.values;
  }

  calculatePressure(particleSystem) {
    // First get density field
    const density = [...this.calculateDensity(particleSystem)]; // Create copy of density values
    this.values.fill(0);

    const restDensity = 4.0; // Target density based on logs
    const pressureScale = 0.5; // Scale factor for visualization

    // Calculate pressure from density
    for (let i = 0; i < density.length; i++) {
      if (density[i] > 0) {
        // Convert density deviation to pressure
        const densityError = density[i] - restDensity;
        this.values[i] = Math.max(0, densityError * pressureScale);
      }
    }

    // // Debug output
    // const nonZero = this.values.filter((v) => v > 0);
    // console.log("Pressure calculation:", {
    //   nonZeroCells: nonZero.length,
    //   maxPressure: Math.max(...this.values),
    //   avgPressure: nonZero.length
    //     ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length
    //     : 0,
    //   densityRange: {
    //     min: Math.min(...density.filter((d) => d > 0)),
    //     max: Math.max(...density),
    //   },
    // });

    return this.values;
  }

  calculateVorticity(particleSystem) {
    // First get velocity components
    const velocityX = new Float32Array(this.getTotalCells());
    const velocityY = new Float32Array(this.getTotalCells());
    const weights = new Float32Array(this.getTotalCells());
    this.values.fill(0);

    const particles = particleSystem.getParticles();
    if (!particles || !particles.length) return this.values;

    // Step 1: Accumulate velocity components
    for (const p of particles) {
      const relY = (1 - p.y) * this.canvas.height;
      const row = Math.floor(relY / this.stepY);
      const vx = p.vx || 0;
      const vy = p.vy || 0;

      for (
        let j = Math.max(0, row - 2);
        j < Math.min(this.numY, row + 3);
        j++
      ) {
        const rowWidth = this.rowCounts[j] * this.stepX;
        const rowBaseX = (this.canvas.width - rowWidth) / 2;
        const relX = p.x * this.canvas.width - rowBaseX;
        const col = Math.floor(relX / this.stepX);

        for (
          let i = Math.max(0, col - 2);
          i < Math.min(this.rowCounts[j], col + 3);
          i++
        ) {
          const idx = this.getCellIndex(i, j);
          if (idx === -1) continue;

          const cellCenterX = rowBaseX + (i + 0.5) * this.stepX;
          const cellCenterY = j * this.stepY + this.stepY * 0.5;
          const dx = p.x * this.canvas.width - cellCenterX;
          const dy = (1 - p.y) * this.canvas.height - cellCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.max(0, 1 - dist / (this.stepX * 1.5));

          velocityX[idx] += vx * weight;
          velocityY[idx] += vy * weight;
          weights[idx] += weight;
        }
      }
    }

    // Step 2: Normalize velocities
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] > 0) {
        velocityX[i] /= weights[i];
        velocityY[i] /= weights[i];
      }
    }

    // Step 3: Calculate vorticity with adjusted scaling
    let maxVorticity = 0;
    const vorticityScale = 100.0; // Increase scale to get values in 0.1-1.0 range

    for (let row = 1; row < this.numY - 1; row++) {
      for (let col = 1; col < this.rowCounts[row] - 1; col++) {
        const idx = this.getCellIndex(col, row);
        if (idx === -1) continue;

        // Get neighboring indices
        const right = this.getCellIndex(col + 1, row);
        const left = this.getCellIndex(col - 1, row);
        const up = this.getCellIndex(col, row - 1);
        const down = this.getCellIndex(col, row + 1);

        if (right === -1 || left === -1 || up === -1 || down === -1) continue;

        // Calculate partial derivatives
        const dvx_dy = (velocityX[down] - velocityX[up]) / (2 * this.stepY);
        const dvy_dx = (velocityY[right] - velocityY[left]) / (2 * this.stepX);

        // Scale vorticity = ∂v_x/∂y - ∂v_y/∂x
        this.values[idx] = Math.abs(dvx_dy - dvy_dx) * vorticityScale;
        maxVorticity = Math.max(maxVorticity, this.values[idx]);
      }
    }

    // Normalize to [0,1] range
    const scale = maxVorticity > 0 ? 1.0 / maxVorticity : 1.0;
    for (let i = 0; i < this.values.length; i++) {
      this.values[i] *= scale;
    }

    // // Debug output
    // const nonZero = this.values.filter((v) => v > 0);
    // console.log("Vorticity calculation:", {
    //   nonZeroCells: nonZero.length,
    //   maxVorticity: maxVorticity,
    //   avgVorticity: nonZero.length
    //     ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length
    //     : 0,
    // });

    return this.values;
  }

  calculateCollision(particleSystem) {
    this.values.fill(0);
    const collisionSystem = particleSystem.collisionSystem;
    if (!collisionSystem) return this.values;

    const particles = particleSystem.particles;
    if (!particles || particles.length === 0) return this.values;

    // Adjusted parameters
    const scaledRadius = collisionSystem.particleRadius * 3; // Increased from 2
    const maxForceThreshold = collisionSystem.repulsion * 0.05; // Reduced from 0.1
    const forceDamping = 0.1; // New: damping factor for smoother visualization
    let maxCollisionForce = 0;

    // Spatial partitioning remains the same
    const gridMap = new Map();

    for (let i = 0; i < particles.length; i += 2) {
      const x = particles[i];
      const y = particles[i + 1];
      const cellKey = this.getCellIndex(
        Math.floor((x * this.canvas.width) / this.stepX),
        Math.floor(((1 - y) * this.canvas.height) / this.stepY)
      );

      if (cellKey !== -1) {
        if (!gridMap.has(cellKey)) gridMap.set(cellKey, []);
        gridMap.get(cellKey).push(i);
      }
    }

    // Process cells with damped forces
    for (const [cellIdx, particleIndices] of gridMap.entries()) {
      let cellForce = 0;

      for (let i = 0; i < particleIndices.length; i++) {
        const idx1 = particleIndices[i];
        const x1 = particles[idx1];
        const y1 = particles[idx1 + 1];

        for (let j = i + 1; j < particleIndices.length; j++) {
          const idx2 = particleIndices[j];
          const x2 = particles[idx2];
          const y2 = particles[idx2 + 1];

          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.hypot(dx, dy);

          if (dist < scaledRadius) {
            const force =
              (1 - dist / scaledRadius) *
              collisionSystem.repulsion *
              forceDamping;
            if (force > maxForceThreshold) {
              cellForce += force;
            }
          }
        }
      }

      if (cellForce > 0) {
        this.values[cellIdx] = cellForce;
        maxCollisionForce = Math.max(maxCollisionForce, cellForce);
      }
    }

    // Normalize with adjusted range
    if (maxCollisionForce > 0) {
      const minForce = maxCollisionForce * 0.05; // Reduced from 0.1
      for (let i = 0; i < this.values.length; i++) {
        if (this.values[i] < minForce) {
          this.values[i] = 0;
        } else {
          this.values[i] = Math.min(1.0, this.values[i] / maxCollisionForce);
        }
      }
    }

    return this.values;
  }

  // Helper to convert particle position to grid cell index
  getGridCell(x, y) {
    const relY = (1 - y) * this.canvas.height;
    const row = Math.floor(relY / this.stepY);

    const rowWidth = this.rowCounts[row] * this.stepX;
    const rowBaseX = (this.canvas.width - rowWidth) / 2;
    const relX = x * this.canvas.width - rowBaseX;
    const col = Math.floor(relX / this.stepX);

    return this.getCellIndex(col, row);
  }

  getValues(particleSystem) {
    switch (this.currentMode) {
      case this.modes.DENSITY:
        return this.calculateDensity(particleSystem);
      case this.modes.VELOCITY:
        return this.calculateVelocity(particleSystem);
      case this.modes.PRESSURE:
        return this.calculatePressure(particleSystem);
      case this.modes.VORTICITY:
        return this.calculateVorticity(particleSystem);
      case this.modes.COLLISION:
        return this.calculateCollision(particleSystem);
      default:
        console.warn("Unsupported render mode:", this.currentMode);
        return this.values;
    }
  }
}

export { GridRenderModes };
