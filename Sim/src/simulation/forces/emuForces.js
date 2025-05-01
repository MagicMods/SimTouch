import { EmuData } from "../../input/emuData.js";
import { debugManager } from '../../util/debugManager.js';
export class EmuForces {
  constructor(simulation) {
    // Store reference to gravity
    this.gravity = simulation.gravity;

    // Store reference to simulation for accessing turbulenceField
    this.simulation = simulation;

    // Initialize joystickRenderer to null
    this.joystickRenderer = null;

    this.emuData = new EmuData();
    this.enabled = false;
    this.accelGravityMultiplier = 1.0;
  }

  get db() {
    return debugManager.get('emu');
  }

  // Method to set the joystick renderer after instantiation
  setJoystickRenderer(renderer) {
    this.joystickRenderer = renderer;
    if (!this.joystickRenderer) {
      console.warn("setJoystickRenderer called with null or undefined renderer.");
    }
  }

  enable() {
    this.enabled = true;
    return this;
  }

  disable() {
    this.enabled = false;
    if (this.joystickRenderer && !this.joystickRenderer.springEnabled) {
      // this.joystickRenderer.resetJoystick(); // This might be too abrupt
    }
    return this;
  }

  handleEmuData(accelX, accelY, accelZ) {
    if (this.db) console.log("handleEmuData called with:", accelX, accelY, accelZ);
    this.emuData.update(accelX, accelY, accelZ);
    this._updateJoystickFromEmu(); // Update joystick after data update
  }

  handleBinaryData(buffer) {
    if (this.db) console.log("handleBinaryData called.");
    this.emuData.updateFromBinary(buffer);
    this._updateJoystickFromEmu(); // Update joystick after data update
  }

  handleStringData(dataString) {
    if (this.db) console.log("handleStringData called with:", dataString);
    this.emuData.updateFromString(dataString);
    this._updateJoystickFromEmu(); // Update joystick after data update
  }

  // Internal helper to update joystick state from EMU data
  _updateJoystickFromEmu() {
    // Add logging
    if (this.db) console.log("_updateJoystickFromEmu called.");

    if (!this.enabled) {
      if (this.db) console.log("  -> EMU not enabled, exiting.");
      return;
    }

    if (!this.emuData) {
      console.warn("_updateJoystickFromEmu: emuData is null/undefined!");
      return;
    }

    if (!this.joystickRenderer) {
      if (this.db || !this._warnedJoystickNull) {
        console.warn("Attempted _updateJoystickFromEmu but this.joystickRenderer is null! Did you call setJoystickRenderer after instantiation?");
        this._warnedJoystickNull = true;
      }
      return;
    }
    this._warnedJoystickNull = false;

    // Apply axis swapping and inversion as before:
    const emuX = this.emuData.accelX;
    const emuY = this.emuData.accelY;
    const newJoystickX = emuY;
    const newJoystickY = emuX;

    // Log the values being processed
    if (this.db) {
      console.log(`  -> Enabled: ${this.enabled}, JoystickRenderer valid: ${!!this.joystickRenderer}`);
      console.log(`  -> EmuData: accelX=${emuX?.toFixed(2)}, accelY=${emuY?.toFixed(2)}`);
      console.log(`  -> Setting joystick: X=${newJoystickX?.toFixed(2)}, Y=${newJoystickY?.toFixed(2)}`);
    }

    // Update joystick state
    this.joystickRenderer.joystickX = newJoystickX;
    this.joystickRenderer.joystickY = newJoystickY;
    this.joystickRenderer.joystickActive = true;

    this.joystickRenderer.updateGravityUI();
    this.joystickRenderer.updateTurbulenceBiasUI();
    this.joystickRenderer.updateJoystickSliders();
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
    if (!this.enabled || !this.emuData) return;
  }
}
