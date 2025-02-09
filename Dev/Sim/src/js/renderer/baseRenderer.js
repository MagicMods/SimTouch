import { ShaderManager } from "../shaders/shaderManager.js";

class BaseRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    this.initWebGL();
    this.setupViewport();
    this.initShaders();
  }

  async initShaders() {
    this.shaderManager = new ShaderManager(this.gl);
    await this.shaderManager.init();
    this.currentProgram = this.shaderManager.getProgram("basic");
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
