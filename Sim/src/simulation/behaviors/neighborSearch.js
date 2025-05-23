import { debugManager } from '../../util/debugManager.js';

export class NeighborSearch {
  constructor() {
    // Match GridRenderer's configuration
    this.TARGET_WIDTH = 240; // TODO: Make dynamic!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    this.TARGET_HEIGHT = 240; // TODO: Make dynamic

    // Grid parameters matching GridRenderer
    this.gridParams = {
      target: 341, // Total cells
      gap: 0, // Gap between cells
      width: 11, // Cell width
      height: 11, // Cell height
      cols: 23, // Grid columns
      rows: 23, // Grid rows
    };

    // Initialize cell mapping
    this.cellMap = new Map();
    this.cellSize = 24; // 10% of TARGET_WIDTH/HEIGHT // TODO: Make dynamic
    this.cols = Math.ceil(240 / this.cellSize);
    this.rows = Math.ceil(240 / this.cellSize);

    if (this.db) console.log("NeighborSearch initialized:", {
      resolution: `${this.TARGET_WIDTH}x${this.TARGET_HEIGHT}`,
      cells: this.gridParams.target,
    });
  }

  findNeighbors(particles, radius) {
    this.cellMap.clear();
    const particleData = new Map();

    particles.forEach((p, idx) => {
      // Convert to consistent pixel space
      const px = p.x * 240;
      const py = p.y * 240;

      const col = Math.floor(px / this.cellSize);
      const row = Math.floor(py / this.cellSize);

      // if (p.y > 0.7) {
      //   if (this.db) console.log(`Mapping particle at (${px.toFixed(1)}, ${py.toFixed(1)}) to cell [${row}, ${col}]`);
      // }

      const cellIndex = row * this.cols + col;
      if (this.isValidCell(cellIndex)) {
        this.mapParticleToCell(particleData, idx, p, px, py, cellIndex);
      }
    });

    return this.findNeighborsInRadius(particleData, radius * 240);
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
    if (this.db) console.log("Neighbor search:", {
      particles: particles.length,
      mappedParticles: particleData.size,
      activeCells: this.cellMap.size,
      averagePerCell: particleData.size / this.cellMap.size,
    });
  }

  get db() {
    return debugManager.get('neighbors');
  }

}