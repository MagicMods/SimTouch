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

    // Apply accelerometer data to gravity
    if (this.gravity && this.gravity.setDirection) {
      const gravityX = this.emuData.accelX * this.accelGravityMultiplier;
      const gravityY = this.emuData.accelY * this.accelGravityMultiplier;
      const gravityZ = this.emuData.accelZ * this.accelGravityMultiplier;

      this.gravity.setDirection(gravityX, gravityY, gravityZ);
    }
  }
}
