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
    const tune = 1;
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

    // renderScale is now 4000 as per your working setup
    const renderScale = particleSystem.renderScale; // 4000

    particles.forEach((particle) => {
      // Convert particle position to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Use the rendered size (diameter) from getParticles()
      const renderedDiameter = particle.size; // Already scaled by renderScale (e.g., 40 for base 0.01)
      const particleRadius = renderedDiameter / 8; // Convert to radius (e.g., 20 pixels)

      // Find all cells that this particle overlaps with using circle-rectangle overlap
      this.gridMap.forEach((cell) => {
        const { x, y, width, height } = cell.bounds;
        const cellArea = width * height;

        const overlapArea = this.calculateCircleRectOverlap(
          px,
          py,
          particleRadius,
          x,
          y,
          width,
          height
        );

        if (overlapArea > 0) {
          const particleArea = Math.PI * particleRadius * particleRadius;
          let densityValue;

          // Calculate the actual percentage of cell covered by the particle
          densityValue = (overlapArea / cellArea) * 100;

          // Apply a smoother scaling to the density value
          // This creates a more gradual transition from 0 to 100%
          densityValue = Math.pow(densityValue / 100, 1.5) * 100;

          // Scale the density to match the grid's visualization range
          // We'll use a smaller scale for density to avoid saturation
          densityValue = Math.min(densityValue * 0.1, 100);

          this.targetValues[cell.index] += densityValue;
        }
      });
    });

    return this.targetValues;
  }

  calculateVelocity(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Track weighted sums and total weights for averaging
    const weightedSums = new Float32Array(this.targetValues.length).fill(0);
    const totalWeights = new Float32Array(this.targetValues.length).fill(0);
    const tune = 5; // Keep the same tuning factor

    particles.forEach((particle) => {
      // Convert particle position to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Use the rendered size (diameter) from getParticles()
      const renderedDiameter = particle.size; // Already scaled by renderScale (e.g., 40 for base 0.01)
      const particleRadius = renderedDiameter / 8; // Convert to radius (e.g., 20 pixels)

      // Calculate particle speed
      const speed = Math.sqrt(
        particle.vx * particle.vx + particle.vy * particle.vy
      );

      // Find all cells that this particle overlaps with using circle-rectangle overlap
      this.gridMap.forEach((cell) => {
        const { x, y, width, height } = cell.bounds;
        const cellArea = width * height;

        const overlapArea = this.calculateCircleRectOverlap(
          px,
          py,
          particleRadius,
          x,
          y,
          width,
          height
        );

        if (overlapArea > 0) {
          // Calculate the weight based on overlap percentage
          let weight = (overlapArea / cellArea) * 100;

          // Apply the same smooth scaling we use in other calculations
          weight = Math.pow(weight / 100, 1.5) * 100;

          // Scale the weight to match our visualization range
          weight = Math.min(weight * 0.1, 100);

          // Add weighted contribution to the cell
          weightedSums[cell.index] += speed * weight * tune;
          totalWeights[cell.index] += weight;
        }
      });
    });

    // Calculate weighted averages
    for (let i = 0; i < this.targetValues.length; i++) {
      if (totalWeights[i] > 0) {
        this.targetValues[i] = weightedSums[i] / totalWeights[i];
      }
    }

    return this.targetValues;
  }

  calculatePressure(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Track total overlap area for each cell
    const cellOverlaps = new Float32Array(this.targetValues.length).fill(0);
    const tune = 0.5; // Increased pressure sensitivity

    particles.forEach((particle) => {
      // Convert particle position to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;

      // Use the rendered size (diameter) from getParticles()
      const renderedDiameter = particle.size; // Already scaled by renderScale (e.g., 40 for base 0.01)
      const particleRadius = renderedDiameter / 8; // Convert to radius (e.g., 20 pixels)

      // Find all cells that this particle overlaps with using circle-rectangle overlap
      this.gridMap.forEach((cell) => {
        const { x, y, width, height } = cell.bounds;
        const cellArea = width * height;

        const overlapArea = this.calculateCircleRectOverlap(
          px,
          py,
          particleRadius,
          x,
          y,
          width,
          height
        );

        if (overlapArea > 0) {
          // Calculate the percentage of cell covered by this particle
          let coveragePercentage = (overlapArea / cellArea) * 100;

          // Apply a smoother scaling to the coverage percentage
          coveragePercentage = Math.pow(coveragePercentage / 100, 1.5) * 100;

          // Scale the coverage to match our visualization range
          coveragePercentage = Math.min(coveragePercentage * 0.25, 100);

          // Add to cell's total overlap
          cellOverlaps[cell.index] += coveragePercentage;
        }
      });
    });

    // Calculate pressure based on total overlap
    // Pressure increases non-linearly with overlap (squared relationship)
    for (let i = 0; i < this.targetValues.length; i++) {
      if (cellOverlaps[i] > 0) {
        // Use squared relationship for pressure, but with smoother scaling
        // Increased the base multiplier to make pressure more visible
        this.targetValues[i] = Math.pow(cellOverlaps[i] / 100, 2) * tune * 200;
      }
    }

    return this.targetValues;
  }

  calculateVorticity(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem) return this.targetValues;

    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Track velocity components and weights for each cell
    const cellVxSums = new Float32Array(this.targetValues.length).fill(0);
    const cellVySums = new Float32Array(this.targetValues.length).fill(0);
    const cellWeights = new Float32Array(this.targetValues.length).fill(0);
    const tune = 5.0; // Adjusted tuning factor for better visualization

    // First pass: accumulate weighted velocities in each cell
    particles.forEach((particle) => {
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT;
      const particleRadius = particle.size / 8;

      this.gridMap.forEach((cell) => {
        const { x, y, width, height } = cell.bounds;
        const cellArea = width * height;

        const overlapArea = this.calculateCircleRectOverlap(
          px,
          py,
          particleRadius,
          x,
          y,
          width,
          height
        );

        if (overlapArea > 0) {
          // Calculate weight based on overlap percentage
          let weight = (overlapArea / cellArea) * 100;
          weight = Math.pow(weight / 100, 1.5) * 100;
          weight = Math.min(weight * 0.25, 100);

          // Accumulate weighted velocities
          cellVxSums[cell.index] += particle.vx * weight;
          cellVySums[cell.index] += particle.vy * weight;
          cellWeights[cell.index] += weight;
        }
      });
    });

    // Calculate average velocities for each cell
    const cellVx = new Float32Array(this.targetValues.length);
    const cellVy = new Float32Array(this.targetValues.length);
    for (let i = 0; i < this.targetValues.length; i++) {
      if (cellWeights[i] > 0) {
        cellVx[i] = cellVxSums[i] / cellWeights[i];
        cellVy[i] = cellVySums[i] / cellWeights[i];
      }
    }

    // Second pass: calculate vorticity using spatial derivatives
    this.gridMap.forEach((cell) => {
      // Skip cells with no data
      if (cellWeights[cell.index] === 0) return;

      // Find neighboring cells
      const neighbors = this.gridMap.filter(n => {
        const dx = n.bounds.x - cell.bounds.x;
        const dy = n.bounds.y - cell.bounds.y;
        // Consider only immediate neighbors (including diagonals)
        return Math.abs(dx) <= cell.bounds.width * 1.5 &&
          Math.abs(dy) <= cell.bounds.height * 1.5 &&
          n.index !== cell.index;
      });

      let dvx_dy = 0;
      let dvy_dx = 0;
      let validGradients = 0;

      // Calculate velocity gradients using neighbors
      neighbors.forEach(n => {
        if (cellWeights[n.index] > 0) {
          const dx = n.bounds.x - cell.bounds.x;
          const dy = n.bounds.y - cell.bounds.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (Math.abs(dy) > 0.001) {
            dvx_dy += (cellVx[n.index] - cellVx[cell.index]) / dy;
          }
          if (Math.abs(dx) > 0.001) {
            dvy_dx += (cellVy[n.index] - cellVy[cell.index]) / dx;
          }
          validGradients++;
        }
      });

      // Calculate curl (vorticity) if we have valid gradients
      if (validGradients > 0) {
        dvx_dy /= validGradients;
        dvy_dx /= validGradients;

        // 2D curl = ∂vy/∂x - ∂vx/∂y
        const vorticity = dvy_dx - dvx_dy;

        // Apply non-linear scaling for better visualization
        const scaledVorticity = Math.sign(vorticity) * Math.pow(Math.abs(vorticity), 0.75);

        this.targetValues[cell.index] = scaledVorticity * tune;
      }
    });

    return this.targetValues;
  }

  calculateCollision(particleSystem) {
    this.targetValues.fill(0);
    if (!particleSystem?.collisionSystem) return this.targetValues;

    const collisionSystem = particleSystem.collisionSystem;
    const particles = particleSystem.getParticles();
    if (!particles?.length) return this.targetValues;

    // Constants
    const tune = 50.0;
    const renderScale = particleSystem.renderScale;

    // Track collision intensities for each cell
    const cellCollisions = new Float32Array(this.targetValues.length).fill(0);
    const cellWeights = new Float32Array(this.targetValues.length).fill(0);

    // Process each particle
    for (let i = 0; i < collisionSystem.grid.length; i++) {
      const collisionCell = collisionSystem.grid[i];
      if (collisionCell.length < 2) continue;

      // Calculate cell center in render space
      const gridSize = collisionSystem.gridSize;
      const x = i % gridSize;
      const y = Math.floor(i / gridSize);
      const normalizedX = (x + 0.5) / gridSize;
      const normalizedY = (y + 0.5) / gridSize;
      const renderX = normalizedX * this.TARGET_WIDTH;
      const renderY = (1 - normalizedY) * this.TARGET_HEIGHT;

      // Process particle pairs in this cell
      for (let j = 0; j < collisionCell.length; j++) {
        const p1 = collisionCell[j];
        for (let k = j + 1; k < collisionCell.length; k++) {
          const p2 = collisionCell[k];

          // Get particle data
          const particle1 = particles[p1];
          const particle2 = particles[p2];

          // Calculate relative velocity
          const dvx = particle2.vx - particle1.vx;
          const dvy = particle2.vy - particle1.vy;
          const relativeSpeed = Math.sqrt(dvx * dvx + dvy * dvy);

          // Get particle positions in render space
          const p1x = particle1.x * this.TARGET_WIDTH;
          const p1y = (1 - particle1.y) * this.TARGET_HEIGHT;
          const p2x = particle2.x * this.TARGET_WIDTH;
          const p2y = (1 - particle2.y) * this.TARGET_HEIGHT;

          // Use the rendered size (diameter) from getParticles()
          const p1Radius = particle1.size / 8;
          const p2Radius = particle2.size / 8;

          // Calculate collision intensity based on overlap and relative speed
          const dx = p2x - p1x;
          const dy = p2y - p1y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = p1Radius + p2Radius;

          if (dist < minDist * 2) {
            // Calculate overlap-based collision intensity
            const overlap = Math.max(0, minDist * 2 - dist);
            const collisionIntensity = (overlap / (minDist * 2)) * relativeSpeed;

            // Find all cells that this collision affects
            this.gridMap.forEach((cell) => {
              const { x, y, width, height } = cell.bounds;
              const cellArea = width * height;

              // Calculate overlap with both particles
              const p1Overlap = this.calculateCircleRectOverlap(
                p1x,
                p1y,
                p1Radius,
                x,
                y,
                width,
                height
              );

              const p2Overlap = this.calculateCircleRectOverlap(
                p2x,
                p2y,
                p2Radius,
                x,
                y,
                width,
                height
              );

              if (p1Overlap > 0 || p2Overlap > 0) {
                // Calculate weight based on total overlap
                let weight = ((p1Overlap + p2Overlap) / cellArea) * 100;

                // Apply smooth scaling
                weight = Math.pow(weight / 100, 1.5) * 100;

                // Scale the weight to match our visualization range
                weight = Math.min(weight * 0.25, 100);

                // Add weighted collision contribution
                cellCollisions[cell.index] += collisionIntensity * weight * tune;
                cellWeights[cell.index] += weight;
              }
            });
          }
        }
      }
    }

    // Calculate final collision values
    for (let i = 0; i < this.targetValues.length; i++) {
      if (cellWeights[i] > 0) {
        this.targetValues[i] = cellCollisions[i] / cellWeights[i];
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

    // Calculate overlap area using the intersection rectangle
    const overlapWidth = overlapRight - overlapLeft;
    const overlapHeight = overlapBottom - overlapTop;
    const overlapArea = overlapWidth * overlapHeight;

    // Adjust the overlap area based on the circle's position
    // If the circle's center is inside the rectangle, we need to subtract
    // the areas of the circle segments that are outside the rectangle
    if (
      circleX >= rectX &&
      circleX <= rectX + rectWidth &&
      circleY >= rectY &&
      circleY <= rectY + rectHeight
    ) {
      // Calculate the areas of the circle segments that are outside
      const leftSegment = this.calculateCircleSegmentArea(
        radius,
        circleX - rectX
      );
      const rightSegment = this.calculateCircleSegmentArea(
        radius,
        rectX + rectWidth - circleX
      );
      const topSegment = this.calculateCircleSegmentArea(
        radius,
        circleY - rectY
      );
      const bottomSegment = this.calculateCircleSegmentArea(
        radius,
        rectY + rectHeight - circleY
      );

      // Subtract the outside segments from the circle area
      return circleArea - (leftSegment + rightSegment + topSegment + bottomSegment);
    }

    // For partial overlaps where center is outside, use a weighted average
    // of the overlap rectangle and the circle area
    const centerDistance = Math.sqrt(distanceSquared);
    const weight = 1 - (centerDistance / radius);
    return overlapArea * (0.785 + 0.215 * weight); // 0.785 ≈ π/4
  }

  // Helper function to calculate the area of a circle segment
  calculateCircleSegmentArea(radius, distance) {
    if (distance >= radius) return 0;
    const theta = 2 * Math.acos(distance / radius);
    return (radius * radius * (theta - Math.sin(theta))) / 2;
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
      const particleRadius = renderedDiameter / 8; // Convert to radius (e.g., 20 pixels)

      // Find all cells that this particle overlaps with using circle-rectangle overlap
      this.gridMap.forEach((cell) => {
        const { x, y, width, height } = cell.bounds;
        const cellArea = width * height;

        const overlapArea = this.calculateCircleRectOverlap(
          px,
          py,
          particleRadius,
          x,
          y,
          width,
          height
        );

        if (overlapArea > 0) {
          const particleArea = Math.PI * particleRadius * particleRadius;
          let coveragePercentage;

          // Calculate the actual percentage of cell covered by the particle
          coveragePercentage = (overlapArea / cellArea) * 100;

          // Apply a smoother scaling to the coverage percentage
          // This creates a more gradual transition from 0 to 100%
          coveragePercentage = Math.pow(coveragePercentage / 100, 1.5) * 100;

          // Scale the coverage to match the grid's visualization range
          // The grid normalizes values to [0,1] and then maps to colors
          // We want the overlap to be visible but not saturate too quickly
          coveragePercentage = Math.min(coveragePercentage * 0.1, 100);

          this.targetValues[cell.index] += coveragePercentage;
        }
      });
    });

    return this.targetValues;
  }
}

export { GridRenderModes };
