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

  extractDataFromUI(pulseModUi) {
    if (!pulseModUi) {
      console.warn("PulseModulation UI not provided to extractDataFromUI");
      return null;
    }
    return pulseModUi.getModulatorsData();
  }

  applyDataToUI(presetName, pulseModUi) {
    if (this.debug) console.log(`Applying pulse preset: ${presetName}`);

    if (!pulseModUi) {
      console.warn("PulseModulation UI not provided to applyDataToUI");
      return false;
    }

    // Special case for None preset
    if (presetName === "None" || !this.presets[presetName]) {
      console.log(
        "Clearing all pulse modulators (None preset or invalid preset name)"
      );
      pulseModUi.clearAllModulators();
      return true;
    }

    const presetData = this.presets[presetName];
    if (!presetData || !presetData.modulators) {
      console.warn(`Invalid preset data for ${presetName}`);
      return false;
    }

    try {
      console.log(
        `Loading pulse preset: ${presetName} with ${presetData.modulators.length} modulators`
      );

      // Use loadPresetData() which is already implemented in PulseModulationUi
      return pulseModUi.loadPresetData(presetData);
    } catch (error) {
      console.error("Error applying pulse preset data:", error);
      return false;
    }
  }

  savePreset(presetName, pulseModUi) {
    if (!pulseModUi) {
      console.warn("PulseModulation UI not provided to savePreset");
      return false;
    }

    try {
      // Extract the data first
      const data = this.extractDataFromUI(pulseModUi);
      if (!data) {
        console.warn("Failed to extract pulse modulation data");
        return false;
      }

      // Save directly without calling extractDataFromUI again
      if (this.protectedPresets.includes(presetName)) {
        console.warn(`Cannot overwrite protected preset: ${presetName}`);
        return false;
      }

      console.log(`Saving pulse preset: ${presetName}`, data);

      // Store the preset data
      this.presets[presetName] = data;

      this.saveToStorage();

      this.selectedPreset = presetName;

      return true;
    } catch (error) {
      console.error("Error saving pulse preset:", error);
      return false;
    }
  }
}
