import { ShaderLoader } from "./shaderLoader.js";

class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this.programInfo = null;
  }

  async init() {
    const vertexSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform vec4 color;
      void main() {
        gl_FragColor = color;
      }
    `;

    this.programInfo = this.createProgram(vertexSource, fragmentSource);
    return this.programInfo;
  }

  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;

    // Create shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      fragmentSource
    );

    // Create and link program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking failed:", gl.getProgramInfoLog(program));
      return null;
    }

    // Get attributes and uniforms
    return {
      program: program,
      attributes: {
        position: gl.getAttribLocation(program, "position"),
      },
      uniforms: {
        color: gl.getUniformLocation(program, "color"),
      },
    };
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
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
