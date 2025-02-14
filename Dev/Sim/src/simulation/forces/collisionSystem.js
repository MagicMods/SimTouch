export class CollisionSystem {
  constructor({
    enabled = true,
    gridSize = 10,
    repulsion = 0.2,
    damping = 0.98,
    particleRestitution = 0.8, // Renamed to be specific
    particleRadius = 0.01,
  } = {}) {
    this.enabled = enabled;
    this.gridSize = gridSize;
    this.cellSize = 1.0 / gridSize;
    this.repulsion = repulsion;
    this.damping = damping;
    this.particleRestitution = particleRestitution; // Clear naming
    this.particleRadius = particleRadius;

    // Initialize spatial grid
    this.grid = new Array(this.gridSize * this.gridSize).fill().map(() => []);
  }

  update(particles, velocitiesX, velocitiesY) {
    if (!this.enabled) return;

    this.updateGrid(particles);
    this.resolveCollisions(particles, velocitiesX, velocitiesY);
  }

  updateGrid(particles) {
    // Clear grid
    this.grid.forEach((cell) => (cell.length = 0));

    // Add particles to cells
    for (let i = 0; i < particles.length / 2; i++) {
      const x = particles[i * 2];
      const y = particles[i * 2 + 1];

      const cellX = Math.floor(x * this.gridSize);
      const cellY = Math.floor(y * this.gridSize);

      if (
        cellX < 0 ||
        cellX >= this.gridSize ||
        cellY < 0 ||
        cellY >= this.gridSize
      )
        continue;

      const cellIndex = cellY * this.gridSize + cellX;
      this.grid[cellIndex].push(i);
    }
  }

  resolveCollisions(particles, velocitiesX, velocitiesY) {
    for (let cellIndex = 0; cellIndex < this.grid.length; cellIndex++) {
      this.checkCellCollisions(cellIndex, particles, velocitiesX, velocitiesY);
    }
  }

  checkCellCollisions(cellIndex, particles, velocitiesX, velocitiesY) {
    const cell = this.grid[cellIndex];
    const x = cellIndex % this.gridSize;
    const y = Math.floor(cellIndex / this.gridSize);

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

      // Neighboring cells
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

  resolveCollision(i, j, particles, velocitiesX, velocitiesY) {
    const dx = particles[j * 2] - particles[i * 2];
    const dy = particles[j * 2 + 1] - particles[i * 2 + 1];
    const distSq = dx * dx + dy * dy;
    const minDist = this.particleRadius * 2;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      // Collision response
      this.applyCollisionResponse(i, j, nx, ny, dist, velocitiesX, velocitiesY);
    }
  }
}
