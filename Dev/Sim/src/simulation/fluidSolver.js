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
    this.velocityY = 0;
    this.gravity = 9.81;

    console.log(
      `FluidSolver initialized: {dimensions: ${this.width}x${
        this.height
      }, cells: ${this.width * this.height}, timeStep: ${this.timeStep}`
    );
  }

  step() {
    // Apply gravity and update position
    this.velocityY += this.gravity * this.timeStep;
    this.particles[1] += this.velocityY * this.timeStep;

    // Reset when reaching bottom
    if (this.particles[1] > this.height) {
      this.particles[1] = 0;
      this.velocityY = 0;
    }
  }
}

export { FluidSolver };
