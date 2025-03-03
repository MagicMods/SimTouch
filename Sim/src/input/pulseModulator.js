/**
 * Manages pulse modulators that can modify UI parameters over time
 */
export class PulseModulatorManager {
  constructor() {
    this.modulators = [];
    this.targets = {};
    this.targetRanges = {}; // Store min/max ranges for targets
    this.lastUpdateTime = Date.now();
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
   * Create a new modulator and add it to the manager
   * @returns {PulseModulator} The created modulator
   */
  createModulator() {
    const modulator = new PulseModulator(this);
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
      modulator.enabled = false;

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

/**
 * A pulse modulator that can modify a parameter over time
 */
class PulseModulator {
  constructor(manager) {
    this.manager = manager;
    this.enabled = false;
    this.targetName = "";
    this.type = "sine";
    this.frequency = 1.0;
    this.phase = 0;
    this.min = 0; // New min property
    this.max = 1; // New max property
    this.time = 0;
    this.targetController = null;
  }

  /**
   * Set the target to modulate
   * @param {string} targetName - Name of the target to modulate
   */
  setTarget(targetName) {
    // If changing targets, reset the previous one
    if (this.targetController && this.enabled) {
      try {
        const oldValue = this.targetController.getValue();
        console.log(`Resetting target ${this.targetName} to ${oldValue}`);
        this.targetController.setValue(oldValue);
      } catch (e) {
        console.warn("Could not reset previous target:", e);
      }
    }

    this.targetName = targetName;
    this.targetController = this.manager.targets[targetName];

    // Set min/max from target range if available
    const targetInfo = this.manager.getTargetInfo(targetName);
    if (
      targetInfo &&
      targetInfo.min !== undefined &&
      targetInfo.max !== undefined
    ) {
      this.min = targetInfo.min;
      this.max = targetInfo.max;
    }

    console.log(
      `Set target ${targetName} with range: ${this.min} - ${this.max}`
    );
  }

  /**
   * Update the modulator
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.targetController || !this.enabled) return;

    this.time += deltaTime;

    try {
      // Calculate modulation and apply to target
      const value = this.calculateModulation(this.time);

      // Map from 0-1 to min-max
      const mappedValue = this.min + value * (this.max - this.min);

      // Add debug logging
      // console.log(`Modulating ${this.targetName}: value=${mappedValue}`);

      this.targetController.setValue(mappedValue);

      // Update the UI display after setting the value
      // if (this.targetController.updateDisplay) {
      this.targetController.updateDisplay();
      // }
    } catch (e) {
      console.error(`Error updating modulator for ${this.targetName}:`, e);
      this.enabled = false; // Disable on error
    }
  }

  /**
   * Calculate the modulation value based on time and settings
   * @param {number} time - Current time in seconds
   * @returns {number} Modulation value 0-1
   */
  calculateModulation(time) {
    const t = time * this.frequency * Math.PI * 2 + this.phase;

    let value = 0;
    switch (this.type) {
      case "sine":
        value = Math.sin(t) * 0.5 + 0.5; // Map to 0-1
        break;
      case "square":
        value = Math.sin(t) >= 0 ? 1 : 0;
        break;
      case "triangle":
        value = Math.abs(((t / Math.PI) % 2) - 1); // Map to 0-1
        break;
      case "sawtooth":
        value = ((t / Math.PI) % 2) / 2 + 0.5; // Map to 0-1
        break;
      case "sustainedPulse":
        // Calculate position in the cycle (0 to 1)
        const position = (t % (Math.PI * 2)) / (Math.PI * 2);

        if (position < 0.5) {
          // First half of cycle: maintain at max value (1.0)
          value = 1.0;
        } else {
          // Second half of cycle: linear ramp from max (1.0) to min (0.0)
          value = 1.0 - (position - 0.5) * 2; // Maps position 0.5->1.0 to value 1.0->0.0
        }
        break;
      default:
        value = Math.sin(t) * 0.5 + 0.5;
    }

    return value; // Return 0-1 value
  }

  /**
   * Disable modulation and clean up
   */
  disable() {
    this.enabled = false;
  }
}
