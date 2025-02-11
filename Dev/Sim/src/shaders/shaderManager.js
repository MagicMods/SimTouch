import { ShaderLoader } from "./shaderLoader.js";

class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
    this.currentProgram = null;
    console.log("ShaderManager created");
  }

  init() {
    try {
      // Create basic shader program immediately
      const program = this.createBasicProgram();
      this.programs.set("basic", program);
      console.log("Basic shader program created:", program);
      return program;
    } catch (error) {
      console.error("Failed to initialize shader:", error);
      return null;
    }
  }

  createBasicProgram() {
    const vertexShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform vec4 color;
      void main() {
        gl_FragColor = color;
      }
    `;

    const program = this.createProgram(vertexShader, fragmentShader);
    return {
      program: program,
      attributes: {
        position: this.gl.getAttribLocation(program, "position"),
      },
      uniforms: {
        color: this.gl.getUniformLocation(program, "color"),
      },
    };
  }

  use(name) {
    const program = this.programs.get(name);
    if (!program) {
      console.error(`Shader program '${name}' not found`);
      return null;
    }
    if (this.currentProgram !== program.program) {
      this.gl.useProgram(program.program);
      this.currentProgram = program.program;
      console.log(`Using shader program: ${name}`);
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

  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(
        `Failed to link program: ${gl.getProgramInfoLog(program)}`
      );
    }

    return program;
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(
        `Failed to compile shader: ${gl.getShaderInfoLog(shader)}`
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
