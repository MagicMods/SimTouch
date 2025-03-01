import { EmuData } from "../../input/emuData.js";

export class EmuForces {
  constructor(simulation) {
    // Store reference to gravity
    this.gravity = simulation.gravity;

    this.emuData = new EmuData();
    this.enabled = false;

    // Force multiplier
    this.accelGravityMultiplier = 1.0;
  }

  enable() {
    this.enabled = true;
    return this;
  }

  disable() {
    this.enabled = false;
    return this;
  }

  handleEmuData(accelX, accelY, accelZ) {
    this.emuData.update(accelX, accelY, accelZ);
  }

  handleBinaryData(buffer) {
    this.emuData.updateFromBinary(buffer);
  }

  handleStringData(dataString) {
    this.emuData.updateFromString(dataString);
  }

  setAccelGravityMultiplier(value) {
    this.accelGravityMultiplier = value;
    return this;
  }

  setAccelSensitivity(value) {
    this.emuData.setAccelSensitivity(value);
    return this;
  }

  calibrate() {
    this.emuData.calibrate();
    return this;
  }

  apply(dt) {
    if (!this.enabled) return;

    // Apply accelerometer data to gravity vector in 360 degrees
    if (this.gravity && this.gravity.setDirection) {
      // Fix: Invert the X axis to match visualization
      // We're using accelY for X and accelX for Y (after 90° rotation)
      const gravityX = this.emuData.accelY * this.accelGravityMultiplier; // REMOVED the negative sign
      const gravityY = this.emuData.accelX * this.accelGravityMultiplier; // Keep this positive
      const gravityZ = -this.emuData.accelZ * this.accelGravityMultiplier; // Z stays the same

      // Normalize the vector to ensure consistent gravity strength
      const length = Math.sqrt(
        gravityX * gravityX + gravityY * gravityY + gravityZ * gravityZ
      );
      if (length > 0) {
        const normalizedX = gravityX / length;
        const normalizedY = gravityY / length;
        const normalizedZ = gravityZ / length;

        // Set the gravity direction using the normalized vector
        this.gravity.setDirection(normalizedX, normalizedY, normalizedZ);
      }
    }
  }
}
