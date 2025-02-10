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

    // Initialize particle arrays (start with 100 particles)
    this.numParticles = 100;
    this.particles = new Float32Array(this.numParticles * 2); // x,y positions
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    // Initialize particles in a grid pattern near the top
    this.initializeParticles();

    // Add velocity for the particle
    this.velocityX = 0;
    this.velocityY = 0;
    this.gravity = 9.81;
    this.restitution = 0.7; // Bounce factor

    // Match grid renderer's circular boundary
    const aspectRatio = this.width / this.height;
    this.boundaryRadius = Math.min(1.0, 1.0 / aspectRatio) * 0.96;

    // Scale to grid dimensions, accounting for aspect ratio
    this.boundaryRadius *= Math.min(this.width, this.height);
    this.boundaryRadiusX = this.boundaryRadius * aspectRatio;
    this.boundaryRadiusY = this.boundaryRadius;

    // Center coordinates
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    console.log(
      `FluidSolver initialized: {dimensions: ${this.width}x${
        this.height
      }, cells: ${this.width * this.height}, timeStep: ${this.timeStep}`
    );
  }

  initializeParticles() {
    const spacing = 0.5; // Space between particles
    const startX = this.width * 0.3;
    const startY = this.height * 0.2;

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;

      this.particles[i * 2] = startX + col * spacing; // x position
      this.particles[i * 2 + 1] = startY + row * spacing; // y position
      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }
  }

  step() {
    // Update all particles
    for (let i = 0; i < this.numParticles; i++) {
      // Apply gravity
      this.velocitiesY[i] += this.gravity * this.timeStep;

      // Update position
      const newX = this.particles[i * 2] + this.velocitiesX[i] * this.timeStep;
      const newY =
        this.particles[i * 2 + 1] + this.velocitiesY[i] * this.timeStep;

      // Check boundary collision using elliptical boundary
      const dx = (newX - this.centerX) / this.boundaryRadiusX;
      const dy = (newY - this.centerY) / this.boundaryRadiusY;
      const distSq = dx * dx + dy * dy;

      if (distSq > 1.0) {
        // Using normalized distance
        // Collision response
        const dist = Math.sqrt(distSq);
        const nx = dx / dist; // Normalized normal X
        const ny = dy / dist; // Normalized normal Y

        // Scale normals back to world space
        const worldNx = nx * this.boundaryRadiusX;
        const worldNy = ny * this.boundaryRadiusY;
        const worldNormLen = Math.sqrt(worldNx * worldNx + worldNy * worldNy);

        // Normalize world space normal
        const finalNx = worldNx / worldNormLen;
        const finalNy = worldNy / worldNormLen;

        // Reflect velocity
        const dot =
          this.velocitiesX[i] * finalNx + this.velocitiesY[i] * finalNy;
        this.velocitiesX[i] -= 2 * dot * finalNx * this.restitution;
        this.velocitiesY[i] -= 2 * dot * finalNy * this.restitution;

        // Place particle on boundary
        this.particles[i * 2] = this.centerX + finalNx * this.boundaryRadiusX;
        this.particles[i * 2 + 1] =
          this.centerY + finalNy * this.boundaryRadiusY;
      } else {
        // No collision, update position
        this.particles[i * 2] = newX;
        this.particles[i * 2 + 1] = newY;
      }
    }
  }

  applyForce(mouseX, mouseY, forceX, forceY) {
    const radius = 4.0; // Increased radius of effect
    const strength = 20.0; // Increased force strength

    for (let i = 0; i < this.numParticles; i++) {
      const dx = this.particles[i * 2] - mouseX;
      const dy = this.particles[i * 2 + 1] - mouseY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        // Scale force by distance (stronger near mouse)
        const scale = 1.0 - Math.sqrt(distSq) / radius;
        this.velocitiesX[i] += forceX * strength * scale;
        this.velocitiesY[i] += forceY * strength * scale;

        // console.log(
        //   `Force applied to particle ${i}: vx=${this.velocitiesX[i]}, vy=${this.velocitiesY[i]}`
        // );
      }
    }
  }
}

export { FluidSolver };
