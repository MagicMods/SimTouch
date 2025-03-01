import { EmuData } from "../../input/emuData.js";

export class EmuForces {
  constructor(simulation) {
    // Store references directly instead of nesting under "simulation"
    this.turbulence = simulation.turbulence;
    this.gravity = simulation.gravity;

    this.emuData = new EmuData();
    this.enabled = false;

    // Force multipliers
    this.gyroTurbulenceMultiplier = 0.1;
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

  handleEmuData(gyroX, gyroY, gyroZ, accelX, accelY, accelZ) {
    this.emuData.update(gyroX, gyroY, gyroZ, accelX, accelY, accelZ);
  }

  handleBinaryData(buffer) {
    this.emuData.updateFromBinary(buffer);
  }

  handleStringData(dataString) {
    this.emuData.updateFromString(dataString);
  }

  setGyroTurbulenceMultiplier(value) {
    this.gyroTurbulenceMultiplier = value;
    return this;
  }

  setAccelGravityMultiplier(value) {
    this.accelGravityMultiplier = value;
    return this;
  }

  setGyroSensitivity(value) {
    this.emuData.setGyroSensitivity(value);
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

    // Apply gyroscope data to turbulence - use the direct reference
    if (this.turbulence && this.turbulence.addExternalForce) {
      this.turbulence.addExternalForce(
        this.emuData.gyroX * this.gyroTurbulenceMultiplier,
        this.emuData.gyroY * this.gyroTurbulenceMultiplier,
        this.emuData.gyroZ * this.gyroTurbulenceMultiplier
      );
    }

    // Apply accelerometer data to gravity - use the direct reference
    if (this.gravity && this.gravity.setDirection) {
      const gravityX = this.emuData.accelX * this.accelGravityMultiplier;
      const gravityY = this.emuData.accelY * this.accelGravityMultiplier;
      const gravityZ = this.emuData.accelZ * this.accelGravityMultiplier;

      this.gravity.setDirection(gravityX, gravityY, gravityZ);
    }
  }
}
