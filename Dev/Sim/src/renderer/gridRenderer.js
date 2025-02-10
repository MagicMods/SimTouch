import { BaseRenderer } from "./baseRenderer.js";

class GridRenderer extends BaseRenderer {
  constructor(canvas) {
    super(canvas);

    // Grid layout parameters matching original
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.baseXs = [64, 40, 24, 16, 8, 0, 0, 0, 0, 8, 16, 24, 40, 64];
    this.numY = this.rowCounts.length;
    this.numX = Math.max(...this.rowCounts);

    // Calculate total vertices needed
    const totalCells = this.rowCounts.reduce((a, b) => a + b, 0);
    this.gridVertices = new Float32Array(totalCells * 12); // 6 vertices per cell

    // Grid dimensions
    const scale = Math.min(canvas.width, canvas.height) / 400;
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;
    this.verticalOffset = (canvas.height - this.numY * this.stepY) / 2;

    console.log("GridRenderer initialized with original pattern");
  }

  updateGrid() {
    let offset = 0;
    const verticalOffset = this.verticalOffset;

    for (let row = 0; row < this.numY; row++) {
      const rowCount = this.rowCounts[row];
      const baseX = (this.canvas.width - rowCount * this.stepX) / 2;
      const y = verticalOffset + row * this.stepY;

      for (let col = 0; col < rowCount; col++) {
        const x = baseX + col * this.stepX;

        // Convert to clip space
        const x1 = (x / this.canvas.width) * 2 - 1;
        const y1 = -((y / this.canvas.height) * 2 - 1);
        const x2 = x1 + (this.rectWidth / this.canvas.width) * 2;
        const y2 = y1 - (this.rectHeight / this.canvas.height) * 2;

        // First triangle
        this.gridVertices[offset++] = x1;
        this.gridVertices[offset++] = y1;
        this.gridVertices[offset++] = x2;
        this.gridVertices[offset++] = y1;
        this.gridVertices[offset++] = x1;
        this.gridVertices[offset++] = y2;

        // Second triangle
        this.gridVertices[offset++] = x2;
        this.gridVertices[offset++] = y1;
        this.gridVertices[offset++] = x2;
        this.gridVertices[offset++] = y2;
        this.gridVertices[offset++] = x1;
        this.gridVertices[offset++] = y2;
      }
    }
  }

  draw(programInfo) {
    this.updateGrid();
    this.drawShape(
      this.gridVertices,
      [0.4, 0.4, 0.4, 1.0], // Lighter gray for better visibility
      programInfo
    );
  }
}

export { GridRenderer };
