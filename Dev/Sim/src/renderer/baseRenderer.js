import { ShaderManager } from "../shaders/shaderManager.js";

class BaseRenderer {
  constructor(gl, shaderManager) {
    if (!gl) {
      throw new Error("WebGL context is required");
    }
    if (typeof gl.createBuffer !== "function") {
      throw new Error("Invalid WebGL context");
    }
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.vertexBuffer = gl.createBuffer();
  }

  async initShaders() {
    const shaderManager = new ShaderManager(this.gl);
    this.programInfo = await shaderManager.init();
    return this.programInfo;
  }

  setupShader(name) {
    const program = this.shaderManager.use(name);
    if (!program) {
      console.error("Failed to set up shader program:", name);
      return null;
    }
    return program;
  }

  setVertexData(data) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }

  bindAttribute(location, size) {
    const gl = this.gl;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  drawShape(vertices, color, programInfo, mode) {
    const gl = this.gl;

    // Save WebGL state
    const lastProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);

    this.gl.useProgram(programInfo.program);

    // Clear canvas
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use shader program
    gl.useProgram(programInfo.program);

    // Set up vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Set up attributes
    const positionLoc = programInfo.attributes.position;
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    const colorLoc = programInfo.uniforms.color;
    gl.uniform4fv(colorLoc, color);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

    // Restore WebGL state
    this.gl.useProgram(lastProgram);
  }
}

export { BaseRenderer };
