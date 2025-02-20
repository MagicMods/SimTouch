class OrganicForces {
  constructor() {
    // Match GridRenderer's configuration
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;
    this.debug = false;

    // Add force scaling factors
    this.forceScales = {
      Fluid: 0.001,
      Swarm: 0.0005,
      Automata: 0.0002,
    };
  }

  calculateForces(particles, neighbors, params) {
    if (!particles?.length) return new Map();

    const forces = new Map();
    particles.forEach((particle, idx) => {
      const force = { x: 0, y: 0 };
      const neighborList = neighbors.get(idx) || [];

      // Convert to pixel space
      const pxPos = this.toPixelSpace(particle);

      switch (params.mode) {
        case "Fluid":
          this.calculateFluidForces(pxPos, neighborList, force, params);
          break;
        case "Swarm":
          this.calculateSwarmForces(pxPos, neighborList, force, params);
          break;
        case "Automata":
          this.calculateAutomataForces(pxPos, neighborList, force, params);
          break;
      }

      // Convert back and store
      forces.set(idx, this.toNormalizedSpace(force));
    });

    // Apply force scaling before returning
    const scale = this.forceScales[params.mode] || 1.0;
    forces.forEach((force, idx) => {
      force.x *= scale;
      force.y *= scale;
    });

    if (this.debug) {
      this.logForces(forces);
    }

    return forces;
  }

  toPixelSpace(p) {
    return {
      x: p.x * this.TARGET_WIDTH,
      y: (1 - p.y) * this.TARGET_HEIGHT,
      vx: p.vx,
      vy: p.vy,
      state: p.state,
    };
  }

  toNormalizedSpace(force) {
    return {
      x: force.x / this.TARGET_WIDTH,
      y: -(force.y / this.TARGET_HEIGHT), // Note Y-inversion
    };
  }

  calculateFluidForces(particle, neighbors, force, params) {
    neighbors.forEach((n) => {
      const other = this.toPixelSpace(n.particle);
      const dx = other.x - particle.x;
      const dy = other.y - particle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        // Surface tension
        const normalized = { x: dx / dist, y: dy / dist };
        const strength = (1 - dist / params.radius) * params.surfaceTension;
        force.x += normalized.x * strength;
        force.y += normalized.y * strength;

        // Viscosity
        const relVelX = other.vx - particle.vx;
        const relVelY = other.vy - particle.vy;
        force.x += relVelX * params.viscosity;
        force.y += relVelY * params.viscosity;
      }
    });

    force.x *= params.damping;
    force.y *= params.damping;

    if (this.debug) this.logForceCalculation("Fluid", force, neighbors.length);
  }

  calculateSwarmForces(particle, neighbors, force, params) {
    if (!neighbors.length) return;

    let [centerX, centerY] = [0, 0];
    let [avgVelX, avgVelY] = [0, 0];
    let [sepX, sepY] = [0, 0];

    neighbors.forEach((n) => {
      const other = this.toPixelSpace(n.particle);

      // Cohesion
      centerX += other.x;
      centerY += other.y;

      // Alignment
      avgVelX += other.vx;
      avgVelY += other.vy;

      // Separation
      const dx = other.x - particle.x;
      const dy = other.y - particle.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        sepX -= (dx / dist) * (1 - dist / params.radius);
        sepY -= (dy / dist) * (1 - dist / params.radius);
      }
    });

    const count = neighbors.length;
    force.x +=
      (centerX / count - particle.x) * params.cohesion +
      (avgVelX / count) * params.alignment +
      sepX * params.separation;
    force.y +=
      (centerY / count - particle.y) * params.cohesion +
      (avgVelY / count) * params.alignment +
      sepY * params.separation;

    // Limit force
    const mag = Math.hypot(force.x, force.y);
    if (mag > params.maxSpeed) {
      const scale = params.maxSpeed / mag;
      force.x *= scale;
      force.y *= scale;
    }

    if (this.debug) this.logForceCalculation("Swarm", force, neighbors.length);
  }

  calculateAutomataForces(particle, neighbors, force, params) {
    // Simple repulsion/attraction based on states
    neighbors.forEach((n) => {
      const other = this.toPixelSpace(n.particle);
      const dx = other.x - particle.x;
      const dy = other.y - particle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        const stateDiff = n.particle.state - particle.state;
        const strength = (1 - dist / params.radius) * stateDiff * 0.1;
        force.x += (dx / dist) * strength;
        force.y += (dy / dist) * strength;
      }
    });
  }

  logForceCalculation(type, force, neighborCount) {
    console.log(`${type} force:`, {
      magnitude: Math.hypot(force.x, force.y).toFixed(3),
      direction: `${force.x.toFixed(3)},${force.y.toFixed(3)}`,
      neighbors: neighborCount,
    });
  }
}

export { OrganicForces };
