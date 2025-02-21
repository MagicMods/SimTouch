class TurbulenceField {
  constructor({
    enabled = true,
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
    if (!boundary || typeof boundary.centerX !== "number" || typeof boundary.centerY !== "number" || typeof boundary.getRadius !== "function") {
      throw new Error("TurbulenceField requires a valid CircularBoundary with centerX, centerY, and getRadius()");
    }
    
    this.boundary = boundary;
    this.enabled = enabled;
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
      noise += amplitude * (Math.sin(rx * frequency + this.time * this.speed) * Math.cos(ry * frequency));
      maxValue += amplitude;
      amplitude *= this.persistence;
      frequency *= 2;
    }

    return (noise / maxValue + 1) * 0.5;
  }

  applyTurbulence(position, velocity, dt) {
    if (!this.enabled) return velocity;

    const [x, y] = position;
    const [vx, vy] = velocity;

    const n1 = this.noise2D(x * this.scale, y * this.scale);
    const n2 = this.noise2D(y * this.scale + 1.234, x * this.scale + 5.678);

    let forceX = (n1 - 0.5) * this.strength + this.directionBias[0];
    let forceY = (n2 - 0.5) * this.strength + this.directionBias[1];

    const dx = x - this.boundary.centerX;
    const dy = y - this.boundary.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = 0.8 * this.boundary.getRadius();
    
    if (dist > threshold) {
      const excess = (dist - threshold) / (this.boundary.getRadius() - threshold);
      const inwardX = (-dx / dist) * excess * this.strength * this.inwardFactor;
      const inwardY = (-dy / dist) * excess * this.strength * this.inwardFactor;
      forceX += inwardX;
      forceY += inwardY;
    }

    return [vx * this.decayRate + forceX * dt, vy * this.decayRate + forceY * dt];
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
