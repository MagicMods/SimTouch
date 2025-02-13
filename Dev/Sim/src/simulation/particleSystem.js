class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // Standard [0,1] space parameters
    this.centerX = 0.5; // Center point
    this.centerY = 0.5; // Center point
    this.radius = 0.475; // Slightly smaller for better visibility

    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = gravity * 0.1; // Scale for [0,1] space

    // Physics parameters - values represent preservation rather than loss
    this.restitution = 0.8; // 50% energy preserved on bounce
    this.velocityDamping = 0.98; // 98% velocity preserved in air
    this.boundaryDamping = 0.95; // 95% velocity preserved on wall
    this.velocityThreshold = 0.001; // Increased threshold
    this.positionThreshold = 0.0001; // New: threshold for position changes
    this.particleRadius = 0.01; // 1% of space width
    this.renderScale = 2000; // Scale to reasonable screen size

    // Animation control
    this.timeScale = 1.0; // Multiplier for animation speed

    // Debug visualization
    this.debugEnabled = false; // Add debug toggle

    // Particle interaction parameters
    this.collisionEnabled = true; // Toggle for particle collisions
    this.repulsion = 1.0; // Repulsion strength (0 = no repulsion)
    this.collisionDamping = 0.98; // Energy preservation in collisions

    // Spatial partitioning parameters
    this.gridSize = 10; // Number of cells per side
    this.cellSize = 1.0 / this.gridSize; // In [0,1] space
    this.grid = new Array(this.gridSize * this.gridSize).fill().map(() => []);

    // Enhanced turbulence parameters
    this.turbulenceEnabled = true;
    this.turbulenceStrength = 0.5;
    this.turbulenceScale = 4.0;
    this.turbulenceSpeed = 1.0;
    this.turbulenceOctaves = 3; // Number of noise layers
    this.turbulencePersistence = 0.5; // How much each octave contributes
    this.turbulenceRotation = 0.0; // Rotation of the turbulence field
    this.time = 0; // For animated turbulence

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
    // Calculate rings based on particle count
    const rings = Math.ceil(Math.sqrt(this.numParticles));
    const particlesPerRing = Math.ceil(this.numParticles / rings);

    // Safe spawn radius (80% of container radius to avoid immediate boundary collision)
    const spawnRadius = this.radius * 0.8;

    let particleIndex = 0;

    // Create concentric rings of particles
    for (
      let ring = 0;
      ring < rings && particleIndex < this.numParticles;
      ring++
    ) {
      // Current ring radius
      const ringRadius = (spawnRadius * (ring + 1)) / rings;

      // Particles in this ring (adjusted for outer rings)
      const ringParticles = Math.min(
        Math.floor((particlesPerRing * (ring + 1)) / 2),
        this.numParticles - particleIndex
      );

      // Distribute particles around the ring
      for (
        let i = 0;
        i < ringParticles && particleIndex < this.numParticles;
        i++
      ) {
        const angle = (i / ringParticles) * Math.PI * 2;

        // Calculate position relative to center
        this.particles[particleIndex * 2] =
          this.centerX + Math.cos(angle) * ringRadius;
        this.particles[particleIndex * 2 + 1] =
          this.centerY + Math.sin(angle) * ringRadius;

        // Initialize with zero velocity
        this.velocitiesX[particleIndex] = 0;
        this.velocitiesY[particleIndex] = 0;

        particleIndex++;
      }
    }

    console.log(`Initialized ${particleIndex} particles in spherical pattern`);
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

  // Improved noise function with rotation
  noise2D(x, y) {
    // Apply rotation to input coordinates
    const cos = Math.cos(this.turbulenceRotation);
    const sin = Math.sin(this.turbulenceRotation);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    let noise = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    // Sum multiple octaves of noise
    for (let i = 0; i < this.turbulenceOctaves; i++) {
      const sx = rx * frequency;
      const sy = ry * frequency;
      const s = (sx + sy) * 0.5;

      // Basic smooth noise
      const t = this.time * this.turbulenceSpeed * frequency;
      noise +=
        amplitude *
        (Math.cos(s + t) * Math.sin(s * 1.5 + t * 0.5) +
          Math.sin(sx * 0.8 + t * 1.2) * Math.cos(sy * 1.2 + t * 0.7));

      maxValue += amplitude;
      amplitude *= this.turbulencePersistence;
      frequency *= 2;
    }

    // Normalize to [0,1] range
    return (noise / maxValue + 1) * 0.5;
  }

  applyTurbulence(i, dt) {
    if (!this.turbulenceEnabled) return;

    const x = this.particles[i * 2];
    const y = this.particles[i * 2 + 1];

    // Sample noise at different offsets for more variation
    const scale = this.turbulenceScale;
    const n1 = this.noise2D(x * scale, y * scale);
    const n2 = this.noise2D(y * scale + 1.234, x * scale + 5.678);

    // Create circular motion tendency
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Combine circular and noise forces
    const fx =
      (n1 - 0.5) * this.turbulenceStrength +
      Math.cos(angle + Math.PI / 2) * this.turbulenceStrength * 0.2;
    const fy =
      (n2 - 0.5) * this.turbulenceStrength +
      Math.sin(angle + Math.PI / 2) * this.turbulenceStrength * 0.2;

    // Apply forces with distance falloff
    const falloff = 1 - dist / this.radius;
    this.velocitiesX[i] += fx * dt * falloff;
    this.velocitiesY[i] += fy * dt * falloff;
  }

  step() {
    // Scale time step by animation speed
    const dt = this.timeStep * this.timeScale;
    this.time += dt; // Update time for animated turbulence

    // First pass: Update velocities and positions
    for (let i = 0; i < this.numParticles; i++) {
      // Apply gravity ([0,1] space: positive Y is down)
      this.velocitiesY[i] += -this.gravity * dt;

      // Apply damping directly (values are preservation factors)
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // Apply turbulence
      this.applyTurbulence(i, dt);

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
        const penetration = dist - this.radius;
        const nx = dxBoundary / dist;
        const ny = dyBoundary / dist;

        // Reflect velocity if particle is moving outward
        const dot = this.velocitiesX[i] * nx + this.velocitiesY[i] * ny;
        if (dot > 0) {
          this.velocitiesX[i] -= (1 + this.restitution) * dot * nx;
          this.velocitiesY[i] -= (1 + this.restitution) * dot * ny;
          this.velocitiesX[i] *= this.boundaryDamping;
          this.velocitiesY[i] *= this.boundaryDamping;
        }

        // Instead of snapping, subtract only the penetration distance to correct the position
        this.particles[i * 2] -= penetration * nx;
        this.particles[i * 2 + 1] -= penetration * ny;
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
