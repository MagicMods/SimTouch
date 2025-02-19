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
    if (!particleSystem) return this.values;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.values;

    // Constants
    const tune = 0.15;
    const radius = 20;
    const radiusSq = radius * radius;

    // Pre-calculate particle positions and cells
    const particleData = particles.map((p, idx) => {
      const px = p.x * this.TARGET_WIDTH;
      const py = (1 - p.y) * this.TARGET_HEIGHT;

      // Use gridMap to find cell (maintain correct coordinate system)
      const cell = this.gridMap.find((cell) => cell.contains(px, py));

      return {
        x: px,
        y: py,
        idx,
        cellIndex: cell ? cell.index : -1,
      };
    });

    // Group by cells (using correct grid indices)
    const cellMap = new Map();
    particleData.forEach((p) => {
      if (p.cellIndex !== -1) {
        if (!cellMap.has(p.cellIndex)) {
          cellMap.set(p.cellIndex, []);
        }
        cellMap.get(p.cellIndex).push(p);
      }
    });

    // Process cells
    this.gridMap.forEach((cell) => {
      const particlesInCell = cellMap.get(cell.index) || [];
      let totalProximity = 0;

      if (particlesInCell.length > 0) {
        // Find neighboring cells using gridMap
        const neighbors = this.gridMap.filter(
          (other) =>
            Math.abs(other.bounds.x - cell.bounds.x) <= radius &&
            Math.abs(other.bounds.y - cell.bounds.y) <= radius
        );

        // Calculate proximities
        particlesInCell.forEach((p1) => {
          neighbors.forEach((neighbor) => {
            const neighborParticles = cellMap.get(neighbor.index) || [];
            neighborParticles.forEach((p2) => {
              if (p1.idx === p2.idx) return;

              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const distSq = dx * dx + dy * dy;

              if (distSq < radiusSq) {
                totalProximity += 1 - distSq / radiusSq;
              }
            });
          });
        });

        this.values[cell.index] =
          (totalProximity / particlesInCell.length) * tune;
      }
    });

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

    // // Debug output
    // console.log(
    //   "Density calculation:",
    //   JSON.stringify(
    //     {
    //       mode: this.currentMode,
    //       particles: particles.length,
    //       nonZeroCells: this.values.filter((v) => v > 0).length,
    //       maxDensity: Math.max(...this.values),
    //     },
    //     null,
    //     2
    //   )
    // );

    return this.values;
  }

  calculateVelocity(particleSystem) {
    this.values.fill(0);
    if (!particleSystem) return this.values;
    const tune = 50;
    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.values;

    // Track particle counts for averaging
    const counts = new Float32Array(this.values.length).fill(0);

    particles.forEach((particle) => {
      // Convert to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Find cell using gridMap
      const cell = this.gridMap.find((cell) => cell.contains(px, py));
      if (cell) {
        // Calculate particle speed
        const speed = Math.sqrt(
          particle.vx * particle.vx + particle.vy * particle.vy
        );

        // Accumulate speeds for averaging
        this.values[cell.index] += speed * tune;
        counts[cell.index]++;
      }
    });

    // Calculate average speeds
    for (let i = 0; i < this.values.length; i++) {
      if (counts[i] > 0) {
        this.values[i] /= counts[i];
      }
    }

    // // Debug output
    // console.log(
    //   "Velocity calculation:",
    //   JSON.stringify(
    //     {
    //       mode: this.currentMode,
    //       particles: particles.length,
    //       nonZeroCells: this.values.filter((v) => v > 0).length,
    //       maxVelocity: Math.max(...this.values),
    //       firstFiveValues: Array.from(this.values.slice(0, 5)),
    //     },
    //     null,
    //     2
    //   )
    // );

    return this.values;
  }
  calculatePressure(particleSystem) {
    this.values.fill(0);
    if (!particleSystem) return this.values;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.values;

    // Track particle counts for pressure calculation
    const counts = new Float32Array(this.values.length).fill(0);
    const tune = 0.1; // Pressure sensitivity

    particles.forEach((particle) => {
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      const cell = this.gridMap.find((cell) => cell.contains(px, py));
      if (cell) {
        counts[cell.index]++;
      }
    });

    // Calculate pressure from particle density
    for (let i = 0; i < counts.length; i++) {
      this.values[i] = Math.pow(counts[i], 2) * tune;
    }

    return this.values;
  }

  calculateVorticity(particleSystem) {
    this.values.fill(0);
    if (!particleSystem) return this.values;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.values;

    // Track angular velocity components
    const angularVel = new Float32Array(this.values.length).fill(0);
    const counts = new Float32Array(this.values.length).fill(0);
    const tune = 2500.0; // Vorticity sensitivity

    particles.forEach((particle) => {
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      const cell = this.gridMap.find((cell) => cell.contains(px, py));
      if (cell) {
        // Calculate curl (2D vorticity)
        const curl = particle.vx * particle.vy;
        angularVel[cell.index] += curl;
        counts[cell.index]++;
      }
    });

    // Calculate average vorticity
    for (let i = 0; i < this.values.length; i++) {
      if (counts[i] > 0) {
        this.values[i] = (angularVel[i] / counts[i]) * tune;
      }
    }

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
