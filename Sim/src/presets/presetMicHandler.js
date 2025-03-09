import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMicHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: {
        micSettings: {
          enabled: false,
          sensitivity: 1.0,
          modulators: [],
        },
      },
    };
    super("savedMicPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
    this.debug = false;
  }

  // Standard extractDataFromUI
  extractDataFromUI(inputUi) {
    if (!inputUi) return null;

    try {
      if (this.debug) console.log("Extracting mic data from UI");

      // Get modulators data from UI directly
      const modulatorData = inputUi.getModulatorsData();
      const micEnabled = inputUi.isMicEnabled ? inputUi.isMicEnabled() : false;
      const sensitivity = inputUi.micSensitivity || 1.0;

      // Create a clean, serializable preset structure
      return {
        micSettings: {
          enabled: micEnabled,
          sensitivity: sensitivity,
          modulators: modulatorData || [],
        },
      };
    } catch (error) {
      console.error("Error extracting mic data:", error);
      return null;
    }
  }

  // Standard applyDataToUI
  applyDataToUI(presetName, inputUi) {
    if (this.debug) console.log(`Applying mic preset: ${presetName}`);

    if (!inputUi) {
      console.warn("No input UI component provided for loading");
      return false;
    }

    const preset = this.presets[presetName];
    if (!preset || !preset.micSettings) {
      console.warn(`Invalid preset or missing mic settings: ${presetName}`);
      return false;
    }

    try {
      // Clear existing modulators first
      if (typeof inputUi.clearAllModulators === "function") {
        inputUi.clearAllModulators();
      }

      // Enable/disable mic input based on preset
      if (typeof inputUi.enableDisableAudioInput === "function") {
        inputUi.enableDisableAudioInput(preset.micSettings.enabled);
      }

      // Set sensitivity if available
      if (
        preset.micSettings.sensitivity !== undefined &&
        typeof inputUi.setMicSensitivity === "function"
      ) {
        inputUi.setMicSensitivity(preset.micSettings.sensitivity);
      }

      // Load modulators from preset
      if (
        preset.micSettings.modulators &&
        preset.micSettings.modulators.length > 0 &&
        typeof inputUi.loadPresetData === "function"
      ) {
        inputUi.loadPresetData(preset);
      }

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error("Error applying mic preset:", error);
      return false;
    }
  }

  // Standard savePreset method
  savePreset(presetName, inputUi) {
    if (this.debug) console.log(`Saving mic preset: ${presetName}`);

    const data = this.extractDataFromUI(inputUi);
    if (!data) return false;

    return super.savePreset(presetName, data, this.protectedPresets);
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
