class OrganicForces {
  constructor(forceScales) {
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;
    this.forceScales = forceScales;
    this.debugEnabled = false;
    // Add force damping to prevent excessive accumulation
    this.forceDamping = 0.85;
  }

  toPixelSpace(p) {
    return {
      x: p.x * this.TARGET_WIDTH,
      y: p.y * this.TARGET_HEIGHT, // Keep original Y coordinate system
      vx: p.vx * this.TARGET_WIDTH,
      vy: p.vy * this.TARGET_HEIGHT,
      state: p.state
    };
  }

  calculateFluidForces(particle, neighbors, force, params) {
    const pixelParticle = this.toPixelSpace(particle);
    const maxForce = 0.5; // Limit maximum force magnitude
    
    if (this.debugEnabled && particle.y > 0.7) {
      console.log(`Computing fluid forces for particle at y=${particle.y.toFixed(3)}`);
      console.log(`Neighbor count: ${neighbors.length}`);
    }

    neighbors.forEach((n) => {
      const other = this.toPixelSpace(n.particle);
      const dx = other.x - pixelParticle.x;
      const dy = other.y - pixelParticle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        // Normalize distance to 0-1 range
        const t = 1.0 - (dist / params.radius);
        
        // Surface tension with distance-based scaling
        const tensionStrength = t * t * params.surfaceTension;
        const tensionScale = this.forceScales.Fluid.surfaceTension * 0.1;
        
        // Add repulsion at very close distances
        const repulsion = dist < params.radius * 0.2 ? 1.0 / (dist + 0.1) : 0;
        
        // Calculate normalized direction
        const nx = dx / (dist + 0.0001);
        const ny = dy / (dist + 0.0001);
        
        // Combine attraction and repulsion
        const fx = (tensionStrength * nx - repulsion * nx) * tensionScale;
        const fy = (tensionStrength * ny - repulsion * ny) * tensionScale;
        
        // Apply viscosity
        const viscosityScale = this.forceScales.Fluid.viscosity * 0.05;
        const relVelX = (other.vx - pixelParticle.vx) * params.viscosity * viscosityScale;
        const relVelY = (other.vy - pixelParticle.vy) * params.viscosity * viscosityScale;

        // Add forces with clamping
        force.x = Math.max(-maxForce, Math.min(maxForce, force.x + fx + relVelX));
        force.y = Math.max(-maxForce, Math.min(maxForce, force.y + fy + relVelY));

        if (this.debugEnabled && particle.y > 0.7) {
          console.log(`Applied force: (${force.x.toFixed(3)}, ${force.y.toFixed(3)})`);
        }
      }
    });

    // Apply damping to prevent force accumulation
    force.x *= this.forceDamping;
    force.y *= this.forceDamping;

    return force;
  }

  toNormalizedSpace(force) {
    // Convert back from pixel to normalized space
    return {
      x: force.x / this.TARGET_WIDTH,
      y: -force.y / this.TARGET_HEIGHT, // Invert Y back
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
