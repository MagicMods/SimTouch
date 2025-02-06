import { initShaderProgram } from "./shaders.js";

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    this.gl = canvas.getContext("webgl");
    if (!this.gl) throw new Error("WebGL not supported");

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

  clear() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  createBuffer() {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error("Failed to create buffer");
    }
    return buffer;
  }

  draw(grid) {
    // console.log("Drawing frame");

    // Clear with white background to verify clearing works
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Debug shader program binding
    this.gl.useProgram(this.programInfo.program);
    // console.log("Program info:", this.programInfo);

    // Debug uniform locations
    // console.log("Uniforms:", {
    //   resolution: this.programInfo.uniformLocations.resolution,
    //   color: this.programInfo.uniformLocations.color,
    //   center: this.programInfo.uniformLocations.center,
    //   radius: this.programInfo.uniformLocations.radius,
    // });

    // Debug vertex attribute locations
    // const positionLocation = this.gl.getAttribLocation(
    //   this.programInfo.program,
    //   "aPosition"
    // );
    // console.log("Position attribute location:", positionLocation);

    // Set viewport explicitly
    this.gl.viewport(0, 0, this.width, this.height);

    // Continue with normal drawing
    this.drawGrid(grid);
    this.drawObstacles(grid);
    this.drawParticles(grid);
  }

  drawGrid(grid) {
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.useProgram(this.programInfo.program);

    // Draw grid lines
    const lineVertices = [];

    // Vertical lines
    for (let i = 0; i <= grid.numX; i++) {
      const x = -1.0 + (i * 2.0) / grid.numX;
      lineVertices.push(x, -1.0, x, 1.0);
    }

    // Horizontal lines
    for (let j = 0; j <= grid.numY; j++) {
      const y = -1.0 + (j * 2.0) / grid.numY;
      lineVertices.push(-1.0, y, 1.0, y);
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(lineVertices),
      this.gl.STATIC_DRAW
    );

    // Draw lines in white
    this.gl.uniform4f(
      this.programInfo.uniformLocations.color,
      1.0,
      1.0,
      1.0,
      0.2
    );

    const positionLoc = this.programInfo.attribLocations.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.lineWidth(1.0);
    this.gl.drawArrays(this.gl.LINES, 0, lineVertices.length / 2);
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
    const vertexBuffer = this.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);

    const vertices = [];
    const particleRadius = 6; // Increased radius for better visibility

    for (const p of grid.particles) {
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

    this.gl.uniform4f(
      this.programInfo.uniformLocations.color,
      0.2,
      0.6,
      1.0,
      1.0
    );

    const positionLoc = this.programInfo.attribLocations.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    const verticesPerParticle = 18; // Updated to match the increased number of segments
    for (let i = 0; i < grid.particles.length; i++) {
      this.gl.drawArrays(
        this.gl.TRIANGLE_FAN,
        i * verticesPerParticle,
        verticesPerParticle
      );
    }

    this.gl.deleteBuffer(vertexBuffer);
  }
}

export { Renderer };
