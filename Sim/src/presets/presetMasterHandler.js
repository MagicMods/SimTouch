import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMasterHandler extends PresetBaseHandler {
  constructor(leftGui, rightGui, pulseModUi, inputModUi) {
    // Create default preset without immediately calling save() which might fail
    let defaultPresets = {
      Default: {
        left: {},
        right: {},
        pulseModulation: null,
        micSettings: null,
      },
    };

    // Only try to get GUI states if the objects have save methods
    try {
      if (leftGui && typeof leftGui.save === "function") {
        defaultPresets.Default.left = leftGui.save();
      } else {
        console.warn(
          "PresetMasterHandler: leftGui missing or has no save method"
        );
      }

      if (rightGui && typeof rightGui.save === "function") {
        defaultPresets.Default.right = rightGui.save();
      } else {
        console.warn(
          "PresetMasterHandler: rightGui missing or has no save method"
        );
      }
    } catch (error) {
      console.error("Error creating default preset:", error);
    }

    super("savedPresets", defaultPresets);

    // Store references to UI components
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputModUi = inputModUi;

    this.protectedPresets = ["Default"];
    this.defaultPreset = "Default";
    this.autoPlayEnabled = false;
  }
  /**
   * Extract data from all UI components
   * @returns {Object} Combined UI data
   */
  extractDataFromUI() {
    const data = {
      left: {},
      right: {},
      pulseModulation: null,
      micSettings: null,
    };

    try {
      data.left = this.leftGui.save();

      data.right = this.rightGui.save();

      data.pulseModulation = this.pulseModUi.getModulatorsData();

      // Extract mic settings data
      if (
        this.inputModUi &&
        typeof this.inputModUi.getModulatorsData === "function"
      ) {
        data.micSettings = this.inputModUi.getModulatorsData();
      }
    } catch (error) {
      console.error("Error extracting UI data:", error);
    }

    return data;
  }

  /**
   * Apply preset data to the UI
   * @param {string} presetName - Name of the preset to apply
   * @returns {boolean} Success/failure
   */
  applyDataToUI(presetName) {
    try {
      const preset = this.presets[presetName];
      if (!preset) {
        console.error(`Preset "${presetName}" not found`);
        return false;
      }

      // Apply left and right GUI settings
      if (
        preset.left &&
        this.leftGui &&
        typeof this.leftGui.load === "function"
      ) {
        this.leftGui.load(preset.left);
      }

      if (
        preset.right &&
        this.rightGui &&
        typeof this.rightGui.load === "function"
      ) {
        this.rightGui.load(preset.right);
      }

      // Clear existing modulators before applying new ones (if the method exists)
      if (this.pulseModUi) {
        // Check if the method exists before calling it
        if (typeof this.pulseModUi.clearAllModulators === "function") {
          this.pulseModUi.clearAllModulators();
        } else if (typeof this.pulseModUi.clearModulators === "function") {
          // Try alternative method name
          this.pulseModUi.clearModulators();
        } else {
          console.warn(
            "PulseModUi doesn't have clearAllModulators or clearModulators method"
          );
        }
      }

      // Apply pulse modulation settings if they exist
      if (preset.pulseModulation && this.pulseModUi) {
        if (typeof this.pulseModUi.loadFromData === "function") {
          this.pulseModUi.loadFromData(preset.pulseModulation);
        } else if (typeof this.pulseModUi.loadModulators === "function") {
          this.pulseModUi.loadModulators(preset.pulseModulation);
        } else {
          console.warn(
            "PulseModUi doesn't have a method to load modulator data"
          );
        }
      }

      // Apply mic settings if they exist
      if (preset.micSettings && this.inputModUi) {
        if (typeof this.inputModUi.loadMicSettings === "function") {
          this.inputModUi.loadMicSettings(preset.micSettings);
        } else {
          console.warn("InputUi doesn't have loadMicSettings method");
        }
      }

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying master preset ${presetName}:`, error);
      return false;
    }
  }

  // API compatibility methods with auto-play management
  setAutoPlay(enabled) {
    this.autoPlayEnabled = enabled;

    // Update current preset to remember auto-play setting
    const currentPreset = this.selectedPreset;
    if (currentPreset && this.presets[currentPreset]) {
      this.presets[currentPreset].autoPlay = enabled;
      this.saveToStorage();
    }
  }

  isAutoPlay() {
    return this.autoPlayEnabled;
  }

  savePreset(presetName) {
    const data = this.extractDataFromUI();
    if (!data) return false;

    // If mic settings are null but the same preset name exists in mic presets, use those
    if (data.micSettings === null && this.inputModUi) {
      try {
        // First try using existing methods
        if (typeof this.inputModUi.getCurrentMicSettings === "function") {
          data.micSettings = this.inputModUi.getCurrentMicSettings();
        } else if (typeof this.inputModUi.getActiveMicSettings === "function") {
          data.micSettings = this.inputModUi.getActiveMicSettings();
        }

        // If still null AND if the input UI has access to micPresets, try to find one with matching name
        if (
          data.micSettings === null &&
          typeof this.inputModUi.getMicPresetByName === "function"
        ) {
          data.micSettings = this.inputModUi.getMicPresetByName(presetName);
        }
      } catch (error) {
        console.warn(
          `Error retrieving mic settings for preset ${presetName}:`,
          error
        );
      }
    }

    return super.savePreset(presetName, data, this.protectedPresets);
  }

  loadPreset(presetName) {
    return this.applyDataToUI(presetName);
  }

  deletePreset(presetName) {
    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
