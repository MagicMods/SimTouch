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

    const pixelParticle = this.toPixelSpace(particle);
    const maxForce = params.maxSpeed;
    let [centerX, centerY] = [0, 0];
    let [avgVelX, avgVelY] = [0, 0];
    let [sepX, sepY] = [0, 0];
    let count = 0;

    // First pass: collect data
    neighbors.forEach((n) => {
      const other = this.toPixelSpace(n.particle);
      const dx = other.x - pixelParticle.x;
      const dy = other.y - pixelParticle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        count++;
        const weight = 1.0 - (dist / params.radius);

        // Separation (inversely proportional to distance)
        const repulsion = 1.0 / (dist + 1);
        sepX -= (dx / dist) * repulsion;
        sepY -= (dy / dist) * repulsion;

        // Cohesion (average position)
        centerX += other.x;
        centerY += other.y;

        // Alignment (average velocity)
        avgVelX += other.vx;
        avgVelY += other.vy;
      }
    });

    if (count > 0) {
      // Normalize vectors
      centerX = centerX / count - pixelParticle.x;
      centerY = centerY / count - pixelParticle.y;
      const centerDist = Math.hypot(centerX, centerY);
      if (centerDist > 0) {
        centerX /= centerDist;
        centerY /= centerDist;
      }

      avgVelX /= count;
      avgVelY /= count;
      const velDist = Math.hypot(avgVelX, avgVelY);
      if (velDist > 0) {
        avgVelX /= velDist;
        avgVelY /= velDist;
      }

      const sepDist = Math.hypot(sepX, sepY);
      if (sepDist > 0) {
        sepX /= sepDist;
        sepY /= sepDist;
      }

      // Apply behavior weights
      const cohesionForce = params.cohesion * 0.05;
      const alignmentForce = params.alignment * 0.05;
      const separationForce = params.separation * 0.05;

      // Combine forces
      force.x = (centerX * cohesionForce) + 
                (avgVelX * alignmentForce) + 
                (sepX * separationForce);
      force.y = (centerY * cohesionForce) + 
                (avgVelY * alignmentForce) + 
                (sepY * separationForce);

      // Clamp force magnitude
      const magnitude = Math.hypot(force.x, force.y);
      if (magnitude > maxForce) {
        const scale = maxForce / magnitude;
        force.x *= scale;
        force.y *= scale;
      }

      // Apply damping
      force.x *= this.forceDamping;
      force.y *= this.forceDamping;
    }

    if (this.debugEnabled) {
      console.log(`Swarm force for particle at (${particle.x.toFixed(2)}, ${particle.y.toFixed(2)}):`, {
        force: `(${force.x.toFixed(3)}, ${force.y.toFixed(3)})`,
        neighbors: count,
        params: {
          cohesion: params.cohesion,
          alignment: params.alignment,
          separation: params.separation
        }
      });
    }
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
