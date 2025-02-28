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

  drawCircle(cx, cy, radius, color) {
    const program = this.shaderManager.use("circle");
    if (!program) return;

    const numSegments = 100;
    const vertices = [];
    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * 2 * Math.PI;
      vertices.push(
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle)
      );
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.uniform4fv(program.uniforms.color, color);
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);
  }
}

export { BaseRenderer };
