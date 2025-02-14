class CollisionSystem {
  constructor({
    enabled = true,
    gridSize = 10,
    repulsion = 2,
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
    this.particleRadius = particleRadius * 2; // Double the radius for collision distance

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
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      return;
    }

    const neighborIndex = y * this.gridSize + x;
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
    const minDist = this.particleRadius; // Already doubled in constructor

    if (distSq >= minDist * minDist) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    // Relative velocity
    const dvx = velocitiesX[j] - velocitiesX[i];
    const dvy = velocitiesY[j] - velocitiesY[i];
    const vn = dvx * nx + dvy * ny;

    // Only collide if approaching
    if (vn < 0) {
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

    // Apply repulsion
    const overlap = minDist - dist;
    const repulsionForce = overlap * this.repulsion;
    velocitiesX[i] -= nx * repulsionForce;
    velocitiesY[i] -= ny * repulsionForce;
    velocitiesX[j] += nx * repulsionForce;
    velocitiesY[j] += ny * repulsionForce;
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
export { CollisionSystem };
