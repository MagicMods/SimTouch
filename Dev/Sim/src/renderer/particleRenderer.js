import { BaseRenderer } from "./baseRenderer.js";

class ParticleRenderer extends BaseRenderer {
  constructor(gl, width, height) {
    if (!gl || typeof gl.createBuffer !== "function") {
      throw new Error("Valid WebGL context required");
    }
    super(gl, width, height);
    this.gl = gl;
    this.width = width;
    this.height = height;

    this.initBuffers();
    console.log(
      "ParticleRenderer initialized with dimensions:",
      width,
      "x",
      height
    );
  }

  initBuffers() {
    // Create buffers
    this.vertexBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();

    // Use brighter blue color for particles
    this.particleColor = [0.2, 0.6, 1.0, 0.9];

    // Make particles slightly larger
    const particleSize = 0.015;
    this.quadTemplate = new Float32Array([
      -particleSize,
      -particleSize,
      particleSize,
      -particleSize,
      -particleSize,
      particleSize,
      particleSize,
      particleSize,
    ]);

    // Setup index buffer for quad rendering
    const maxQuads = 1000;
    const indices = new Uint16Array(maxQuads * 6);
    for (let i = 0; i < maxQuads; i++) {
      const vertexOffset = i * 4;
      const indexOffset = i * 6;
      indices[indexOffset + 0] = vertexOffset + 0;
      indices[indexOffset + 1] = vertexOffset + 1;
      indices[indexOffset + 2] = vertexOffset + 2;
      indices[indexOffset + 3] = vertexOffset + 1;
      indices[indexOffset + 4] = vertexOffset + 3;
      indices[indexOffset + 5] = vertexOffset + 2;
    }

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      indices,
      this.gl.STATIC_DRAW
    );

    this.vertexArray = new Float32Array(maxQuads * 8);
  }

  drawParticles(particles, programInfo) {
    if (!programInfo || !particles || particles.length === 0) return;

    const gl = this.gl;
    gl.useProgram(programInfo.program);

    // Setup blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Set particle color
    gl.uniform4fv(programInfo.uniforms.color, this.particleColor);

    // Update vertex positions
    const numParticles = particles.length / 2;
    for (let i = 0; i < numParticles; i++) {
      const x = (particles[i * 2] / this.width) * 2 - 1;
      const y = -((particles[i * 2 + 1] / this.height) * 2 - 1);

      const vertexOffset = i * 8;
      for (let j = 0; j < 4; j++) {
        this.vertexArray[vertexOffset + j * 2] = x + this.quadTemplate[j * 2];
        this.vertexArray[vertexOffset + j * 2 + 1] =
          y + this.quadTemplate[j * 2 + 1];
      }
    }

    // Upload vertices and draw
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attributes.position);

    gl.drawElements(gl.TRIANGLES, numParticles * 6, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.BLEND);
  }
}

export { ParticleRenderer };
