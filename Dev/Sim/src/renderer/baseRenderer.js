import { ShaderManager } from "../shaders/shaderManager.js";

class BaseRenderer {
  constructor(gl, width, height) {
    if (!gl) {
      throw new Error("WebGL context is required");
    }
    if (typeof gl.createBuffer !== "function") {
      throw new Error("Invalid WebGL context");
    }
    this.gl = gl;
    this.width = width;
    this.height = height;
  }

  async initShaders() {
    const shaderManager = new ShaderManager(this.gl);
    this.programInfo = await shaderManager.init();
    return this.programInfo;
  }

  drawShape(vertices, color, programInfo) {
    const gl = this.gl;

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
  }
}

export { BaseRenderer };
