class CircularBoundary {
  constructor({
    centerX = 0.5,
    centerY = 0.5,
    radius = 0.475,
    cBoundaryRestitution = 0.8, // Renamed to be specific
    damping = 0.95,
    segments = 64, // Higher segment count for smoother circle
  } = {}) {
    // Core parameters
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;

    // Physics parameters
    this.cBoundaryRestitution = cBoundaryRestitution; // Renamed
    this.damping = damping;
    this.segments = segments;

    // Visual properties
    this.color = [1.0, 1.0, 1.0, 0.5]; // White, semi-transparent
    this.lineWidth = 2;

    // Add FLIP-specific parameters
    this.flipBoundaryScale = 1.0; // Ensures FLIP boundary matches PIC

    // Notify systems that need updating
    this.updateCallbacks = new Set();

    // Generate boundary points
    this.generateBoundaryPoints();
  }

  generateBoundaryPoints() {
    this.boundaryPoints = [];
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      const x = this.centerX + Math.cos(angle) * this.radius;
      const y = this.centerY + Math.sin(angle) * this.radius;
      this.boundaryPoints.push({ x, y });
    }
  }

  draw(gl, shaderManager) {
    const program = shaderManager.use("circle");
    if (!program) return;

    // Full screen quad vertices
    const vertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);

    // Setup GL state
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Set attributes and uniforms
    const { attributes, uniforms } = program;
    gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributes.position);

    // Get canvas size and aspect ratio
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const aspect = width / height;

    // Set uniforms with proper aspect ratio correction
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.center, this.centerX, this.centerY);
    gl.uniform1f(uniforms.radius, this.radius); // Use actual radius
    gl.uniform1f(uniforms.aspect, aspect); // Add aspect ratio correction
    gl.uniform4fv(uniforms.color, this.color);
    gl.uniform1f(uniforms.lineWidth, this.lineWidth / 100.0); // Scale line width appropriately

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Cleanup
    gl.disable(gl.BLEND);
    gl.deleteBuffer(buffer);
  }

  // Standard collision for particle system
  resolveCollision(position, velocity) {
    const dx = position[0] - this.centerX;
    const dy = position[1] - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.radius) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Reflect velocity using boundary-specific restitution
      const dot = velocity[0] * nx + velocity[1] * ny;
      if (dot > 0) {
        velocity[0] -= (1 + this.cBoundaryRestitution) * dot * nx; // Updated
        velocity[1] -= (1 + this.cBoundaryRestitution) * dot * ny; // Updated
        velocity[0] *= this.damping;
        velocity[1] *= this.damping;
      }

      // Move back inside boundary - exact radius
      position[0] = this.centerX + nx * this.radius;
      position[1] = this.centerY + ny * this.radius;
      return true;
    }
    return false;
  }

  // Soft boundary for FLIP system
  resolveFLIP(x, y, vx, vy) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Match FLIP boundary to PIC boundary
    const effectiveRadius = this.radius * this.flipBoundaryScale;

    if (dist > effectiveRadius) {
      const nx = dx / dist;
      const ny = dy / dist;
      const radialVel = vx * nx + vy * ny;

      // Match hard boundary behavior
      if (radialVel > 0) {
        return {
          vx: (vx - radialVel * nx) * this.damping,
          vy: (vy - radialVel * ny) * this.damping,
        };
      }
    }

    return { vx, vy };
  }

  // Get visualization points for rendering
  getPoints(segments = 32) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = this.centerX + Math.cos(angle) * this.radius;
      const y = this.centerY + Math.sin(angle) * this.radius;
      points.push({ x, y });
    }
    return points;
  }

  // Update boundary parameters and notify dependents
  update(params) {
    let changed = false;
    if (params.radius !== undefined && params.radius !== this.radius) {
      this.radius = params.radius;
      // Update FLIP system boundary at same time
      this.flipBoundaryScale = 1.0;
      changed = true;
    }
    if (changed) {
      this.generateBoundaryPoints();
      this.updateCallbacks.forEach((callback) => callback(this));
    }
  }

  addUpdateCallback(callback) {
    this.updateCallbacks.add(callback);
  }

  removeUpdateCallback(callback) {
    this.updateCallbacks.delete(callback);
  }

  getRadius() {
    return this.radius;
  }
}

export { CircularBoundary };
