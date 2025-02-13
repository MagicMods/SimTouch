import { BaseRenderer } from "./baseRenderer.js";

class DebugRenderer extends BaseRenderer {
  constructor(canvas) {
    super(canvas);
    this.arrowLength = 20; // Length of velocity arrows
    this.pressureScale = 0.1; // Scale for pressure visualization
  }

  drawDebugOverlay(physics, programInfo) {
    if (!programInfo) return;

    // Existing debug overlays…
    if (physics.debugShowVelocityField) {
      this.drawVelocityField(physics, programInfo);
    }
    if (physics.debugShowPressureField) {
      this.drawPressureField(physics, programInfo);
    }
    if (physics.debugShowBoundaries) {
      this.drawBoundaries(physics, programInfo);
    }
    // NEW: Draw noise field visualization if enabled
    if (physics.debugShowNoiseField) {
      this.drawNoiseField(physics, programInfo);
    }
  }

  drawVelocityField(solver, programInfo) {
    const vertices = [];
    const scale = this.arrowLength;

    // Sample velocity field at regular intervals
    for (let y = 0; y < solver.height; y += 2) {
      for (let x = 0; x < solver.width; x += 2) {
        const i = solver.IX(x, y);
        const u = solver.u[i];
        const v = solver.v[i];

        // Convert to screen space
        const x1 = (x / solver.width) * 2 - 1;
        const y1 = -((y / solver.height) * 2 - 1);
        const x2 = x1 + u * scale;
        const y2 = y1 - v * scale;

        // Add arrow line
        vertices.push(x1, y1, x2, y2);
      }
    }

    this.drawShape(
      new Float32Array(vertices),
      [0.0, 1.0, 0.0, 0.5], // Semi-transparent green
      programInfo,
      this.gl.LINES
    );
  }

  drawPressureField(solver, programInfo) {
    const vertices = [];
    const colors = [];

    // Compute cell size in clip space:
    const cellWidth = 2 / solver.width;
    const cellHeight = 2 / solver.height;

    for (let y = 0; y < solver.height; y++) {
      for (let x = 0; x < solver.width; x++) {
        const p = solver.p[solver.IX(x, y)];
        // Map the pressure to an intensity
        const intensity = Math.min(Math.abs(p) * this.pressureScale, 1.0);
        // Build a color where positive pressure is red and negative is blue
        const r = p > 0 ? intensity : 0.0;
        const b = p < 0 ? intensity : 0.0;
        const a = 0.5;
        // Convert grid cell position to clip space coordinates
        const x1 = (x / solver.width) * 2 - 1;
        const y1 = -((y / solver.height) * 2 - 1);
        const x2 = x1 + cellWidth;
        const y2 = y1 - cellHeight;

        // Two triangles for the cell (quad)
        vertices.push(x1, y1, x2, y1, x1, y2, x2, y1, x2, y2, x1, y2);

        // Same color for all vertices in this cell
        for (let i = 0; i < 6; i++) {
          colors.push(r, 0, b, a);
        }
      }
    }

    // Create buffers and send to GPU
    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    const colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(colors),
      this.gl.STATIC_DRAW
    );

    // Set up attributes from programInfo
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.enableVertexAttribArray(programInfo.attributes.position);
    this.gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.enableVertexAttribArray(programInfo.attributes.color);
    this.gl.vertexAttribPointer(
      programInfo.attributes.color,
      4,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Draw all quads
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length / 2);

    // Cleanup
    this.gl.deleteBuffer(vertexBuffer);
    this.gl.deleteBuffer(colorBuffer);
  }

  drawBoundaries(solver, programInfo) {
    const vertices = [];

    for (let y = 0; y < solver.height; y++) {
      for (let x = 0; x < solver.width; x++) {
        if (solver.s[solver.IX(x, y)] === 1.0) {
          const x1 = (x / solver.width) * 2 - 1;
          const y1 = -((y / solver.height) * 2 - 1);
          vertices.push(x1, y1);
        }
      }
    }

    this.drawShape(
      new Float32Array(vertices),
      [1.0, 1.0, 1.0, 0.5], // Semi-transparent white
      programInfo,
      this.gl.POINTS
    );
  }

  drawNoiseField(physics, programInfo) {
    const vertices = [];
    const colors = [];

    // Use the configured noise field resolution (default to 20 if undefined)
    const cellCountX = physics.noiseFieldResolution || 20;
    const cellCountY = cellCountX;
    const cellWidth = 2 / cellCountX;
    const cellHeight = 2 / cellCountY;

    for (let i = 0; i < cellCountY; i++) {
      for (let j = 0; j < cellCountX; j++) {
        // Compute cell boundaries in [0,1] space
        const u1 = j / cellCountX;
        const v1 = i / cellCountY;
        const u2 = (j + 1) / cellCountX;
        const v2 = (i + 1) / cellCountY;

        // Calculate cell center in [0,1] for noise sampling
        const uCenter = (u1 + u2) / 2;
        const vCenter = (v1 + v2) / 2;

        // Sample noise – scale the input as desired (here using turbulenceScale)
        const noiseVal = physics.noise2D(
          uCenter * physics.turbulenceScale,
          vCenter * physics.turbulenceScale
        );

        // Map noise value to a grayscale intensity (assuming noise2D returns [0,1])
        const r = noiseVal,
          g = noiseVal,
          b = noiseVal,
          a = 0.5;

        // Convert cell boundaries to clip-space ([−1,1])
        const x1 = u1 * 2 - 1;
        const y1 = -(v1 * 2 - 1);
        const x2 = u2 * 2 - 1;
        const y2 = -(v2 * 2 - 1);

        // Quad defined as two triangles (6 vertices)
        vertices.push(x1, y1, x2, y1, x1, y2, x2, y1, x2, y2, x1, y2);

        // Same color for all vertices in this cell
        for (let k = 0; k < 6; k++) {
          colors.push(r, g, b, a);
        }
      }
    }

    // Create and populate buffers for vertices and colors
    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    const colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(colors),
      this.gl.STATIC_DRAW
    );

    // Bind position attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.enableVertexAttribArray(programInfo.attributes.position);
    this.gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Bind color attribute
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.enableVertexAttribArray(programInfo.attributes.color);
    this.gl.vertexAttribPointer(
      programInfo.attributes.color,
      4,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Draw the noise field overlay
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length / 2);

    // Cleanup buffers
    this.gl.deleteBuffer(vertexBuffer);
    this.gl.deleteBuffer(colorBuffer);
  }
}

export { DebugRenderer };
