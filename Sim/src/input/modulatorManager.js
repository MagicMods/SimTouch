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
    this.globalTime = 0;
  }

  //#region Target
  addTarget(name, controller) {
    // Validate controller has the necessary interface
    if (!controller) {
      throw new Error(`Cannot add null controller for target "${name}"`);
    }

    // Check for required methods or properties
    let hasGetValue = false;
    let hasSetValue = false;
    let hasValueProperty = false;

    try {
      // Try to call getValue to see if it exists
      controller.getValue();
      hasGetValue = true;
    } catch (e) {
      // getValue method doesn't exist, check for value property
      hasValueProperty = controller.value !== undefined;
    }

    try {
      // Test setValue with the current value (or 0 if we can't get it)
      const currentValue = hasGetValue ? controller.getValue() : (hasValueProperty ? controller.value : 0);
      controller.setValue(currentValue);
      hasSetValue = true;
    } catch (e) {
      // setValue method doesn't exist, check for value property
      hasValueProperty = controller.value !== undefined;
    }

    if (!hasGetValue && !hasValueProperty) {
      throw new Error(`Controller for "${name}" must have getValue() method or value property`);
    }

    if (!hasSetValue && !hasValueProperty) {
      throw new Error(`Controller for "${name}" must have setValue() method or value property`);
    }

    this.targets[name] = {
      controller: controller,
      min: 0,
      max: 1,
      getValue: () => {
        if (hasGetValue) {
          return controller.getValue();
        }
        return controller.value;
      },
      setValue: (value) => {
        if (hasSetValue) {
          controller.setValue(value);
          try {
            controller.updateDisplay();
          } catch (e) {
            // updateDisplay is optional, silently ignore if it doesn't exist
          }
        } else {
          controller.value = value;
        }
      },
    };
  }

  addTargetWithRangeFull(name, controller, min = 0, max = 1, step = 0.01) {
    this.addTarget(name, controller);
    this.targets[name].min = min;
    this.targets[name].max = max;
    this.targets[name].step = step;
  }

  getTargetInfo(targetName) {
    const target = this.targets[targetName];
    if (!target) {
      throw new Error(`Target "${targetName}" not found in ModulatorManager`);
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
      this.registerTargetsFromUi();
    }

    return Object.keys(this.targets);
  }

  registerUiComponents(components = {}) {
    if (!components || Object.keys(components).length === 0) {
      throw new Error("Cannot register empty UI components");
    }

    this.uiComponents = components;
    this.registerTargetsFromUi();
  }

  registerTargetsFromUi() {
    // Clear existing targets to avoid duplicates
    this.targets = {};

    if (!this.uiComponents || Object.keys(this.uiComponents).length === 0) {
      throw new Error("No UI components to register targets from");
    }

    // Register targets from all components
    Object.entries(this.uiComponents).forEach(([name, component]) => {
      if (!component) {
        throw new Error(`Component "${name}" is null or undefined`);
      }

      if (typeof component.getControlTargets !== "function") {
        throw new Error(`Component "${name}" must have getControlTargets() method`);
      }

      const targets = component.getControlTargets();
      this.registerTargetsFromObject(targets);
    });

    const targetCount = Object.keys(this.targets).length;
    if (targetCount === 0) {
      throw new Error("No targets were registered from UI components");
    }
  }

  autoRangeTarget(modulator, minController, maxController) {
    if (!modulator || !modulator.targetName) {
      throw new Error("Cannot auto-range target: modulator or targetName is missing");
    }

    const targetInfo = this.getTargetInfo(modulator.targetName);
    const min = targetInfo.min;
    const max = targetInfo.max;
    const step = targetInfo.step || 0.01;

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
    if (index < 0 || index >= this.modulators.length) {
      throw new Error(`Invalid modulator index: ${index}`);
    }

    const modulator = this.modulators[index];

    // Make sure modulator is disabled
    try {
      modulator.disable();
    } catch (e) {
      // Fallback to directly setting enabled flag
      modulator.enabled = false;
    }

    // Remove it from the array
    this.modulators.splice(index, 1);
    return true;
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

    // Count modulators of each type to generate correct indices
    let pulseCount = 0;
    let inputCount = 0;

    return modulators.map((mod) => {
      // Common properties
      const state = {
        enabled: !!mod.enabled,
        targetName: mod.targetName,
        min: mod.min,
        max: mod.max,
      };

      // Calculate the type-specific index (1-based)
      let typeIndex = 1;
      if (mod instanceof PulseModulator) {
        typeIndex = ++pulseCount;
      } else if (mod instanceof InputModulator) {
        typeIndex = ++inputCount;
      }

      // Add display name if method exists
      if (typeof mod.getDisplayName === "function") {
        state.displayName = mod.getDisplayName(typeIndex);
      } else {
        // Fallback display name format
        const typePrefix = mod instanceof PulseModulator ? "Modulator" : "Audio Modulator";
        state.displayName = `${typePrefix} ${typeIndex} | "${mod.targetName || "No Target"}"`;
      }

      // Type-specific properties
      if (mod instanceof PulseModulator) {
        state.type = "pulse";
        state.waveType = mod.type;
        state.frequency = mod.frequency;
        state.phase = mod.phase;
        state.sync = !!mod.sync;
        if (mod.beatDivision !== undefined) state.beatDivision = mod.beatDivision;
        if (mod.pwm !== undefined) state.pwm = mod.pwm;
      } else if (mod instanceof InputModulator) {
        state.type = "input";
        state.inputSource = mod.inputSource;
        state.frequencyBand = mod.frequencyBand;
        state.sensitivity = mod.sensitivity;
      }

      return state;
    });
  }


  getModulatorsDisplayInfo(type) {
    const modulators = type ? this.getModulatorsByType(type) : this.modulators;

    // Count modulators of each type to generate correct indices
    let pulseCount = 0;
    let inputCount = 0;

    return modulators.map((mod, index) => {
      // Calculate the type-specific index (1-based)
      let typeIndex = 1;
      if (mod instanceof PulseModulator) {
        typeIndex = ++pulseCount;
      } else if (mod instanceof InputModulator) {
        typeIndex = ++inputCount;
      }

      // Get display name from modulator or generate a default one
      let displayName;
      if (typeof mod.getDisplayName === "function") {
        displayName = mod.getDisplayName(typeIndex);
      } else {
        // Fallback if getDisplayName is not implemented
        const typeLabel = mod instanceof PulseModulator ? "Modulator" : "Audio Modulator";
        const targetInfo = mod.targetName ? ` | "${mod.targetName}"` : " | No Target";
        displayName = `${typeLabel} ${typeIndex}${targetInfo}`;
      }

      return {
        index,
        type: mod instanceof PulseModulator ? "pulse" : "input",
        displayName,
        enabled: !!mod.enabled,
        targetName: mod.targetName || null
      };
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
        modulator.beatDivision = state.beatDivision || "1"; // Set beat division if present
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

    // Increment global time using dt
    this.globalTime += dt;

    // Ensure all sync'd modulators have latest master frequency before updating
    this.getModulatorsByType("pulse").forEach((mod) => {
      if (mod.sync) {
        mod.frequency = this.masterFrequency;
      }
    });

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
        // Update BPM value if it exists
        if (mod.frequencyBpm !== undefined) {
          mod.frequencyBpm = frequency * 60;
        }
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
