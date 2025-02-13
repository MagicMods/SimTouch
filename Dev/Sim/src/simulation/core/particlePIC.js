class ParticlePIC {
  constructor({
    particleCount = 500,
    timeStep = 1 / 60,
    centerX = 0.5,
    centerY = 0.5,
    radius = 0.475,
  } = {}) {
    // Core parameters
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;

    // Particle properties
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.particleRadius = 0.01;

    // Core arrays
    this.particles = new Float32Array(particleCount * 2);
    this.velocitiesX = new Float32Array(particleCount);
    this.velocitiesY = new Float32Array(particleCount);

    // Basic physics
    this.velocityDamping = 0.98;
    this.velocityThreshold = 0.001;
    this.positionThreshold = 0.0001;

    this.initializeParticles();
  }

  initializeParticles() {
    // Move existing initialization code here
    const rings = Math.ceil(Math.sqrt(this.numParticles));
    const particlesPerRing = Math.ceil(this.numParticles / rings);
    const spawnRadius = this.radius * 0.8;
    // ... rest of initialization code ...
  }

  updatePositions(dt) {
    // Move core position update logic here
    for (let i = 0; i < this.numParticles; i++) {
      // Basic position update without forces
      this.particles[i * 2] += this.velocitiesX[i] * dt;
      this.particles[i * 2 + 1] += this.velocitiesY[i] * dt;
    }
  }

  getParticles() {
    return {
      positions: this.particles,
      velocitiesX: this.velocitiesX,
      velocitiesY: this.velocitiesY,
      count: this.numParticles,
    };
  }
}
export { ParticlePIC };
