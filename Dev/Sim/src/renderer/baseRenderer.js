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
}

export { BaseRenderer };
