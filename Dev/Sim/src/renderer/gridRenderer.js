import { BaseRenderer } from "./baseRenderer.js";

class GridRenderer extends BaseRenderer {
  constructor(canvas) {
    super(canvas);

    // Grid layout parameters
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.numY = this.rowCounts.length;
    this.numX = Math.max(...this.rowCounts);

    // Create buffer
    this.vertexBuffer = this.gl.createBuffer();
    this.createGridGeometry();
  }

  createGridGeometry() {
    const vertices = [];
    const margin = 0.002; // Reduced margin

    // Calculate dimensions to fit screen
    const aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    const cellWidth = 1.8 / this.numX; // Reduced width to fix horizontal spacing
    const cellHeight = 1.9 / this.numY; // Slightly increased height to show full grid

    // Calculate vertical offset to center grid
    const totalHeight = cellHeight * this.numY;
    const yOffset = (2 - totalHeight) / 2;

    for (let y = 0; y < this.numY; y++) {
      const rowWidth = this.rowCounts[y];
      // Center each row horizontally
      const rowOffset = -(rowWidth * cellWidth) / 2;
      // Start from top, apply offset for centering
      const yPos = 1.0 - yOffset - y * cellHeight;

      for (let x = 0; x < rowWidth; x++) {
        const xPos = rowOffset + x * cellWidth;

        // Create cell using two triangles
        vertices.push(
          // First triangle
          xPos + margin,
          yPos - margin,
          xPos + cellWidth - margin,
          yPos - margin,
          xPos + margin,
          yPos - cellHeight + margin,

          // Second triangle
          xPos + cellWidth - margin,
          yPos - margin,
          xPos + cellWidth - margin,
          yPos - cellHeight + margin,
          xPos + margin,
          yPos - cellHeight + margin
        );
      }
    }

    this.gridVertices = new Float32Array(vertices);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.gridVertices,
      this.gl.STATIC_DRAW
    );
  }

  draw(programInfo) {
    if (!programInfo) return;

    const gl = this.gl;
    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(programInfo.attributes.position);
    gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );

    // Light gray color for grid
    gl.uniform4fv(programInfo.uniforms.color, [0.3, 0.3, 0.3, 1.0]);

    gl.drawArrays(gl.TRIANGLES, 0, this.gridVertices.length / 2);
  }
}

export { GridRenderer };
