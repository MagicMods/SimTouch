class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // Standard [0,1] space parameters
    this.centerX = 0.5; // Center point
    this.centerY = 0.5; // Center point
    this.radius = 0.475; // 95% of normalized space

    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = -gravity;

    // Physics parameters
    this.restitution = 0.5;
    this.velocityDamping = 0.995;
    this.boundaryDamping = 0.6;
    this.particleRadius = 0.01;

    // Initialize particle arrays in [0,1] space
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    this.initializeParticles();
    this.boundaryPoints = this.createBoundaryPoints();
  }

  createBoundaryPoints() {
    const points = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Create directly in [0,1] space
      const x = this.centerX + Math.cos(angle) * this.radius;
      const y = this.centerY + Math.sin(angle) * this.radius;
      points.push({ x, y, vx: 0, vy: 0 });
    }
    return points;
  }

  initializeParticles() {
    const spacing = 0.05; // In [0,1] space
    const particlesPerRow = 10;
    const rows = this.numParticles / particlesPerRow;

    // Start near top in [0,1] space
    const startX = this.centerX - (particlesPerRow * spacing) / 2;
    const startY = 0.2; // 20% from top

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / particlesPerRow);
      const col = i % particlesPerRow;

      this.particles[i * 2] = startX + col * spacing;
      this.particles[i * 2 + 1] = startY + row * spacing;
      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }
  }

  step() {
    for (let i = 0; i < this.numParticles; i++) {
      // Apply gravity ([0,1] space: positive Y is down)
      this.velocitiesY[i] += this.gravity * this.timeStep;

      // Apply velocity damping
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // Update position
      const newX = this.particles[i * 2] + this.velocitiesX[i] * this.timeStep;
      const newY =
        this.particles[i * 2 + 1] + this.velocitiesY[i] * this.timeStep;

      // Check circular boundary collision in [0,1] space
      const dx = newX - this.centerX;
      const dy = newY - this.centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq > this.radius * this.radius) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        // Calculate impact
        const dot = this.velocitiesX[i] * nx + this.velocitiesY[i] * ny;

        if (dot > 0) {
          // Reflect velocity
          this.velocitiesX[i] -= (1 + this.restitution) * dot * nx;
          this.velocitiesY[i] -= (1 + this.restitution) * dot * ny;

          // Apply damping
          this.velocitiesX[i] *= this.boundaryDamping;
          this.velocitiesY[i] *= this.boundaryDamping;
        }

        // Move inside boundary
        const safeRadius = this.radius - this.particleRadius;
        this.particles[i * 2] = this.centerX + nx * safeRadius;
        this.particles[i * 2 + 1] = this.centerY + ny * safeRadius;
      } else {
        this.particles[i * 2] = newX;
        this.particles[i * 2 + 1] = newY;
      }
    }
  }

  // No coordinate conversion needed - already in [0,1] space
  getParticles() {
    const particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      particles.push({
        x: this.particles[i * 2],
        y: this.particles[i * 2 + 1],
        vx: this.velocitiesX[i],
        vy: this.velocitiesY[i],
      });
    }
    return particles;
  }

  getBoundaryPoints() {
    return this.boundaryPoints;
  }
}

export { ParticleSystem };
