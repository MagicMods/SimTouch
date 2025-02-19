// Add at the top of the file
export const GridField = {
  PROXIMITY: "Proximity",
  DENSITY: "Density",
  VELOCITY: "Velocity",
  PRESSURE: "Pressure",
  VORTICITY: "Vorticity",
  COLLISION: "Collision", // New field
};

class GridRenderModes {
  constructor({ gridParams, gridGeometry, gridMap, canvas, coordTransforms }) {
    this.gridParams = gridParams;
    this.gridGeometry = gridGeometry;
    this.gridMap = gridMap;
    this.canvas = canvas;
    this.coordTransforms = coordTransforms;

    // Fixed target resolution (must match GridRenderer)
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;

    // Create value buffer
    this.values = new Float32Array(gridParams.target);

    // Modes configuration
    this.modes = GridField;
    this.currentMode = this.modes.DENSITY; // Start with Density mode

    console.log(
      "GridRenderModes initialized with new params:",
      JSON.stringify(
        {
          cells: gridParams.target,
          dimensions: {
            cols: gridParams.cols,
            rows: gridParams.rows,
          },
        },
        null,
        2
      )
    );
  }

  calculateProximity(particleSystem) {
    this.values.fill(0);
    return this.values;
  }

  calculateDensity(particleSystem) {
    this.values.fill(0);
    if (!particleSystem) return this.values;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.values;

    particles.forEach((particle) => {
      // Convert to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Find cell using gridMap
      const cell = this.gridMap.find((cell) => cell.contains(px, py));
      if (cell) {
        this.values[cell.index]++;
      }
    });

    // Debug output
    console.log(
      "Density calculation:",
      JSON.stringify(
        {
          mode: this.currentMode,
          particles: particles.length,
          nonZeroCells: this.values.filter((v) => v > 0).length,
          maxDensity: Math.max(...this.values),
        },
        null,
        2
      )
    );

    return this.values;
  }

  calculateVelocity(particleSystem) {
    this.values.fill(0);
    return this.values;
  }

  calculatePressure(particleSystem) {
    this.values.fill(0);
    return this.values;
  }

  calculateVorticity(particleSystem) {
    this.values.fill(0);
    return this.values;
  }

  calculateCollision(particleSystem) {
    this.values.fill(0);
    return this.values;
  }

  getValues(particleSystem) {
    switch (this.currentMode) {
      case this.modes.PROXIMITY:
        return this.calculateProximity(particleSystem);
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
