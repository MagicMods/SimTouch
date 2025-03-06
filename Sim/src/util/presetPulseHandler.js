import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetPulseHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { modulators: [] },
    };
    super("savedPulsePresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
  }

  extractDataFromUI(pulseModUI) {
    if (!pulseModUI) {
      console.error("No PulseModulationUi provided");
      return null;
    }

    try {
      // Get modulators from controllers if available
      let modulators = [];

      if (Array.isArray(pulseModUI.modulatorControllers)) {
        // Extract modulator objects from controllers
        modulators = pulseModUI.modulatorControllers
          .map((controller) => controller.object)
          .filter(Boolean);
      }

      // Extract data from modulators
      const modulatorData = modulators.map((mod) => ({
        enabled: Boolean(mod.enabled),
        targetName: mod.targetName || null,
        type: mod.type || mod.waveType || "sine",
        frequency: Number(mod.frequency) || 0.5,
        amplitude: Number(mod.amplitude) || 0.5,
        phase: Number(mod.phase) || 0,
        bias: Number(mod.bias) || 0.5,
        min: Number(mod.min) || 0,
        max: Number(mod.max) || 1,
      }));

      return { modulators: modulatorData };
    } catch (error) {
      console.error("Error extracting pulse modulation data:", error);
      return null;
    }
  }

  applyDataToUI(presetName, pulseModUI) {
    // Special case for "None" - just clear all modulators
    if (presetName === "None") {
      // Try to clear modulators
      try {
        if (Array.isArray(pulseModUI.modulatorControllers)) {
          // Clone array to avoid issues during iteration
          const controllers = [...pulseModUI.modulatorControllers];
          controllers.forEach((controller) => {
            if (typeof pulseModUI.removeModulator === "function") {
              pulseModUI.removeModulator(controller);
            }
          });
        }

        // Update UI
        if (typeof pulseModUI.update === "function") {
          pulseModUI.update();
        }

        this.selectedPreset = "None";
        return true;
      } catch (error) {
        console.error("Error clearing modulators for None preset:", error);
        return false;
      }
    }

    // Regular preset handling for non-"None" presets
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return false;
    }

    try {
      // First, try our new direct method if it exists
      if (typeof pulseModUI.loadPresetData === "function") {
        const result = pulseModUI.loadPresetData(preset);
        if (result) {
          this.selectedPreset = presetName;
          return true;
        }
      }

      // Fall back to manual implementation if direct method isn't available or fails
      console.warn(
        "PulseModulationUi.loadPresetData failed, using manual approach"
      );

      // First step: Clear existing modulators
      if (Array.isArray(pulseModUI.modulatorControllers)) {
        // Clone array to avoid issues when removing during iteration
        const controllers = [...pulseModUI.modulatorControllers];
        controllers.forEach((controller) => {
          if (typeof pulseModUI.removeModulator === "function") {
            pulseModUI.removeModulator(controller);
          }
        });
      }

      // Create new modulators using the correct method
      if (
        preset.modulators &&
        Array.isArray(preset.modulators) &&
        typeof pulseModUI.addPulseModulator === "function"
      ) {
        preset.modulators.forEach((modData) => {
          const mod = pulseModUI.addPulseModulator();

          if (!mod) {
            console.warn("Failed to create modulator");
            return;
          }

          // Apply modulator properties
          if (modData.targetName && typeof mod.setTarget === "function") {
            mod.setTarget(modData.targetName);
          }

          if (modData.type && typeof mod.setWaveType === "function") {
            mod.setWaveType(modData.type);
          }

          // Apply basic properties
          mod.frequency = modData.frequency || 0.5;
          mod.amplitude = modData.amplitude || 0.5;
          mod.phase = modData.phase || 0;
          mod.bias = modData.bias || 0.5;
          mod.min = modData.min || 0;
          mod.max = modData.max || 1;
          mod.enabled = !!modData.enabled;
        });
      } else {
        console.error(
          "Cannot create modulators - addPulseModulator method not found"
        );
        return false;
      }

      // Update UI using the correct method
      if (typeof pulseModUI.update === "function") {
        pulseModUI.update();
      }

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying pulse preset ${presetName}:`, error);
      return false;
    }
  }

  // API compatibility methods
  savePulsePreset(presetName, pulseModUI) {
    const data = this.extractDataFromUI(pulseModUI);
    if (!data) return false;
    return this.savePreset(presetName, data, this.protectedPresets);
  }

  loadPulsePreset(presetName, pulseModUI) {
    return this.applyDataToUI(presetName, pulseModUI);
  }

  deletePulsePreset(presetName) {
    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
