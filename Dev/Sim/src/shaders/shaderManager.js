class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
    this.currentProgram = null;
    console.log("ShaderManager created");
  }

  init() {
    try {
      // Create both shader programs
      const basicProgram = this.createProgram(
        ShaderManager.SHADERS.basic.vert,
        ShaderManager.SHADERS.basic.frag
      );
      this.programs.set("basic", {
        program: basicProgram,
        attributes: this.getAttributes(basicProgram),
        uniforms: this.getUniforms(basicProgram),
      });
      console.log("Created shader program: basic");

      const particleProgram = this.createProgram(
        ShaderManager.SHADERS.particles.vert,
        ShaderManager.SHADERS.particles.frag
      );
      this.programs.set("particles", {
        program: particleProgram,
        attributes: this.getAttributes(particleProgram),
        uniforms: this.getUniforms(particleProgram),
      });
      console.log("Created shader program: particles");

      return true;
    } catch (error) {
      console.error("Failed to initialize shader:", error);
      return false;
    }
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
      // console.log(`Using shader program: ${name}`);
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
        `Failed to link program: ${this.gl.getProgramInfoLog(program)}`
      );
    }

    return program;
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(
        `Failed to compile shader: ${this.gl.getShaderInfoLog(shader)}`
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

  static SHADERS = {
    basic: {
      vert: `
          attribute vec2 position;
          void main() {
              gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
      frag: `
          precision mediump float;
          uniform vec4 color;
          
          void main() {
            gl_FragColor = color;
          }
        `,
    },
    particles: {
      vert: `
          attribute vec2 position;
          uniform float pointSize;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
            gl_PointSize = pointSize;
          }
        `,
      frag: `
          precision mediump float;
          uniform vec4 color;
          
          void main() {
            vec2 coord = gl_PointCoord * 2.0 - 1.0;
            float r = dot(coord, coord);
            if (r > 1.0) {
              discard;
            }
            gl_FragColor = color;
          }
        `,
    },
  };
}

export { ShaderManager };
