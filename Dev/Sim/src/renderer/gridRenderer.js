import { BaseRenderer } from "./baseRenderer.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, width, height) {
    super(gl, width, height);

    // Calculate aspect-ratio independent radius, 10% larger
    const aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    this.boundaryRadius = Math.min(1.0, 1.0 / aspectRatio) * 0.96; // from 0.8 to 0.88

    this.aspectRatio = width / height;

    // Grid layout parameters
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.numY = this.rowCounts.length;
    this.numX = Math.max(...this.rowCounts);

    // Create buffer
    this.vertexBuffer = this.gl.createBuffer();
    this.createGridGeometry();
    this.initBoundary();
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

  initBoundary() {
    this.boundaryBuffer = this.gl.createBuffer();
    const segments = 32;
    const vertices = new Float32Array(segments * 2);

    // Generate circle points for perfect circle
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices[i * 2] = Math.cos(angle) * this.boundaryRadius;
      vertices[i * 2 + 1] = Math.sin(angle) * this.boundaryRadius;
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boundaryBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    this.boundaryVertexCount = segments;
  }

  drawBoundary(programInfo, radius) {
    const gl = this.gl;
    const segments = 32;
    const vertices = new Float32Array(segments * 2);

    // Generate circle vertices
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices[i * 2] = Math.cos(angle) * radius * 2; // Scale for visibility
      vertices[i * 2 + 1] = Math.sin(angle) * radius * 2; // Scale for visibility
    }

    // Create and bind buffer
    const boundaryBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boundaryBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Set line properties
    gl.lineWidth(2.0);
    gl.uniform4fv(programInfo.uniforms.color, [1.0, 1.0, 1.0, 1.0]); // White color

    // Draw boundary
    gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attributes.position);
    gl.drawArrays(gl.LINE_LOOP, 0, segments);
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

    // Draw boundary after grid
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boundaryBuffer);
    this.gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set white color and double line width
    this.gl.uniform4fv(programInfo.uniforms.color, [1.0, 1.0, 1.0, 1.0]);
    this.gl.lineWidth(2.0);

    // Draw circle
    this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.boundaryVertexCount);
  }
}

export { GridRenderer };
