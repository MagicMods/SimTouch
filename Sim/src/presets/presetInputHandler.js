import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetInputHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: {
        modulators: [],
      },
    };
    super("savedMicPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
  }

  extractDataFromUI(inputUi) {
    if (!inputUi) {
      console.warn("InputModulation UI not provided to extractDataFromUI");
      return null;
    }
    return inputUi.getModulatorsData();
  }

  applyDataToUI(presetName, inputUi) {
    if (this.debug) console.log(`Applying pulse preset: ${presetName}`);

    if (!inputUi) {
      console.warn("InputModulation UI not provided to applyDataToUI");
      return false;
    }

    // Special case for None preset
    if (presetName === "None" || !this.presets[presetName]) {
      console.log(
        "Clearing all pulse modulators (None preset or invalid preset name)"
      );
      inputUi.clearAllModulators();
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
      return inputUi.loadPresetData(presetData);
    } catch (error) {
      console.error("Error applying pulse preset data:", error);
      return false;
    }
  }

  savePreset(presetName, inputUi) {
    if (this.debug) console.log(`Saving mic preset: ${presetName}`);

    if (!inputUi) {
      console.warn("No input UI component provided for saving");
      return false;
    }

    try {
      // Extract the data first
      const data = this.extractDataFromUI(inputUi);
      if (!data) {
        console.warn("Failed to extract mic preset data");
        return false;
      }

      // Check for protected presets
      if (this.protectedPresets.includes(presetName)) {
        console.warn(`Cannot overwrite protected preset: ${presetName}`);
        return false;
      }

      console.log(`Saving Input preset: ${presetName}`, data);

      // Store the preset data
      this.presets[presetName] = data;
      this.saveToStorage(); // Not saveToLocalStorage
      this.selectedPreset = presetName;

      return true;
    } catch (error) {
      console.error("Error saving mic preset:", error);
      return false;
    }
  }

  // Standard deletePreset method
  deletePreset(presetName) {
    if (this.debug) console.log(`Deleting mic preset: ${presetName}`);

    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }

  setDebug(enabled) {
    this.debug = enabled;
  }
}
