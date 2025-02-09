import { initShaderProgram } from "./shaders.js";

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    // Try to get WebGL2 context first, then fallback to WebGL
    this.gl = canvas.getContext("webgl2");
    if (!this.gl) {
      this.gl = canvas.getContext("webgl");
    }
    if (!this.gl) {
      throw new Error("WebGL not supported");
    }

    // Initialize WebGL context
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.programInfo = initShaderProgram(this.gl);
    this.vertexBuffer = this.gl.createBuffer();

    // Set viewport size
    this.gl.viewport(0, 0, this.width, this.height);
    console.log("Initialized with dimensions:", this.width, this.height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  createBuffer() {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error("Failed to create buffer");
    }
    return buffer;
  }

  draw(grid) {
    // Reset WebGL state
    // this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
    // this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.viewport(0, 0, this.width, this.height);
    this.gl.useProgram(this.programInfo.program);

    // Draw in correct order:
    // 1. Draw rectangles (background)
    const rectangles = grid.generateRectangles();
    rectangles.forEach((rect) => {
      grid.drawRectangle(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        rect.color,
        this.programInfo
      );
    });

    // 2. Draw particles (on top of rectangles)
    this.drawParticles(grid);

    // 3. Draw obstacle (topmost)
    if (grid.isObstacleActive) {
      this.drawObstacles(grid);
    }
  }
  drawObstacles(grid) {
    const vertexBuffer = this.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);

    // Convert to clip space coordinates
    const cx = (grid.circleCenter.x / this.width) * 2.0 - 1.0;
    const cy = -((grid.circleCenter.y / this.height) * 2.0 - 1.0); // Flip Y
    const radius =
      (grid.circleRadius / Math.min(this.width, this.height)) * 2.0; // Uniform radius

    const vertices = [];
    const numSegments = 32;
    vertices.push(cx, cy);

    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * 2 * Math.PI;
      vertices.push(
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle) // Remove scaleY factor
      );
    }

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    this.gl.uniform4f(this.programInfo.uniformLocations.color, 0, 0, 0, 1);

    const positionLoc = this.programInfo.attribLocations.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);
    this.gl.deleteBuffer(vertexBuffer);
  }

  drawParticles(grid) {
    // Enable blending for transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    const vertexBuffer = this.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);

    const vertices = [];
    const particleRadius = grid.particleSystem.particleRadius;
    const particles = grid.particleSystem.getParticles();
    for (const p of particles) {
      // Convert to clip space while preserving aspect ratio
      const px = (p.x / this.width) * 2.0 - 1.0;
      const py = -((p.y / this.height) * 2.0 - 1.0);
      const pr = (particleRadius / Math.min(this.width, this.height)) * 2.0; // Uniform radius

      // Center vertex
      vertices.push(px, py);

      // Circle vertices with more segments for smoother appearance
      const numSegments = 16; // Increased from 8
      for (let i = 0; i <= numSegments; i++) {
        const angle = (i / numSegments) * 2 * Math.PI;
        vertices.push(px + pr * Math.cos(angle), py + pr * Math.sin(angle));
      }
    }

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Use particleSystem's color including alpha
    const color = grid.particleSystem.particleColor;
    this.gl.uniform4f(
      this.programInfo.uniformLocations.color,
      color[0],
      color[1],
      color[2],
      color[3] // Use alpha from particleSystem
    );

    const positionLoc = this.programInfo.attribLocations.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    const verticesPerParticle = 18; // Updated to match the increased number of segments
    for (let i = 0; i < particles.length; i++) {
      // Changed from grid.particles to particles
      this.gl.drawArrays(
        this.gl.TRIANGLE_FAN,
        i * verticesPerParticle,
        verticesPerParticle
      );
    }

    this.gl.deleteBuffer(vertexBuffer);
  }

  drawTestRectangle() {
    // Ensure the correct program is active
    this.gl.useProgram(this.programInfo.program);

    const vertices = new Float32Array([
      -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Use the attribute location from programInfo
    const positionLoc = this.programInfo.attribLocations.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.uniform4fv(
      this.programInfo.uniformLocations.color,
      [1.0, 0.0, 0.0, 1.0]
    );
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

export { Renderer };
