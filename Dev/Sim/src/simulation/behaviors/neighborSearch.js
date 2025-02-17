export class NeighborSearch {
  constructor(searchRadius, gridSize) {
    this.radius = searchRadius;
    this.gridSize = gridSize;
    this.cellSize = searchRadius * 2;
    this.grid = new Map();
  }

  updateGrid(particleSystem) {
    this.grid.clear();
    const particles = particleSystem.particles;

    for (let i = 0; i < particles.length; i += 2) {
      const x = particles[i];
      const y = particles[i + 1];
      const cellX = Math.floor(x / this.cellSize);
      const cellY = Math.floor(y / this.cellSize);
      const key = `${cellX},${cellY}`;

      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(i / 2);
    }
  }

  findNeighbors(particleSystem, index) {
    const neighbors = [];
    const particles = particleSystem.particles;
    const x = particles[index * 2];
    const y = particles[index * 2 + 1];

    // Get cell coordinates
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);

    // Check surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cellParticles = this.grid.get(key);

        if (cellParticles) {
          for (const neighborIndex of cellParticles) {
            if (neighborIndex === index) continue;

            const nx = particles[neighborIndex * 2];
            const ny = particles[neighborIndex * 2 + 1];

            const dist = Math.hypot(x - nx, y - ny);
            if (dist < this.radius) {
              neighbors.push({
                index: neighborIndex,
                x: nx,
                y: ny,
                distance: dist,
              });
            }
          }
        }
      }
    }

    return neighbors;
  }
}
