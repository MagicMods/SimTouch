class TurbulenceField {
  constructor({
    strength = 3,
    scale = 4.0,
    speed = 1.0,
    octaves = 3,
    persistence = 0.5,
    rotation = 0.0,
    rotationSpeed = 0.0, // Add new rotation speed parameter
    pullFactor = 0.0, // -1 to +1 range parameter replacing inwardFactor and pullMode
    boundary = null,
    directionBias = [0, 0], // New: directional bias
    decayRate = 0.99, // New: decay over time
    timeOffset = Math.random() * 1000, // Random time start
    noiseSeed = Math.random() * 10000, // Random seed
    domainWarp = 0.3, // Domain warping strength
  } = {}) {
    if (
      !boundary ||
      typeof boundary.centerX !== "number" ||
      typeof boundary.centerY !== "number" ||
      typeof boundary.getRadius !== "function"
    ) {
      throw new Error(
        "TurbulenceField requires a valid CircularBoundary with centerX, centerY, and getRadius()"
      );
    }

    this.boundary = boundary;
    this.strength = strength;
    this.scale = scale;
    this.speed = speed;
    this._octaves = octaves; // Use private property for octaves
    this.persistence = persistence;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed; // Store the rotation speed
    this.pullFactor = pullFactor; // Store the unified pull factor
    this.inwardFactor = Math.abs(pullFactor); // For backward compatibility - remove if not needed
    this.time = 0;
    this.directionBias = directionBias;
    this.decayRate = decayRate;

    this.scaleField = false; // Field-based velocity scaling
    this.affectPosition = true;
    this.affectScale = true; // Particle radius scaling
    this.scaleStrength = 0; // Strength for particle radius scaling

    // Add min/max scale parameters
    this.minScale = 0.5; // 50% of base size
    this.maxScale = 2.0; // 200% of base size

    this.timeOffset = timeOffset;
    this.noiseSeed = noiseSeed;
    this.domainWarp = domainWarp;
    this.time = 0;

    // Initialize noise bases
    this.noiseBases = [];
    this.regenerateNoiseBases();
  }

  // Add getter and setter for octaves
  get octaves() {
    return this._octaves;
  }

  set octaves(value) {
    this._octaves = value;
    this.regenerateNoiseBases();
  }

  // Method to regenerate noise bases when octaves change
  regenerateNoiseBases() {
    try {
      this.noiseBases = [];

      // Use fixed values for testing to ensure consistency
      const baseFrequencies = [
        { freqX: 1.0, freqY: 1.0, phaseX: 0, phaseY: 0 },
        { freqX: 1.0, freqY: 1.0, phaseX: 2.1, phaseY: 1.3 },
        { freqX: 0.9, freqY: 1.1, phaseX: 4.2, phaseY: 3.8 },
        { freqX: 1.1, freqY: 0.9, phaseX: 0.7, phaseY: 5.1 },
        { freqX: 1.0, freqY: 1.0, phaseX: 3.3, phaseY: 2.2 },
        { freqX: 1.0, freqY: 1.0, phaseX: 1.4, phaseY: 4.3 },
        { freqX: 1.0, freqY: 1.0, phaseX: 5.6, phaseY: 0.5 },
        { freqX: 1.0, freqY: 1.0, phaseX: 2.8, phaseY: 3.7 }
      ];

      // Use fixed bases for octaves up to 8
      for (let i = 0; i < this._octaves; i++) {
        // Use modulo to wrap around if we need more than the predefined bases
        const baseIdx = i % baseFrequencies.length;
        this.noiseBases.push(baseFrequencies[baseIdx]);
      }

      console.log("Regenerated noise bases with center:",
        this.boundary.centerX, this.boundary.centerY);
    } catch (err) {
      console.error("Error regenerating noise bases:", err);
      // Create fallback bases
      this.noiseBases = [];
      for (let i = 0; i < this._octaves; i++) {
        this.noiseBases.push({
          freqX: 1.0,
          freqY: 1.0,
          phaseX: i * 1.0,
          phaseY: i * 2.0,
        });
      }
    }
  }

  // Completely redesigned noise2D function
  noise2D(x, y) {
    try {
      // Get exact boundary center coordinates - these must be correct!
      // Use 0.5, 0.5 as fallback values if boundary is invalid
      const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
      const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

      // FIXED APPROACH: Create a very recognizable pattern that clearly shows rotation
      // We'll use a simple checkerboard pattern first WITHOUT rotation

      // Scale coordinates based on noise scale
      const scaledX = x * this.scale;
      const scaledY = y * this.scale;

      // Simple noise function with clear sine patterns aligned with axes
      // This pattern will clearly show proper rotation
      const basePattern = Math.sin(scaledX * 6) * Math.sin(scaledY * 6);

      // Only apply rotation if non-zero - calculate a rotated version of the pattern
      let rotatedPattern = basePattern;

      if (Math.abs(this.rotation) > 0.0001) {
        // 1. Translate to center
        const tx = x - centerX;
        const ty = y - centerY;

        // 2. Rotate point
        const cos = Math.cos(-this.rotation); // Negative for proper visual rotation
        const sin = Math.sin(-this.rotation);
        const rx = tx * cos - ty * sin;
        const ry = tx * sin + ty * cos;

        // 3. Translate back
        const rotX = rx + centerX;
        const rotY = ry + centerY;

        // 4. Sample pattern at rotated position
        const rotScaledX = rotX * this.scale;
        const rotScaledY = rotY * this.scale;
        rotatedPattern = Math.sin(rotScaledX * 6) * Math.sin(rotScaledY * 6);
      }

      // Now use the rotated pattern as the base for our noise
      let noise = rotatedPattern;

      // Apply time animation if speed > 0
      if (this.speed > 0) {
        noise = Math.sin(noise + this.time * this.speed);
      }

      // Normalize to [0,1]
      return (noise + 1) * 0.5;

    } catch (err) {
      console.error("Error in noise2D:", err);
      return 0.5;
    }
  }

  applyTurbulence(position, velocity, dt, particleIndex, system) {
    const [x, y] = position;
    const [vx, vy] = velocity;

    // Initialize with current velocities
    let newVx = vx * this.decayRate;
    let newVy = vy * this.decayRate;

    // If strength is zero, we're done - just return the damped velocity
    if (Math.abs(this.strength) < 0.001) {
      return [newVx, newVy];
    }

    try {
      // APPLY DIRECTION BIAS FIRST - this should work in either mode
      // Scale direction bias by strength and apply it consistently
      if ((this.directionBias[0] !== 0 || this.directionBias[1] !== 0) && this.affectPosition) {
        newVx += this.directionBias[0] * this.strength * dt;
        newVy += this.directionBias[1] * this.strength * dt;
      }

      // Calculate noise and determine mode based on pullFactor
      if (this.pullFactor > 0 && this.affectPosition) {
        // PULL MODE: Move toward noise peaks (positive pullFactor)

        // Sample noise at multiple points to calculate gradient
        const epsilon = 0.01;  // Small sampling distance
        const n0 = this.noise2D(x, y);
        const nx = this.noise2D(x + epsilon, y);
        const ny = this.noise2D(x, y + epsilon);

        // Calculate approximate gradient (direction toward higher values)
        const gradX = (nx - n0) / epsilon;
        const gradY = (ny - n0) / epsilon;

        // Calculate gradient magnitude and normalize
        const gradMag = Math.sqrt(gradX * gradX + gradY * gradY);
        if (gradMag > 0.001) {
          // Apply force toward higher noise values, scaled by pullFactor
          const normalizedGradX = gradX / gradMag;
          const normalizedGradY = gradY / gradMag;

          // Scale force by pull factor (0 to 1 range) and noise value for stronger effect at peaks
          const pullStrength = this.pullFactor * this.strength;
          newVx += normalizedGradX * pullStrength * dt;
          newVy += normalizedGradY * pullStrength * dt;
        }
      } else if (this.affectPosition) {
        // STANDARD MODE: Use the existing implementation for pushing particles
        // Calculate noise at particle position
        const n1 = this.noise2D(x, y);
        const n2 = this.noise2D(y + 1.234, x + 5.678);

        // Determine how much "push" to apply (full when pullFactor is 0 or negative)
        const pushStrength = this.strength * (1 + Math.min(0, this.pullFactor));
        const forceX = (n1 - 0.5) * pushStrength;
        const forceY = (n2 - 0.5) * pushStrength;
        newVx += forceX * dt;
        newVy += forceY * dt;
      }

      // Rest of the method remains unchanged...
      // Apply velocity scaling if enabled - works the same in either mode
      if (this.scaleField) {
        const n1 = this.noise2D(x * this.scale, y * this.scale);
        const scaleFactorField = 1.0 + (n1 - 0.5) * this.strength * 0.1;
        newVx *= scaleFactorField;
        newVy *= scaleFactorField;
      }

      // Apply particle radius scaling if enabled - works the same in either mode
      if (this.affectScale && system?.particleRadii) {
        const n1 = this.noise2D(x * this.scale, y * this.scale);
        const noiseValue = n1 * this.scaleStrength;
        // Map noise [0,1] to [minScale,maxScale]
        const scalePartFactor =
          this.minScale + noiseValue * (this.maxScale - this.minScale);
        system.particleRadii[particleIndex] =
          system.particleRadius * scalePartFactor;
      }
    } catch (err) {
      console.error("Error in turbulenceField.applyTurbulence:", err);
    }

    return [newVx, newVy];
  }

  update(dt) {
    this.time += dt;

    if (this.strength <= 0) return;

    // Apply rotation based on rotation speed
    if (this.rotationSpeed > 0) {
      this.rotation += this.rotationSpeed * dt;
      // Keep rotation within [0, 2π]
      this.rotation %= Math.PI * 2;
    }

    // Occasionally shift phase values for more variation
    if (Math.random() < 0.001) {
      for (let i = 0; i < this.octaves; i++) {
        this.noiseBases[i].phaseX += (Math.random() - 0.5) * 0.1;
        this.noiseBases[i].phaseY += (Math.random() - 0.5) * 0.1;
      }
    }
  }

  setParameters({
    strength,
    scale,
    speed,
    octaves, // Add octaves parameter
    persistence, // Add persistence parameter
    rotation, // Add rotation parameter
    rotationSpeed, // Add this parameter
    directionBias,
    decayRate,
    domainWarp,
    timeOffset,
  }) {
    if (strength !== undefined) this.strength = strength;
    if (scale !== undefined) this.scale = scale;
    if (speed !== undefined) this.speed = speed;
    if (octaves !== undefined) this.octaves = octaves; // This will trigger regeneration
    if (persistence !== undefined) this.persistence = persistence;
    if (rotation !== undefined) this.rotation = rotation;
    if (rotationSpeed !== undefined) this.rotationSpeed = rotationSpeed;
    if (directionBias !== undefined) this.directionBias = directionBias;
    if (decayRate !== undefined) this.decayRate = decayRate;
    if (domainWarp !== undefined) this.domainWarp = domainWarp;
    if (timeOffset !== undefined) this.timeOffset = timeOffset;
  }

  // Debug function to help diagnose rotation issues
  debugRotation() {
    console.log("=== Turbulence Field Debug ===");
    console.log("Boundary center:", this.boundary.centerX, this.boundary.centerY);
    console.log("Current rotation:", this.rotation);

    // Test noise values at fixed points to verify rotation
    const testPoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 },
      { x: 0.5, y: 0.5 }  // Center
    ];

    console.log("Testing noise values:");
    testPoints.forEach(pt => {
      // Original coordinates
      console.log(`Point (${pt.x}, ${pt.y}): ${this.noise2D(pt.x, pt.y)}`);

      // Compute what the rotated coordinates should be
      const centerX = this.boundary.centerX;
      const centerY = this.boundary.centerY;
      const tx = pt.x - centerX;
      const ty = pt.y - centerY;
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const rx = tx * cos - ty * sin + centerX;
      const ry = tx * sin + ty * cos + centerY;

      console.log(`Should rotate to (${rx.toFixed(3)}, ${ry.toFixed(3)})`);
    });

    console.log("=== End Debug ===");
  }
}

export { TurbulenceField };
