class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // Match grid's center and scale
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 0.95;

    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = -gravity; // Negative for downward

    // Particle arrays (in normalized space)
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    // Physics parameters
    this.restitution = 0.5;
    this.velocityDamping = 0.995;
    this.boundaryDamping = 0.6;
    this.particleRadius = 0.01; // In normalized space

    this.initializeParticles();
    this.boundaryPoints = this.createBoundaryPoints(); // Create and store boundary points
  }

  createBoundaryPoints() {
    const points = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = this.centerX + this.radius * Math.cos(angle); // Center at (0.5, 0.5)
      const y = this.centerY + this.radius * Math.sin(angle);
      points.push({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
      });
    }
    return points;
  }

  getBoundaryPoints() {
    return this.boundaryPoints;
  }

  initializeParticles() {
    const spacing = 0.05;
    const particlesPerRow = 10;
    const rows = this.numParticles / particlesPerRow;

    // Center the grid of particles
    const startX = this.centerX - (particlesPerRow * spacing) / 2;
    const startY = 0.8; // Start near top

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / particlesPerRow);
      const col = i % particlesPerRow;

      // Store directly in [0,1] space
      this.particles[i * 2] = startX + col * spacing;
      this.particles[i * 2 + 1] = startY - row * spacing;
      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }
  }

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

  step() {
    for (let i = 0; i < this.numParticles; i++) {
      // Apply gravity
      this.velocitiesY[i] += this.gravity * this.timeStep;

      // Apply velocity damping
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // Update position
      const newX = this.particles[i * 2] + this.velocitiesX[i] * this.timeStep;
      const newY =
        this.particles[i * 2 + 1] + this.velocitiesY[i] * this.timeStep;

      // Check boundary collision (relative to center)
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
}

export { ParticleSystem };
