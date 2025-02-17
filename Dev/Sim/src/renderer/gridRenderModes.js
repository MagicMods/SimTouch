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

    // Initialize modes
    this.modes = {
      DENSITY: "Density",
      PRESSURE: "Pressure",
      VELOCITY: "Velocity",
    };
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

    // Debug output
    const nonZero = this.values.filter((v) => v > 0);
    console.log("Density calculation:", {
      nonZeroCells: nonZero.length,
      maxValue: Math.max(...this.values),
      minValue: Math.min(...nonZero),
    });

    return this.values;
  }

  getValues(particleSystem) {
    switch (this.currentMode) {
      case this.modes.DENSITY:
        return this.calculateDensity(particleSystem);
      default:
        console.warn("Unsupported render mode:", this.currentMode);
        return this.values;
    }
  }
}

export { GridRenderModes };
