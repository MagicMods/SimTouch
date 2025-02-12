import { BaseRenderer } from "./baseRenderer.js";

class ParticleRenderer extends BaseRenderer {
  constructor(gl, shaderManager, shaderType = "particles") {
    super(gl, shaderManager);
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.shaderType = shaderType;
    this.particleBuffer = gl.createBuffer();
    this.config = {
      size: 10.0,
      color: [0.2, 0.4, 1.0, 0.8],
    };
    console.log("ParticleRenderer initialized");
  }

  draw(particles, color = [0.2, 0.6, 1.0, 1.0]) {
    if (!particles || !Array.isArray(particles) || particles.length === 0) {
      console.warn("No valid particles to draw");
      return;
    }

    // Use specified shader program
    const program = this.shaderManager.use(this.shaderType);
    if (!program) {
      console.error("Failed to setup particle shader");
      return;
    }

    // Use particle size from system
    const pointSize = particles[0].size || this.config.size;
    this.gl.uniform1f(program.uniforms.pointSize, pointSize);

    // Update particle positions in buffer
    const vertices = new Float32Array(particles.flatMap((p) => [p.x, p.y]));
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

    // Enable blending for transparent particles
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Set up vertex attributes
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Set particle color uniform (use provided color or default)
    this.gl.uniform4fv(program.uniforms.color, color || this.config.color);

    // Draw the particles
    this.gl.drawArrays(this.gl.POINTS, 0, particles.length);

    // Cleanup GL state
    this.gl.disable(this.gl.BLEND);
  }

  // Clean up resources
  dispose() {
    if (this.particleBuffer) {
      this.gl.deleteBuffer(this.particleBuffer);
      this.particleBuffer = null;
    }
  }
}

// Single export at the end
export { ParticleRenderer };
