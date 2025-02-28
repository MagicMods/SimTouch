import { BaseRenderer } from "./baseRenderer.js";

class ParticleRenderer extends BaseRenderer {
  constructor(gl, shaderManager, shaderType = "particles") {
    super(gl, shaderManager);
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.shaderType = shaderType;
    this.particleBuffer = gl.createBuffer();
    this.sizeBuffer = gl.createBuffer(); // Add new buffer for individual sizes
    this.config = {
      size: 10.0,
      color: [1, 1, 1, 0.1],
    };
    this.particleOpacity = 0.1;
    console.log("ParticleRenderer initialized with per-particle sizing");
  }

  draw(particles) {
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

    // Default size as fallback
    const defaultSize = this.config.size;

    // Update position buffer
    const vertices = new Float32Array(particles.flatMap((p) => [p.x, p.y]));
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

    // Set up position attribute
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Check if shader has a size attribute (for individual particle sizes)
    if (program.attributes.size !== undefined) {
      // Extract individual sizes into a Float32Array
      const sizes = new Float32Array(
        particles.map((p) => p.size || defaultSize)
      );

      // Send size data to GPU
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.DYNAMIC_DRAW);

      // Set up size attribute
      this.gl.enableVertexAttribArray(program.attributes.size);
      this.gl.vertexAttribPointer(
        program.attributes.size,
        1,
        this.gl.FLOAT,
        false,
        0,
        0
      );
    } else {
      // Fallback to uniform pointSize (legacy mode)
      const pointSize = particles[0].size || defaultSize;
      this.gl.uniform1f(program.uniforms.pointSize, pointSize);
    }

    // Enable blending for transparent particles
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Create color with opacity
    const finalColor = [...this.config.color];
    finalColor[3] = this.particleOpacity;

    // Set particle color uniform with opacity
    this.gl.uniform4fv(program.uniforms.color, finalColor);

    // Draw the particles
    this.gl.drawArrays(this.gl.POINTS, 0, particles.length);

    // Cleanup GL state
    this.gl.disable(this.gl.BLEND);
    this.gl.disableVertexAttribArray(program.attributes.position);
    if (program.attributes.size !== undefined) {
      this.gl.disableVertexAttribArray(program.attributes.size);
    }
    // if (particles.length > 0) {
    //   console.log(
    //     `Drawing ${particles.length} particles, first sizes:`,
    //     `normalized=${particles[0].radius.toFixed(
    //       4
    //     )}, pixel=${particles[0].size.toFixed(1)}`
    //   );
    // }
  }

  dispose() {
    if (this.particleBuffer) {
      this.gl.deleteBuffer(this.particleBuffer);
      this.particleBuffer = null;
    }
    if (this.sizeBuffer) {
      this.gl.deleteBuffer(this.sizeBuffer);
      this.sizeBuffer = null;
    }
  }
}

export { ParticleRenderer };
