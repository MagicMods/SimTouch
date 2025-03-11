import { PulseModulator } from "./pulseModulator.js";
import { InputModulator } from "./inputModulator.js";

export class ModulatorManager {
  constructor() {
    this.modulators = [];
    this.targets = {};
    this.targetRanges = {}; // Store min/max ranges for targets
    this.lastUpdateTime = Date.now();
    this.uiComponents = {}; // Single structure for ALL UI components
    this.masterFrequency = 1.0;
    this.globalTime = 0; // Add global time reference
  }

  //#region Target
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

  addTargetWithRangeFull(name, controller, min = 0, max = 1, step = 0.01) {
    this.addTarget(name, controller);
    if (this.targets[name]) {
      this.targets[name].min = min;
      this.targets[name].max = max;
      this.targets[name].step = step;
      // console.log(
      //   `Added target ${name} with range: ${min} - ${max}, step: ${step}`
      // );
    }
  }

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

  getTargetNames() {
    // If no targets and we have stored components, try to register them
    if (
      Object.keys(this.targets).length === 0 &&
      Object.keys(this.uiComponents).length > 0
    ) {
      console.log("ModulatorManager: No targets found, auto-registering");
      this.registerTargetsFromUi();
    }

    return Object.keys(this.targets);
  }

  registerUiComponents(components = {}) {
    this.uiComponents = components;
    console.log(
      `ModulatorManager: Registered ${
        Object.keys(components).length
      } UI components`
    );

    // Register targets from all components
    this.registerTargetsFromUi();
  }

  registerTargetsFromUi() {
    console.log("ModulatorManager: Registering targets from UI components");

    try {
      // Clear existing targets to avoid duplicates
      this.targets = {};

      if (!this.uiComponents || Object.keys(this.uiComponents).length === 0) {
        console.warn(
          "ModulatorManager: No UI components to register targets from"
        );
        return;
      }

      // Register targets from all components
      Object.entries(this.uiComponents).forEach(([name, component]) => {
        if (component && typeof component.getControlTargets === "function") {
          console.log(`Registering targets from ${name}`);
          const targets = component.getControlTargets();
          this.registerTargetsFromObject(targets);
        } else {
          console.log(`Component ${name} has no getControlTargets method`);
        }
      });

      const targetCount = Object.keys(this.targets).length;
      console.log(`ModulatorManager: Registered ${targetCount} targets`);
      if (targetCount > 0) {
        console.log("Available targets:", Object.keys(this.targets));
      } else {
        console.warn("No targets were registered!");
      }
    } catch (e) {
      console.error("Error registering targets in ModulatorManager:", e);
    }
  }

  autoRangeTarget(modulator, minController, maxController) {
    if (!modulator || !modulator.targetName) return;

    const targetInfo = this.getTargetInfo(modulator.targetName);
    if (!targetInfo) return;

    const min = targetInfo.min;
    const max = targetInfo.max;
    const step = targetInfo.step || 0.01;

    if (min !== undefined && max !== undefined && !isNaN(min) && !isNaN(max)) {
      // Update modulator's range
      modulator.min = min;
      modulator.max = max;

      // Update UI controllers if provided
      if (minController) {
        minController.min(min);
        minController.max(max);
        minController.step(step);
        minController.setValue(min);
        minController.updateDisplay();
      }

      if (maxController) {
        maxController.min(min);
        maxController.max(max);
        maxController.step(step);
        maxController.setValue(max);
        maxController.updateDisplay();
      }
    }
  }

  //#endregion

  //#region Modulators

  createPulseModulator() {
    const modulator = new PulseModulator(this);
    this.modulators.push(modulator);
    return modulator;
  }

  createInputModulator() {
    const modulator = new InputModulator(this);
    modulator.inputSource = "mic"; // Default to mic input
    this.modulators.push(modulator);
    return modulator;
  }

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

  getModulatorsByType(type) {
    return this.modulators.filter((mod) => {
      if (type === "pulse") {
        return mod instanceof PulseModulator;
      } else if (type === "input") {
        return mod instanceof InputModulator;
      }
      return false;
    });
  }

  removeModulatorsByType(type) {
    const initialCount = this.modulators.length;
    const toRemove = this.getModulatorsByType(type);
    toRemove.forEach((mod) => {
      if (typeof mod.disable === "function") {
        mod.disable();
      } else {
        mod.enabled = false;
      }
    });

    this.modulators = this.modulators.filter((mod) => {
      if (type === "pulse") {
        return !(mod instanceof PulseModulator);
      } else if (type === "input") {
        return !(mod instanceof InputModulator);
      }
      return true;
    });

    return initialCount - this.modulators.length;
  }

  getModulatorsState(type) {
    const modulators = type ? this.getModulatorsByType(type) : this.modulators;

    return modulators.map((mod) => {
      // Common properties
      const state = {
        enabled: !!mod.enabled,
        targetName: mod.targetName,
        min: mod.min,
        max: mod.max,
      };

      // Type-specific properties
      if (mod instanceof PulseModulator) {
        state.type = "pulse";
        state.waveType = mod.type;
        state.frequency = mod.frequency;
        state.phase = mod.phase;
        state.sync = !!mod.sync;
        if (mod.pwm !== undefined) state.pwm = mod.pwm;
      } else if (mod instanceof InputModulator) {
        state.type = "input";
        state.inputSource = mod.inputSource;
        state.frequencyBand = mod.frequencyBand;
        state.sensitivity = mod.sensitivity;
        state.smoothing = mod.smoothing;
      }

      return state;
    });
  }

  loadModulatorsState(states, clearExisting = true) {
    if (!Array.isArray(states)) return false;

    if (clearExisting) {
      this.clearAll();
    }

    states.forEach((state) => {
      let modulator;

      // Create the right type of modulator
      if (state.type === "pulse") {
        modulator = this.createPulseModulator();
        modulator.type = state.waveType || "sine";
        modulator.frequency = state.frequency || 1.0;
        modulator.phase = state.phase || 0;
        modulator.sync = !!state.sync;
        if (state.pwm !== undefined) modulator.pwm = state.pwm;
      } else if (state.type === "input") {
        modulator = this.createInputModulator();
        modulator.inputSource = state.inputSource || "mic";
        modulator.frequencyBand = state.frequencyBand || "none";
        modulator.sensitivity = state.sensitivity || 1.0;
        modulator.smoothing = state.smoothing || 0.7;
      } else {
        return; // Skip if type is unknown
      }

      // Set common properties
      if (state.targetName) {
        modulator.targetName = state.targetName;
        if (typeof modulator.setTarget === "function") {
          modulator.setTarget(state.targetName);
        }
      }

      modulator.min = state.min !== undefined ? state.min : 0;
      modulator.max = state.max !== undefined ? state.max : 1;
      modulator.enabled = !!state.enabled;
    });

    return true;
  }

  //#endregion

  update(deltaTime) {
    const now = Date.now();
    const dt = deltaTime || (now - this.lastUpdateTime) / 1000; // seconds
    this.lastUpdateTime = now;

    // Increment global time
    this.globalTime += deltaTime;

    for (const modulator of this.modulators) {
      if (modulator.enabled) {
        modulator.update(dt, this.globalTime);
      }
    }
  }

  getControllerInfo(controller, targetName) {
    const result = {
      controller,
      property: controller.property,
    };

    try {
      // For lil-gui controls
      if (typeof controller._min !== "undefined") {
        result.min = Number(controller._min);
        result.max = Number(controller._max);
        result.step =
          controller._step !== undefined ? Number(controller._step) : 0.01;
      }
      // Alternative property names
      else if (typeof controller.__min !== "undefined") {
        result.min = Number(controller.__min);
        result.max = Number(controller.__max);
        result.step =
          controller.__step !== undefined ? Number(controller.__step) : 0.01;
      }
      // Function calls if available
      else if (typeof controller.min === "function") {
        result.min = Number(controller.min());
        result.max = Number(controller.max());
        result.step =
          typeof controller.step === "function"
            ? Number(controller.step())
            : 0.01;
      }
      // Special known targets
      else {
        result.min = 0;
        result.max = 1;
        result.step = 0.01;
      }

      return result;
    } catch (e) {
      console.error(`Error extracting range for ${targetName}:`, e);
      return {
        controller,
        min: 0,
        max: 1,
        step: 0.01,
      };
    }
  }

  clearAll() {
    this.modulators.forEach((mod) => {
      if (typeof mod.disable === "function") {
        mod.disable();
      } else {
        mod.enabled = false;
      }
    });

    this.modulators = [];
  }

  setMasterFrequency(frequency) {
    this.masterFrequency = frequency;

    // Update all pulse modulators that are synced
    this.getModulatorsByType("pulse").forEach((mod) => {
      if (mod.sync) {
        mod.frequency = frequency;
      }
    });
  }

  getMasterFrequency() {
    return this.masterFrequency || 1.0;
  }

  // Helper method to register targets
  registerTargetsFromObject(targetsObject) {
    Object.keys(targetsObject).forEach((name) => {
      const controller = targetsObject[name];
      const targetInfo = this.getControllerInfo(controller, name);
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
}
