class TurbulenceField {
  constructor({
    strength = 0.5,
    scale = 4.0,
    speed = 1.0,
    octaves = 3,
    persistence = 0.5,
    rotation = 0.0,
    inwardFactor = 1.0,
    boundary = null,
    directionBias = [0, 0], // New: directional bias
    decayRate = 0.99, // New: decay over time
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
    this.octaves = octaves;
    this.persistence = persistence;
    this.rotation = rotation;
    this.inwardFactor = inwardFactor;
    this.time = 0;
    this.directionBias = directionBias;
    this.decayRate = decayRate;

    this.scaleField = false; // Field-based velocity scaling
    this.affectPosition = true;
    this.affectScale = true; // Particle radius scaling
    this.scaleStrength = 0.2; // Strength for particle radius scaling
  }

  noise2D(x, y) {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    let noise = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < this.octaves; i++) {
      noise +=
        amplitude *
        (Math.sin(rx * frequency + this.time * this.speed) *
          Math.cos(ry * frequency));
      maxValue += amplitude;
      amplitude *= this.persistence;
      frequency *= 2;
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
      const scaleFactor = 1.0 + (n1 - 0.5) * this.strength * 0.5;
      newVx *= scaleFactor;
      newVy *= scaleFactor;
    }

    // Apply particle radius scaling if enabled
    if (this.affectScale && system?.particleRadii) {
      const scaleFactor = 1.0 + (n1 - 0.5) * this.scaleStrength;
      system.particleRadii[particleIndex] = system.particleRadius * scaleFactor;
    }

    return [newVx, newVy];
  }

  update(dt) {
    this.time += dt;
  }

  setParameters({ strength, scale, speed, directionBias, decayRate }) {
    if (strength !== undefined) this.strength = strength;
    if (scale !== undefined) this.scale = scale;
    if (speed !== undefined) this.speed = speed;
    if (directionBias !== undefined) this.directionBias = directionBias;
    if (decayRate !== undefined) this.decayRate = decayRate;
  }
}

export { TurbulenceField };
