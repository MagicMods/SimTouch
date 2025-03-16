import { BaseRenderer } from "./baseRenderer.js";

class DebugRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl);
    this.shaderManager = shaderManager;
    this.arrowLength = 2;
    this.pressureScale = 0.01;

    // Debug visualization flags
    this.enabled = true;
    this.showVelocityField = false;
    this.showGrid = false;
    this.showBoundary = false;
    this.showNoiseField = true;
    this.showParticlesInfo = false;
  }

  draw(particleSystem, turbulenceField, voronoiField) {
    if (!this.enabled) return;

    if (this.showGrid) {
      this.drawGrid(particleSystem.fluid.gridSize || 10);
    }

    if (this.showVelocityField) {
      this.drawVelocityField(particleSystem);
    }

    if (this.showBoundary && particleSystem.boundary) {
      this.drawBoundary(particleSystem.boundary);
    }

    if (this.showNoiseField && turbulenceField) {
      this.drawNoiseField(turbulenceField);
    }

    if (this.showParticlesInfo) {
      this.drawParticlesInfo(particleSystem);
    }
  }

  drawGrid(gridSize) {
    const program = this.shaderManager.use('lines');
    if (!program) return;
    gridSize = 48;
    const vertices = [];
    const gridStep = 2.0 / gridSize;

    // Vertical lines
    for (let i = 0; i <= gridSize; i++) {
      const x = i * gridStep - 1.0;
      vertices.push(x, -1.0, x, 1.0);
    }

    // Horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      const y = i * gridStep - 1.0;
      vertices.push(-1.0, y, 1.0, y);
    }

    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(program.attributes.position);

    // Set grid color (light blue, semi-transparent)
    this.gl.uniform4fv(program.uniforms.color, [0.2, 0.4, 0.8, 0.3]);

    this.gl.drawArrays(this.gl.LINES, 0, vertices.length / 2);
    this.gl.deleteBuffer(vertexBuffer);
  }

  drawVelocityField(particleSystem) {
    const program = this.shaderManager.use('lines');
    if (!program) return;

    const particles = particleSystem.getParticles();
    if (!particles || particles.length === 0) return;

    const vertices = [];
    const scale = 0.1; // Scale for velocity vectors

    // Sample every nth particle to avoid too many arrows
    const stride = Math.max(1, Math.floor(particles.length / 1000));

    for (let i = 0; i < particles.length; i += stride) {
      const p = particles[i];
      // Convert from [0,1] to [-1,1] coordinate space
      // const x1 = p.x * 2 - 1;
      // const y1 = (p.y * 2 - 1); // Y is flipped in WebGL
      const x1 = p.x;
      const y1 = (p.y);
      const x2 = x1 + p.vx * scale;
      const y2 = y1 - p.vy * scale;

      vertices.push(x1, y1, x2, y2);
    }

    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(program.attributes.position);

    // Set vector color (yellow)
    this.gl.uniform4fv(program.uniforms.color, [1.0, 1.0, 0.0, 0.7]);

    this.gl.drawArrays(this.gl.LINES, 0, vertices.length / 2);
    this.gl.deleteBuffer(vertexBuffer);
  }

  drawBoundary(boundary) {
    if (!boundary) return;

    const program = this.shaderManager.use('circle');
    if (!program) return;

    // Draw a full-screen quad
    const vertices = [
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ];

    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(program.attributes.position);

    // Set circle parameters
    this.gl.uniform2f(program.uniforms.resolution, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.uniform2f(program.uniforms.center, boundary.centerX, boundary.centerY);
    this.gl.uniform1f(program.uniforms.radius, boundary.radius);
    this.gl.uniform1f(program.uniforms.aspect, this.gl.canvas.width / this.gl.canvas.height);
    this.gl.uniform4f(program.uniforms.color, 1.0, 0.5, 0.0, 0.7); // Orange
    this.gl.uniform1f(program.uniforms.lineWidth, 0.003);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.deleteBuffer(vertexBuffer);
  }

  drawNoiseField(turbulenceField) {
    // Single quad approach with texture-style sampling
    const program = this.shaderManager.use('basic');
    if (!program) return;

    // Use [-1,1] coordinate system for the main background
    const vertices = new Float32Array([
      -1, -1,  // bottom-left
      1, -1,   // bottom-right
      -1, 1,   // top-left
      1, 1     // top-right
    ]);

    // Create background quad
    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2, this.gl.FLOAT, false, 0, 0
    );

    // Draw semi-transparent background
    this.gl.uniform4f(program.uniforms.color, 0, 0, 0.3, 0.1);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Now draw a grid of points to visualize the noise
    const resolution = 20;

    // Sample with different coordinate mappings for visualization
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Map to the normalized [0,1] coordinate space
        const nx = x / (resolution - 1);
        const ny = y / (resolution - 1);

        let noiseValue = 0.5;
        try {
          if (typeof turbulenceField.sampleNoise === 'function') {
            noiseValue = turbulenceField.sampleNoise(nx, ny);
            // Normalize to 0-1 range for visualization
            noiseValue = (noiseValue + 1) * 0.5;
          }
        } catch (error) {
          // Silent fallback
        }

        // Map points to cover the full screen in [-1,1] space
        const screenX = nx * 2 - 1;
        const screenY = ny * 2 - 1;

        // Visualize with small colored squares, size based on noise value
        const pointSize = 0.02 + noiseValue * 0.05;

        // Draw a small quad for each sample point
        const x1 = screenX - pointSize;
        const y1 = screenY - pointSize;
        const x2 = screenX + pointSize;
        const y2 = screenY + pointSize;

        const pointVertices = new Float32Array([
          x1, y1,
          x2, y1,
          x1, y2,
          x2, y2
        ]);

        const pointBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, pointBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, pointVertices, this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(program.attributes.position);
        this.gl.vertexAttribPointer(
          program.attributes.position,
          2, this.gl.FLOAT, false, 0, 0
        );

        // Color based on noise value (blue gradient)
        this.gl.uniform4f(
          program.uniforms.color,
          0,
          0.2,
          0.5 + noiseValue * 0.5,
          0.7
        );

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.deleteBuffer(pointBuffer);
      }
    }

    // Clean up
    this.gl.disableVertexAttribArray(program.attributes.position);
    this.gl.deleteBuffer(vertexBuffer);
  }

  drawParticlesInfo(particleSystem) {
    const program = this.shaderManager.use('basic');
    if (!program) return;

    // Get some statistics from the particle system
    const particles = particleSystem.getParticles();
    if (!particles || particles.length === 0) return;

    // Find min/max velocities for visualization
    let maxVel = 0;
    for (const p of particles) {
      const velMag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (velMag > maxVel) maxVel = velMag;
    }

    // Draw a legend in the corner
    const size = 0.15; // Size of the legend box
    const x1 = -1 + 0.1;  // Left position
    const y1 = -1 + 0.1;  // Bottom position
    const x2 = x1 + size;
    const y2 = y1 + size;

    // Draw background
    this.gl.uniform4f(program.uniforms.color, 0, 0, 0, 0.7);

    const bgVertices = [
      x1, y1,
      x2, y1,
      x1, y2,
      x2, y2
    ];

    const bgBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bgBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(bgVertices), this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(program.attributes.position);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.deleteBuffer(bgBuffer);

    // We can't easily draw text in WebGL, so drawing indicators in different colors
    // to show particle count and max velocity

    // Draw particle count indicator (green bar)
    const countRatio = Math.min(particles.length / 1000, 1); // Normalize to 0-1

    const countVertices = [
      x1 + 0.01, y1 + 0.02,
      x1 + 0.01 + (size - 0.02) * countRatio, y1 + 0.02,
      x1 + 0.01, y1 + 0.06,
      x1 + 0.01 + (size - 0.02) * countRatio, y1 + 0.06
    ];

    this.gl.uniform4f(program.uniforms.color, 0, 1, 0, 0.9); // Green

    const countBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, countBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(countVertices), this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(program.attributes.position);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.deleteBuffer(countBuffer);

    // Draw velocity indicator (blue bar)
    const velRatio = Math.min(maxVel * 50, 1); // Scale and normalize

    const velVertices = [
      x1 + 0.01, y1 + 0.08,
      x1 + 0.01 + (size - 0.02) * velRatio, y1 + 0.08,
      x1 + 0.01, y1 + 0.12,
      x1 + 0.01 + (size - 0.02) * velRatio, y1 + 0.12
    ];

    this.gl.uniform4f(program.uniforms.color, 0, 0.5, 1, 0.9); // Blue

    const velBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, velBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(velVertices), this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(program.attributes.position);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.deleteBuffer(velBuffer);
  }
}

export { DebugRenderer };
