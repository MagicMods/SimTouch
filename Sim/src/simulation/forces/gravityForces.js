import { eventBus } from '../../util/eventManager.js';

export class GravityForces {
  constructor(strength = 0) {
    // Raw direction values (also represent magnitude)
    this.directionX = 0;
    // Initialize Y direction based on strength (legacy compatibility)
    this.directionY = -strength;
    this.directionZ = 0;

    // For physics calculations
    this.strength = 0;
    // Add normalized direction for potential use (if needed)
    this.normalizedDirectionX = 0;
    this.normalizedDirectionY = 0;

    // For visualization and UI control
    this.enabled = true; // Default to enabled

    // Calculate initial magnitude
    this.updateMagnitude();

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
  }

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (simParams?.gravity) {
      // Directly update direction using values from simParams
      this.directionX = simParams.gravity.directionX ?? this.directionX;
      this.directionY = simParams.gravity.directionY ?? this.directionY;
      // Re-calculate strength and normalized direction internally
      this.updateMagnitude();
    }
    // console.log(`GravityForces updated: dirX=${this.directionX}, dirY=${this.directionY}`);
  }

  // Add method to calculate strength and normalized direction
  updateMagnitude() {
    this.strength = Math.sqrt(this.directionX * this.directionX + this.directionY * this.directionY + this.directionZ * this.directionZ);
    // Avoid division by zero if strength is zero
    if (this.strength > 1e-6) { // Use a small epsilon
      this.normalizedDirectionX = this.directionX / this.strength;
      this.normalizedDirectionY = this.directionY / this.strength;
      // Note: normalizedDirectionZ is not currently used but could be added
    } else {
      this.normalizedDirectionX = 0;
      this.normalizedDirectionY = 0;
      this.strength = 0; // Ensure strength is exactly 0 if components are near zero
    }
  }

  // Use raw values directly (don't normalize)
  setRawDirection(x, y, z = 0) {
    // Store the raw values
    this.directionX = x;
    this.directionY = y;
    this.directionZ = z;

    // Calculate magnitude from inputs
    // this.strength = Math.sqrt(x * x + y * y + z * z); // Replaced by updateMagnitude
    this.updateMagnitude();

    return this;
  }

  // Keep this for compatibility with existing code
  setDirection(x, y, z = 0) {
    return this.setRawDirection(x, y, z);
  }

  // Keep for backward compatibility - might need review based on how strength is used
  setStrength(value) {
    // If current magnitude is zero, set Y direction (legacy behavior)
    if (this.strength < 1e-6) {
      this.directionY = -value; // Apply strength downwards
      this.directionX = 0;
      this.directionZ = 0;
      this.updateMagnitude();
      return this;
    }

    // Scale current direction to reach desired strength
    const scaleFactor = value / this.strength;
    return this.setRawDirection(
      this.directionX * scaleFactor,
      this.directionY * scaleFactor,
      this.directionZ * scaleFactor
    );
  }

  getAcceleration() {
    if (!this.enabled || this.strength < 1e-6) return [0, 0, 0];

    // Use raw direction values directly
    return [this.directionX, this.directionY, this.directionZ];
  }

  apply(velocitiesX, velocitiesY, numParticles, dt) {
    // Check enabled state and if strength is effectively zero
    if (!this.enabled || this.strength < 1e-6) return;

    // Use raw direction values
    const accX = this.directionX;
    const accY = this.directionY;

    for (let i = 0; i < numParticles; i++) {
      velocitiesX[i] += accX * dt;
      velocitiesY[i] += accY * dt;
    }
  }
}
