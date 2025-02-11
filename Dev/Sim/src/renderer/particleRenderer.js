import { BaseRenderer } from "./baseRenderer.js";

class ParticleRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);
    this.particleBuffer = gl.createBuffer();
    this.config = {
      size: 4.0,
      color: [0.2, 0.4, 1.0, 0.8],
    };
    console.log("ParticleRenderer initialized");
  }

  draw(particles) {
    // Get shader program
    const program = this.setupShader("particles");
    if (!program) {
      console.error("Failed to setup particle shader");
      return;
    }

    // Set configurable uniforms
    this.gl.uniform1f(program.uniforms.pointSize, this.config.size);

    // Early exit if no particles
    if (!particles || particles.length === 0) {
      console.log("No particles to draw");
      return;
    }

    // console.log(`Drawing ${particles.length} particles`);

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

    // Set particle color uniform
    this.gl.uniform4fv(program.uniforms.color, this.config.color);

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

export { ParticleRenderer };
