import { BaseRenderer } from "./baseRenderer.js";
import { GridRenderModes } from "./gridRenderModes.js";
import { Gradient } from "../shaders/gradients.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);
    this.vertexBuffer = gl.createBuffer();

    // Grid layout parameters
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.numX = Math.max(...this.rowCounts);
    this.numY = this.rowCounts.length;

    // Base scale on 240x240 grid
    const scale = Math.min(gl.canvas.width, gl.canvas.height) / 240;

    // Cell dimensions
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;

    // Create grid geometry
    this.createGridGeometry();

    // Add density field parameters with defaults
    this.density = new Float32Array(this.getTotalCells());
    this.minDensity = 0.0;
    this.maxDensity = 7.0;

    // Replace gradient initialization with new class
    this.gradient = new Gradient();

    this.renderModes = new GridRenderModes({
      rowCounts: this.rowCounts,
      numX: this.numX,
      numY: this.numY,
      stepX: this.stepX,
      stepY: this.stepY,
      canvas: this.gl.canvas,
    });

    console.log("GridRenderer initialized with scale:", scale);
  }

  getTotalCells() {
    return this.rowCounts.reduce((sum, count) => sum + count, 0);
  }

  createGridGeometry() {
    const vertices = [];
    const margin = 0.9; // Scale down grid positions to reserve a margin around the grid
    // Center vertically
    const totalHeight = this.numY * this.stepY;
    const yStart = totalHeight / 2;

    for (let y = 0; y < this.numY; y++) {
      const rowCount = this.rowCounts[y];
      const rowWidth = rowCount * this.stepX;
      const xStart = -rowWidth / 2; // Center horizontally
      const yPos = yStart - y * this.stepY;

      for (let x = 0; x < rowCount; x++) {
        const xPos = xStart + x * this.stepX;

        // Convert to clip space coordinates (-1 to 1) and apply margin factor
        const x1 = (xPos / (this.gl.canvas.width / 2)) * margin;
        const x2 =
          ((xPos + this.rectWidth) / (this.gl.canvas.width / 2)) * margin;
        const y1 = (yPos / (this.gl.canvas.height / 2)) * margin;
        const y2 =
          ((yPos - this.rectHeight) / (this.gl.canvas.height / 2)) * margin;

        // Add two triangles for the rectangle
        vertices.push(
          x1,
          y1,
          x2,
          y1,
          x1,
          y2, // First triangle
          x2,
          y1,
          x2,
          y2,
          x1,
          y2 // Second triangle
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

    console.log(
      "Grid geometry created:",
      this.gridVertices.length / 2,
      "vertices"
    );
  }

  draw(particleSystem) {
    const program = this.shaderManager.use("grid");
    if (!program || !particleSystem) return;

    // Update density field based on particle positions
    this.density = this.renderModes.getValues(particleSystem); //updateDensityField

    // Draw grid cells with density colors
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    let cellOffset = 0;
    const gradientValues = this.gradient.getValues();

    for (let y = 0; y < this.numY; y++) {
      for (let x = 0; x < this.rowCounts[y]; x++) {
        const value = this.density[cellOffset];
        const normalizedValue = Math.max(
          0,
          Math.min(
            1,
            (value - this.minDensity) / (this.maxDensity - this.minDensity)
          )
        );

        const gradientIdx = Math.floor(normalizedValue * 255);
        const color = gradientValues[gradientIdx];

        this.gl.uniform4fv(program.uniforms.color, [
          color.r,
          color.g,
          color.b,
          1.0,
        ]);
        this.gl.drawArrays(this.gl.TRIANGLES, cellOffset * 6, 6);
        cellOffset++;
      }
    }
  }

  drawRectangle(x, y, size, color) {
    const program = this.shaderManager.use("grid");
    if (!program) return;

    // Convert from normalized coordinates (0-1) to clip space (-1 to 1)
    const x1 = x * 2 - 1;
    const y1 = y * 2 - 1;
    const x2 = (x + size) * 2 - 1;
    const y2 = (y + size) * 2 - 1;

    const vertices = [
      x1,
      y1, // Top-left
      x2,
      y1, // Top-right
      x1,
      y2, // Bottom-left
      x1,
      y2, // Bottom-left
      x2,
      y1, // Top-right
      x2,
      y2, // Bottom-right
    ];

    // Use temporary buffer for this single rectangle
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Set up attributes and uniforms
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.uniform4fv(program.uniforms.color, color);

    // Draw and cleanup
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.deleteBuffer(buffer);
  }
}

export { GridRenderer };
