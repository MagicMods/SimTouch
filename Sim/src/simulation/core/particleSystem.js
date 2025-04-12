import { FluidFLIP } from "./fluidFLIP.js";
import { MouseForces } from "../forces/mouseForces.js";
import { CircularBoundary } from "../boundary/circularBoundary.js";
import { RectangularBoundary } from "../boundary/rectangularBoundary.js";
import { CollisionSystem } from "../forces/collisionSystem.js";
import { OrganicBehavior } from "../behaviors/organicBehavior.js";
import { GravityForces } from "../forces/gravityForces.js";
import { eventBus } from '../../util/eventManager.js';

class ParticleSystem {
  constructor({
    particleCount = 500,
    timeStep = 1 / 60,
    gravity = 0, // Default gravity strength
    picFlipRatio = 0,
    turbulence = null, // Keep turbulence as optional parameter
    voronoi = null, // Add voronoi as optional parameter
    boundaryMode = "WARP", // Add boundary mode parameter
    boundaryType = "CIRCULAR", // Add boundary type parameter
    boundaryParams = {}, // Add boundary parameters
  } = {}) {
    // Particle properties
    this.numParticles = particleCount;
    this.timeStep = timeStep;
    this.gravity = new GravityForces(gravity);
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

    // Create appropriate boundary based on type
    const defaultBoundaryParams = {
      mode: boundaryMode,
      ...boundaryParams
    };

    if (boundaryType === "RECTANGULAR") {
      this.boundary = new RectangularBoundary(defaultBoundaryParams);
    } else {
      // Default to circular boundary
      this.boundary = new CircularBoundary(defaultBoundaryParams);
    }

    // Then create FLIP system with boundary reference
    this.fluid = new FluidFLIP({
      gridSize: 32,
      picFlipRatio: this.picFlipRatio,
      dt: timeStep,
      boundary: this.boundary,
      restDensity: this.restDensity,
      gasConstant: this.gasConstant,
      particleSystem: this
    });

    // Initialize mouse forces
    this.mouseForces = new MouseForces({});

    // Initialize organic behavior
    this.organicBehavior = new OrganicBehavior();

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
    const boundary = this.boundary;
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

      // After updating position, check if particle escaped and recover
      // if (isNaN(this.particles[i * 2]) ||
      //   isNaN(this.particles[i * 2 + 1]) ||
      //   this.particles[i * 2] < 0 ||
      //   this.particles[i * 2] > 1 ||
      //   this.particles[i * 2 + 1] < 0 ||
      //   this.particles[i * 2 + 1] > 1) {

      //   // Reset escaped particle to center with zero velocity
      //   this.particles[i * 2] = 0.5;
      //   this.particles[i * 2 + 1] = 0.5;
      //   this.velocitiesX[i] = 0;
      //   this.velocitiesY[i] = 0;
      //   console.log("Recovered escaped particle");
      // }
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
    for (let i = 0; i < this.numParticles; i++) {
      const position = [this.particles[i * 2], this.particles[i * 2 + 1]];
      const velocity = [this.velocitiesX[i], this.velocitiesY[i]];
      const radius = this.particleRadii[i];

      // Pass boundary damping to the boundary collision resolver
      this.boundary.resolveCollision(
        position,
        velocity,
        radius,
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

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (!simParams) return; // Guard against missing data

    let boundaryShapeChanged = false;
    // Update boundary mode and shape if present
    if (simParams.boundary) {
      const previousShape = this.boundary?.getBoundaryType(); // Get current type before update
      const newShape = simParams.boundary.shape ?? previousShape;

      // Update mode (use the value from simParams, fallback to current boundary mode)
      const newMode = simParams.boundary.mode ?? this.boundary?.mode;

      // Recreate boundary object ONLY if shape changes
      if (newShape && newShape !== previousShape) { // Ensure newShape is valid before comparing
        console.log(`ParticleSystem: Boundary shape changed from ${previousShape} to ${newShape}. Recreating boundary.`);
        const boundaryParams = { mode: newMode }; // Pass the potentially updated mode

        // Preserve existing callbacks if possible (simple example)
        const existingCallbacks = this.boundary?.updateCallbacks || [];

        if (newShape === "RECTANGULAR") {
          this.boundary = new RectangularBoundary(boundaryParams);
        } else { // Default to CIRCULAR
          this.boundary = new CircularBoundary(boundaryParams);
        }

        // Restore callbacks
        existingCallbacks.forEach(cb => this.boundary.addUpdateCallback(cb));

        // Link new boundary to dependent components if necessary
        if (this.fluid) this.fluid.boundary = this.boundary;
        // if (this.collisionSystem) this.collisionSystem.boundary = this.boundary; // Collision doesn't seem to need boundary ref

        boundaryShapeChanged = true;
      }
      // If shape didn't change, just update the mode on the existing boundary
      else if (this.boundary && typeof this.boundary.setMode === 'function' && newMode && newMode !== this.boundary.mode) {
        console.log(`ParticleSystem: Boundary mode changed to ${newMode}.`);
        this.boundary.setMode(newMode);
      }
    }

    // Update simulation parameters if they exist in the event payload
    if (simParams.simulation) {
      const previousParticleCount = this.numParticles; // Store count before update
      const previousParticleRadius = this.particleRadius; // Store radius before update

      this.timeStep = simParams.simulation.timeStep ?? this.timeStep;
      this.timeScale = simParams.simulation.timeScale ?? this.timeScale;
      this.velocityDamping = simParams.simulation.velocityDamping ?? this.velocityDamping;
      this.maxVelocity = simParams.simulation.maxVelocity ?? this.maxVelocity;
      this.picFlipRatio = simParams.simulation.picFlipRatio ?? this.picFlipRatio;
      this.numParticles = simParams.simulation.particleCount ?? this.numParticles;
      this.particleRadius = simParams.simulation.particleRadius ?? this.particleRadius;

      // Reinitialize if particle count changed OR if boundary shape changed
      if ((this.numParticles !== previousParticleCount || boundaryShapeChanged) && typeof this.reinitializeParticles === 'function') {
        console.log(`ParticleSystem: Reinitializing due to count change (${previousParticleCount} -> ${this.numParticles}) or shape change (${boundaryShapeChanged}).`);
        this.reinitializeParticles(this.numParticles);
      }
      // Update radii array if radius changed AND count/shape did NOT change
      else if (this.particleRadius !== previousParticleRadius) {
        // Check if particleRadii exists before filling
        if (this.particleRadii) {
          this.particleRadii.fill(this.particleRadius);
          console.log(`ParticleSystem: Radius changed to ${this.particleRadius}. Updating radii array.`);
        } else {
          console.warn("ParticleSystem: particleRadii array not found when trying to update radius.");
        }
      }
    }

    // Boundary mode update was handled above, removed duplicate logic here
    // if (simParams.boundary && this.boundary && typeof this.boundary.setMode === 'function') {
    //      this.boundary.setMode(simParams.boundary.mode);
    // }
    // console.log("ParticleSystem updated params via event:", this.timeStep, this.timeScale, /*...*/ this.boundary?.mode);
  }
}

// Helper function to throw errors
function throwError(message) {
  throw new Error(message);
}

export { ParticleSystem };
