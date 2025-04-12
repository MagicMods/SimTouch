import { BaseRenderer } from "./baseRenderer.js";

class ParticleRenderer extends BaseRenderer {
  showVelocityField = true; // Add property to toggle velocity field

  constructor(gl, shaderManager, shaderType = "particles") {
    super(gl, shaderManager);
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.shaderType = shaderType;
    this.particleBuffer = gl.createBuffer();
    this.sizeBuffer = gl.createBuffer();
    this.velocityLineBuffer = gl.createBuffer(); // Add buffer for velocity lines
    this.config = {
      size: 10.0,
      color: [1, 1, 1, 0.1],
    };
    this.particleOpacity = 0.1;
    console.log("ParticleRenderer initialized with per-particle sizing");
  }

  draw(particles) {
    if (!particles || !Array.isArray(particles)) {
      throw new Error("Invalid particles array provided to ParticleRenderer");
    }

    if (particles.length === 0) {
      return; // Nothing to draw, but not an error
    }

    const program = this.shaderManager.use(this.shaderType);
    if (!program) {
      throw new Error(`Failed to use shader "${this.shaderType}" for particle rendering`);
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

    // --- START: Velocity Field Rendering ---
    if (this.showVelocityField && particles.length > 0) {
      const lineProgram = this.shaderManager.use('lines');
      if (!lineProgram) {
        console.error("Failed to use 'lines' shader for velocity field rendering");
      } else {
        const scale = 0.1; // Scale for velocity vectors
        const vertices = [];

        // Sample every nth particle to avoid too many arrows (optional, can be adjusted)
        // const stride = Math.max(1, Math.floor(particles.length / 1000));
        // for (let i = 0; i < particles.length; i += stride) {
        for (let i = 0; i < particles.length; i++) { // Render for all for now
          const p = particles[i];
          const x1 = p.x;
          const y1 = p.y;
          // NOTE: Original DebugRenderer had -p.vy. Assuming standard coordinate system now.
          const x2 = x1 + p.vx * scale;
          const y2 = y1 + p.vy * scale;
          vertices.push(x1, y1, x2, y2);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityLineBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.DYNAMIC_DRAW);

        this.gl.enableVertexAttribArray(lineProgram.attributes.position);
        this.gl.vertexAttribPointer(
          lineProgram.attributes.position,
          2,
          this.gl.FLOAT,
          false,
          0,
          0
        );

        // Set vector color (yellow, semi-transparent)
        this.gl.uniform4fv(lineProgram.uniforms.color, [1.0, 1.0, 0.0, 0.7]);

        // Enable blending for lines as well if needed
        // this.gl.enable(this.gl.BLEND);
        // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.drawArrays(this.gl.LINES, 0, vertices.length / 2);

        // Disable blending if it was enabled for lines
        // this.gl.disable(this.gl.BLEND);

        this.gl.disableVertexAttribArray(lineProgram.attributes.position);
      }
    }
    // --- END: Velocity Field Rendering ---
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
    // Add cleanup for velocity line buffer
    if (this.velocityLineBuffer) {
      this.gl.deleteBuffer(this.velocityLineBuffer);
      this.velocityLineBuffer = null;
    }
  }
}

export { ParticleRenderer };
