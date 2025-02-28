class ParticleSystem {
  constructor(config) {
    // Grid layout parameters
    this.width = config.width;
    this.height = config.height;
    this.rowCounts = config.rowCounts;
    this.stepX = config.stepX;
    this.stepY = config.stepY;
    this.verticalOffset = config.verticalOffset;
    this.velocityDamping = config.velocityDamping || 0.8;

    // Particle parameters
    this.particleCount = config.particleCount || 338;
    this.particleRadius = config.particleRadius || 4.0;
    this.collisionDamping = config.collisionDamping || 0.5;
    this.repulsionStrength = config.repulsionStrength || 0.3;
    this.collisionIterations = config.collisionIterations || 3;

    // Container/obstacle parameters
    this.containerRadius = config.containerRadius;
    this.containerCenter = config.containerCenter;
    this.circleCenter = config.circleCenter;
    this.circleRadius = config.circleRadius;
    this.isObstacleActive = config.isObstacleActive || false;

    this.particleLineWidth = 2.0;
    this.particleColor = [1, 1, 1, 0];

    this.particles = [];
    this.setupParticles();
  }

  setupParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      let x, y, dist;
      do {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * this.containerRadius * 0.8;
        x = this.containerCenter.x + radius * Math.cos(angle);
        y = this.containerCenter.y + radius * Math.sin(angle);
        const dx = x - this.containerCenter.x;
        const dy = y - this.containerCenter.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      } while (dist > this.containerRadius);

      this.particles.push({ x, y, vx: 0, vy: 0 });
    }
  }

  getParticles() {
    return this.particles;
  }

  handleParticleCollisions() {
    const cellSize = this.particleRadius * 4;
    const spatialGrid = new Map();

    // Insert particles into spatial grid
    this.particles.forEach((p, i) => {
      const col = Math.floor(p.x / cellSize);
      const row = Math.floor(p.y / cellSize);
      const key = `${row},${col}`;
      if (!spatialGrid.has(key)) spatialGrid.set(key, []);
      spatialGrid.get(key).push(i);
    });

    // Check collisions
    for (let iter = 0; iter < this.collisionIterations; iter++) {
      for (let i = 0; i < this.particles.length; i++) {
        const p1 = this.particles[i];
        const col = Math.floor(p1.x / cellSize);
        const row = Math.floor(p1.y / cellSize);

        // Check neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${row + dy},${col + dx}`;
            const cell = spatialGrid.get(key) || [];

            for (const j of cell) {
              if (i >= j) continue;

              const p2 = this.particles[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const distSq = dx * dx + dy * dy;
              const minDist = this.particleRadius * 2;

              if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;

                // Position correction
                const overlap = minDist - dist;
                const correction = overlap * 0.5;
                p1.x -= nx * correction;
                p1.y -= ny * correction;
                p2.x += nx * correction;
                p2.y += ny * correction;

                // Collision response
                const relVelX = p2.vx - p1.vx;
                const relVelY = p2.vy - p1.vy;
                const relVelDotNormal = relVelX * nx + relVelY * ny;

                if (relVelDotNormal < 0) {
                  const restitution = 1.0 + this.collisionDamping;
                  const j = -(relVelDotNormal * restitution) * 0.5;

                  p1.vx -= j * nx;
                  p1.vy -= j * ny;
                  p2.vx += j * nx;
                  p2.vy += j * ny;
                }

                // Apply repulsion force
                const repulsionScale =
                  this.repulsionStrength * (1.0 - dist / minDist);
                const repulsionX = nx * repulsionScale;
                const repulsionY = ny * repulsionScale;

                p1.vx -= repulsionX;
                p1.vy -= repulsionY;
                p2.vx += repulsionX;
                p2.vy += repulsionY;
              }
            }
          }
        }
      }
    }
  }

  checkBoundaries(particle) {
    // Container boundary check with adjusted radius
    const dx = particle.x - this.containerCenter.x;
    const dy = particle.y - this.containerCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.containerRadius) {
      const angle = Math.atan2(dy, dx);
      particle.x =
        this.containerCenter.x + Math.cos(angle) * this.containerRadius;
      particle.y =
        this.containerCenter.y + Math.sin(angle) * this.containerRadius;

      // Reflect velocity with dampening
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = particle.vx * nx + particle.vy * ny;
      particle.vx = (particle.vx - 2 * dot * nx) * 0.8;
      particle.vy = (particle.vy - 2 * dot * ny) * 0.8;
    }

    // Obstacle collision with separation
    if (this.isObstacleActive) {
      const odx = particle.x - this.circleCenter.x;
      const ody = particle.y - this.circleCenter.y;
      const odist = Math.sqrt(odx * odx + ody * ody);

      if (odist < this.circleRadius + 2.0) {
        const angle = Math.atan2(odx, ody);
        particle.x =
          this.circleCenter.x + Math.cos(angle) * (this.circleRadius + 2.0);
        particle.y =
          this.circleCenter.y + Math.sin(angle) * (this.circleRadius + 2.0);

        // Reflect velocity with dampening
        const nx = odx / odist;
        const ny = ody / odist;
        const dot = particle.vx * nx + particle.vy * ny;
        if (dot < 0) {
          particle.vx = (particle.vx - 2 * dot * nx) * 0.8;
          particle.vy = (particle.vy - 2 * dot * ny) * 0.8;
        }
      }
    }
  }

  isInsideGrid(x, y) {
    const row = Math.floor((y - this.verticalOffset) / this.stepY);
    if (row < 0 || row >= this.rowCounts.length) return false;

    const rowWidth = this.rowCounts[row] * this.stepX;
    const baseX = (this.width - rowWidth) / 2;
    return x >= baseX && x <= baseX + rowWidth;
  }

  enforceBoundaries() {
    for (const p of this.particles) {
      // Container boundary check
      const dx = p.x - this.containerCenter.x;
      const dy = p.y - this.containerCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const containerLimit = this.containerRadius - this.particleRadius;

      if (dist > containerLimit) {
        const angle = Math.atan2(dy, dx);
        p.x = this.containerCenter.x + Math.cos(angle) * containerLimit;
        p.y = this.containerCenter.y + Math.sin(angle) * containerLimit;

        const nx = dx / dist;
        const ny = dy / dist;
        const dot = p.vx * nx + p.vy * ny;
        p.vx = (p.vx - 2 * dot * nx) * this.velocityDamping;
        p.vy = (p.vy - 2 * dot * ny) * this.velocityDamping;
      }

      if (this.isObstacleActive) {
        for (const p of this.particles) {
          const odx = p.x - this.circleCenter.x;
          const ody = p.y - this.circleCenter.y;
          const odist = Math.sqrt(odx * odx + ody * ody);

          if (odist < this.circleRadius + this.particleRadius) {
            const angle = Math.atan2(ody, odx);
            p.x =
              this.circleCenter.x +
              Math.cos(angle) * (this.circleRadius + this.particleRadius);
            p.y =
              this.circleCenter.y +
              Math.sin(angle) * (this.circleRadius + this.particleRadius);

            const nx = odx / odist;
            const ny = ody / odist;
            const dot = p.vx * nx + p.vy * ny;
            if (dot < 0) {
              p.vx = (p.vx - 2 * dot * nx) * this.velocityDamping;
              p.vy = (p.vy - 2 * dot * ny) * this.velocityDamping;
            }
          }
        }
      }
    }
  }

  advectParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.checkBoundaries(p);
    }
  }
}

export { ParticleSystem };
