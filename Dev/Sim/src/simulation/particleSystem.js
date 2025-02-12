class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = gravity;

    // Particle state arrays (in normalized space [0,1])
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    this.initializeParticles();
    console.log("ParticleSystem initialized");
  }

  initializeParticles() {
    const spacing = 0.05; // Normalized spacing
    const startX = 0.3; // Start at 30% from left
    const startY = 0.8; // Start at 80% from bottom

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      this.particles[i * 2] = startX + col * spacing;
      this.particles[i * 2 + 1] = startY - row * spacing;
      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }
  }

  step() {
    // Empty for now
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
}

export { ParticleSystem };
