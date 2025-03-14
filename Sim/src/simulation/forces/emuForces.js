import { EmuData } from "../../input/emuData.js";

export class EmuForces {
  constructor(simulation) {
    // Store reference to gravity
    this.gravity = simulation.gravity;

    this.emuData = new EmuData();
    this.enabled = false;

    // Add flag for manual override
    this.manualOverride = false;

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

  // Set manual override flag when mouse input is active
  setManualOverride(override) {
    this.manualOverride = override;
    return this;
  }

  handleEmuData(accelX, accelY, accelZ) {
    // Only update if not in manual override mode
    if (!this.manualOverride) {
      this.emuData.update(accelX, accelY, accelZ);
    }
  }

  handleBinaryData(buffer) {
    // Only update if not in manual override mode
    if (!this.manualOverride) {
      this.emuData.updateFromBinary(buffer);
    }
  }

  handleStringData(dataString) {
    // Only update if not in manual override mode
    if (!this.manualOverride) {
      this.emuData.updateFromString(dataString);
    }
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

    // Apply accelerometer data to gravity using raw values (not normalized)
    if (this.gravity && this.gravity.setRawDirection) {
      // We're using accelY for X and accelX for Y (after 90° rotation)
      const gravityX = this.emuData.accelY * this.accelGravityMultiplier;
      const gravityY = this.emuData.accelX * this.accelGravityMultiplier;
      const gravityZ = -this.emuData.accelZ * this.accelGravityMultiplier;

      // Use setRawDirection to control both direction and magnitude
      this.gravity.setRawDirection(gravityX, gravityY, gravityZ);
    }
  }
}
