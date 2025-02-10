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
    // this.gravity = -9.81;
    this.gravity = 9.81;
    this.restitution = 0.5; // Reduced bounce factor

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

    // Particle properties
    this.particleRadius = 0.5; // Increased for better visibility
    this.particleMass = 1.0; // Mass for collision response
    this.particleStiffness = 0.5; // Collision response stiffness
    this.collisionStiffness = 0.5; // Bounce factor for particle collisions

    // Add damping factors
    this.boundaryDamping = 0.6; // Increased boundary energy loss
    this.velocityDamping = 0.995; // Slightly stronger continuous damping

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

      // Apply velocity damping
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // Handle particle collisions before updating positions
      this.handleParticleCollisions(i);

      // Update position
      const newX = this.particles[i * 2] + this.velocitiesX[i] * this.timeStep;
      const newY =
        this.particles[i * 2 + 1] + this.velocitiesY[i] * this.timeStep;

      // Check boundary collision using elliptical boundary
      const dx = (newX - this.centerX) / this.boundaryRadiusX;
      const dy = (newY - this.centerY) / this.boundaryRadiusY;
      const distSq = dx * dx + dy * dy;

      if (distSq > 1.0) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        // Scale normals back to world space
        const worldNx = nx * this.boundaryRadiusX;
        const worldNy = ny * this.boundaryRadiusY;
        const worldNormLen = Math.sqrt(worldNx * worldNx + worldNy * worldNy);

        // Normalize world space normal
        const finalNx = worldNx / worldNormLen;
        const finalNy = worldNy / worldNormLen;

        // Calculate impact speed with tangential component
        const impactSpeed =
          this.velocitiesX[i] * finalNx + this.velocitiesY[i] * finalNy;

        // Separate normal and tangential velocities
        const vn = impactSpeed;
        const vtx = this.velocitiesX[i] - vn * finalNx;
        const vty = this.velocitiesY[i] - vn * finalNy;

        // Apply damping to both components
        const dampedVn = -vn * this.restitution * this.boundaryDamping;
        const dampedVtx = vtx * this.boundaryDamping;
        const dampedVty = vty * this.boundaryDamping;

        // Recombine velocities
        this.velocitiesX[i] = dampedVtx + dampedVn * finalNx;
        this.velocitiesY[i] = dampedVty + dampedVn * finalNy;

        // Move particle to boundary with small offset
        const offset = 0.01; // Small offset to prevent sticking
        this.particles[i * 2] =
          this.centerX + finalNx * this.boundaryRadiusX * (1.0 + offset);
        this.particles[i * 2 + 1] =
          this.centerY + finalNy * this.boundaryRadiusY * (1.0 + offset);
      } else {
        // No collision, update position
        this.particles[i * 2] = newX;
        this.particles[i * 2 + 1] = newY;
      }
    }
  }

  handleParticleCollisions(i) {
    const px = this.particles[i * 2];
    const py = this.particles[i * 2 + 1];

    for (let j = i + 1; j < this.numParticles; j++) {
      const dx = this.particles[j * 2] - px;
      const dy = this.particles[j * 2 + 1] - py;
      const distSq = dx * dx + dy * dy;
      const minDist = this.particleRadius * 2;

      if (distSq < minDist * minDist && distSq > 0.0) {
        // Log collision detection
        // console.log(`Collision between particles ${i} and ${j}`);

        // Calculate collision response
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        // Relative velocity
        const dvx = this.velocitiesX[j] - this.velocitiesX[i];
        const dvy = this.velocitiesY[j] - this.velocitiesY[i];

        // Impact velocity along normal
        const impactSpeed = dvx * nx + dvy * ny;

        if (impactSpeed < 0) {
          // Collision impulse
          const impulse = impactSpeed * this.collisionStiffness;

          // Apply impulse to velocities
          this.velocitiesX[i] += nx * impulse;
          this.velocitiesY[i] += ny * impulse;
          this.velocitiesX[j] -= nx * impulse;
          this.velocitiesY[j] -= ny * impulse;

          // Separate particles to prevent sticking
          const overlap = minDist - dist;
          const separation = overlap * 0.5;
          this.particles[i * 2] -= nx * separation;
          this.particles[i * 2 + 1] -= ny * separation;
          this.particles[j * 2] += nx * separation;
          this.particles[j * 2 + 1] += ny * separation;
        }
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
