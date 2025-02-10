class FluidSolver {
  constructor(config) {
    if (
      !config ||
      typeof config.width !== "number" ||
      typeof config.height !== "number"
    ) {
      throw new Error("FluidSolver requires numeric width and height");
    }

    // Grid dimensions
    this.width = config.width;
    this.height = config.height;
    this.timeStep = config.timeStep || 1 / 60;

    // Initialize single test particle
    this.particles = new Float32Array(2);
    this.particles[0] = this.width / 2; // x position (center)
    this.particles[1] = this.height * 0.2; // y position (near top)

    // Add velocity for the particle
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 9.81;
    this.restitution = 0.7; // Bounce factor

    // Match grid renderer's circular boundary
    const aspectRatio = this.width / this.height;
    this.boundaryRadius = Math.min(1.0, 1.0 / aspectRatio) * 0.96; // from 0.8 to 0.88

    // Scale to grid dimensions
    this.boundaryRadius *= Math.min(this.width, this.height);

    // Center coordinates
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    console.log(
      `FluidSolver initialized: {dimensions: ${this.width}x${
        this.height
      }, cells: ${this.width * this.height}, timeStep: ${this.timeStep}`
    );
  }

  step() {
    // Apply gravity and update position
    this.velocityY += this.gravity * this.timeStep;

    // Update position
    const newX = this.particles[0] + this.velocityX * this.timeStep;
    const newY = this.particles[1] + this.velocityY * this.timeStep;

    // Check boundary collision
    const dx = newX - this.centerX;
    const dy = newY - this.centerY;
    const distSq = dx * dx + dy * dy;

    if (distSq > this.boundaryRadius * this.boundaryRadius) {
      // Collision response
      const dist = Math.sqrt(distSq);
      const nx = dx / dist; // Normal x
      const ny = dy / dist; // Normal y

      // Reflect velocity
      const dot = this.velocityX * nx + this.velocityY * ny;
      this.velocityX -= 2 * dot * nx * this.restitution;
      this.velocityY -= 2 * dot * ny * this.restitution;

      // Place particle on boundary
      this.particles[0] = this.centerX + nx * this.boundaryRadius;
      this.particles[1] = this.centerY + ny * this.boundaryRadius;
    } else {
      // No collision, update position
      this.particles[0] = newX;
      this.particles[1] = newY;
    }
  }
}

export { FluidSolver };
