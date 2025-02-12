import { BaseRenderer } from "./baseRenderer.js";

class LineRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.lineBuffer = gl.createBuffer();
  }

  draw(lines, color = [0.2, 0.2, 0.2, 0.5]) {
    if (!lines || lines.length === 0) return;

    const program = this.shaderManager.use("lines");
    if (!program) return;

    const vertices = new Float32Array(lines.flatMap((p) => [p.x, p.y]));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    this.gl.uniform4fv(program.uniforms.color, color);
    this.gl.drawArrays(this.gl.LINES, 0, lines.length);
  }

  dispose() {
    if (this.lineBuffer) {
      this.gl.deleteBuffer(this.lineBuffer);
      this.lineBuffer = null;
    }
  }
}

export { LineRenderer };
