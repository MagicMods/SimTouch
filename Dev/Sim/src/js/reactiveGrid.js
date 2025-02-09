class ReactiveGrid {
  constructor(renderer) {
    this.renderer = renderer;
    this.width = renderer.width;
    this.height = renderer.height;
    this.spacing = 20; // Grid cell size

    this.numX = Math.floor(this.width / this.spacing);
    this.numY = Math.floor(this.height / this.spacing);

    this.cells = new Array(this.numX * this.numY).fill(0);
  }

  draw() {
    const ctx = this.renderer.ctx;
    // Draw grid lines
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 0.5;

    // Draw grid cells
    for (let i = 0; i < this.numX; i++) {
      for (let j = 0; j < this.numY; j++) {
        // Draw cell based on state
        if (this.cells[i + j * this.numX] === 1) {
          ctx.fillStyle = "#333333";
          ctx.fillRect(
            i * this.spacing,
            j * this.spacing,
            this.spacing,
            this.spacing
          );
        }
      }
    }
  }
}

export { ReactiveGrid };
