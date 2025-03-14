export class GravityForces {
  constructor(strength = 0) {
    // Raw direction values (also represent magnitude)
    this.directionX = 0;
    this.directionY = 0;
    this.directionZ = 0;

    // For physics calculations
    this.strength = 0;

    // For visualization and UI control
    this.enabled = true;
  }

  // Use raw values directly (don't normalize)
  setRawDirection(x, y, z = 0) {
    // Store the raw values
    this.directionX = x;
    this.directionY = y;
    this.directionZ = z;

    // Calculate magnitude from inputs
    this.strength = Math.sqrt(x * x + y * y + z * z);

    return this;
  }

  // Keep this for compatibility with existing code
  setDirection(x, y, z = 0) {
    return this.setRawDirection(x, y, z);
  }

  // Keep for backward compatibility
  setStrength(value) {
    // If current magnitude is zero, this has no effect
    if (this.strength === 0) return this;

    // Scale current direction to reach desired strength
    const scaleFactor = value / this.strength;
    return this.setRawDirection(
      this.directionX * scaleFactor,
      this.directionY * scaleFactor,
      this.directionZ * scaleFactor
    );
  }

  getAcceleration() {
    if (!this.enabled || this.strength === 0) return [0, 0, 0];

    // Use raw direction values directly
    return [this.directionX, this.directionY, this.directionZ];
  }

  apply(velocitiesX, velocitiesY, numParticles, dt) {
    if (!this.enabled || this.strength === 0) return;

    // Use raw direction values
    const accX = this.directionX;
    const accY = this.directionY;

    for (let i = 0; i < numParticles; i++) {
      velocitiesX[i] += accX * dt;
      velocitiesY[i] += accY * dt;
    }
  }
}
