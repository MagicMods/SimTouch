import { FluidFLIP } from "./fluidFLIP.js";
import { MouseForces } from "../forces/mouseForces.js";
import { CollisionSystem } from "../forces/collisionSystem.js";
import { OrganicBehavior } from "../behaviors/organicBehavior.js";
import { GravityForces } from "../forces/gravityForces.js";
import { eventBus } from '../../util/eventManager.js';
import { TickLog } from '../../util/tickLog.js';

export class ParticleSystem {
  constructor({
    particleCount = 500,
    timeStep = 1 / 60,
    gravity = 0,
    picFlipRatio = 0,
    turbulence,
    voronoi = null,
    boundaryManager,
    debugFlags,
  } = {}) {
    // Particle properties
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = new GravityForces(gravity, debugFlags.debugGravity);
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
    this.maxVelocity = 1; // Maximum particle velocity cap

    // Add rest state properties for fluid simulation
    this.restDensity = 2.0;
    this.gasConstant = 2.0;

    // Animation control
    this.timeScale = 1.0;

    // Debug flags
    this.debug = debugFlags;
    this.noiseFieldResolution = 20;

    // Initialize TickLog for logging
    this.logTick = new TickLog(1000, this.debug.particles);

    // Particle arrays
    this.particles = new Float32Array(particleCount * 2);
    this.velocitiesX = new Float32Array(particleCount);
    this.velocitiesY = new Float32Array(particleCount);

    // External forces - these are required
    this.turbulence = turbulence || throwError("Turbulence field is required");
    this.voronoi = voronoi || throwError("Voronoi field is required");

    // FLIP system
    this.picFlipRatio = picFlipRatio;
    this.flipIterations = 20;

    // Create collision system with particle-specific restitution
    this.collisionSystem = new CollisionSystem();

    // Store reference to collision system in particle system
    this.collisionSystem.particleSystem = this;

    // Assign the passed boundary manager
    if (!boundaryManager) {
      throw new Error("ParticleSystem requires a boundaryManager instance.");
    }
    this.boundaryManager = boundaryManager;

    // Get initial boundary for FluidFLIP instantiation
    const initialBoundary = this.boundaryManager.getPhysicsBoundary();
    if (!initialBoundary) {
      throw new Error("ParticleSystem could not get initial boundary from manager.");
    }

    // Then create FLIP system with boundary reference
    this.fluid = new FluidFLIP({
      gridSize: 32,
      picFlipRatio: this.picFlipRatio,
      dt: timeStep,
      boundary: initialBoundary,
      restDensity: this.restDensity,
      gasConstant: this.gasConstant,
      particleSystem: this,
      debugFlags: this.debug
    });

    // Initialize mouse forces
    this.mouseForces = new MouseForces({}, this.debug);

    // Initialize organic behavior
    this.organicBehavior = new OrganicBehavior(this.debug);

    this.initializeParticles();

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
  }

  // Helper function to throw errors
  throwError(message) {
    throw new Error(message);
  }

  initializeParticles() {
    // Get boundary details to determine distribution
    const boundary = this.boundaryManager.getPhysicsBoundary(); // Get from manager
    if (!boundary) { // Add null check
      console.error("ParticleSystem.initializeParticles: Could not get boundary from manager!");
      return;
    }
    const boundaryType = boundary.getBoundaryType();

    // Calculate center point
    const centerX = boundary.centerX;
    const centerY = boundary.centerY;

    if (boundaryType === "CIRCULAR") {
      // Calculate rings based on particle count for circular distribution
      const rings = Math.ceil(Math.sqrt(this.numParticles));
      const particlesPerRing = Math.ceil(this.numParticles / rings);

      // Safe spawn radius (80% of container radius to avoid immediate boundary collision)
      const spawnRadius = boundary.radius * 0.95;

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
    } else {
      // Rectangular distribution
      // Get boundary dimensions
      const width = boundary.width * 0.95; // 95% of width to avoid immediate collision
      const height = boundary.height * 0.95; // 95% of height to avoid immediate collision
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      // Calculate grid dimensions based on particle count
      const particlesPerSide = Math.ceil(Math.sqrt(this.numParticles));
      const cellWidth = width / particlesPerSide;
      const cellHeight = height / particlesPerSide;

      let particleIndex = 0;

      // Distribute particles in a grid pattern
      for (let row = 0; row < particlesPerSide && particleIndex < this.numParticles; row++) {
        for (let col = 0; col < particlesPerSide && particleIndex < this.numParticles; col++) {
          // Calculate position within the grid cell (with slight randomization)
          const jitter = 0.2; // Small random offset
          const cellX = (col + 0.5 + (Math.random() - 0.5) * jitter) * cellWidth;
          const cellY = (row + 0.5 + (Math.random() - 0.5) * jitter) * cellHeight;

          // Position relative to center
          this.particles[particleIndex * 2] = centerX - halfWidth + cellX;
          this.particles[particleIndex * 2 + 1] = centerY - halfHeight + cellY;

          // Initialize with zero velocity
          this.velocitiesX[particleIndex] = 0;
          this.velocitiesY[particleIndex] = 0;

          particleIndex++;
        }
      }
    }
  }

  reinitializeParticles(newCount = null) {
    if (newCount !== null) {
      if (this.debug.particles) console.log(`Reinitializing particle system with ${newCount} particles`);
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

    // Regenerate voronoi cells when particle count changes
    this.voronoi.regenerateCells();
  }

  step() {
    const dt = this.timeStep * this.timeScale;

    // Allow mouse forces to neutralize other forces if active
    if (this.mouseForces.isActive) {
      this.mouseForces.neutralizeOtherForces(this);
    } else {
      this.mouseForces.restoreOtherForces(this);
    }

    // Update field generators - no conditional checks needed
    this.turbulence.update(dt);
    this.voronoi.update(dt);

    // Apply external forces
    this.applyExternalForces(dt);

    // Apply organic behavior forces
    if (this.organicBehavior.currentBehavior !== "None") {
      this.organicBehavior.updateParticles(this, dt);
    }

    // Apply FLIP fluid simulation if enabled
    if (this.picFlipRatio > 0) {
      this.updateFLIP(dt);
    }

    // Update positions
    this.updateParticles(dt);

    // Update the log ticker
    this.logTick.update();

    // Emit event after step calculations are complete
    // eventBus.emit('simulationStepComplete');
  }

  applyExternalForces(dt) {
    // Apply gravity using the controller
    this.gravity.apply(
      this.velocitiesX,
      this.velocitiesY,
      this.numParticles,
      dt
    );

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
    } else if (this.swarmBehavior?.enabled) {
      this.swarmBehavior.apply(
        this.particles,
        this.velocitiesX,
        this.velocitiesY,
        dt
      );
    } else if (this.automataBehavior?.enabled) {
      this.automataBehavior.apply(
        this.particles,
        this.velocitiesX,
        this.velocitiesY,
        dt
      );
    }

    // Apply turbulence - no conditional checks needed
    if (
      this.turbulence.affectScale ||
      this.turbulence.affectPosition ||
      this.turbulence.scaleField
    ) {
      for (let i = 0; i < this.numParticles; i++) {
        const pos = [this.particles[i * 2], this.particles[i * 2 + 1]];
        const vel = [this.velocitiesX[i], this.velocitiesY[i]];
        [this.velocitiesX[i], this.velocitiesY[i]] =
          this.turbulence.applyTurbulence(pos, vel, dt, i, this);
      }
    }

    // Apply voronoi field - strength check is appropriate but no null check needed
    if (this.voronoi.strength > 0) {
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
      this.particles[i * 2] += this.velocitiesX[i] * dt;
      this.particles[i * 2 + 1] += this.velocitiesY[i] * dt;

    }

    // Apply velocity clamping to ensure max velocity is respected
    // regardless of whether FLIP simulation is used
    for (let i = 0; i < this.numParticles; i++) {
      this.velocitiesX[i] = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, this.velocitiesX[i]));
      this.velocitiesY[i] = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, this.velocitiesY[i]));
    }

    // Use collision system ONCE - not twice
    this.collisionSystem.update(
      this.particles,
      this.velocitiesX,
      this.velocitiesY
    );

    // Finally check boundary collisions for all particles
    const affectScale = this.turbulence?.affectScale; // Check turbulence scale mode once before the loop
    for (let i = 0; i < this.numParticles; i++) {
      const position = [this.particles[i * 2], this.particles[i * 2 + 1]];
      const velocity = [this.velocitiesX[i], this.velocitiesY[i]];
      // Determine the correct radius for physics based on affectScale
      const physicsRadius = affectScale ? this.particleRadii[i] : this.particleRadius;

      // Get current boundary from manager inside the loop
      const currentBoundary = this.boundaryManager.getPhysicsBoundary();
      if (!currentBoundary) {
        console.error(`ParticleSystem.updateParticles: Could not get boundary from manager for particle ${i}! Skipping collision.`);
        continue; // Skip collision for this particle if boundary is missing
      }

      // Pass boundary damping to the boundary collision resolver
      currentBoundary.resolveCollision( // Use currentBoundary
        position,
        velocity,
        physicsRadius, // Use the correctly determined radius
        this.boundaryDamping
      );

      // Store updated values
      this.particles[i * 2] = position[0];
      this.particles[i * 2 + 1] = position[1];
      this.velocitiesX[i] = velocity[0];
      this.velocitiesY[i] = velocity[1];
    }
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
      // Update rest density parameter only
      this.fluid.setParameters(this.restDensity);

      // Transfer particle velocities to grid
      this.fluid.transferToGrid(
        this.particles,
        this.velocitiesX,
        this.velocitiesY
      );

      // Solve incompressibility
      this.fluid.solveIncompressibility();

      // Transfer back to particles with PIC/FLIP mix
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
    let shouldResetTick = false; // Flag to reset tick only once
    const affectScale = this.turbulence?.affectScale; // Check turbulence scale mode

    const particlesData = Array.from({ length: this.numParticles }, (_, i) => {
      // Determine the correct radius based on affectScale
      const rawRadius = affectScale ? this.particleRadii[i] : this.particleRadius;

      const particleData = {
        x: this.particles[i * 2],
        y: this.particles[i * 2 + 1],
        vx: this.velocitiesX[i],
        vy: this.velocitiesY[i],
        // Use the determined rawRadius for size calculation
        size: rawRadius * this.renderScale,
      };
      // --- DEBUG LOG with TickLog ---
      if (i < 9 && this.logTick.GetTick() && this.debug.particles) {
        console.log(`ParticleSystem.getParticles - P[${i}] | Radius(raw): ${this.particleRadii[i].toFixed(6)} | Size(scaled): ${particleData.size.toFixed(3)}`);
        shouldResetTick = true; // Mark that tick needs reset
      }
      // --- END DEBUG ---
      return particleData;
    });

    // Reset tick outside the loop if needed
    if (shouldResetTick) {
      this.logTick.ResetTick();
    }

    return particlesData;
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

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (!simParams) return;

    // Update simulation parameters
    if (simParams.simulation) {
      // --- P-Count Handling ---
      const newCount = simParams.simulation.particleCount;

      if (newCount !== undefined && newCount !== this.numParticles) {
        // Check if count is valid before reinitializing
        if (typeof newCount === 'number' && newCount >= 0) {
          this.reinitializeParticles(newCount);
          // Note: No need to update other sim params here if reinitialize handles them or they are read fresh next cycle.
          // If other params NEED to be applied immediately *after* reinit, place them here.
        } else {
          console.warn(`Invalid particle count received: ${newCount}. Ignoring.`);
        }
      }
      // --- End P-Count ---

      // Apply other simulation parameters (only if count didn't change, or apply after reinit if needed)
      // For simplicity, we'll apply them regardless, reinitializeParticles should reset things correctly anyway.
      this.timeStep = simParams.simulation.timeStep ?? this.timeStep;
      this.timeScale = simParams.simulation.timeScale ?? this.timeScale;
      this.velocityDamping = simParams.simulation.velocityDamping ?? this.velocityDamping;
      this.maxVelocity = simParams.simulation.maxVelocity ?? this.maxVelocity;
      this.picFlipRatio = simParams.simulation.picFlipRatio ?? this.picFlipRatio;
      this.restDensity = simParams.simulation.restDensity ?? this.restDensity;

      // --- P-Size Handling ---
      const oldRadius = this.particleRadius;
      const newRadius = simParams.simulation.particleRadius ?? this.particleRadius;
      if (newRadius !== oldRadius) {
        this.particleRadius = newRadius;
        // Update the radii array for all particles
        if (this.particleRadii && typeof this.particleRadii.fill === 'function') {
          this.particleRadii.fill(this.particleRadius);
          if (this.debug.particles) console.log(`Updated particleRadii array with new radius: ${this.particleRadius}`);
        } else {
          console.warn("Could not update particleRadii array.");
        }
      }
      // --- End P-Size ---


      // Update FluidFLIP if restDensity changed
      if (this.fluid && simParams.simulation.restDensity !== undefined) {
        this.fluid.setParameters(this.restDensity);
      }
    }

    // Update gravity parameters
    if (simParams.gravity && this.gravity) {
      this.gravity.setDirection(
        simParams.gravity.directionX ?? this.gravity.directionX,
        simParams.gravity.directionY ?? this.gravity.directionY
      );
    }

    // Note: Boundary parameters (mode, damping, restitution, repulsion) are now handled
    // by BoundaryManager and accessed via this.boundaryManager.getPhysicsBoundary().
    // No need to update a local boundary instance here.

    // Optional: Log for verification
    if (this.debug.particles) console.log(`ParticleSystem updated params via event: timeStep=${this.timeStep}, damping=${this.velocityDamping}, ...`);
  }
}

// Helper function to throw errors
function throwError(message) {
  throw new Error(message);
}

