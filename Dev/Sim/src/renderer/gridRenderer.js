import { BaseRenderer } from "./baseRenderer.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);

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

    this.createGridGeometry();
    console.log("GridRenderer initialized with scale:", scale);
  }

  createGridGeometry() {
    const vertices = [];

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

        // Convert to clip space coordinates (-1 to 1)
        const x1 = xPos / (this.gl.canvas.width / 2);
        const x2 = (xPos + this.rectWidth) / (this.gl.canvas.width / 2);
        const y1 = yPos / (this.gl.canvas.height / 2);
        const y2 = (yPos - this.rectHeight) / (this.gl.canvas.height / 2);

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

  draw() {
    const program = this.setupShader("basic");
    if (!program) return;

    // Bind vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

    // Set up position attribute
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set color uniform
    this.gl.uniform4fv(program.uniforms.color, [0.2, 0.2, 0.2, 1.0]);

    // Draw triangles
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.gridVertices.length / 2);

    console.log("Grid drawn:", this.gridVertices.length / 2, "vertices");
  }
}

export { GridRenderer };
