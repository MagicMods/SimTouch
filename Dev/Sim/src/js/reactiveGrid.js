class ReactiveGrid {
  constructor(renderer) {
    this.renderer = renderer;
    this.programInfo = null;
    console.log("ReactiveGrid created");

    this.width = renderer.width;
    this.height = renderer.height;

    // Match Grid.js layout pattern
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.baseXs = [64, 40, 24, 16, 8, 0, 0, 0, 0, 8, 16, 24, 40, 64];
    this.numX = Math.max(...this.rowCounts);
    this.numY = this.rowCounts.length;

    // Calculate total cells
    const totalCells = this.rowCounts.reduce((a, b) => a + b, 0);
    console.log("Total cells:", totalCells); // Debug output

    // Grid state and buffers
    this.cells = new Array(this.getTotalCells()).fill(1); // Start with all cells visible
    this.vertexBuffer = new Float32Array(this.getTotalCells() * 12); // 6 vertices per cell

    // Grid dimensions (matching Grid.js)
    const scale = Math.min(this.width, this.height) / 400;
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;

    // Center grid properly
    this.horizontalOffset = (this.width - this.numX * this.stepX) / 2;
    this.verticalOffset = (this.height - this.numY * this.stepY) / 2;

    // Remove debug logs
    this.debug = false;
  }

  setProgramInfo(info) {
    if (!info) {
      throw new Error("Program info is required");
    }
    this.programInfo = info;
    console.log("Program info set:", this.programInfo);
  }

  async init() {
    if (!this.programInfo) {
      throw new Error("Program info required for initialization");
    }
    return this;
  }

  getTotalCells() {
    return this.rowCounts.reduce((sum, count) => sum + count, 0);
  }

  // Update cell states based on particle positions
  updateFromParticles(particles) {
    // Reset cells
    this.cells.fill(0);

    // Activate cells based on particle positions
    particles.forEach((particle) => {
      const gridX = Math.floor(particle.x / this.spacing);
      const gridY = Math.floor(particle.y / this.spacing);

      if (gridX >= 0 && gridX < this.numX && gridY >= 0 && gridY < this.numY) {
        const idx = this.getCellIndex(gridX, gridY);
        if (idx !== -1) {
          this.cells[idx] = 1;
        }
      }
    });
  }

  draw() {
    if (!this.programInfo) {
      console.error("No program info available");
      return;
    }

    const gl = this.renderer.gl;

    // 1. Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 2. Use bright red for debug
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 3. Use program and get locations
    gl.useProgram(this.programInfo.program);
    const positionLoc = this.programInfo.attributes.position;
    const colorLoc = this.programInfo.uniforms.color;

    // 4. Create and set up buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // 5. Create full screen quad
    const vertices = new Float32Array([
      -1.0,
      -1.0, // bottom left
      1.0,
      -1.0, // bottom right
      -1.0,
      1.0, // top left
      1.0,
      1.0, // top right
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 6. Set up attributes and uniforms
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]); // Bright red

    // 7. Draw triangle strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 8. Check for errors
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error("GL error:", error);
    }

    // 9. Cleanup
    gl.deleteBuffer(vertexBuffer);
  }

  getCellIndex(col, row) {
    if (
      row < 0 ||
      row >= this.rowCounts.length ||
      col < 0 ||
      col >= this.rowCounts[row]
    ) {
      return -1;
    }

    let index = 0;
    for (let i = 0; i < row; i++) {
      index += this.rowCounts[i];
    }
    return index + col;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.numX = Math.floor(width / this.spacing);
    this.numY = Math.floor(height / this.spacing);
    this.cells = new Array(this.numX * this.numY).fill(0);
  }
}

export { ReactiveGrid };
