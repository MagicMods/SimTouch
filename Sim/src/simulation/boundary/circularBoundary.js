import { BaseBoundary } from "./baseBoundary.js";

export class CircularBoundary extends BaseBoundary {
  constructor({
    centerX = 0.5,
    centerY = 0.5,
    radius = 0.5,
    cBoundaryRestitution = 0.8,
    damping = 0.95,
    boundaryRepulsion = 0.1,
    segments = 64,
    mode = "BOUNCE",
    debugFlag,
  } = {}) {
    // Call the parent constructor with shared parameters
    super({
      cBoundaryRestitution,
      damping,
      boundaryRepulsion,
      mode,
      // debugFlag,
    });
    this.debugFlag = debugFlag;
    // Core parameters specific to circular boundary
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.segments = segments;

    // Visual properties
    this.color = [1.0, 1.0, 1.0, 0.5]; // White, semi-transparent
    this.lineWidth = 0.3;

    // Add FLIP-specific parameters
    this.flipBoundaryScale = 1.0; // Ensures FLIP boundary matches PIC

    // Notify systems that need updating
    this.updateCallbacks = new Set();

    // Add boundary mode
    this.BOUNDARY_MODES = {
      BOUNCE: "BOUNCE",
      WARP: "WARP",
    };
    this.mode = mode;
  }

  // Drawing method - renamed from drawCircularBoundary to drawBoundary for consistency
  drawBoundary(gl, shaderManager) {
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
  resolveCollision(
    position,
    velocity,
    particleRadius = 0,
    externalDamping = null
  ) {
    const dx = position[0] - this.centerX;
    const dy = position[1] - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction vector (points from center to particle)
    const nx = dx / dist;
    const ny = dy / dist;

    // Use provided damping if available, otherwise use internal damping
    const effectiveDamping =
      externalDamping !== null ? externalDamping : this.damping;

    // Case 1: Collision - particle crosses boundary
    if (dist + particleRadius > this.radius) {
      if (this.mode === this.BOUNDARY_MODES.WARP) {
        // Warp to opposite side
        position[0] = this.centerX - nx * (this.radius * 0.95);
        position[1] = this.centerY - ny * (this.radius * 0.95);
        return false;
      } else {
        // Calculate normal velocity component (along radius)
        const dot = velocity[0] * nx + velocity[1] * ny;

        // Only apply bounce if moving toward/into boundary
        if (dot > 0) {
          // Decompose velocity into normal and tangential components
          const normalVx = dot * nx;
          const normalVy = dot * ny;

          // Tangential component (along boundary)
          const tangentialVx = velocity[0] - normalVx;
          const tangentialVy = velocity[1] - normalVy;

          // Apply bounce to normal component (-restitution * normal)
          const bounceVx = -this.cBoundaryRestitution * normalVx;
          const bounceVy = -this.cBoundaryRestitution * normalVy;

          // Apply friction to tangential component using effective damping
          const frictionVx = effectiveDamping * tangentialVx;
          const frictionVy = effectiveDamping * tangentialVy;

          // Replace velocity with new components
          velocity[0] = bounceVx + frictionVx;
          velocity[1] = bounceVy + frictionVy;
        }

        // Position correction - place slightly inside boundary
        const safeDistance = this.radius - particleRadius - 0.001;
        position[0] = this.centerX + nx * safeDistance;
        position[1] = this.centerY + ny * safeDistance;

        return true;
      }
    }
    // Case 2: Repulsion - particle is near but not colliding with boundary
    else if (this.boundaryRepulsion > 0) {
      // Calculate distance from particle edge to boundary
      const distanceToEdge = this.radius - (dist + particleRadius);

      // Apply repulsion only when close to boundary (within 15% of radius)
      const repulsionZone = this.radius * 0.15;

      if (distanceToEdge < repulsionZone) {
        // Calculate repulsion strength (stronger as particle gets closer)
        // Map distance from 0 (at boundary) to 1 (at repulsion threshold)
        const normalizedDistance = 1.0 - distanceToEdge / repulsionZone;

        // Use quadratic falloff for smoother effect
        const repulsionStrength =
          this.boundaryRepulsion * normalizedDistance * normalizedDistance;

        // Apply repulsion force (inward direction = -nx, -ny)
        velocity[0] -= nx * repulsionStrength;
        velocity[1] -= ny * repulsionStrength;

        return true;
      }
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

  // Update boundary parameters and notify dependents - override parent method
  update(params) {
    let changed = false;
    if (params.radius !== undefined && params.radius !== this.radius) {
      this.radius = params.radius;
      // Update FLIP system boundary at same time
      this.flipBoundaryScale = 1.0;
      changed = true;
    }
    if (changed) {
      this.updateCallbacks.forEach((callback) => callback(this));
    }
    return changed;
  }

  // Keep for backward compatibility
  getRadius() {
    return this.radius;
  }

  // New methods required by the boundary interface
  getBoundaryType() {
    return "CIRCULAR";
  }

  // Return details needed for calculations
  getBoundaryDetails() {
    return {
      type: "CIRCULAR",
      centerX: this.centerX,
      centerY: this.centerY,
      radius: this.radius,
    };
  }

  // For backward compatibility
  drawCircularBoundary(gl, shaderManager) {
    return this.drawBoundary(gl, shaderManager);
  }

  addUpdateCallback(callback) {
    this.updateCallbacks.add(callback);
  }

  removeUpdateCallback(callback) {
    this.updateCallbacks.delete(callback);
  }

  // Add method to change boundary mode
  setBoundaryMode(mode) {
    if (this.BOUNDARY_MODES[mode]) {
      this.mode = mode;
      // Notify any systems that need updating
      this.updateCallbacks.forEach((callback) => callback(this));
    }
  }
}