export class GravityForces {
  constructor(strength = 9.8) {
    this.strength = strength;

    // Default direction is downward (positive y in our coordinate system)
    this.directionX = 0;
    this.directionY = 0;
    this.directionZ = 0;

    // For visualization and UI control
    this.enabled = true;
  }

  setStrength(value) {
    this.strength = value;
    return this;
  }

  setDirection(x, y, z = 0) {
    // Store the normalized direction
    const length = Math.sqrt(x * x + y * y + z * z);

    if (length > 0) {
      this.directionX = x / length;
      this.directionY = y / length;
      this.directionZ = z / length;
    } else {
      // When given a zero vector, disable gravity by setting strength to 0
      this.directionX = 0;
      this.directionY = 0;
      this.directionZ = 0;
    }
    return this;
  }

  getAcceleration() {
    if (!this.enabled) return [0, 0, 0];

    return [
      this.directionX * this.strength,
      this.directionY * this.strength,
      this.directionZ * this.strength,
    ];
  }

  apply(velocitiesX, velocitiesY, numParticles, dt) {
    if (!this.enabled) return;

    const accX = this.directionX * this.strength;
    const accY = this.directionY * this.strength;

    for (let i = 0; i < numParticles; i++) {
      velocitiesX[i] += accX * dt;
      velocitiesY[i] += accY * dt;
    }
  }
}
