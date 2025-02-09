import { ShaderLoader } from "./shaderLoader.js";

class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
  }

  async init() {
    const vertexSource = await ShaderLoader.loadShader("shaders/basic.vert");
    const fragmentSource = await ShaderLoader.loadShader("shaders/basic.frag");

    this.createProgram("basic", vertexSource, fragmentSource);
  }

  createProgram(name, vertexSource, fragmentSource) {
    const program = this.gl.createProgram();

    // Compile shaders
    const vertexShader = this.compileShader(
      vertexSource,
      this.gl.VERTEX_SHADER
    );
    const fragmentShader = this.compileShader(
      fragmentSource,
      this.gl.FRAGMENT_SHADER
    );

    // Attach and link
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    // Check for linking errors
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      this.cleanup(program, vertexShader, fragmentShader);
      throw new Error(`Program linking failed: ${error}`);
    }

    // Store program info
    const programInfo = {
      program: program,
      attributes: this.getAttributes(program),
      uniforms: this.getUniforms(program),
    };

    this.programs.set(name, programInfo);
    return programInfo;
  }

  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }

    return shader;
  }

  getAttributes(program) {
    const attributes = {};
    const numAttributes = this.gl.getProgramParameter(
      program,
      this.gl.ACTIVE_ATTRIBUTES
    );

    for (let i = 0; i < numAttributes; i++) {
      const info = this.gl.getActiveAttrib(program, i);
      attributes[info.name] = this.gl.getAttribLocation(program, info.name);
    }

    return attributes;
  }

  getUniforms(program) {
    const uniforms = {};
    const numUniforms = this.gl.getProgramParameter(
      program,
      this.gl.ACTIVE_UNIFORMS
    );

    for (let i = 0; i < numUniforms; i++) {
      const info = this.gl.getActiveUniform(program, i);
      uniforms[info.name] = this.gl.getUniformLocation(program, info.name);
    }

    return uniforms;
  }

  getProgram(name) {
    const program = this.programs.get(name);
    if (!program) {
      throw new Error(`Shader program '${name}' not found`);
    }
    return program;
  }

  cleanup(program, vertexShader, fragmentShader) {
    if (vertexShader) this.gl.deleteShader(vertexShader);
    if (fragmentShader) this.gl.deleteShader(fragmentShader);
    if (program) this.gl.deleteProgram(program);
  }

  dispose() {
    this.programs.forEach((programInfo, name) => {
      this.gl.deleteProgram(programInfo.program);
    });
    this.programs.clear();
  }
}

export { ShaderManager };
