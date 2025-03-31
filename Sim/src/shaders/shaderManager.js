class ShaderManager {
  constructor(gl) {
    if (!gl) {
      throw new Error("WebGL context is required for ShaderManager");
    }
    this.gl = gl;
    this.programs = new Map();
    this.currentProgram = null;
    // console.log("ShaderManager created");
  }

  async init() {
    // Create all shader programs
    for (const [name, shaders] of Object.entries(ShaderManager.SHADERS)) {
      const vertexSource = shaders.vert || shaders.vertex;
      const fragmentSource = shaders.frag || shaders.fragment;

      if (!vertexSource) {
        throw new Error(`Vertex shader source not provided for "${name}"`);
      }

      if (!fragmentSource) {
        throw new Error(`Fragment shader source not provided for "${name}"`);
      }

      await this.createProgram(name, vertexSource, fragmentSource);
    }
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

    // console.log(`Created shader program: ${name}`);
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

  cleanup(program, vertexShader, fragmentShader) {
    if (vertexShader) this.gl.deleteShader(vertexShader);
    if (fragmentShader) this.gl.deleteShader(fragmentShader);
    if (program) this.gl.deleteProgram(program);
  }

  dispose() {
    this.programs.forEach((programInfo) => {
      this.gl.deleteProgram(programInfo.program);
    });
    this.programs.clear();
    this.currentProgram = null;
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
    rectangle: {
      vert: `
          precision mediump float;
          attribute vec2 position;
          
          void main() {
              gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
      frag: `
          precision mediump float;
          uniform vec2 resolution;
          uniform vec2 center;
          uniform vec2 dimensions;
          uniform float aspect;
          uniform vec4 color;
          uniform float lineWidth;
          
          void main() {
              // Get normalized coordinates (0-1)
              vec2 uv = gl_FragCoord.xy / resolution;
              
              // Correct aspect ratio
              uv.x = uv.x * aspect;
              
              // Calculate distance from point to each edge of rectangle
              float halfWidth = dimensions.x / 2.0;
              float halfHeight = dimensions.y / 2.0;
              
              float left = center.x - halfWidth;
              float right = center.x + halfWidth;
              float top = center.y + halfHeight;
              float bottom = center.y - halfHeight;
          
              // Calculate distance to nearest edge (positive inside, negative outside)
              float distToLeft = uv.x - left;
              float distToRight = right - uv.x;
              float distToBottom = uv.y - bottom;
              float distToTop = top - uv.y;
              
              // Find minimum distance to any edge
              float dx = min(distToLeft, distToRight);
              float dy = min(distToBottom, distToTop);
              
              // Calculate signed distance field
              float distanceField = min(dx, dy);
              
              // Apply line width
              float outlineEdge = lineWidth;
              
              // Color based on distance
              vec4 finalColor = vec4(0.0);
              
              // Inside rectangle with outline
              if (distanceField > 0.0 && distanceField < outlineEdge) {
                  // Inside outline zone - use border color
                  finalColor = color;
              } else if (distanceField < 0.0 && distanceField > -outlineEdge) {
                  // Outside but within line width - use border color
                  finalColor = color;
              } else {
                  // Either well inside or well outside - no color (transparent)
                  discard;
              }
              
              gl_FragColor = finalColor;
          }
        `,
    },
    gridCell: {
      vert: `
          attribute vec2 position;
          uniform mat4 uTransform;
          varying vec2 vUv;
          
          void main() {
              gl_Position = uTransform * vec4(position, 0.0, 1.0);
              vUv = position;
          }
        `,
      frag: `
          precision mediump float;
          uniform vec4 color;
          uniform float shadowIntensity;
          uniform float blurAmount;
          uniform float shadowThreshold;
          varying vec2 vUv;
          
          void main() {
              // Calculate distance from edges with configurable threshold
              float distFromEdge = min(
                  min(vUv.x, 1.0 - vUv.x),
                  min(vUv.y, 1.0 - vUv.y)
              );
              
              // Create shadow effect with threshold and spread
              float shadow = 1.0 - smoothstep(
                  shadowThreshold, 
                  shadowThreshold + (blurAmount), 
                  distFromEdge
              );
              
              // Calculate color brightness (0-1)
              float brightness = max(max(color.r, color.g), color.b);
              
              // Scale shadow intensity inversely with color brightness
              float scaledShadowIntensity = shadowIntensity * (1.0 - brightness *0.75);
              
              // Apply shadow independently of base color
              vec4 finalColor = color;
              finalColor.rgb = mix(finalColor.rgb, vec3(0.0), shadow * scaledShadowIntensity);
              
              gl_FragColor = finalColor;
          }
        `,
    },
    particles: {
      vert: `
          attribute vec2 position;
          attribute float size; // Add per-particle size attribute
          uniform float pointSize; // Keep uniform for backward compatibility
          
          void main() {
            vec2 clipSpace = (position * 2.0) - 1.0;
            gl_Position = vec4(clipSpace, 0.0, 1.0);
            
            // Use attribute size if available, fallback to uniform pointSize
            gl_PointSize = size > 0.0 ? size : pointSize;
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
    lines: {
      vert: `
            attribute vec2 position;
            void main() {
                vec2 clipSpace = (position * 2.0) - 1.0;
                gl_Position = vec4(clipSpace, 0.0, 1.0);
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
    circle: {
      vert: `
            precision mediump float;
            attribute vec2 position;
            
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `,
      frag: `
            precision mediump float;
            
            uniform vec2 resolution;
            uniform vec2 center;
            uniform float radius;
            uniform float aspect;
            uniform vec4 color;
            uniform float lineWidth;
            
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution;
                vec2 pos = uv * 2.0 - 1.0;
                pos.x *= aspect;  // Correct for aspect ratio
                
                vec2 centerPos = center * 2.0 - 1.0;
                centerPos.x *= aspect;
                
                float dist = length(pos - centerPos);
                float circleRadius = radius * 2.0;  // Scale radius to match boundary
                
                float circle = smoothstep(circleRadius - lineWidth, circleRadius, dist) *
                             smoothstep(circleRadius + lineWidth, circleRadius, dist);
                             
                gl_FragColor = vec4(color.rgb, color.a * circle);
            }
        `,
    },
    grid: {
      vert: `
        attribute vec2 position;
        uniform vec2 resolution;
        void main() {
            vec2 zeroToOne = position / resolution;
            vec2 zeroToTwo = zeroToOne * 2.0;
            vec2 clipSpace = zeroToTwo - 1.0;
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
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
    boundary: {
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
  };
}

export { ShaderManager };
