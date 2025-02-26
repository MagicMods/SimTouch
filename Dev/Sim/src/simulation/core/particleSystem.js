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
    voronoi = null, // Add voronoi as optional parameter
    boundaryMode = "BOUNCE", // Add boundary mode parameter
  } = {}) {
    // Particle properties
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = gravity;
    this.particleRadius = 0.01;
    this.renderScale = 2000;

    // Add radius array to track individual particle sizes
    this.particleRadii = new Float32Array(particleCount).fill(
      this.particleRadius
    );

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
    this.voronoi = voronoi; // Store voronoi reference

    // FLIP system
    this.picFlipRatio = picFlipRatio;
    this.flipIterations = 20;

    // Create collision system with particle-specific restitution
    this.collisionSystem = new CollisionSystem();

    // Store reference to collision system in particle system
    this.collisionSystem.particleSystem = this;

    // Create boundary with specified mode
    this.boundary = new CircularBoundary({
      mode: boundaryMode,
    });

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
    if (newCount !== null) {
      console.log(`Reinitializing particle system with ${newCount} particles`);
      this.numParticles = newCount;

      // Recreate arrays with new size
      this.particles = new Float32Array(newCount * 2);
      this.velocitiesX = new Float32Array(newCount);
      this.velocitiesY = new Float32Array(newCount);
      this.particleRadii = new Float32Array(newCount).fill(this.particleRadius);
    } else {
      // Just reset the particle radii if count hasn't changed
      this.particleRadii = new Float32Array(this.numParticles).fill(
        this.particleRadius
      );
    }

    this.initializeParticles();

    // Make sure voronoi field regenerates cells when particle count changes
    if (this.voronoi) {
      this.voronoi.regenerateCells();
    }
  }

  step() {
    const dt = this.timeStep * this.timeScale;

    // 1. Apply external forces (including turbulence)
    this.applyExternalForces(dt);

    // 2. Apply organic behavior forces
    if (this.organicBehavior.currentBehavior !== "None") {
      this.organicBehavior.updateParticles(this, dt);
    }

    // 3. Update positions and handle collisions
    this.collisionSystem.update(
      this.particles,
      this.velocitiesX,
      this.velocitiesY
    );
    this.updateParticles(dt);
  }

  applyExternalForces(dt) {
    // Track if organic behavior is active
    this.organicBehaviorActive =
      this.fluidBehavior?.enabled ||
      this.swarmBehavior?.enabled ||
      this.automataBehavior?.enabled;

    // Apply organic behaviors first
    if (this.fluidBehavior?.enabled) {
      this.fluidBehavior.apply(
        this.particles,
        this.velocitiesX,
        this.velocitiesY,
        dt
      );
    }
    if (this.swarmBehavior?.enabled) {
      this.swarmBehavior.apply(
        this.particles,
        this.velocitiesX,
        this.velocitiesY,
        dt
      );
    }
    if (this.automataBehavior?.enabled) {
      this.automataBehavior.apply(
        this.particles,
        this.velocitiesX,
        this.velocitiesY,
        dt
      );
    }

    // Apply turbulence only if no organic behavior is active
    if (this.turbulence?.strength > 0) {
      for (let i = 0; i < this.numParticles; i++) {
        const pos = [this.particles[i * 2], this.particles[i * 2 + 1]];
        const vel = [this.velocitiesX[i], this.velocitiesY[i]];
        [this.velocitiesX[i], this.velocitiesY[i]] =
          this.turbulence.applyTurbulence(pos, vel, dt, i, this);
      }
    }

    // Apply voronoi field if enabled
    if (this.voronoi && this.voronoi.strength > 0) {
      try {
        for (let i = 0; i < this.numParticles; i++) {
          const pos = [this.particles[i * 2], this.particles[i * 2 + 1]];
          const vel = [this.velocitiesX[i], this.velocitiesY[i]];
          [this.velocitiesX[i], this.velocitiesY[i]] =
            this.voronoi.applyTurbulence(pos, vel, dt, i, this);
        }
      } catch (error) {
        console.error("Error applying voronoi field:", error);
        // Reset the voronoi field to recover from error
        this.voronoi.regenerateCells();
      }
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
    // Return flat array of objects with x, y properties
    // This format is what ParticleRenderer expects
    return Array.from({ length: this.numParticles }, (_, i) => ({
      x: this.particles[i * 2],
      y: this.particles[i * 2 + 1],
      vx: this.velocitiesX[i],
      vy: this.velocitiesY[i],
      size: this.particleRadii[i] * this.renderScale,
    }));
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

  // Add method to change boundary mode
  setBoundaryMode(mode) {
    this.boundary.setBoundaryMode(mode);
  }
}

export { ParticleSystem };
