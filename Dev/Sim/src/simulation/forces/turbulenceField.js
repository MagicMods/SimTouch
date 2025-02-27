class TurbulenceField {
  constructor({
    strength = 0,
    scale = 4.0,
    speed = 1.0,
    octaves = 3,
    persistence = 0.5,
    rotation = 0.0,
    inwardFactor = 1.0,
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
    this.inwardFactor = inwardFactor;
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
    // Clear existing bases and regenerate
    this.noiseBases = [];
    for (let i = 0; i < this._octaves; i++) {
      this.noiseBases.push({
        freqX: Math.random() * 0.1 + 0.95,
        freqY: Math.random() * 0.1 + 0.95,
        phaseX: Math.random() * 6.28,
        phaseY: Math.random() * 6.28,
      });
    }
    console.log(`Regenerated noise bases for ${this._octaves} octaves`);
  }

  // Improved noise function with domain warping
  noise2D(x, y) {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // Apply domain warping
    const warpX = this.domainWarp * Math.sin(y * 0.1 + this.time * 0.05);
    const warpY = this.domainWarp * Math.sin(x * 0.1 + this.time * 0.07);

    let rx = (x + warpX) * cos - (y + warpY) * sin;
    let ry = (x + warpX) * sin + (y + warpY) * cos;

    let noise = 0;
    let amplitude = 1;
    let maxValue = 0;

    // Safety check: ensure we have enough noise bases
    const actualOctaves = Math.min(this._octaves, this.noiseBases.length);

    // Safety check: regenerate if needed
    if (this.noiseBases.length < this._octaves) {
      this.regenerateNoiseBases();
    }

    for (let i = 0; i < actualOctaves; i++) {
      // Check if base exists
      if (!this.noiseBases[i]) {
        console.warn(`Missing noise base for octave ${i}`);
        continue;
      }

      const base = this.noiseBases[i];
      const frequencyX = Math.pow(2, i) * base.freqX;
      const frequencyY = Math.pow(2, i) * base.freqY;

      // Use varied phases and frequencies per octave
      const val =
        Math.sin(rx * frequencyX + this.time * this.speed + base.phaseX) *
        Math.cos(ry * frequencyY + this.time * this.speed * 0.7 + base.phaseY);

      noise += amplitude * val;
      maxValue += amplitude;
      amplitude *= this.persistence;
    }

    return (noise / maxValue + 1) * 0.5;
  }

  applyTurbulence(position, velocity, dt, particleIndex, system) {
    const [x, y] = position;
    const [vx, vy] = velocity;

    // Calculate noise at particle position
    const n1 = this.noise2D(x * this.scale, y * this.scale);
    const n2 = this.noise2D(y * this.scale + 1.234, x * this.scale + 5.678);

    // Initialize with current velocities
    let newVx = vx * this.decayRate;
    let newVy = vy * this.decayRate;

    // Apply position forces only if enabled
    if (this.affectPosition) {
      const forceX = (n1 - 0.5) * this.strength + this.directionBias[0];
      const forceY = (n2 - 0.5) * this.strength + this.directionBias[1];
      newVx += forceX * dt;
      newVy += forceY * dt;
    }

    // Apply velocity scaling if enabled
    if (this.scaleField) {
      const scaleFactorField = 1.0 + (n1 - 0.5) * this.strength * 0.1;
      newVx *= scaleFactorField;
      newVy *= scaleFactorField;
    }

    // Apply particle radius scaling if enabled
    if (this.affectScale && system?.particleRadii) {
      const noiseValue = n1 * this.scaleStrength; // Use same noise as forces for consistency
      // Map noise [0,1] to [minScale,maxScale]
      const scalePartFactor =
        this.minScale + noiseValue * (this.maxScale - this.minScale);
      system.particleRadii[particleIndex] =
        system.particleRadius * scalePartFactor;
    }

    return [newVx, newVy];
  }

  update(dt) {
    this.time += dt;

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
    if (directionBias !== undefined) this.directionBias = directionBias;
    if (decayRate !== undefined) this.decayRate = decayRate;
    if (domainWarp !== undefined) this.domainWarp = domainWarp;
    if (timeOffset !== undefined) this.timeOffset = timeOffset;
  }
}

export { TurbulenceField };
