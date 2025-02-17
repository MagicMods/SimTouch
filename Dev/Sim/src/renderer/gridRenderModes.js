// Add at the top of the file
export const GridField = {
  DENSITY: "Density",
  VELOCITY: "Velocity",
  PRESSURE: "Pressure",
  VORTICITY: "Vorticity",
  // Add more fields as needed
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

    // Debug output
    const nonZero = this.values.filter((v) => v > 0);
    console.log("Pressure calculation:", {
      nonZeroCells: nonZero.length,
      maxPressure: Math.max(...this.values),
      avgPressure: nonZero.length
        ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length
        : 0,
      densityRange: {
        min: Math.min(...density.filter((d) => d > 0)),
        max: Math.max(...density),
      },
    });

    return this.values;
  }

  getValues(particleSystem) {
    switch (this.currentMode) {
      case this.modes.DENSITY:
        return this.calculateDensity(particleSystem);
      case this.modes.VELOCITY:
        return this.calculateVelocity(particleSystem);
      case this.modes.PRESSURE:
        return this.calculatePressure(particleSystem);
      default:
        console.warn("Unsupported render mode:", this.currentMode);
        return this.values;
    }
  }
}

export { GridRenderModes };
