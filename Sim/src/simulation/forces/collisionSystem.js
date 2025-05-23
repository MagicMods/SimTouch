import { eventBus } from '../../util/eventManager.js';

export class CollisionSystem {
  constructor({
    enabled = true,
    gridSizeCollision = 10,
    repulsion = 0.5,
    damping = 0.98,
    particleRestitution = 0.8,
    particleRadius = 0.01,
  } = {}) {
    this.enabled = enabled;
    this.gridSizeCollision = gridSizeCollision;
    this.cellSize = 1 / this.gridSizeCollision;
    this.repulsion = repulsion;
    this.damping = damping;
    this.particleRestitution = particleRestitution;
    this.particleRadius = particleRadius;

    // INITIALIZE THIS - it was missing
    this.grid = [];
    for (let i = 0; i < this.gridSizeCollision * this.gridSizeCollision; i++) {
      this.grid.push([]);
    }

    this.particleSystem = null;

    // Assuming initializeGrid exists and needs to be called
    this.initializeGrid(); // Call initial grid setup

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
  }

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (simParams?.collision) {
      const previousGridSize = this.gridSizeCollision;

      this.enabled = simParams.collision.enabled ?? this.enabled;
      this.gridSizeCollision = simParams.collision.gridSizeCollision ?? this.gridSizeCollision;
      this.repulsion = simParams.collision.repulsion ?? this.repulsion;
      this.particleRestitution = simParams.collision.particleRestitution ?? this.particleRestitution;
      this.particleRadius = simParams.collision.particleRadius ?? this.particleRadius;
      this.damping = simParams.collision.damping ?? this.damping;

      // Re-initialize grid if gridSize has changed
      if (this.gridSizeCollision !== previousGridSize && typeof this.initializeGrid === 'function') {
        console.log(`CollisionSystem: Grid size changed from ${previousGridSize} to ${this.gridSizeCollision}. Reinitializing grid.`);
        this.initializeGrid(); // Assuming this method exists to handle grid resizing
      }
    }
    // console.log(`CollisionSystem updated: enabled=${this.enabled}, gridSize=${this.gridSizeCollision}, repulsion=${this.repulsion}, restitution=${this.particleRestitution}`);
  }

  // Add initializeGrid method if it doesn't exist (or update existing one)
  initializeGrid() {
    this.cellSize = 1 / this.gridSizeCollision;
    // Reset grid array based on new size
    this.grid = [];
    const gridCellCount = this.gridSizeCollision * this.gridSizeCollision;
    for (let i = 0; i < gridCellCount; i++) {
      this.grid.push([]);
    }
    // console.log(`Collision grid initialized with size ${this.gridSizeCollision}x${this.gridSizeCollision}`); // REMOVED
  }

  update(particles, velocitiesX, velocitiesY) {
    if (!this.enabled) return;

    this.updateGrid(particles);
    this.resolveCollisions(particles, velocitiesX, velocitiesY);
  }

  updateGrid(particles) {
    // Reset grid at the start of each update
    this.grid = [];
    for (let i = 0; i < this.gridSizeCollision * this.gridSizeCollision; i++) {
      this.grid.push([]);
    }

    // Then add particles to grid cells
    const numParticles = particles.length / 2;
    for (let i = 0; i < numParticles; i++) {
      const x = particles[i * 2];
      const y = particles[i * 2 + 1];

      // Ensure coordinates are within bounds
      if (x < 0 || x > 1 || y < 0 || y > 1) continue;

      const cellX = Math.floor(x * this.gridSizeCollision);
      const cellY = Math.floor(y * this.gridSizeCollision);
      const cellIndex = cellY * this.gridSizeCollision + cellX;

      // Ensure the cell exists before pushing
      if (this.grid[cellIndex]) {
        this.grid[cellIndex].push(i);
      }
    }
  }

  resolveCollisions(particles, velocitiesX, velocitiesY) {
    for (let cellIndex = 0; cellIndex < this.grid.length; cellIndex++) {
      this.checkCellCollisions(cellIndex, particles, velocitiesX, velocitiesY);
    }
  }

  checkCellCollisions(cellIndex, particles, velocitiesX, velocitiesY) {
    const cell = this.grid[cellIndex];
    const x = cellIndex % this.gridSizeCollision;
    const y = Math.floor(cellIndex / this.gridSizeCollision);

    for (let i = 0; i < cell.length; i++) {
      const particleI = cell[i];

      // Same cell
      for (let j = i + 1; j < cell.length; j++) {
        this.resolveCollision(
          particleI,
          cell[j],
          particles,
          velocitiesX,
          velocitiesY
        );
      }

      // Check neighboring cells
      this.checkNeighborCell(
        x + 1,
        y,
        particleI,
        particles,
        velocitiesX,
        velocitiesY
      );
      this.checkNeighborCell(
        x,
        y + 1,
        particleI,
        particles,
        velocitiesX,
        velocitiesY
      );
      this.checkNeighborCell(
        x + 1,
        y + 1,
        particleI,
        particles,
        velocitiesX,
        velocitiesY
      );
    }
  }

  checkNeighborCell(x, y, particleI, particles, velocitiesX, velocitiesY) {
    if (x < 0 || x >= this.gridSizeCollision || y < 0 || y >= this.gridSizeCollision) {
      return;
    }

    const neighborIndex = y * this.gridSizeCollision + x;
    const neighborCell = this.grid[neighborIndex];

    for (const particleJ of neighborCell) {
      this.resolveCollision(
        particleI,
        particleJ,
        particles,
        velocitiesX,
        velocitiesY
      );
    }
  }

  resolveCollision(i, j, particles, velocitiesX, velocitiesY) {
    const dx = particles[j * 2] - particles[i * 2];
    const dy = particles[j * 2 + 1] - particles[i * 2 + 1];
    const distSq = dx * dx + dy * dy;

    let radiusI = this.particleRadius; // Default if no particle system
    let radiusJ = this.particleRadius; // Default if no particle system
    let densityFactor = 1.0; // Default density factor

    // Only try to access particleSystem properties if the reference exists
    if (this.particleSystem) {
      const affectScale = this.particleSystem.turbulence?.affectScale;
      radiusI = affectScale ? this.particleSystem.particleRadii[i] : this.particleSystem.particleRadius;
      radiusJ = affectScale ? this.particleSystem.particleRadii[j] : this.particleSystem.particleRadius;

      // Access rest density from particleSystem reference
      // REMOVE START
      // if (this.particleSystem.restDensity) {
      //  densityFactor = Math.max(0.5, Math.min(2.0, this.particleSystem.restDensity / 3));
      // }
      // REMOVE END
    }

    // Modify minimum separation distance based on rest density
    // Higher density = particles should be closer (smaller minDist)
    // REPLACE START
    // const minDist = (radiusI + radiusJ) * (1 / densityFactor);
    // REPLACE END
    // WITH START
    // Calculate spacing multiplier based on rest density
    // Default to 1 (edge-to-edge) if restDensity is unavailable or 0
    let spacingMultiplier = 1.0;
    if (this.particleSystem && typeof this.particleSystem.restDensity === 'number' && this.particleSystem.restDensity > 0) {
      // Linear increase: At density 10, multiplier is 1.5 (gap = 0.5 * radius sum)
      const scaleFactor = 0.05;
      spacingMultiplier = 1.0 + (this.particleSystem.restDensity * scaleFactor);
    }

    // Calculate minimum separation distance using the multiplier
    const minDist = (radiusI + radiusJ) * spacingMultiplier;
    // WITH END

    const minDistSq = minDist * minDist;

    if (distSq < minDistSq) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      // Calculate overlap
      const overlap = minDist - dist;

      // Convert repulsion into a smooth force
      const repulsionForce = Math.pow(overlap / minDist, 1.5) * this.repulsion;

      // Apply repulsion as velocity change instead of position correction
      const repulsionX = nx * repulsionForce;
      const repulsionY = ny * repulsionForce;

      // Apply smoother velocity changes
      velocitiesX[i] -= repulsionX;
      velocitiesY[i] -= repulsionY;
      velocitiesX[j] += repulsionX;
      velocitiesY[j] += repulsionY;

      // Handle collision response only for significant relative velocity
      const vx = velocitiesX[j] - velocitiesX[i];
      const vy = velocitiesY[j] - velocitiesY[i];
      const vn = vx * nx + vy * ny;

      if (vn < 0) {
        // Softer restitution based on overlap
        const restitution =
          this.particleRestitution * (1.0 - overlap / minDist);
        const impulse = -(1 + restitution) * vn * 0.5;

        velocitiesX[i] -= nx * impulse;
        velocitiesY[i] -= ny * impulse;
        velocitiesX[j] += nx * impulse;
        velocitiesY[j] += ny * impulse;
      }

      // Apply minimal position correction to prevent extreme overlap
      const correction = Math.max(0, overlap - minDist * 0.1) * 0.5;
      particles[i * 2] -= nx * correction;
      particles[i * 2 + 1] -= ny * correction;
      particles[j * 2] += nx * correction;
      particles[j * 2 + 1] += ny * correction;
    }
  }

  applyImpulse(i, j, nx, ny, vn, velocitiesX, velocitiesY) {
    const impulse = -(1 + this.particleRestitution) * vn * 0.5;

    velocitiesX[i] -= impulse * nx;
    velocitiesY[i] -= impulse * ny;
    velocitiesX[j] += impulse * nx;
    velocitiesY[j] += impulse * ny;

    // Apply damping
    velocitiesX[i] *= this.damping;
    velocitiesY[i] *= this.damping;
    velocitiesX[j] *= this.damping;
    velocitiesY[j] *= this.damping;
  }

  applyRepulsion(i, j, nx, ny, dist, velocitiesX, velocitiesY) {
    const overlap = this.particleRadius * 2 - dist;
    const repulsionForce = overlap * this.repulsion;

    velocitiesX[i] -= nx * repulsionForce;
    velocitiesY[i] -= ny * repulsionForce;
    velocitiesX[j] += nx * repulsionForce;
    velocitiesY[j] += ny * repulsionForce;
  }

  reset() {
    // Clear all grid cells
    this.grid.forEach((cell) => (cell.length = 0));
  }
}