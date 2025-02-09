import { ShaderManager } from "../shaders/shaderManager.js";

class BaseRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = this.canvas.height;

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
      throw new Error("Failed to create vertex buffer");
    }

    // Initialize WebGL state
    this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
    this.gl.viewport(0, 0, this.width, this.height);

    this.programInfo = null;
    console.log("Initialized with dimensions:", this.width, this.height);
  }

  async initShaders() {
    try {
      if (this.programInfo) {
        console.log("Using existing shader program");
        return this.programInfo;
      }

      console.log("Creating new ShaderManager");
      this.shaderManager = new ShaderManager(this.gl);

      console.log("Initializing ShaderManager");
      this.programInfo = await this.shaderManager.init();

      console.log("ProgramInfo received:", this.programInfo);

      if (!this.programInfo) {
        throw new Error("ProgramInfo is null");
      }

      if (!this.programInfo.program) {
        throw new Error("WebGL program is null");
      }

      console.log("Shader program initialized successfully");
      return this.programInfo;
    } catch (error) {
      console.error("Shader initialization failed:", error);
      console.error("Stack:", error.stack);
      throw new Error("Failed to initialize shader program");
    }
  }

  beginRender() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  drawShape(vertices, color) {
    this.gl.useProgram(this.currentProgram.program);

    // Update vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Set attributes
    const positionLoc = this.currentProgram.attributes.position;
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const colorLoc = this.currentProgram.uniforms.color;
    this.gl.uniform4fv(colorLoc, color);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, vertices.length / 2);
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
