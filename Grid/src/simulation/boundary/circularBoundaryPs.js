import { BaseBoundaryPs } from "./baseBoundaryPs.js";

class CircularBoundaryPs extends BaseBoundaryPs {
  constructor({
    centerX = 0.5,
    centerY = 0.5,
    radius = 0.5,
    cBoundaryRestitution = 0.8,
    damping = 0.95,
    boundaryRepulsion = 0.1,
    segments = 64,
    mode = "BOUNCE",
  } = {}) {
    // Call the parent constructor with shared parameters
    super({
      cBoundaryRestitution,
      damping,
      boundaryRepulsion,
      mode,
    });

    // Core parameters specific to circular boundary
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.segments = segments;

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

  // Handle collision resolution
  resolveCollision(
    position,
    velocity,
    particleRadius = 0,
    externalDamping = null
  ) {
    const dx = position[0] - this.centerX;
    const dy = position[1] - this.centerY;
    const distSq = dx * dx + dy * dy;
    const minDist = this.radius - particleRadius;

    // Detect collision if distance is less than effective radius
    if (distSq > minDist * minDist) {
      return false; // No collision
    }

    // Normal vector (normalized)
    const dist = Math.sqrt(distSq);
    const nx = dist === 0 ? 1 : dx / dist;
    const ny = dist === 0 ? 0 : dy / dist;

    // Calculate effective damping (combine internal and external)
    const effectiveDamping = externalDamping
      ? Math.min(this.damping, externalDamping)
      : this.damping;

    // Check boundary mode
    if (this.mode === this.BOUNDARY_MODES.WARP) {
      // WARP mode: Move particle to opposite side
      position[0] = this.centerX - nx * minDist;
      position[1] = this.centerY - ny * minDist;
      // No velocity change required for warp
      return true;
    }

    // BOUNCE mode (default)
    // Case 1: Particle is colliding with boundary
    if (dist <= this.radius) {
      // Calculate relative velocity normal to the boundary
      const dot = velocity[0] * nx + velocity[1] * ny;

      // If moving towards boundary, apply bounce
      if (dot < 0) {
        // Normal component (perpendicular to boundary)
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

  setRadius(newRadius) {
    this.radius = newRadius;
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

export { CircularBoundaryPs };
