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
    if (!pulseModUI) {
      console.warn("No pulse modulation UI provided");
      return null;
    }

    try {
      if (this.debug) console.log("Extracting pulse modulation data from UI");

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
    if (this.debug) console.log(`Applying pulse preset: ${presetName}`);

    if (!pulseModUI) {
      console.warn("No pulse modulation UI provided for loading");
      return false;
    }

    // Special case for None preset
    if (presetName === "None") {
      pulseModUI.clearAllModulators();
      this.selectedPreset = presetName;
      return true;
    }

    // Get preset data
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    // Apply data via the loadPresetData method
    try {
      const result = pulseModUI.loadPresetData(preset);
      if (result) this.selectedPreset = presetName;
      return result;
    } catch (error) {
      console.error("Error applying pulse preset:", error);
      return false;
    }
  }

  savePreset(presetName, pulseModUI) {
    if (this.debug) console.log(`Saving pulse preset: ${presetName}`);

    const data = this.extractDataFromUI(pulseModUI);
    if (!data) return false;

    return super.savePreset(presetName, data, this.protectedPresets);
  }
}
