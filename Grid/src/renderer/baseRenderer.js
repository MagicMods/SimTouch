export class BaseRenderer {
  constructor(gl, shaderManager) {
    if (!gl) throw new Error("WebGL context is required.");
    if (!shaderManager) throw new Error("ShaderManager instance is required.");
    this.gl = gl;
    this.shaderManager = shaderManager;
  }
}
