import { BaseRenderer } from "./baseRenderer.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);
    this.vertexBuffer = gl.createBuffer();
    this.boundaryBuffer = gl.createBuffer();

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
    // Create boundary geometry (a simple circle using this.boundaryRadius)
    this.boundaryVertices = this.createBoundaryGeometry();
    this.boundaryVertexCount = this.boundaryVertices.length / 2;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boundaryBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.boundaryVertices,
      this.gl.STATIC_DRAW
    );

    console.log("GridRenderer initialized with scale:", scale);
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

  // Uses the current this.boundaryRadius to generate circle vertices.
  createBoundaryGeometry() {
    const segments = 100; // Number of segments for the circle
    const vertices = new Float32Array(segments * 2);
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices[i * 2] = Math.cos(angle) * this.boundaryRadius; // x coordinate
      vertices[i * 2 + 1] = Math.sin(angle) * this.boundaryRadius; // y coordinate
    }
    return vertices;
  }

  // Allow external code (e.g., UI) to update the visual boundary radius.
  updateBoundaryGeometry(newRadius) {
    const marginFactor = 1.01; // Adjust this factor to leave a margin (values < 1.0 shrink the circle)
    // Previously, boundaryRadius was set to newRadius * 2.
    // Now, multiply by marginFactor to ensure the circle (visual boundary) doesn't reach the screen edge.
    this.boundaryRadius = newRadius * 2 * marginFactor;
    const vertices = this.createBoundaryGeometry();
    this.boundaryVertices = vertices;
    this.boundaryVertexCount = vertices.length / 2;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boundaryBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    console.log("Boundary geometry updated with radius:", this.boundaryRadius);
  }

  draw() {
    const program = this.setupShader("basic");
    if (!program) return;

    // Draw grid rectangles
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
    // Draw grid in a dark gray color
    this.gl.uniform4fv(program.uniforms.color, [0.2, 0.2, 0.2, 1.0]);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.gridVertices.length / 2);

    // Draw circle boundary
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boundaryBuffer);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    // Set white color for the boundary line
    this.gl.uniform4fv(program.uniforms.color, [1.0, 1.0, 1.0, 1.0]);
    // Set line width to 2px (note: on some systems, lineWidth might not work as expected)
    this.gl.lineWidth(2);
    this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.boundaryVertexCount);
  }
}

export { GridRenderer };
