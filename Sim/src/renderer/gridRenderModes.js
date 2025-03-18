export const GridField = {
  PROXIMITY: "Proximity",
  PROXIMITYB: "ProximityB",
  DENSITY: "Density",
  VELOCITY: "Velocity",
  PRESSURE: "Pressure",
  VORTICITY: "Vorticity",
  COLLISION: "Collision",
  OVERLAP: "Overlap",
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
    this.currentValues = new Float32Array(gridParams.target).fill(0);

    // Smoothing configuration - simplified
    this.smoothing = {
      rateIn: 0.15, // Speed to reach target (higher = faster)
      rateOut: 0.08, // Speed to return to zero (lower = smoother)
    };

    // Modes configuration
    this.modes = GridField;
    this.currentMode = this.modes.PROXIMITY; // Start with Density mode

    // console.log(
    //   "GridRenderModes initialized with new params:",
    //   JSON.stringify(
    //     {
    //       cells: gridParams.target,
    //       dimensions: {
    //         cols: gridParams.cols,
    //         rows: gridParams.rows,
    //       },
    //       smoothing: this.smoothing,
    //     },
    //     null,
    //     2
    //   )
    // );
  }

  updateGrid({ gridParams, gridGeometry, gridMap }) {
    this.gridParams = gridParams;
    this.gridGeometry = gridGeometry;
    this.gridMap = gridMap;

    // Resize value buffer if needed
    if (this.values.length !== gridParams.target) {
      this.values = new Float32Array(gridParams.target);
      this.targetValues = new Float32Array(gridParams.target);
      this.currentValues = new Float32Array(gridParams.target).fill(0);
    }
  }

  getValues(particleSystem) {
    // Calculate new target values
    this.calculateTargetValues(particleSystem);

    // Apply smoothing
    this.smoothValues();

    // Return the smoothed current values instead of target values
    return this.currentValues;
  }

  calculateTargetValues(particleSystem) {
    switch (this.currentMode) {
      case this.modes.PROXIMITY:
        this.calculateProximity(particleSystem);
        break;
      case this.modes.PROXIMITYB:
        this.calculateProximityB(particleSystem);
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
        // console.log("Calculating collision values");
        this.calculateCollision(particleSystem);
        break;
      case this.modes.OVERLAP:
        this.calculateOverlap(particleSystem);
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

      // Choose smoothing rate based on whether we're increasing or decreasing
      const rate =
        Math.abs(target) > Math.abs(current)
          ? this.smoothing.rateIn
          : this.smoothing.rateOut;

      // Apply smoothing with rate
      this.currentValues[i] += diff * rate;
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


  calculateProximityB(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Constants
    const tune = 1.5;
    const radius = 20;
    const radiusSq = radius * radius;

    // Pre-calculate particle positions and cells, considering radius
    const particleData = particles.map((p, idx) => {
      const px = p.x * this.TARGET_WIDTH;
      const py = (1 - p.y) * this.TARGET_HEIGHT;
      const particleRadius = p.size / 4; // Convert diameter to radius

      // Find all cells that this particle overlaps with using circle-rectangle overlap
      const overlappingCells = this.gridMap.filter(cell => {
        const overlap = this.calculateCircleRectOverlap(
          px,
          py,
          particleRadius,
          cell.bounds.x,
          cell.bounds.y,
          cell.bounds.width,
          cell.bounds.height
        );
        return overlap > 0;
      });

      return {
        x: px,
        y: py,
        idx,
        radius: particleRadius,
        cells: overlappingCells.map(cell => cell.index)
      };
    });

    // Group by cells (using correct grid indices)
    const cellMap = new Map();
    particleData.forEach((p) => {
      p.cells.forEach(cellIndex => {
        if (!cellMap.has(cellIndex)) {
          cellMap.set(cellIndex, []);
        }
        cellMap.get(cellIndex).push(p);
      });
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
              const minDist = p1.radius + p2.radius;

              if (distSq < (minDist + radius) * (minDist + radius)) {
                // Calculate overlap-based proximity
                const overlap = Math.max(0, minDist - Math.sqrt(distSq));
                totalProximity += (overlap / minDist) * tune;
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
    const tune = 5;
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
    if (!particleSystem?.collisionSystem) return this.targetValues;

    const collisionSystem = particleSystem.collisionSystem;
    const particles = particleSystem.particles;
    const velocitiesX = particleSystem.velocitiesX;
    const velocitiesY = particleSystem.velocitiesY;

    // Constants
    const tune = 100.0;
    const collisionGridSize = collisionSystem.gridSize;
    const cellRadius = (this.TARGET_WIDTH / collisionGridSize) * 0.8; // Reduced radius

    for (let y = 0; y < collisionGridSize; y++) {
      for (let x = 0; x < collisionGridSize; x++) {
        const cellIndex = y * collisionGridSize + x;
        const collisionCell = collisionSystem.grid[cellIndex];

        if (collisionCell.length < 2) continue;

        const normalizedX = (x + 0.5) / collisionGridSize;
        const normalizedY = (y + 0.5) / collisionGridSize;
        const renderX = normalizedX * this.TARGET_WIDTH;
        const renderY = (1 - normalizedY) * this.TARGET_HEIGHT;

        // Calculate base intensity for this collision cell
        let baseIntensity = 0;
        for (let i = 0; i < collisionCell.length; i++) {
          const p1 = collisionCell[i];
          for (let j = i + 1; j < collisionCell.length; j++) {
            const p2 = collisionCell[j];

            const dvx = velocitiesX[p2] - velocitiesX[p1];
            const dvy = velocitiesY[p2] - velocitiesY[p1];
            const relativeSpeed = Math.sqrt(dvx * dvx + dvy * dvy);

            const dx = particles[p2 * 2] - particles[p1 * 2];
            const dy = particles[p2 * 2 + 1] - particles[p1 * 2 + 1];
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < collisionSystem.particleRadius * 2) {
              baseIntensity +=
                (1 - dist / (collisionSystem.particleRadius * 2)) *
                relativeSpeed;
            }
          }
        }

        // Normalize base intensity
        const normalizedIntensity = Math.min(
          10,
          (baseIntensity / collisionCell.length) * tune
        );

        // Find and apply to affected cells with falloff
        this.gridMap.forEach((cell) => {
          const dx = cell.bounds.x + cell.bounds.width / 2 - renderX;
          const dy = cell.bounds.y + cell.bounds.height / 2 - renderY;
          const distToCenter = Math.sqrt(dx * dx + dy * dy);

          if (distToCenter < cellRadius) {
            // Calculate falloff factor (1.0 at center, 0.5 at edges)
            const falloff =
              distToCenter === 0
                ? 1.0 // Center cell
                : 0.5 + 0.5 * (1 - distToCenter / cellRadius); // Surrounding cells

            // Apply intensity with falloff
            this.targetValues[cell.index] = Math.max(
              this.targetValues[cell.index],
              normalizedIntensity * falloff
            );
          }
        });
      }
    }

    return this.targetValues;
  }

  calculateCircleRectOverlap(
    circleX,
    circleY,
    radius,
    rectX,
    rectY,
    rectWidth,
    rectHeight
  ) {
    // Clamp the circle's center to the rectangle's bounds to find the nearest point
    const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
    const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

    // Distance from circle center to closest point
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    const distanceSquared = dx * dx + dy * dy;

    // No overlap if distance exceeds radius
    if (distanceSquared > radius * radius) {
      return 0;
    }

    // Full overlap cases
    const circleArea = Math.PI * radius * radius;
    const rectArea = rectWidth * rectHeight;

    // If circle fully contains rectangle
    if (
      circleX - radius <= rectX &&
      circleX + radius >= rectX + rectWidth &&
      circleY - radius <= rectY &&
      circleY + radius >= rectY + rectHeight
    ) {
      return rectArea; // Entire rectangle is overlapped
    }

    // If rectangle fully contains circle
    if (
      circleX - radius >= rectX &&
      circleX + radius <= rectX + rectWidth &&
      circleY - radius >= rectY &&
      circleY + radius <= rectY + rectHeight
    ) {
      return circleArea; // Entire circle is overlapped
    }

    // Partial overlap: approximate with bounding box and adjust
    const overlapLeft = Math.max(circleX - radius, rectX);
    const overlapRight = Math.min(circleX + radius, rectX + rectWidth);
    const overlapTop = Math.max(circleY - radius, rectY);
    const overlapBottom = Math.min(circleY + radius, rectY + rectHeight);

    if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
      return 0; // No overlap
    }

    // Simple approximation for partial overlap
    const overlapWidth = overlapRight - overlapLeft;
    const overlapHeight = overlapBottom - overlapTop;

    // If circle center is inside rectangle, use circle area minus segments outside
    if (
      circleX >= rectX &&
      circleX <= rectX + rectWidth &&
      circleY >= rectY &&
      circleY <= rectY + rectHeight
    ) {
      return circleArea; // For simplicity, assume full circle area if center is inside
      // TODO: Refine with segment subtraction if needed
    }

    // Otherwise, approximate partial overlap (this could be refined further)
    return overlapWidth * overlapHeight * 0.785; // 0.785 ≈ π/4, rough circle area adjustment
  }

  calculateOverlap(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // renderScale is now 4000 as per your working setup
    const renderScale = particleSystem.renderScale; // 4000

    particles.forEach((particle) => {
      // Convert particle position to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Use the rendered size (diameter) from getParticles()
      const renderedDiameter = particle.size; // Already scaled by renderScale (e.g., 40 for base 0.01)
      const particleRadius = renderedDiameter / 4; // Convert to radius (e.g., 20 pixels)

      // Scale radius to match GridRenderModes' coordinate system (TARGET_WIDTH = 240)
      const gridParticleRadius =
        particleRadius * (this.TARGET_WIDTH / renderScale); // e.g., 20 * (240 / 4000) = 1.2

      this.gridMap.forEach((cell) => {
        const { x, y, width, height } = cell.bounds;
        const cellArea = width * height;

        const overlapArea = this.calculateCircleRectOverlap(
          px,
          py,
          gridParticleRadius,
          x,
          y,
          width,
          height
        );

        if (overlapArea > 0) {
          const particleArea =
            Math.PI * gridParticleRadius * gridParticleRadius;
          let coveragePercentage;

          if (particleArea >= cellArea && overlapArea >= cellArea) {
            coveragePercentage = 100; // Particle fully covers cell
          } else {
            coveragePercentage = (overlapArea / cellArea) * 100;
            if (particleArea < cellArea) {
              coveragePercentage = Math.min(
                coveragePercentage,
                (particleArea / cellArea) * 100
              );
            }
          }

          this.targetValues[cell.index] += coveragePercentage;
        }
      });
    });

    return this.targetValues;
  }
}

export { GridRenderModes };
