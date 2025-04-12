class BaseRenderer {
  constructor(gl, shaderManager) {
    if (!gl) throw new Error("WebGL context is required");
    this.gl = gl;
    this.shaderManager = shaderManager;
  }
}

export { BaseRenderer };
