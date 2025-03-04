import { PulseModulator } from "./pulseModulator.js";
import { InputModulator } from "./inputModulator.js";

/**
 * Manages modulators that can modify UI parameters through various inputs
 */
export class ModulatorManager {
  constructor() {
    this.modulators = [];
    this.targets = {};
    this.targetRanges = {}; // Store min/max ranges for targets
    this.lastUpdateTime = Date.now();
    this.masterFrequency = 1.0; // For pulse modulators
  }

  /**
   * Add a target controller that can be modulated
   * @param {string} name - Name of the target
   * @param {object} controller - Controller object that can be modulated
   */
  addTarget(name, controller) {
    // Make sure the controller has getValue and setValue methods
    if (!controller.getValue) {
      controller.getValue = function () {
        return this.object[this.property];
      };
    }

    if (!controller.setValue) {
      controller.setValue = function (value) {
        this.object[this.property] = value;
        if (this.updateDisplay) this.updateDisplay();
      };
    }

    this.targets[name] = controller;
  }

  /**
   * Add a target controller with range information
   * @param {string} name - Name of the target
   * @param {object} controller - Controller object that can be modulated
   * @param {number} min - Minimum valid value
   * @param {number} max - Maximum valid value
   */
  addTargetWithRange(name, controller, min, max) {
    this.addTarget(name, controller);
    this.targetRanges[name] = { min, max };
  }

  /**
   * Add a target controller with full range information
   * @param {string} name - Name of the target
   * @param {object} controller - Controller object that can be modulated
   * @param {number} min - Minimum valid value
   * @param {number} max - Maximum valid value
   * @param {number} step - Step value for the controller
   */
  addTargetWithRangeFull(name, controller, min, max, step) {
    this.addTarget(name, controller);
    this.targetRanges[name] = { min, max, step };
  }

  /**
   * Get information about a target including its range
   * @param {string} name - Target name
   * @returns {object} Target information
   */
  getTargetInfo(name) {
    return {
      controller: this.targets[name],
      ...(this.targetRanges[name] || {}),
    };
  }

  /**
   * Get all available target names
   * @returns {string[]} Array of target names
   */
  getTargetNames() {
    return Object.keys(this.targets);
  }

  /**
   * Create a new pulse modulator and add it to the manager
   * @returns {PulseModulator} The created pulse modulator
   */
  createPulseModulator() {
    const modulator = new PulseModulator(this);
    this.modulators.push(modulator);
    return modulator;
  }

  /**
   * Create a new input modulator and add it to the manager
   * @returns {InputModulator} The created input modulator
   */
  createInputModulator() {
    const modulator = new InputModulator(this);
    this.modulators.push(modulator);
    return modulator;
  }

  /**
   * Remove a modulator by index
   * @param {number} index - Index of modulator to remove
   * @returns {boolean} Success
   */
  removeModulator(index) {
    if (index >= 0 && index < this.modulators.length) {
      const modulator = this.modulators[index];

      // Make sure modulator is disabled
      if (modulator.disable) {
        modulator.disable();
      } else {
        modulator.enabled = false;
      }

      // Remove it from the array
      this.modulators.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update all modulators
   */
  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // seconds
    this.lastUpdateTime = now;

    for (const modulator of this.modulators) {
      if (modulator.enabled) {
        modulator.update(deltaTime);
      }
    }
  }
}
