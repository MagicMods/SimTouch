class OrganicForces {
  constructor(forceScales) {
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;
    this.debug = false;
    this.forceScales = forceScales;
    this.frameCount = 0;
    this.logInterval = 60; // Log every 60 frames
  }

  toPixelSpace(p) {
    // Convert normalized coordinates (0-1) to pixel space (0-240)
    return {
      x: p.x * this.TARGET_WIDTH,
      y: p.y * this.TARGET_HEIGHT, // Don't invert Y
      vx: p.vx * this.TARGET_WIDTH,
      vy: p.vy * this.TARGET_HEIGHT,
      state: p.state,
    };
  }

  toNormalizedSpace(force) {
    // Convert back from pixel to normalized space
    return {
      x: force.x / this.TARGET_WIDTH,
      y: force.y / this.TARGET_HEIGHT, // Don't invert Y
    };
  }

  calculateFluidForces(particle, neighbors, force, params) {
    const stats = {
      input: {
        particle: { x: particle.x, y: particle.y },
        pixel: this.toPixelSpace(particle),
        neighbors: neighbors.length,
        frame: this.frameCount,
      },
    };

    // Increment frame counter
    this.frameCount = (this.frameCount + 1) % this.logInterval;

    // Log bottom half particles every logInterval frames
    if (
      stats.input.pixel.y > this.TARGET_HEIGHT / 2 &&
      this.frameCount === 0 &&
      this.debug
    ) {
      console.log(
        "Fluid force calculation (bottom half):",
        JSON.stringify(stats, null, 2)
      );
    }

    if (!params || !params.surfaceTension || !params.viscosity) {
      console.warn("Invalid fluid parameters:", params);
      return;
    }

    neighbors.forEach((n) => {
      const other = n.particle;
      const dx = other.x - particle.x;
      const dy = other.y - particle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        // Surface tension
        const strength = (1 - dist / params.radius) * params.surfaceTension;
        force.x +=
          (dx / dist) * strength * this.forceScales.Fluid.surfaceTension;
        force.y +=
          (dy / dist) * strength * this.forceScales.Fluid.surfaceTension;

        // Viscosity
        const relVelX = other.vx - particle.vx;
        const relVelY = other.vy - particle.vy;
        force.x +=
          relVelX * params.viscosity * this.forceScales.Fluid.viscosity;
        force.y +=
          relVelY * params.viscosity * this.forceScales.Fluid.viscosity;
      }
    });

    // Apply base scale and damping
    force.x *= this.forceScales.Fluid.base * params.damping;
    force.y *= this.forceScales.Fluid.base * params.damping;
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
