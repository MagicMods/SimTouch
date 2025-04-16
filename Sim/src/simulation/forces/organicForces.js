export class OrganicForces {
  constructor(forceScales, debugFlags) {
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;
    this.forceScales = forceScales;
    this.debug = debugFlags;
    this.forceDamping = 0.85;
  }

  toPixelSpace(p) {
    return {
      x: p.x * this.TARGET_WIDTH,
      y: p.y * this.TARGET_HEIGHT,
      vx: p.vx * this.TARGET_WIDTH,
      vy: p.vy * this.TARGET_HEIGHT,
      state: p.state
    };
  }

  calculateFluidForces(particle, neighbors, force, params) {
    const pixelParticle = this.toPixelSpace(particle);
    const maxForce = 0.5; // Limit maximum force magnitude

    if (this.debug.organic && particle.y > 0.7) {
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

        // if (this.debug.organic && particle.y > 0.7) {
        //   console.log(`Applied force: (${force.x.toFixed(3)}, ${force.y.toFixed(3)})`);
        // }
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
        case "Chain":
          this.calculateChainForces(particle, neighborList, force, params);
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

    if (this.debug.organic) {
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
    const pixelParticle = this.toPixelSpace(particle);
    const maxForce = 0.5;
    let totalForce = { x: 0, y: 0 };

    if (this.debug.organic) {
      console.log(`Automata force calculation for particle ${particle.index}:`, {
        state: particle.state,
        neighbors: neighbors.length
      });
    }

    neighbors.forEach((n) => {
      const other = this.toPixelSpace(n.particle);
      const dx = other.x - pixelParticle.x;
      const dy = other.y - pixelParticle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < params.radius) {
        // Normalize direction
        const nx = dx / (dist + 0.0001);
        const ny = dy / (dist + 0.0001);

        // Calculate state difference (-1 to 1 range)
        const stateDiff = Math.abs(n.particle.state - particle.state);

        // Force calculation based on states
        let magnitude;
        if (stateDiff < params.threshold) {
          // Similar states attract
          magnitude = params.attraction * (1 - dist / params.radius);
        } else {
          // Different states repel
          magnitude = -params.repulsion * (1 - dist / params.radius);
        }

        // Apply force with distance falloff
        totalForce.x += nx * magnitude;
        totalForce.y += ny * magnitude;
      }
    });

    // Apply forces with clamping
    force.x = Math.max(-maxForce, Math.min(maxForce, totalForce.x));
    force.y = Math.max(-maxForce, Math.min(maxForce, totalForce.y));

    // Scale with base force
    const baseScale = this.forceScales.Automata.base;
    force.x *= baseScale;
    force.y *= baseScale;

    // Apply damping
    force.x *= this.forceDamping;
    force.y *= this.forceDamping;

    if (this.debug.organic) {
      console.log(`Applied automata force: (${force.x.toFixed(3)}, ${force.y.toFixed(3)})`);
    }
  }

  calculateChainForces(particle, neighbors, force, params) {
    if (!neighbors.length) return;

    console.log("CHAIN FORCES:", {
      particleIndex: particle.index,
      neighbors: neighbors.length,
      params: params
    });

    // Make sure chain data exists on particle
    if (!particle.chainData) {
      particle.chainData = {
        links: []    // Array of particle indices this particle is linked to
      };
    }

    const pixelParticle = this.toPixelSpace(particle);
    const maxForce = 2.0; // Strong force for visibility

    // STEP 1: Form new links if needed
    if (particle.chainData.links.length < params.maxLinks) {
      // Sort neighbors by distance
      const sortedNeighbors = [...neighbors].sort((a, b) => a.distance - b.distance);

      // Try to link with closest neighbors first
      for (const neighbor of sortedNeighbors) {
        // Skip if already linked or if we've reached max links
        if (particle.chainData.links.includes(neighbor.particle.index) ||
          particle.chainData.links.length >= params.maxLinks) {
          continue;
        }

        // Initialize neighbor's chain data if needed
        if (!neighbor.particle.chainData) {
          neighbor.particle.chainData = {
            links: []
          };
        }

        // Skip if neighbor already has maximum links
        if (neighbor.particle.chainData.links.length >= params.maxLinks) {
          continue;
        }

        // Skip if adding this link would exceed branch limit
        const branchCount = neighbor.particle.chainData.links.length;
        if (branchCount >= params.branchProb) {
          continue;
        }

        // Always create links with closest neighbors for testing
        if (sortedNeighbors.length > 0 && sortedNeighbors.indexOf(neighbor) < 2) {
          // Add bidirectional link
          particle.chainData.links.push(neighbor.particle.index);
          neighbor.particle.chainData.links.push(particle.index);

          // Log link creation
          // console.log(`Created link: ${particle.index} <-> ${neighbor.particle.index}`);
        }
      }
    }

    // STEP 2: Apply chain forces to maintain links
    let totalForce = { x: 0, y: 0 };
    const linkedNeighbors = [];

    // Find all linked neighbors
    for (const neighborIdx of particle.chainData.links) {
      const linkedNeighbor = neighbors.find(n => n.particle.index === neighborIdx);
      if (linkedNeighbor) {
        linkedNeighbors.push(linkedNeighbor);
      }
    }

    // Log linked neighbors count
    // console.log(`Particle ${particle.index} has ${linkedNeighbors.length} linked neighbors`);

    // Apply link maintenance forces
    for (const linkedNeighbor of linkedNeighbors) {
      const other = this.toPixelSpace(linkedNeighbor.particle);
      const dx = other.x - pixelParticle.x;
      const dy = other.y - pixelParticle.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        // Calculate direction vector
        const nx = dx / dist;
        const ny = dy / dist;

        // Apply spring force to maintain target distance
        const targetDist = params.linkDistance;
        const distDiff = dist - targetDist;

        // Link strength controls spring force - much stronger now
        const springForce = distDiff * params.linkStrength * 2.0;
        totalForce.x += nx * springForce;
        totalForce.y += ny * springForce;
      }
    }

    // STEP 3: Apply alignment forces
    if (linkedNeighbors.length >= 2 && params.alignment > 0) {
      // Get positions of all linked neighbors
      const positions = linkedNeighbors.map(n => this.toPixelSpace(n.particle));

      // Calculate vectors from particle to each linked neighbor
      const vectors = positions.map(p => ({
        x: p.x - pixelParticle.x,
        y: p.y - pixelParticle.y
      }));

      // Normalize all vectors
      const normVectors = vectors.map(v => {
        const len = Math.hypot(v.x, v.y);
        return (len > 0) ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
      });

      // Compare each pair of vectors
      for (let i = 0; i < normVectors.length - 1; i++) {
        for (let j = i + 1; j < normVectors.length; j++) {
          const v1 = normVectors[i];
          const v2 = normVectors[j];

          // Calculate dot product
          const dot = v1.x * v2.x + v1.y * v2.y;

          // For perfect alignment (straight line), dot should be -1
          // Apply strong alignment force based on parameter
          const alignForce = (1 + dot) * params.alignment * 2.0;

          if (alignForce > 0.01) {
            const perpX = -(v1.y + v2.y);
            const perpY = (v1.x + v2.x);

            const perpLen = Math.hypot(perpX, perpY);
            if (perpLen > 0) {
              totalForce.x += (perpX / perpLen) * alignForce;
              totalForce.y += (perpY / perpLen) * alignForce;
            }
          }
        }
      }
    }

    // Apply forces
    force.x += totalForce.x;
    force.y += totalForce.y;

    // Apply base force scale - make sure this is used
    if (this.forceScales && this.forceScales.Chain) {
      const baseScale = this.forceScales.Chain.base || 1.0;
      force.x *= baseScale;
      force.y *= baseScale;

      // Log actual force applied
      // console.log(`Applied force: ${force.x.toFixed(3)}, ${force.y.toFixed(3)}, scale: ${baseScale}`);
    }

    // Limit maximum force
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

  logForceCalculation(type, force, neighborCount) {
    console.log(`${type} force:`, {
      magnitude: Math.hypot(force.x, force.y).toFixed(3),
      direction: `${force.x.toFixed(3)},${force.y.toFixed(3)}`,
      neighbors: neighborCount,
    });
  }
}