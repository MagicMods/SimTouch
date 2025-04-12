import { BaseRenderer } from "./baseRenderer.js";

class DebugRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl);
    if (!shaderManager) {
      throw new Error("ShaderManager is required for DebugRenderer");
    }
    this.shaderManager = shaderManager;
    this.arrowLength = 2;
    this.pressureScale = 0.01;
    this.enabled = false;
    this.showTurbulenceField = false;
    this.showVoronoiField = false;
    this.turbulenceOpacity = 0.2;
  }

  draw(particleSystem, turbulenceField, voronoiField) {
    if (!this.enabled) return;

    if (!particleSystem) {
      throw new Error("ParticleSystem is required for DebugRenderer.draw");
    }

    if (this.showTurbulenceField && !turbulenceField) {
      throw new Error("TurbulenceField is required when showTurbulenceField is enabled");
    }

    if (this.showVoronoiField && !voronoiField) {
      throw new Error("VoronoiField is required when showVoronoiField is enabled");
    }

    if (this.showTurbulenceField || this.showVoronoiField) {
      this.drawNoiseField(turbulenceField, voronoiField);
    }
  }

  drawGrid(gridSize) {
    const program = this.shaderManager.use('lines');
    if (!program) {
      throw new Error("Failed to use 'lines' shader for grid rendering");
    }

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
    this.gl.uniform4fv(program.uniforms.color, [1.0, 1.0, 1.0, 0.3]);

    this.gl.drawArrays(this.gl.LINES, 0, vertices.length / 2);
    this.gl.deleteBuffer(vertexBuffer);
  }

  drawBoundary(boundary) {
    if (!boundary) {
      throw new Error("Boundary is required for drawBoundary");
    }

    const program = this.shaderManager.use('circle');
    if (!program) {
      throw new Error("Failed to use 'circle' shader for boundary rendering");
    }

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
    if (!program) {
      throw new Error("Failed to use 'basic' shader for noise field rendering");
    }

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

        // Sample turbulence
        let turbValue = 0.5;
        if (this.showTurbulenceField) {
          try {
            turbValue = turbulenceField.noise2D(nx * turbulenceField.scale, ny * turbulenceField.scale);
            // Normalize to [0,1] range
            turbValue = (turbValue + 1) * 0.5;
          } catch (e) {
            console.error("Error sampling turbulence field:", e);
          }
        }

        // Sample voronoi
        let voroValue = 0;
        if (this.showVoronoiField) {
          try {
            const edgeInfo = voronoiField.getVoronoiEdgeDistance(nx, ny);

            // Use edge distance for visualization
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
            console.error("Error sampling voronoi field:", e);
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
}

export { DebugRenderer };
