import { FluidFLIP } from "./fluidFLIP.js";
import { MouseForces } from "../forces/mouseForces.js";
import { CircularBoundary } from "../boundary/circularBoundary.js";
import { CollisionSystem } from "../forces/collisionSystem.js";
import { OrganicBehavior } from "../behaviors/organicBehavior.js";

class ParticleSystem {
  constructor({
    particleCount = 500,
    timeStep = 1 / 60,
    gravity = 0,
    picFlipRatio = 1,
    turbulence = null, // Keep turbulence as optional parameter
  } = {}) {
    // Particle properties
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = gravity * 0.1;
    this.particleRadius = 0.01;
    this.renderScale = 2000;

    // Physics parameters
    this.velocityDamping = 0.98;
    this.boundaryDamping = 0.95;
    this.velocityThreshold = 0.001;
    this.positionThreshold = 0.0001;

    // Animation control
    this.timeScale = 1.0;

    // Debug flags
    this.debug = false;
    this.debugShowVelocityField = false;
    this.debugShowPressureField = false;
    this.debugShowBoundaries = false;
    this.debugShowFlipGrid = false;
    this.debugShowNoiseField = false;
    this.noiseFieldResolution = 20;

    // Particle arrays
    this.particles = new Float32Array(particleCount * 2);
    this.velocitiesX = new Float32Array(particleCount);
    this.velocitiesY = new Float32Array(particleCount);

    // External forces
    this.turbulence = turbulence; // Store turbulence reference

    // FLIP system
    this.picFlipRatio = picFlipRatio;
    this.flipIterations = 20;

    // Create collision system with particle-specific restitution
    this.collisionSystem = new CollisionSystem();

    // Create boundary with its own restitution
    this.boundary = new CircularBoundary();

    // Then create FLIP system with boundary reference
    this.fluid = new FluidFLIP({
      // gridSize: 32,
      // picFlipRatio: this.picFlipRatio,
      // dt: timeStep,
      boundary: this.boundary,
    });

    // Initialize mouse forces
    this.mouseForces = new MouseForces({});

    // Initialize organic behavior
    this.organicBehavior = new OrganicBehavior();

    this.initializeParticles();
  }

  initializeParticles() {
    // Calculate rings based on particle count
    const rings = Math.ceil(Math.sqrt(this.numParticles));
    const particlesPerRing = Math.ceil(this.numParticles / rings);

    // Safe spawn radius (80% of container radius to avoid immediate boundary collision)
    const spawnRadius = this.boundary.radius * 0.8;
    const centerX = this.boundary.centerX;
    const centerY = this.boundary.centerY;

    let particleIndex = 0;

    // Create concentric rings of particles
    for (
      let ring = 0;
      ring < rings && particleIndex < this.numParticles;
      ring++
    ) {
      // Current ring radius
      const ringRadius = (spawnRadius * (ring + 1)) / rings;

      // Particles in this ring (adjusted for outer rings)
      const ringParticles = Math.min(
        Math.floor((particlesPerRing * (ring + 1)) / 2),
        this.numParticles - particleIndex
      );

      // Distribute particles around the ring
      for (
        let i = 0;
        i < ringParticles && particleIndex < this.numParticles;
        i++
      ) {
        const angle = (i / ringParticles) * Math.PI * 2;

        // Calculate position relative to center
        this.particles[particleIndex * 2] =
          centerX + Math.cos(angle) * ringRadius;
        this.particles[particleIndex * 2 + 1] =
          centerY + Math.sin(angle) * ringRadius;

        // Initialize with zero velocity
        this.velocitiesX[particleIndex] = 0;
        this.velocitiesY[particleIndex] = 0;

        particleIndex++;
      }
    }

    console.log(`Initialized ${particleIndex} particles in spherical pattern`);
  }

  reinitializeParticles(newCount = null) {
    // If no new count provided, use current count
    if (newCount !== null) {
      this.numParticles = newCount;
    }

    // Ensure arrays match current particle count
    this.particles = new Float32Array(this.numParticles * 2);
    this.velocitiesX = new Float32Array(this.numParticles);
    this.velocitiesY = new Float32Array(this.numParticles);

    // Clear collision grid
    this.collisionSystem.reset();

    // Reinitialize particle positions
    this.initializeParticles();
  }

  step() {
    const dt = this.timeStep * this.timeScale;

    if (this.debugEnabled) {
      console.log(
        "ParticleSystem step:",
        JSON.stringify(
          {
            frame: {
              dt: dt,
              particles: this.numParticles,
            },
            behaviors: {
              turbulence: this.turbulence?.enabled,
              organic: this.organicBehavior?.enabled,
              mode: this.organicBehavior?.currentBehavior,
            },
            sample: {
              pos: [this.particles[0], this.particles[1]],
              vel: [this.velocitiesX[0], this.velocitiesY[0]],
            },
          },
          null,
          2
        )
      );
    }

    // 1. Apply external forces (including turbulence)
    this.applyExternalForces(dt);

    // 2. Apply organic behavior forces
    if (this.organicBehavior.enabled) {
      this.organicBehavior.updateParticles(this, dt);
    }

    // 3. Update positions based on combined velocities
    for (let i = 0; i < this.particles.length; i += 2) {
      const idx = i / 2;
      this.particles[i] += this.velocitiesX[idx] * dt;
      this.particles[i + 1] += this.velocitiesY[idx] * dt;
    }

    // 4. Position and boundary update
    this.updateParticles(dt);
  }

  applyExternalForces(dt) {
    const stats = {
      before: {
        vel: [this.velocitiesX[0], this.velocitiesY[0]],
      },
    };

    // Apply gravity with FLIP scaling
    const scaledGravity = this.gravity * (this.picFlipRatio > 0 ? 0.5 : 1.0);
    for (let i = 0; i < this.numParticles; i++) {
      this.velocitiesY[i] += -scaledGravity * dt;
    }

    // Apply turbulence if enabled
    if (this.turbulence?.enabled) {
      for (let i = 0; i < this.numParticles; i++) {
        const pos = [this.particles[i * 2], this.particles[i * 2 + 1]];
        const vel = [this.velocitiesX[i], this.velocitiesY[i]];
        [this.velocitiesX[i], this.velocitiesY[i]] =
          this.turbulence.applyTurbulence(pos, vel, dt);
      }
    }

    if (this.debug) {
      stats.after = {
        vel: [this.velocitiesX[0], this.velocitiesY[0]],
        delta: [
          this.velocitiesX[0] - stats.before.vel[0],
          this.velocitiesY[0] - stats.before.vel[1],
        ],
      };
      console.log("External forces applied:", JSON.stringify(stats, null, 2));
    }
  }

  updateParticles(dt) {
    for (let i = 0; i < this.numParticles; i++) {
      // 1. Apply velocity damping
      this.velocitiesX[i] *= this.velocityDamping;
      this.velocitiesY[i] *= this.velocityDamping;

      // 2. Check rest state
      if (this.checkRestState(i, dt)) continue;

      // 3. Update position
      const position = [this.particles[i * 2], this.particles[i * 2 + 1]];
      const velocity = [this.velocitiesX[i], this.velocitiesY[i]];

      // Apply position update
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;

      // 4. Resolve boundary collision
      this.boundary.resolveCollision(position, velocity);

      // 5. Store updated values
      this.particles[i * 2] = position[0];
      this.particles[i * 2 + 1] = position[1];
      this.velocitiesX[i] = velocity[0];
      this.velocitiesY[i] = velocity[1];
    }

    // Only use the new collision system
    this.collisionSystem.update(
      this.particles,
      this.velocitiesX,
      this.velocitiesY
    );
  }

  checkRestState(index, dt) {
    const vx = this.velocitiesX[index];
    const vy = this.velocitiesY[index];

    const velocityMagnitude = Math.hypot(vx, vy);
    const positionChange = velocityMagnitude * dt;

    if (
      velocityMagnitude < this.velocityThreshold &&
      positionChange < this.positionThreshold
    ) {
      this.velocitiesX[index] = 0;
      this.velocitiesY[index] = 0;
      return true;
    }
    return false;
  }

  updateFLIP(dt) {
    if (this.picFlipRatio > 0) {
      // Only do FLIP steps if ratio > 0
      // Transfer particle velocities to grid
      this.fluid.transferToGrid(
        this.particles,
        this.velocitiesX,
        this.velocitiesY
      );

      // Solve incompressibility
      this.fluid.solveIncompressibility();

      // Update particle velocities with PIC/FLIP mix
      this.fluid.transferToParticles(
        this.particles,
        this.velocitiesX,
        this.velocitiesY
      );
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

  drawDebugGrid(renderer) {
    if (!this.debugEnabled) return;

    const gridLines = [];

    // Vertical lines
    for (let i = 0; i <= this.gridSize; i++) {
      const x = i * this.cellSize;
      gridLines.push({ x, y: 0 }, { x, y: 1 });
    }

    // Horizontal lines
    for (let i = 0; i <= this.gridSize; i++) {
      const y = i * this.cellSize;
      gridLines.push({ x: 0, y }, { x: 1, y });
    }

    renderer.draw(gridLines, [0.2, 0.2, 0.2, 0.5]);
  }
}

export { ParticleSystem };
