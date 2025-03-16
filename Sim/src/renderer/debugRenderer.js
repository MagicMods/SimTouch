import { BaseRenderer } from "./baseRenderer.js";

class DebugRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl);
    this.shaderManager = shaderManager;
    this.arrowLength = 2;
    this.pressureScale = 0.01;

    // Debug visualization flags
    this.enabled = true;

    // Remove redundant flags and directly expose the field controls
    this.showVelocityField = false;
    this.showParticlesInfo = false;

    // Direct field controls (no nested showNoiseField)
    this.showTurbulenceField = false;
    this.showVoronoiField = true;
    this.turbulenceOpacity = 0.2; // Single opacity control
  }

  draw(particleSystem, turbulenceField, voronoiField) {
    if (!this.enabled) return;

    // Remove grid and boundary drawing

    if (this.showVelocityField) {
      this.drawVelocityField(particleSystem);
    }

    // Always check both turbulence and voronoi fields directly
    if (this.showTurbulenceField || this.showVoronoiField) {
      this.drawNoiseField(turbulenceField, voronoiField);
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

  drawNoiseField(turbulenceField, voronoiField) {
    const program = this.shaderManager.use('basic');
    if (!program) return;

    // Enable proper blending for transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Using appropriate resolution for visualization
    const resolution = 30;

    // Visualize fields
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Normalize coordinates to [0,1] range for sampling
        const nx = x / (resolution - 1);
        const ny = y / (resolution - 1);

        // Sample turbulence - use noise2D method
        let turbValue = 0.5;
        if (this.showTurbulenceField && turbulenceField && typeof turbulenceField.noise2D === 'function') {
          try {
            turbValue = turbulenceField.noise2D(nx * turbulenceField.scale, ny * turbulenceField.scale);
            // Normalize to [0,1] range
            turbValue = (turbValue + 1) * 0.5;
          } catch (e) {
            // Fallback on error
          }
        }

        // Sample voronoi - use getVoronoiEdgeDistance method
        let voroValue = 0;
        if (this.showVoronoiField && voronoiField && typeof voronoiField.getVoronoiEdgeDistance === 'function') {
          try {
            const edgeInfo = voronoiField.getVoronoiEdgeDistance(nx, ny);

            // IMPROVED EDGE VISUALIZATION: Use a better formula that maintains contrast
            // at different edge width values

            // First, apply a hard cutoff based on a fraction of the edge width
            const scaledDistance = edgeInfo.distance / (voronoiField.edgeWidth * 0.33);

            // Use sharper falloff curve
            if (scaledDistance <= 1.0) {
              // Close to edge - use smoothstep-like function for smooth transition
              voroValue = 1.0 - Math.pow(scaledDistance, 0.75);
            } else {
              // Far from edge - no value
              voroValue = 0;
            }
          } catch (e) {
            // Fallback on error
          }
        }

        // Skip rendering cells with no effect (performance improvement)
        const hasVisibleValue =
          (this.showTurbulenceField && turbValue > 0.01) ||
          (this.showVoronoiField && voroValue > 0.01);

        // Skip cells with no visible effect
        if (!hasVisibleValue) continue;

        // Map to screen coordinates [-1,1]
        const screenX = nx * 2 - 1;
        const screenY = ny * 2 - 1;

        // Size based on values - different handling based on which fields are shown
        let pointSize;
        if (this.showTurbulenceField && this.showVoronoiField) {
          pointSize = 0.02 + Math.max(turbValue, voroValue) * 0.04;
        } else if (this.showTurbulenceField) {
          pointSize = 0.02 + turbValue * 0.04;
        } else if (this.showVoronoiField) {
          pointSize = 0.02 + voroValue * 0.04;
        } else {
          pointSize = 0.02; // Default size
        }

        // Create a cell quad
        const x1 = screenX - pointSize;
        const y1 = screenY - pointSize;
        const x2 = screenX + pointSize;
        const y2 = screenY + pointSize;

        const cellVertices = new Float32Array([
          x1, y1,
          x2, y1,
          x1, y2,
          x2, y2
        ]);

        const cellBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, cellBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, cellVertices, this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(program.attributes.position);
        this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);

        // Use a single opacity value (turbulenceOpacity) for both fields
        // But keep colors at full intensity - just vary the alpha channel
        let r = 0, g = 0, b = 0;

        if (this.showVoronoiField) {
          g = voroValue; // Green component for voronoi
        }

        if (this.showTurbulenceField) {
          b = turbValue; // Blue component for turbulence
        }

        // Use interaction effect in red channel when both are active
        if (this.showTurbulenceField && this.showVoronoiField) {
          r = turbValue * voroValue * 0.7;
        }

        // Only the alpha varies with opacity - not the color intensity
        const alpha = this.turbulenceOpacity * 0.7;

        this.gl.uniform4f(program.uniforms.color, r, g, b, alpha);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.deleteBuffer(cellBuffer);
      }
    }

    // Restore WebGL state
    this.gl.disable(this.gl.BLEND);
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
