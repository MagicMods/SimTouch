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
    // this.masterFrequency = 1.0; // For pulse modulators
  }

  /**
   * Add a target controller that can be modulated
   * @param {string} name - Name of the target
   * @param {object} controller - Controller object that can be modulated
   */
  addTarget(name, controller) {
    this.targets[name] = {
      controller: controller,
      min: 0,
      max: 1,
      getValue: () => {
        if (typeof controller.getValue === "function") {
          return controller.getValue();
        } else if (controller.value !== undefined) {
          return controller.value;
        } else {
          console.warn(
            `No getValue method or value property for target "${name}"`
          );
          return 0;
        }
      },
      setValue: (value) => {
        try {
          if (typeof controller.setValue === "function") {
            controller.setValue(value);
            if (typeof controller.updateDisplay === "function") {
              controller.updateDisplay();
            }
          } else if (controller.value !== undefined) {
            controller.value = value;
          } else {
            console.warn(
              `No setValue method or value property for target "${name}"`
            );
          }
        } catch (e) {
          console.warn(`Error setting value for target "${name}":`, e);
        }
      },
    };
  }

  /**
   * Add a target controller with range information
   * @param {string} name - Name of the target
   * @param {object} controller - Controller object that can be modulated
   * @param {number} min - Minimum value (optional)
   * @param {number} max - Maximum value (optional)
   */
  addTargetWithRange(name, controller, min = 0, max = 1) {
    this.addTarget(name, controller);
    if (this.targets[name]) {
      this.targets[name].min = min;
      this.targets[name].max = max;
    }
  }

  /**
   * Add a target with full range specifications
   * @param {string} name - Name of the target
   * @param {object} controller - Controller object that can be modulated
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} step - Step value
   */
  addTargetWithRangeFull(name, controller, min = 0, max = 1, step = 0.01) {
    this.addTarget(name, controller);
    if (this.targets[name]) {
      this.targets[name].min = min;
      this.targets[name].max = max;
      this.targets[name].step = step;
      console.log(
        `Added target ${name} with range: ${min} - ${max}, step: ${step}`
      );
    }
  }

  /**
   * Get information about a specific target
   * @param {string} targetName - The name of the target
   * @returns {Object|null} Target information or null if not found
   */
  getTargetInfo(targetName) {
    const target = this.targets[targetName];
    if (!target) {
      console.warn(`Target "${targetName}" not found in ModulatorManager`);
      return null;
    }

    // Return a properly structured target info object
    return {
      name: targetName,
      min: target.min,
      max: target.max,
      step: target.step,
      controller: target,
    };
  }

  /**
   * Get all available target names
   * @returns {string[]} Array of target names
   */
  getTargetNames() {
    // Check if targets exist, and if not, try to register them if UI panels are available
    if (
      Object.keys(this.targets).length === 0 &&
      this._uiPanelsForAutoRegister
    ) {
      console.log("ModulatorManager: No targets found, auto-registering");
      this.registerTargetsFromUi(
        this._uiPanelsForAutoRegister.leftUi,
        this._uiPanelsForAutoRegister.rightUi
      );
    }

    return Object.keys(this.targets);
  }

  /**
   * Store UI panels for auto-registration if needed
   * @param {Object} leftUi - Left UI panel
   * @param {Object} rightUi - Right UI panel
   */
  storeUiPanelsForAutoRegistration(leftUi, rightUi) {
    if (leftUi && rightUi) {
      this._uiPanelsForAutoRegister = { leftUi, rightUi };
    }
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
    modulator.inputSource = "mic"; // Default to mic input
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
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    const now = Date.now();
    const dt = deltaTime || (now - this.lastUpdateTime) / 1000; // seconds
    this.lastUpdateTime = now;

    for (const modulator of this.modulators) {
      if (modulator.enabled) {
        modulator.update(dt);
      }
    }
  }

  /**
   * Register all available targets from UI components
   * @param {Object} leftUi - Left UI panel
   * @param {Object} rightUi - Right UI panel
   */
  registerTargetsFromUi(leftUi, rightUi) {
    console.log("ModulatorManager registering targets from UI panels");

    try {
      // Check if we already have targets registered to avoid duplication
      if (Object.keys(this.targets).length > 0) {
        console.log(
          "ModulatorManager already has targets registered. Skipping registration."
        );
        return;
      }

      // Continue with registration
      // Reset targets before registering to avoid duplication
      this.targets = {};

      // Register from left UI
      if (leftUi && typeof leftUi.getControlTargets === "function") {
        const leftTargets = leftUi.getControlTargets();

        Object.keys(leftTargets).forEach((name) => {
          const targetInfo = leftUi.getControllerForTarget(name);
          if (targetInfo && targetInfo.controller) {
            this.addTargetWithRangeFull(
              name,
              targetInfo.controller,
              targetInfo.min,
              targetInfo.max,
              targetInfo.step
            );
          }
        });
      }

      // Register from right UI
      if (rightUi && typeof rightUi.getControlTargets === "function") {
        const rightTargets = rightUi.getControlTargets();

        Object.keys(rightTargets).forEach((name) => {
          const targetInfo = rightUi.getControllerForTarget(name);
          if (targetInfo && targetInfo.controller) {
            this.addTargetWithRangeFull(
              name,
              targetInfo.controller,
              targetInfo.min,
              targetInfo.max,
              targetInfo.step
            );
          }
        });
      }

      console.log(
        "ModulatorManager registered targets:",
        this.getTargetNames()
      );
    } catch (e) {
      console.error("Error registering targets in ModulatorManager:", e);
    }
  }
}
