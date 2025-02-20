class OrganicForces {
  constructor() {
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;
    this.debug = false;

    // Force multipliers
    this.forceMultiplier = {
      surfaceTension: 0.5,
      viscosity: 0.2,
      damping: 0.98,
      base: 0.1,
    };
  }

  calculateForces(particles, neighbors, params) {
    const forces = new Map();

    particles.forEach((particle, idx) => {
      const force = { x: 0, y: 0 };
      const neighborList = neighbors.get(idx) || [];

      switch (params.mode) {
        case "Fluid":
          this.calculateFluidForces(particle, neighborList, force, params);
          break;
        case "Swarm":
          this.calculateSwarmForces(particle, neighborList, force, params);
          break;
        case "Automata":
          this.calculateAutomataForces(particle, neighborList, force, params);
          break;
      }

      forces.set(idx, force);
    });

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
    const stats = {
      particle: {
        x: particle.x,
        y: particle.y,
        vx: particle.vx,
        vy: particle.vy,
      },
      neighbors: neighbors.length,
      params: params,
      forces: { surface: 0, viscosity: 0 },
    };

    neighbors.forEach((n) => {
      const other = n.particle;
      const dx = other.x - particle.x;
      const dy = other.y - particle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        // Surface tension
        const normalized = {
          x: dx / dist,
          y: dy / dist,
        };
        const strength = (1 - dist / params.radius) * params.surfaceTension;

        force.x +=
          normalized.x * strength * this.forceMultiplier.surfaceTension;
        force.y +=
          normalized.y * strength * this.forceMultiplier.surfaceTension;
        stats.forces.surface += strength;

        // Viscosity
        const relVelX = other.vx - particle.vx;
        const relVelY = other.vy - particle.vy;

        force.x += relVelX * params.viscosity * this.forceMultiplier.viscosity;
        force.y += relVelY * params.viscosity * this.forceMultiplier.viscosity;
        stats.forces.viscosity +=
          Math.hypot(relVelX, relVelY) * params.viscosity;
      }
    });

    // Scale and damp
    force.x *= this.forceMultiplier.base;
    force.y *= this.forceMultiplier.base;
    force.x *= this.forceMultiplier.damping;
    force.y *= this.forceMultiplier.damping;

    stats.finalForce = {
      x: force.x,
      y: force.y,
      magnitude: Math.hypot(force.x, force.y),
    };

    if (this.debug && stats.forces.surface > 0) {
      console.log("FluidForces calculation:", JSON.stringify(stats, null, 2));
    }
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
