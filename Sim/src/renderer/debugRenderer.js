import { BaseRenderer } from "./baseRenderer.js";

class DebugRenderer extends BaseRenderer {
  constructor(gl) {
    super(gl);
    this.programInfo = null; // Will store shader program info
    this.arrowLength = 2; // Length of velocity arrows
    this.pressureScale = 0.01; // Scale for pressure visualization
  }

  init() {
    // Create shader program for debug visualization
    this.programInfo = createDebugShaderProgram(this.gl);
  }

  // Rename render to drawDebugOverlay to match the call in main.js
  drawDebugOverlay(physics, programInfo) {
    if (!physics.debugEnabled) return;

    const program = programInfo || this.programInfo;
    if (!program) {
      console.warn("No shader program available for debug rendering");
      return;
    }

    if (physics.debugShowVelocityField) {
      this.drawVelocityField(physics, program);
    }
    if (physics.debugShowPressureField) {
      this.drawPressureField(physics, program);
    }
    if (physics.debugShowBoundaries) {
      this.drawBoundaries(physics, program);
    }
    if (physics.debugShowFlipGrid) {
      this.drawFlipGrid(physics, program);
    }
    if (physics.debugShowNoiseField) {
      this.drawNoiseField(physics, program);
    }
  }

  drawVelocityField(physics, programInfo) {
    // Should be physics.fluid instead of solver
    const vertices = [];
    // const scale = this.arrowLength;
    const scale = 0.1;

    // Sample velocity field from FLIP fluid
    for (let y = 0; y < physics.fluid.gridSize; y += 2) {
      for (let x = 0; x < physics.fluid.gridSize; x += 2) {
        const i = x + y * physics.fluid.gridSize;
        const u = physics.fluid.u[i];
        const v = physics.fluid.v[i];

        // Convert to screen space
        const x1 = (x / physics.fluid.gridSize) * 2 - 1;
        const y1 = -((y / physics.fluid.gridSize) * 2 - 1);
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
      this.gl.BASIC
    );
  }

  drawPressureField(physics, programInfo) {
    const vertices = [];
    const colors = [];
    const n = physics.fluid.gridSize;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const idx = i * n + j;
        const p = physics.fluid.pressure[idx];
        // ...rest of pressure visualization
        const intensity = Math.min(Math.abs(p) * this.pressureScale, 1.0);
        const r = p > 0 ? intensity : 0.0;
        const b = p < 0 ? intensity : 0.0;
        const a = 0.5;
        const x1 = (j / n) * 2 - 1;
        const y1 = -((i / n) * 2 - 1);
        const x2 = x1 + 2 / n;
        const y2 = y1 - 2 / n;

        vertices.push(x1, y1, x2, y1, x1, y2, x2, y1, x2, y2, x1, y2);

        for (let k = 0; k < 6; k++) {
          colors.push(r, 0, b, a);
        }
      }
    }

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

    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length / 2);

    this.gl.deleteBuffer(vertexBuffer);
    this.gl.deleteBuffer(colorBuffer);
  }

  drawBoundaries(physics, programInfo) {
    const vertices = [];
    const n = physics.fluid.gridSize;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (physics.fluid.solid[i * n + j]) {
          const x = (j / n) * 2 - 1;
          const y = -((i / n) * 2 - 1);
          vertices.push(x, y);
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

  drawFlipGrid(physics, programInfo) {
    const vertices = [];
    const colors = [];
    const n = physics.fluid.gridSize;
    // console.log("FLIP grid size:", n);

    if (!n) {
      console.warn("Invalid grid size");
      return;
    }

    // First draw the centered pressure points (using FLIP's [0,1] space)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Cell centers in [0,1] space
        const x = (j + 0.5) / n;
        const y = (i + 0.5) / n;

        // Convert to clip space
        const xClip = x * 2 - 1;
        const yClip = -(y * 2 - 1); // Flip Y for WebGL

        const size = 0.01; // Increased for visibility
        vertices.push(
          xClip - size,
          yClip,
          xClip + size,
          yClip,
          xClip,
          yClip - size,
          xClip,
          yClip + size
        );

        // Red crosses for pressure points
        for (let k = 0; k < 4; k++) {
          colors.push(1, 0, 0, 1);
        }
      }
    }

    // Draw U velocity points (vertical faces)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = j / n; // Staggered U positions
        const y = (i + 0.5) / n; // Cell centers in Y

        const xClip = x * 2 - 1;
        const yClip = -(y * 2 - 1);

        const size = 0.008;
        vertices.push(xClip - size, yClip, xClip + size, yClip);

        // Green for U velocities
        colors.push(0, 1, 0, 1, 0, 1, 0, 1);
      }
    }

    // Draw V velocity points (horizontal faces)
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (j + 0.5) / n; // Cell centers in X
        const y = i / n; // Staggered V positions

        const xClip = x * 2 - 1;
        const yClip = -(y * 2 - 1);

        const size = 0.008;
        vertices.push(xClip, yClip - size, xClip, yClip + size);

        // Blue for V velocities
        colors.push(0, 0, 1, 1, 0, 0, 1, 1);
      }
    }

    // Create buffers
    const vertexBuffer = this.gl.createBuffer();
    const colorBuffer = this.gl.createBuffer();

    // Save current WebGL state
    const lastProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);

    // Set up drawing
    this.gl.useProgram(programInfo.program);

    // Bind vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );
    this.gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(programInfo.attributes.position);

    // Bind color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(colors),
      this.gl.STATIC_DRAW
    );
    this.gl.vertexAttribPointer(
      programInfo.attributes.color,
      4,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(programInfo.attributes.color);

    // Draw the grid
    this.gl.drawArrays(this.gl.LINES, 0, vertices.length / 2);

    // Cleanup
    this.gl.deleteBuffer(vertexBuffer);
    this.gl.deleteBuffer(colorBuffer);

    // Restore WebGL state
    this.gl.useProgram(lastProgram);
  }
}

export { DebugRenderer };
