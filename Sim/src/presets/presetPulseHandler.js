import { PresetBaseHandler } from "./presetBaseHandler.js";
import { PresetManager } from "./presetManager.js";

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
    if (!pulseModUI) return null;

    try {
      const data = pulseModUI.getModulatorsData();

      // Validate format
      if (!data || !Array.isArray(data.modulators)) {
        console.warn("Invalid data format from PulseModulationUI");
        return { modulators: [] };
      }

      return data;
    } catch (error) {
      console.error("Error extracting pulse modulation data:", error);
      return { modulators: [] };
    }
  }

  applyDataToUI(presetName, pulseModUI) {
    // Special case for None preset
    if (presetName === "None") {
      pulseModUI.clearAllModulators();
      return true;
    }

    // Get preset data
    const preset = this.presets[presetName];
    if (!preset) return false;

    // Apply data via modern API
    const result = pulseModUI.loadPresetData(preset);
    if (result) this.selectedPreset = presetName;

    return result;
  }

  // Save a preset with validation
  savePreset(presetName, data, protectedList = this.protectedPresets) {
    // Validate data before saving
    if (!data || !data.modulators) {
      console.error("Invalid data for saving preset");
      return false;
    }

    console.log(
      `Saving pulse preset: ${presetName} with ${data.modulators.length} modulators`
    );

    // Use the parent class method for actual saving
    return super.savePreset(presetName, data, protectedList);
  }

  loadPreset(presetName, ui) {
    return this.applyDataToUI(presetName, ui);
  }

  deletePreset(
    presetName,
    protectedList = this.protectedPresets,
    defaultPreset = this.defaultPreset
  ) {
    return super.deletePreset(presetName, protectedList, defaultPreset);
  }
}
