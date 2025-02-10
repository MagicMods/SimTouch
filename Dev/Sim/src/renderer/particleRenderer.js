import { BaseRenderer } from "./baseRenderer.js";

class ParticleRenderer extends BaseRenderer {
  constructor(canvas, width, height) {
    super(canvas);
    this.gl = canvas.getContext("webgl");
    this.width = width;
    this.height = height;

    // Create buffers
    this.vertexBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();

    // Use brighter blue color for particles
    this.particleColor = [0.2, 0.6, 1.0, 0.9]; // Bright blue with high alpha

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

    // Upload indices
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      indices,
      this.gl.STATIC_DRAW
    );

    // Vertex array for batching
    this.vertexArray = new Float32Array(maxQuads * 8);

    console.log(
      "ParticleRenderer initialized with dimensions:",
      width,
      "x",
      height
    );
  }

  drawParticles(particles, programInfo) {
    if (!programInfo || !particles || particles.length === 0) return;

    const gl = this.gl;
    gl.useProgram(programInfo.program);

    // Setup blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Set bright blue color
    gl.uniform4fv(programInfo.uniforms.color, this.particleColor);

    // Transform all particles
    const numParticles = particles.length / 2;
    let vertexOffset = 0;

    for (let i = 0; i < numParticles; i++) {
      // Scale coordinates to clip space
      const x = (particles[i * 2] / this.width) * 2 - 1;
      const y = -(particles[i * 2 + 1] / this.height) * 2 + 1;

      // Add vertices for this particle
      const offset = i * 8;
      this.vertexArray[offset + 0] = x + this.quadTemplate[0];
      this.vertexArray[offset + 1] = y + this.quadTemplate[1];
      this.vertexArray[offset + 2] = x + this.quadTemplate[2];
      this.vertexArray[offset + 3] = y + this.quadTemplate[3];
      this.vertexArray[offset + 4] = x + this.quadTemplate[4];
      this.vertexArray[offset + 5] = y + this.quadTemplate[5];
      this.vertexArray[offset + 6] = x + this.quadTemplate[6];
      this.vertexArray[offset + 7] = y + this.quadTemplate[7];

      vertexOffset += 8;
    }

    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.vertexArray.subarray(0, vertexOffset),
      gl.DYNAMIC_DRAW
    );

    // Set attribute
    gl.enableVertexAttribArray(programInfo.attributes.position);
    gl.vertexAttribPointer(
      programInfo.attributes.position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );

    // Bind index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // Draw all particles in one call
    gl.drawElements(gl.TRIANGLES, numParticles * 6, gl.UNSIGNED_SHORT, 0);

    // Cleanup
    gl.disable(gl.BLEND);
  }
}

export { ParticleRenderer };
