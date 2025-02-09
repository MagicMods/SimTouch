import { ShaderManager } from "../shaders/shaderManager.js";

class BaseRenderer {
  constructor(canvas) {
    this.canvas = canvas;

    // Single source of truth for dimensions
    const CANVAS_SIZE = 1000; // Match working template
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;

    // Initialize WebGL context
    this.gl = this.canvas.getContext("webgl2");
    if (!this.gl) {
      this.gl = this.canvas.getContext("webgl");
    }
    if (!this.gl) {
      throw new Error("WebGL not supported");
    }

    // Create vertex buffer
    this.vertexBuffer = this.gl.createBuffer();
    if (!this.vertexBuffer) {
      console.error("Failed to create vertex buffer");
      return;
    }

    // Initialize WebGL state
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.viewport(0, 0, this.width, this.height);

    this.programInfo = null;
    console.log(
      "Initialized with dimensions:",
      this.canvas.width,
      this.canvas.height
    );

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  async initShaders() {
    try {
      this.shaderManager = new ShaderManager(this.gl);
      this.programInfo = await this.shaderManager.init();

      if (!this.programInfo || !this.programInfo.program) {
        throw new Error("Shader program creation failed");
      }

      // Use the program immediately after creation
      this.gl.useProgram(this.programInfo.program);

      return this.programInfo;
    } catch (error) {
      console.error("Shader initialization failed:", error);
      throw error;
    }
  }

  beginRender() {
    // Set clear color to dark gray for visibility
    this.gl.clearColor(0.2, 0.2, 0.2, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  drawShape(vertices, color, programInfo) {
    // Use provided program info
    const program = programInfo.program;
    this.gl.useProgram(program);

    // Set vertices
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Set attributes and uniforms using programInfo
    const positionLoc = programInfo.attributes.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    const colorLoc = programInfo.uniforms.color;
    this.gl.uniform4fv(colorLoc, color);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length / 2);
  }

  drawTestRectangle() {
    if (!this.programInfo || !this.programInfo.program) {
      console.error("No valid shader program available");
      return;
    }

    // Use the shader program
    this.gl.useProgram(this.programInfo.program);

    // Create test vertices
    const vertices = new Float32Array([
      -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5,
    ]);

    // Update buffer data
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Enable vertex attributes
    const positionLoc = this.programInfo.attributes.position;
    if (positionLoc === undefined) {
      console.error("Position attribute not found in shader");
      return;
    }
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    // Set color uniform
    const colorLoc = this.programInfo.uniforms.color;
    if (colorLoc === null) {
      console.error("Color uniform not found in shader");
      return;
    }
    this.gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 1.0]); // Red color

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width, height) {
    // Update canvas size
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;

    // Update WebGL viewport
    this.gl.viewport(0, 0, width, height);

    // Preserve the shader program state
    if (this.programInfo && this.programInfo.program) {
      this.gl.useProgram(this.programInfo.program);
    }

    console.log(`Renderer resized to ${width}x${height}`);
  }

  endRender() {
    this.gl.flush();
  }

  dispose() {
    this.shaderManager.dispose();
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
    }
  }
}

export { BaseRenderer };
