export const GridField = {
  PROXIMITY: "Proximity",
  DENSITY: "Density",
  VELOCITY: "Velocity",
  PRESSURE: "Pressure",
  VORTICITY: "Vorticity",
  COLLISION: "Collision",
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
    this.targetValues = new Float32Array(gridParams.target);
    this.currentValues = new Float32Array(gridParams.target);

    // Smoothing configuration
    this.smoothing = {
      enabled: true,
      rateIn: 0.15, // Speed to reach target (higher = faster)
      rateOut: 0.08, // Speed to return to zero (lower = smoother)
      threshold: 0.001, // Minimum change threshold
    };

    // Modes configuration
    this.modes = GridField;
    this.currentMode = this.modes.PROXIMITY; // Start with Density mode

    console.log(
      "GridRenderModes initialized with new params:",
      JSON.stringify(
        {
          cells: gridParams.target,
          dimensions: {
            cols: gridParams.cols,
            rows: gridParams.rows,
          },
          smoothing: this.smoothing,
        },
        null,
        2
      )
    );
  }

  updateGrid({ gridParams, gridGeometry, gridMap }) {
    this.gridParams = gridParams;
    this.gridGeometry = gridGeometry;
    this.gridMap = gridMap;

    // Resize value buffer if needed
    if (this.values.length !== gridParams.target) {
      this.values = new Float32Array(gridParams.target);
      this.targetValues = new Float32Array(gridParams.target);
      this.currentValues = new Float32Array(gridParams.target);
    }
  }

  getValues(particleSystem) {
    // Calculate new target values
    this.calculateTargetValues(particleSystem);

    // Apply smoothing if enabled
    if (this.smoothing.enabled) {
      this.smoothValues();
      return this.currentValues;
    }

    // Otherwise return target values directly
    return this.targetValues;
  }

  calculateTargetValues(particleSystem) {
    switch (this.currentMode) {
      case this.modes.PROXIMITY:
        this.calculateProximity(particleSystem);
        break;
      case this.modes.DENSITY:
        this.calculateDensity(particleSystem);
        break;
      case this.modes.VELOCITY:
        this.calculateVelocity(particleSystem);
        break;
      case this.modes.PRESSURE:
        this.calculatePressure(particleSystem);
        break;
      case this.modes.VORTICITY:
        this.calculateVorticity(particleSystem);
        break;
      case this.modes.COLLISION:
        this.calculateCollision(particleSystem);
        break;
      default:
        console.warn("Unsupported render mode:", this.currentMode);
        this.targetValues.fill(0);
    }
  }

  smoothValues() {
    for (let i = 0; i < this.currentValues.length; i++) {
      const target = this.targetValues[i];
      const current = this.currentValues[i];
      const diff = target - current;

      // Choose rate based on whether we're increasing or decreasing
      const rate =
        Math.abs(target) > Math.abs(current)
          ? this.smoothing.rateIn
          : this.smoothing.rateOut;

      // Apply smoothing only if difference is above threshold
      if (Math.abs(diff) > this.smoothing.threshold) {
        this.currentValues[i] += diff * rate;
      }
    }
  }

  calculateProximity(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

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

        this.targetValues[cell.index] =
          (totalProximity / particlesInCell.length) * tune;
      }
    });

    return this.targetValues;
  }

  calculateDensity(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    particles.forEach((particle) => {
      // Convert to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Find cell using gridMap
      const cell = this.gridMap.find((cell) => cell.contains(px, py));
      if (cell) {
        this.targetValues[cell.index]++;
      }
    });

    return this.targetValues;
  }

  calculateVelocity(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;
    const tune = 50;
    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Track particle counts for averaging
    const counts = new Float32Array(this.targetValues.length).fill(0);

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
        this.targetValues[cell.index] += speed * tune;
        counts[cell.index]++;
      }
    });

    // Calculate average speeds
    for (let i = 0; i < this.targetValues.length; i++) {
      if (counts[i] > 0) {
        this.targetValues[i] /= counts[i];
      }
    }

    return this.targetValues;
  }

  calculatePressure(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Track particle counts for pressure calculation
    const counts = new Float32Array(this.targetValues.length).fill(0);
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
      this.targetValues[i] = Math.pow(counts[i], 2) * tune;
    }

    return this.targetValues;
  }

  calculateVorticity(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Track angular velocity components
    const angularVel = new Float32Array(this.targetValues.length).fill(0);
    const counts = new Float32Array(this.targetValues.length).fill(0);
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
    for (let i = 0; i < this.targetValues.length; i++) {
      if (counts[i] > 0) {
        this.targetValues[i] = (angularVel[i] / counts[i]) * tune;
      }
    }

    return this.targetValues;
  }

  calculateCollision(particleSystem) {
    this.targetValues.fill(0);
    return this.targetValues;
  }
}

export { GridRenderModes };
