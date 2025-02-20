class NeighborSearch {
  constructor() {
    // Match GridRenderer's configuration
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;

    // Grid parameters matching GridRenderer
    this.gridParams = {
      target: 341, // Total cells
      gap: 1, // Gap between cells
      width: 10, // Cell width
      height: 10, // Cell height
      cols: 23, // Grid columns
      rows: 23, // Grid rows
    };

    // Initialize cell mapping
    this.cellMap = new Map();
    this.debug = false;

    console.log("NeighborSearch initialized:", {
      resolution: `${this.TARGET_WIDTH}x${this.TARGET_HEIGHT}`,
      cells: this.gridParams.target,
    });
  }

  findNeighbors(particles, radius) {
    this.cellMap.clear();
    const particleData = new Map();

    // Step 1: Map particles to grid cells using pixel space
    particles.forEach((p, idx) => {
      // Convert to pixel space (match GridRenderer)
      const px = p.x * this.TARGET_WIDTH;
      const py = (1 - p.y) * this.TARGET_HEIGHT; // Note Y inversion

      // Calculate grid position
      const col = Math.floor(
        px / (this.gridParams.width + this.gridParams.gap)
      );
      const row = Math.floor(
        py / (this.gridParams.height + this.gridParams.gap)
      );
      const cellIndex = row * this.gridParams.cols + col;

      if (this.isValidCell(cellIndex)) {
        this.mapParticleToCell(particleData, idx, p, px, py, cellIndex);
      }
    });

    if (this.debug) {
      this.logNeighborStats(particles, particleData);
    }

    // Step 2: Find neighbors within radius
    return this.findNeighborsInRadius(particleData, radius);
  }

  isValidCell(cellIndex) {
    return cellIndex >= 0 && cellIndex < this.gridParams.target;
  }

  mapParticleToCell(particleData, idx, particle, px, py, cellIndex) {
    particleData.set(idx, {
      particle,
      index: idx,
      position: { x: px, y: py },
      cellIndex,
    });

    if (!this.cellMap.has(cellIndex)) {
      this.cellMap.set(cellIndex, new Set());
    }
    this.cellMap.get(cellIndex).add(idx);
  }

  findNeighborsInRadius(particleData, radius) {
    const neighbors = new Map();
    const radiusSq = radius * radius;

    particleData.forEach((p1, idx) => {
      neighbors.set(idx, []);

      // Get cell indices
      const row = Math.floor(p1.cellIndex / this.gridParams.cols);
      const col = p1.cellIndex % this.gridParams.cols;

      // Check neighboring cells
      this.checkNeighboringCells(
        row,
        col,
        p1,
        idx,
        neighbors,
        particleData,
        radiusSq
      );
    });

    return neighbors;
  }

  checkNeighboringCells(row, col, p1, idx, neighbors, particleData, radiusSq) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const neighborRow = row + dy;
        const neighborCol = col + dx;

        if (!this.isValidGridPosition(neighborRow, neighborCol)) continue;

        const neighborCell = neighborRow * this.gridParams.cols + neighborCol;
        this.checkParticlesInCell(
          neighborCell,
          p1,
          idx,
          neighbors,
          particleData,
          radiusSq
        );
      }
    }
  }

  isValidGridPosition(row, col) {
    return (
      row >= 0 &&
      row < this.gridParams.rows &&
      col >= 0 &&
      col < this.gridParams.cols
    );
  }

  checkParticlesInCell(cellIndex, p1, idx, neighbors, particleData, radiusSq) {
    const cellParticles = this.cellMap.get(cellIndex);
    if (!cellParticles) return;

    cellParticles.forEach((nIdx) => {
      if (idx === nIdx) return;

      const p2 = particleData.get(nIdx);
      const dx = p2.position.x - p1.position.x;
      const dy = p2.position.y - p1.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        neighbors.get(idx).push({
          index: nIdx,
          particle: p2.particle,
          distance: Math.sqrt(distSq),
        });
      }
    });
  }

  logNeighborStats(particles, particleData) {
    console.log("Neighbor search:", {
      particles: particles.length,
      mappedParticles: particleData.size,
      activeCells: this.cellMap.size,
      averagePerCell: particleData.size / this.cellMap.size,
    });
  }
}

export { NeighborSearch };
