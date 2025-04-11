import { gridCellShader } from "./shaders/gridCell.js";
import {
  vertexShader as particleVertex,
  fragmentShader as particleFragment,
} from "./shaders/particles.js";

const particleShader = { vertex: particleVertex, fragment: particleFragment };

const SHADERS = {
  gridCell: gridCellShader,
  particles: particleShader,
};

class ShaderManager {
  constructor(gl) {
    if (!gl) {
      throw new Error("WebGL context is required for ShaderManager");
    }
    this.gl = gl;
    this.programs = new Map();
    this.currentProgram = null;
  }

  async init() {
    // Original simple init for direct objects
    for (const [name, shaders] of Object.entries(SHADERS)) {
      const vertexSource = shaders.vert || shaders.vertex;
      const fragmentSource = shaders.frag || shaders.fragment;

      if (!vertexSource) {
        throw new Error(`Vertex shader source not provided for "${name}"`);
      }

      if (!fragmentSource) {
        throw new Error(`Fragment shader source not provided for "${name}"`);
      }

      // createProgram is synchronous
      this.createProgram(name, vertexSource, fragmentSource);
    }
    console.log("Grid shaders loaded and compiled."); // Adjusted log message
    return true;
  }

  use(name) {
    const program = this.programs.get(name);
    if (!program) {
      throw new Error(`Shader program '${name}' not found`);
    }

    if (this.currentProgram !== program.program) {
      this.gl.useProgram(program.program);
      this.currentProgram = program.program;
    }

    return program;
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

  createProgram(name, vertexSource, fragmentSource) {
    const vertexShader = this.compileShader(
      this.gl.VERTEX_SHADER,
      vertexSource
    );

    const fragmentShader = this.compileShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource
    );

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(
        `Failed to link program "${name}": ${this.gl.getProgramInfoLog(program)}`
      );
    }

    // Store program info
    this.programs.set(name, {
      program,
      attributes: this.getAttributes(program),
      uniforms: this.getUniforms(program),
    });

    return this.programs.get(name);
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const shaderType = type === this.gl.VERTEX_SHADER ? "vertex" : "fragment";
      throw new Error(
        `Failed to compile ${shaderType} shader: ${this.gl.getShaderInfoLog(shader)}`
      );
    }

    return shader;
  }

  getProgram(name) {
    const program = this.programs.get(name);
    if (!program) {
      throw new Error(`Shader program '${name}' not found`);
    }
    return program;
  }

  dispose() {
    this.programs.forEach((programInfo) => {
      this.gl.deleteProgram(programInfo.program);
    });
    this.programs.clear();
    this.currentProgram = null;
  }
}

export { ShaderManager };
