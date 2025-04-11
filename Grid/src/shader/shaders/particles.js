export const vertexShader = `
          attribute vec2 position;
          attribute float size; // Add per-particle size attribute
          uniform float pointSize; // Keep uniform for backward compatibility
          
          void main() {
            vec2 clipSpace = (position * 2.0) - 1.0;
            gl_Position = vec4(clipSpace, 0.0, 1.0);
            
            // Use attribute size if available, fallback to uniform pointSize
            gl_PointSize = size > 0.0 ? size : pointSize;
          }
        `;

export const fragmentShader = `
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
        `;
