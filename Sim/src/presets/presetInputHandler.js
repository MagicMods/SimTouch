import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetInputHandler extends PresetBaseHandler {
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
  }

  /**
   * Extract data from input modulation UI
   * @param {Object} inputUi - Input modulation UI component
   * @returns {Object|null} Extracted data or null if failed
   */
  extractDataFromUI(inputUi) {
    // TEMPORARY DEBUG CHECK - REMOVE IN PRODUCTION
    if (typeof inputUi !== "object") {
      console.error(`Error in extractDataFromUI: inputUi is ${typeof inputUi}`);
      return null;
    }

    try {
      console.log(
        "Extracting mic preset data from",
        inputUi.constructor?.name || typeof inputUi
      );

      // Use getModulatorsData if available - this is the most reliable method
      if (typeof inputUi.getModulatorsData === "function") {
        const data = inputUi.getModulatorsData();
        console.log("Extracted data using getModulatorsData:", data);
        return data;
      }

      // Check if the modulatorManager is available directly
      if (inputUi.modulatorManager) {
        console.log("Getting data directly from modulatorManager");

        // Get all mic input modulators
        const modulators = inputUi.modulatorManager.modulators
          .filter((m) => m.type === "input" && m.inputSource === "mic")
          .map((mod) => ({
            type: "input",
            inputSource: "mic",
            enabled: mod.enabled,
            frequencyBand: mod.frequencyBand || "none",
            sensitivity: mod.sensitivity || 0,
            smoothing: mod.smoothing || 0.7,
            min: mod.min || 0,
            max: mod.max || 1,
            targetName: mod.targetName || "None",
          }));

        const data = {
          enabled: inputUi.audioInputEnabled || false,
          sensitivity:
            inputUi.main?.externalInput?.micForces?.sensitivity || 1.0,
          modulators,
        };

        console.log(
          `Extracted ${modulators.length} modulators from manager:`,
          data
        );
        return data;
      }

      // Create basic structure as fallback
      return {
        enabled: false,
        sensitivity: 1.0,
        modulators: [],
      };
    } catch (error) {
      console.error("Error extracting mic preset data:", error);
      return {
        enabled: false,
        sensitivity: 1.0,
        modulators: [],
      };
    }
  }

  /**
   * Apply preset data to input modulation UI
   * @param {string} presetName - Name of preset to apply
   * @param {Object} inputUi - Input modulation UI component
   * @returns {boolean} Success status
   */
  applyDataToUI(presetName, inputUi) {
    if (this.debug) console.log(`Applying mic preset: ${presetName}`);

    if (!inputUi) {
      console.warn("Input UI not provided to applyDataToUI");
      return false;
    }

    // Special case for None preset
    if (presetName === "None" || !this.presets[presetName]) {
      console.log(
        "Clearing all input modulators (None preset or invalid preset name)"
      );

      if (typeof inputUi.clearAllModulators === "function") {
        inputUi.clearAllModulators();
      }

      if (typeof inputUi.setAudioInputEnabled === "function") {
        inputUi.setAudioInputEnabled(false);
      }

      return true;
    }

    try {
      const presetData = this.presets[presetName];

      // Log what data structure we're getting
      console.log(`Loading mic preset: ${presetName}`, presetData);

      // Handle both old format (with micSettings) and new format (direct properties)
      // New format
      if (
        presetData.hasOwnProperty("enabled") ||
        presetData.hasOwnProperty("modulators")
      ) {
        console.log(`Loading preset data in new format: ${presetName}`);
        return inputUi.loadPresetData(presetData);
      }
      // Old format with micSettings property
      else if (presetData.micSettings) {
        console.log(`Loading preset data in old format: ${presetName}`);
        return inputUi.loadPresetData(presetData.micSettings);
      }
      // Invalid format
      else {
        console.warn(`Invalid preset or missing settings: ${presetName}`);
        return false;
      }
    } catch (error) {
      console.error("Error applying mic preset data:", error);
      return false;
    }
  }

  /**
   * Save an input modulation preset
   * @param {string} presetName - Name to save preset as
   * @param {Object} inputUi - Input modulation UI component
   * @returns {boolean} Success status
   */
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

      console.log(`Saving mic preset: ${presetName}`, data);

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
