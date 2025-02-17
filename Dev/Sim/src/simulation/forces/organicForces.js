export class OrganicForces {
  static applyCohesion(particle, neighbors, strength) {
    // Implementation to follow
    // Calculates attraction forces
  }

  static applySeparation(particle, neighbors, strength) {
    // Implementation to follow
    // Calculates repulsion forces
  }

  static applySurfaceTension(particle, neighbors, strength) {
    // Implementation to follow
    // Calculates surface tension forces
  }

  applyFluidForces(particle, neighbors, params) {
    let surfaceTension = [0, 0];
    let viscousForce = [0, 0];

    for (const neighbor of neighbors) {
      const dx = neighbor.x - particle.x;
      const dy = neighbor.y - particle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        // Surface tension
        const normalized = [dx / dist, dy / dist];
        const strength = Math.pow(1 - dist / params.radius, 2);
        surfaceTension[0] += normalized[0] * strength;
        surfaceTension[1] += normalized[1] * strength;

        // Viscosity
        const relVelX = neighbor.vx - particle.vx;
        const relVelY = neighbor.vy - particle.vy;
        viscousForce[0] += relVelX * strength;
        viscousForce[1] += relVelY * strength;
      }
    }

    // Apply combined forces
    particle.vx +=
      (surfaceTension[0] * params.surfaceTension +
        viscousForce[0] * params.viscosity) *
      params.damping;
    particle.vy +=
      (surfaceTension[1] * params.surfaceTension +
        viscousForce[1] * params.viscosity) *
      params.damping;
  }

  applySwarmForces(particle, neighbors, params) {
    const cohesion = [0, 0];
    const separation = [0, 0];
    const alignment = [0, 0];
    let neighborCount = 0;

    // Calculate swarm behavior vectors
    for (const neighbor of neighbors) {
      const dx = neighbor.x - particle.x;
      const dy = neighbor.y - particle.y;
      const dist = neighbor.distance;
      const influence = 1 - dist / params.radius;

      // Cohesion: steer towards center of mass
      cohesion[0] += neighbor.x * influence;
      cohesion[1] += neighbor.y * influence;

      // Separation: steer away from close neighbors
      if (dist < params.radius * 0.5) {
        const repel = 1 - dist / (params.radius * 0.5);
        separation[0] -= dx * repel;
        separation[1] -= dy * repel;
      }

      // Alignment: match velocity with neighbors
      alignment[0] += neighbor.vx * influence;
      alignment[1] += neighbor.vy * influence;

      neighborCount++;
    }

    // Apply combined forces
    if (neighborCount > 0) {
      // Normalize and apply weights
      const normalize = (v) => {
        const len = Math.hypot(v[0], v[1]);
        if (len > 0) {
          v[0] /= len;
          v[1] /= len;
        }
        return v;
      };

      const forces = [
        normalize(cohesion).map((v) => v * params.cohesion),
        normalize(separation).map((v) => v * params.separation),
        normalize(alignment).map((v) => v * params.alignment),
      ];

      // Combine forces
      const totalForce = forces.reduce(
        (acc, force) => {
          acc[0] += force[0];
          acc[1] += force[1];
          return acc;
        },
        [0, 0]
      );

      // Apply force with speed limit
      particle.vx += totalForce[0];
      particle.vy += totalForce[1];

      // Limit speed
      const speed = Math.hypot(particle.vx, particle.vy);
      if (speed > params.maxSpeed) {
        const scale = params.maxSpeed / speed;
        particle.vx *= scale;
        particle.vy *= scale;
      }
    }
  }
}
