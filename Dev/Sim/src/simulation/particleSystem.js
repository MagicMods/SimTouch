class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // System dimensions (physical space)
    this.width = 240;
    this.height = 240;
    this.halfWidth = this.width / 2; // 120
    this.halfHeight = this.height / 2; // 120

    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = gravity;

    // Particle state arrays (in physical space)
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    // Physics parameters
    this.restitution = 0.5;
    this.velocityDamping = 0.995;
    this.boundaryDamping = 0.6;
    this.particleRadius = 2; // 2 pixels radius

    // Physical space center (0,0 in -120 to +120 space)
    this.centerX = -this.halfWidth; // Changed to -120
    this.centerY = -this.halfHeight; // Changed to -120

    this.initializeParticles();
    console.log("ParticleSystem initialized in physical 240x240 space");
  }

  initializeParticles() {
    // Grid formation in pixel space
    const spacing = 5; // 5 pixels between particles
    const particlesPerRow = 10;
    const rows = this.numParticles / particlesPerRow;
    const halfWidth = (particlesPerRow * spacing) / 2;
    const halfHeight = (rows * spacing) / 2;

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / particlesPerRow);
      const col = i % particlesPerRow;

      // Center grid on 240x240 space
      this.particles[i * 2] = this.centerX - halfWidth + col * spacing;
      this.particles[i * 2 + 1] = this.centerY - halfHeight + row * spacing;

      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }

    console.log(`Particles initialized at (${this.centerX}, ${this.centerY})`);

    // Debug first and last particle positions
    console.log("First particle:", {
      physical: {
        x: this.particles[0],
        y: this.particles[1],
      },
      normalized: {
        x: (this.particles[0] + this.halfWidth) / this.width,
        y: (this.particles[1] + this.halfHeight) / this.height,
      },
    });
  }

  step() {
    // Empty for now
  }

  getParticles() {
    const particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      particles.push({
        // Transform from [-120,+120] to [0,1] space
        x: (this.particles[i * 2] + this.halfWidth) / this.width,
        y: (this.particles[i * 2 + 1] + this.halfHeight) / this.height,
        vx: this.velocitiesX[i],
        vy: this.velocitiesY[i],
      });
    }
    return particles;
  }
}

export { ParticleSystem };
