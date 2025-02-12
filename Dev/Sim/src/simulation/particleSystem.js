class ParticleSystem {
  constructor({ particleCount = 100, timeStep = 1 / 60, gravity = 9.81 }) {
    // Standard [0,1] space parameters
    this.centerX = 0.5; // Center point
    this.centerY = 0.5; // Center point
    this.radius = 0.475; // Slightly smaller for better visibility

    // Core particle data
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = -gravity * 0.1; // Scale for [0,1] space

    // Physics parameters - values represent preservation rather than loss
    this.restitution = 0.5; // 50% energy preserved on bounce
    this.velocityDamping = 0.98; // 98% velocity preserved in air
    this.boundaryDamping = 0.95; // 95% velocity preserved on wall
    this.velocityThreshold = 0.001; // Increased threshold
    this.positionThreshold = 0.0001; // New: threshold for position changes
    this.particleRadius = 0.1; // 1% of space width
    this.renderScale = 500; // Scale to reasonable screen size

    // Animation control
    this.timeScale = 1.0; // Multiplier for animation speed

    // Debug visualization
    this.debugEnabled = false; // Add debug toggle

    // Initialize arrays
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    this.initializeParticles();
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
    // Scale time step by animation speed
    const dt = this.timeStep * this.timeScale;

    for (let i = 0; i < this.numParticles; i++) {
      // Apply gravity ([0,1] space: positive Y is down)
      this.velocitiesY[i] += this.gravity * dt;

      // Apply damping directly (values are preservation factors)
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // Check for rest state
      const velocityMagnitude = Math.sqrt(
        this.velocitiesX[i] * this.velocitiesX[i] +
          this.velocitiesY[i] * this.velocitiesY[i]
      );

      // Position change check
      const dx = this.velocitiesX[i] * dt;
      const dy = this.velocitiesY[i] * dt;
      const positionChange = Math.sqrt(dx * dx + dy * dy);

      if (
        velocityMagnitude < this.velocityThreshold &&
        positionChange < this.positionThreshold
      ) {
        // Put particle fully to rest
        this.velocitiesX[i] = 0;
        this.velocitiesY[i] = 0;
        continue; // Skip position update for resting particles
      }

      // Update position
      const newX = this.particles[i * 2] + this.velocitiesX[i] * dt;
      const newY = this.particles[i * 2 + 1] + this.velocitiesY[i] * dt;

      // Check circular boundary collision in [0,1] space
      const dxBoundary = newX - this.centerX;
      const dyBoundary = newY - this.centerY;
      const distSq = dxBoundary * dxBoundary + dyBoundary * dyBoundary;

      if (distSq > this.radius * this.radius) {
        const dist = Math.sqrt(distSq);
        const nx = dxBoundary / dist;
        const ny = dyBoundary / dist;

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

        // Fix: Place particle exactly at boundary minus its radius
        // This prevents cumulative offset issues
        const safeRadius = this.radius - this.particleRadius * 0.5; // Use half radius for better contact
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
        size: this.particleRadius * this.renderScale, // Scale radius to visible size
      });
    }
    return particles;
  }

  getBoundaryPoints() {
    return this.boundaryPoints;
  }

  // Add debug visualization method
  drawDebugBounds(renderer) {
    if (!this.debugEnabled) return;

    // Draw physical bounds of a single particle
    const debugParticle = {
      x: this.centerX,
      y: this.centerY,
      size: this.particleRadius * this.renderScale,
    };

    renderer.draw([debugParticle], [0.0, 1.0, 0.0, 0.5]);
  }
}

export { ParticleSystem };
