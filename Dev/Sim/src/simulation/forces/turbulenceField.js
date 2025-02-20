class TurbulenceField {
  constructor({
    enabled = true,
    strength = 0.1,
    scale = 4.0,
    speed = 1.0,
    octaves = 3,
    persistence = 0.5,
    rotation = 0.0,
    inwardFactor = 1.0,
    boundary = null,
  } = {}) {
    // Validate boundary interface first
    if (
      !boundary ||
      typeof boundary.centerX !== "number" ||
      typeof boundary.centerY !== "number" ||
      typeof boundary.getRadius !== "function"
    ) {
      throw new Error(
        "TurbulenceField requires valid CircularBoundary with centerX, centerY, and getRadius()"
      );
    }

    // Store boundary reference
    this.boundary = boundary;

    // Core parameters
    this.enabled = enabled;
    this.strength = strength;
    this.scale = scale;
    this.speed = speed;
    this.octaves = octaves;
    this.persistence = persistence;
    this.rotation = rotation;
    this.inwardFactor = inwardFactor;
    this.time = 0;
  }

  noise2D(x, y) {
    // Apply rotation to input coordinates
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    let noise = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    // Sum multiple octaves of noise
    for (let i = 0; i < this.octaves; i++) {
      const sx = rx * frequency;
      const sy = ry * frequency;
      const s = (sx + sy) * 0.5;

      const t = this.time * this.speed * frequency;
      noise +=
        amplitude *
        (Math.cos(s + t) * Math.sin(s * 1.5 + t * 0.5) +
          Math.sin(sx * 0.8 + t * 1.2) * Math.cos(sy * 1.2 + t * 0.7));

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

    // Compute noise-based force
    const n1 = this.noise2D(x * this.scale, y * this.scale);
    const n2 = this.noise2D(y * this.scale + 1.234, x * this.scale + 5.678);

    let forceX = (n1 - 0.5) * this.strength;
    let forceY = (n2 - 0.5) * this.strength;

    // Use boundary reference for containment forces
    const dx = x - this.boundary.centerX;
    const dy = y - this.boundary.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const threshold = 0.8 * this.boundary.getRadius();
    if (dist > threshold) {
      const excess =
        (dist - threshold) / (this.boundary.getRadius() - threshold);
      const inwardX = (-dx / dist) * excess * this.strength * this.inwardFactor;
      const inwardY = (-dy / dist) * excess * this.strength * this.inwardFactor;

      forceX += inwardX;
      forceY += inwardY;
    }

    // Update velocity
    return [vx + forceX * dt, vy + forceY * dt];
  }

  update(dt) {
    this.time += dt;
  }
}
export { TurbulenceField };
