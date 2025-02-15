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

    // Add density field parameters with defaults
    this.density = new Float32Array(this.getTotalCells());
    this.minDensity = 0.0;
    this.maxDensity = 5.0;
    this.gradientPoints = [
      { pos: 0, r: 0, g: 0, b: 0 },
      { pos: 60, r: 144 / 255, g: 3 / 255, b: 0 },
      { pos: 80, r: 1, g: 6 / 255, b: 0 },
      { pos: 95, r: 1, g: 197 / 255, b: 0 },
      { pos: 100, r: 1, g: 1, b: 1 },
    ];
    this.gradient = this.createGradient();

    // Visualization settings
    this.showDensity = true;
    this.densityOpacity = 0.8;

    console.log("GridRenderer initialized with scale:", scale);
  }

  getTotalCells() {
    return this.rowCounts.reduce((sum, count) => sum + count, 0);
  }

  createGradient() {
    const gradient = new Array(256).fill(0).map(() => ({ r: 0, g: 0, b: 0 }));

    // Define color control points
    const rawGradient = this.gradientPoints;

    // Interpolate between control points
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let lower = rawGradient[0];
      let upper = rawGradient[rawGradient.length - 1];

      for (let j = 0; j < rawGradient.length - 1; j++) {
        if (t * 100 >= rawGradient[j].pos && t * 100 < rawGradient[j + 1].pos) {
          lower = rawGradient[j];
          upper = rawGradient[j + 1];
          break;
        }
      }

      const range = upper.pos - lower.pos;
      const localT = (t * 100 - lower.pos) / range;
      gradient[i] = {
        r: this.lerp(lower.r, upper.r, localT),
        g: this.lerp(lower.g, upper.g, localT),
        b: this.lerp(lower.b, upper.b, localT),
      };
    }

    return gradient;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
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

  updateDensityField(particleSystem) {
    if (!particleSystem || !particleSystem.getParticles) return; // Safety check

    this.density.fill(0);
    const particles = particleSystem.getParticles();

    if (!particles || !particles.length) return; // Check particles exist

    for (const p of particles) {
      // Calculate grid cell influence
      const relY = (1 - p.y) * this.gl.canvas.height;
      const row = Math.floor(relY / this.stepY);

      // Check neighboring rows
      for (
        let j = Math.max(0, row - 2);
        j < Math.min(this.numY, row + 3);
        j++
      ) {
        const rowWidth = this.rowCounts[j] * this.stepX;
        const rowBaseX = (this.gl.canvas.width - rowWidth) / 2;
        const relX = p.x * this.gl.canvas.width - rowBaseX;
        const col = Math.floor(relX / this.stepX);

        // Check neighboring cells in this row
        for (
          let i = Math.max(0, col - 2);
          i < Math.min(this.rowCounts[j], col + 3);
          i++
        ) {
          const idx = this.getCellIndex(i, j);
          if (idx === -1) continue;

          // Calculate cell center
          const cellCenterX = rowBaseX + (i + 0.5) * this.stepX;
          const cellCenterY = j * this.stepY + this.stepY * 0.5;

          // Calculate influence based on distance
          const dx = p.x * this.gl.canvas.width - cellCenterX;
          const dy = (1 - p.y) * this.gl.canvas.height - cellCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / (this.stepX * 1.5));

          this.density[idx] += influence;
        }
      }
    }
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

  draw(particleSystem) {
    const program = this.setupShader("basic");
    if (!program || !particleSystem) return;

    // Update density field based on particle positions
    this.updateDensityField(particleSystem);

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
    for (let y = 0; y < this.numY; y++) {
      for (let x = 0; x < this.rowCounts[y]; x++) {
        if (this.showDensity) {
          // Map density to [0,1] range using min/max
          const normalizedDensity = Math.max(
            0,
            Math.min(
              1,
              (this.density[cellOffset] - this.minDensity) /
                (this.maxDensity - this.minDensity)
            )
          );
          const gradientIdx = Math.floor(normalizedDensity * 255);
          const color = this.gradient[gradientIdx];

          this.gl.uniform4fv(program.uniforms.color, [
            color.r,
            color.g,
            color.b,
            this.densityOpacity,
          ]);
        } else {
          // Default grid color when density display is off
          this.gl.uniform4fv(program.uniforms.color, [0.2, 0.2, 0.2, 0.5]);
        }

        this.gl.drawArrays(this.gl.TRIANGLES, cellOffset * 6, 6);
        cellOffset++;
      }
    }
    // Draw boundary
    this.drawBoundary(program);
  }

  drawBoundary(program) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.boundaryBuffer);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.uniform4fv(program.uniforms.color, [1.0, 1.0, 1.0, 1.0]);
    this.gl.lineWidth(2);
    this.gl.drawArrays(this.gl.LINE_LOOP, 0, this.boundaryVertexCount);
  }

  // Add method to update gradient
  updateGradient() {
    this.gradient = this.createGradient();
  }
}

export { GridRenderer };
