class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // Standard [0,1] space parameters
    this.centerX = 0.5; // Center point
    this.centerY = 0.5; // Center point
    this.radius = 0.475; // Slightly smaller for better visibility

    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = -gravity * 0.1; // Scale for [0,1] space

    // Physics parameters - values represent preservation rather than loss
    this.restitution = 0.5; // 50% energy preserved on bounce
    this.velocityDamping = 0.98; // 98% velocity preserved in air
    this.boundaryDamping = 0.95; // 95% velocity preserved on wall
    this.velocityThreshold = 0.001; // Increased threshold
    this.positionThreshold = 0.0001; // New: threshold for position changes
    this.particleRadius = 0.1; // 1% of space width
    this.renderScale = 500; // Scale to reasonable screen size

    // Animation control
    this.timeScale = 1.0; // Multiplier for animation speed

    // Debug visualization
    this.debugEnabled = false; // Add debug toggle

    // Particle interaction parameters
    this.collisionEnabled = false; // Toggle for particle collisions
    this.repulsion = 0.0; // Repulsion strength (0 = no repulsion)
    this.collisionDamping = 0.98; // Energy preservation in collisions

    // Spatial partitioning parameters
    this.gridSize = 10; // Number of cells per side
    this.cellSize = 1.0 / this.gridSize; // In [0,1] space
    this.grid = new Array(this.gridSize * this.gridSize).fill().map(() => []);

    // Initialize arrays
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    this.initializeParticles();
  }

  createBoundaryPoints() {
    const points = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Create directly in [0,1] space
      const x = this.centerX + Math.cos(angle) * this.radius;
      const y = this.centerY + Math.sin(angle) * this.radius;
      points.push({ x, y, vx: 0, vy: 0 });
    }
    return points;
  }

  initializeParticles() {
    const spacing = 0.05; // In [0,1] space
    const particlesPerRow = 10;
    const rows = this.numParticles / particlesPerRow;

    // Start near top in [0,1] space
    const startX = this.centerX - (particlesPerRow * spacing) / 2;
    const startY = 0.2; // 20% from top

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / particlesPerRow);
      const col = i % particlesPerRow;

      this.particles[i * 2] = startX + col * spacing;
      this.particles[i * 2 + 1] = startY + row * spacing;
      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }
  }

  updateGrid() {
    // Clear grid
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i].length = 0;
    }

    // Add particles to grid cells
    for (let i = 0; i < this.numParticles; i++) {
      const x = this.particles[i * 2];
      const y = this.particles[i * 2 + 1];

      // Get grid cell indices
      const cellX = Math.floor(x * this.gridSize);
      const cellY = Math.floor(y * this.gridSize);

      // Skip if outside bounds
      if (
        cellX < 0 ||
        cellX >= this.gridSize ||
        cellY < 0 ||
        cellY >= this.gridSize
      )
        continue;

      // Add particle index to cell
      const cellIndex = cellY * this.gridSize + cellX;
      this.grid[cellIndex].push(i);
    }
  }

  checkCellCollisions(cellIndex) {
    const cell = this.grid[cellIndex];

    // Check collisions within cell
    for (let i = 0; i < cell.length; i++) {
      const particleI = cell[i];

      // Check against other particles in same cell
      for (let j = i + 1; j < cell.length; j++) {
        const particleJ = cell[j];
        this.resolveCollision(particleI, particleJ);
      }

      // Check against neighboring cells (right and bottom only to avoid duplicates)
      const x = cellIndex % this.gridSize;
      const y = Math.floor(cellIndex / this.gridSize);

      // Right neighbor
      if (x < this.gridSize - 1) {
        const rightCell = this.grid[cellIndex + 1];
        for (const particleJ of rightCell) {
          this.resolveCollision(particleI, particleJ);
        }
      }

      // Bottom neighbor
      if (y < this.gridSize - 1) {
        const bottomCell = this.grid[cellIndex + this.gridSize];
        for (const particleJ of bottomCell) {
          this.resolveCollision(particleI, particleJ);
        }
      }

      // Bottom-right neighbor
      if (x < this.gridSize - 1 && y < this.gridSize - 1) {
        const bottomRightCell = this.grid[cellIndex + this.gridSize + 1];
        for (const particleJ of bottomRightCell) {
          this.resolveCollision(particleI, particleJ);
        }
      }
    }
  }

  resolveCollision(i, j) {
    const dx = this.particles[j * 2] - this.particles[i * 2];
    const dy = this.particles[j * 2 + 1] - this.particles[i * 2 + 1];
    const distSq = dx * dx + dy * dy;
    const minDist = this.particleRadius * 2;

    if (distSq < minDist * minDist) {
      // ...existing collision response code...
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      // Calculate relative velocity
      const dvx = this.velocitiesX[j] - this.velocitiesX[i];
      const dvy = this.velocitiesY[j] - this.velocitiesY[i];
      const vn = dvx * nx + dvy * ny;

      // Only collide if particles are approaching
      if (vn < 0) {
        // Collision impulse
        const impulse = -(1 + this.restitution) * vn;
        this.velocitiesX[i] -= impulse * nx * 0.5;
        this.velocitiesY[i] -= impulse * ny * 0.5;
        this.velocitiesX[j] += impulse * nx * 0.5;
        this.velocitiesY[j] += impulse * ny * 0.5;

        // Apply collision damping
        this.velocitiesX[i] *= this.collisionDamping;
        this.velocitiesY[i] *= this.collisionDamping;
        this.velocitiesX[j] *= this.collisionDamping;
        this.velocitiesY[j] *= this.collisionDamping;
      }

      // Add repulsion force
      if (this.repulsion > 0) {
        const overlap = minDist - dist;
        const repulsionForce = overlap * this.repulsion;
        this.velocitiesX[i] -= nx * repulsionForce;
        this.velocitiesY[i] -= ny * repulsionForce;
        this.velocitiesX[j] += nx * repulsionForce;
        this.velocitiesY[j] += ny * repulsionForce;
      }
    }
  }

  step() {
    // Scale time step by animation speed
    const dt = this.timeStep * this.timeScale;

    // First pass: Update velocities and positions
    for (let i = 0; i < this.numParticles; i++) {
      // Apply gravity ([0,1] space: positive Y is down)
      this.velocitiesY[i] += this.gravity * dt;

      // Apply damping directly (values are preservation factors)
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // Check for rest state
      const velocityMagnitude = Math.sqrt(
        this.velocitiesX[i] * this.velocitiesX[i] +
          this.velocitiesY[i] * this.velocitiesY[i]
      );

      // Position change check
      const dx = this.velocitiesX[i] * dt;
      const dy = this.velocitiesY[i] * dt;
      const positionChange = Math.sqrt(dx * dx + dy * dy);

      if (
        velocityMagnitude < this.velocityThreshold &&
        positionChange < this.positionThreshold
      ) {
        // Put particle fully to rest
        this.velocitiesX[i] = 0;
        this.velocitiesY[i] = 0;
        continue; // Skip position update for resting particles
      }

      // Update position
      const newX = this.particles[i * 2] + this.velocitiesX[i] * dt;
      const newY = this.particles[i * 2 + 1] + this.velocitiesY[i] * dt;

      // Check circular boundary collision in [0,1] space
      const dxBoundary = newX - this.centerX;
      const dyBoundary = newY - this.centerY;
      const distSq = dxBoundary * dxBoundary + dyBoundary * dyBoundary;

      if (distSq > this.radius * this.radius) {
        const dist = Math.sqrt(distSq);
        const nx = dxBoundary / dist;
        const ny = dyBoundary / dist;

        // Calculate impact
        const dot = this.velocitiesX[i] * nx + this.velocitiesY[i] * ny;

        if (dot > 0) {
          // Reflect velocity
          this.velocitiesX[i] -= (1 + this.restitution) * dot * nx;
          this.velocitiesY[i] -= (1 + this.restitution) * dot * ny;

          // Apply damping
          this.velocitiesX[i] *= this.boundaryDamping;
          this.velocitiesY[i] *= this.boundaryDamping;
        }

        // Fix: Place particle exactly at boundary minus its radius
        // This prevents cumulative offset issues
        const safeRadius = this.radius - this.particleRadius * 0.5; // Use half radius for better contact
        this.particles[i * 2] = this.centerX + nx * safeRadius;
        this.particles[i * 2 + 1] = this.centerY + ny * safeRadius;
      } else {
        this.particles[i * 2] = newX;
        this.particles[i * 2 + 1] = newY;
      }
    }

    // Second pass: Particle-particle collisions (if enabled)
    if (this.collisionEnabled) {
      this.updateGrid();

      // Check collisions using grid
      for (let i = 0; i < this.grid.length; i++) {
        this.checkCellCollisions(i);
      }
    }
  }

  // No coordinate conversion needed - already in [0,1] space
  getParticles() {
    const particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      particles.push({
        x: this.particles[i * 2],
        y: this.particles[i * 2 + 1],
        vx: this.velocitiesX[i],
        vy: this.velocitiesY[i],
        size: this.particleRadius * this.renderScale, // Scale radius to visible size
      });
    }
    return particles;
  }

  getBoundaryPoints() {
    return this.boundaryPoints;
  }

  // Add debug visualization method
  drawDebugBounds(renderer) {
    if (!this.debugEnabled) return;

    // Draw physical bounds of a single particle
    const debugParticle = {
      x: this.centerX,
      y: this.centerY,
      size: this.particleRadius * this.renderScale,
    };

    renderer.draw([debugParticle], [0.0, 1.0, 0.0, 0.5]);
  }

  drawDebugGrid(renderer) {
    if (!this.debugEnabled) return;

    const gridLines = [];

    // Vertical lines
    for (let i = 0; i <= this.gridSize; i++) {
      const x = i * this.cellSize;
      gridLines.push({ x, y: 0 }, { x, y: 1 });
    }

    // Horizontal lines
    for (let i = 0; i <= this.gridSize; i++) {
      const y = i * this.cellSize;
      gridLines.push({ x: 0, y }, { x: 1, y });
    }

    renderer.draw(gridLines, [0.2, 0.2, 0.2, 0.5]);
  }
}

export { ParticleSystem };
