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
  }

  extractDataFromUI(inputUi) {
    if (!inputUi || !inputUi.modulatorManager) {
      console.warn("No input UI or modulator manager provided");
      return null;
    }

    try {
      // Collect all mic-related modulators
      const modulators = inputUi.modulatorManager.modulators
        .filter((mod) => mod.inputSource === "mic")
        .map((mod) => ({
          enabled: mod.enabled,
          targetName: mod.targetName,
          inputSource: mod.inputSource,
          frequencyBand: mod.frequencyBand,
          sensitivity: mod.sensitivity,
          smoothing: mod.smoothing,
          min: mod.min,
          max: mod.max,
        }));

      return {
        micSettings: {
          enabled: inputUi.main?.externalInput?.micForces?.isEnabled() || false,
          sensitivity:
            inputUi.main?.externalInput?.micForces?.sensitivity || 1.0,
          modulators,
        },
      };
    } catch (error) {
      console.error("Error extracting mic input data:", error);
      return null;
    }
  }

  applyDataToUI(presetName, inputUi) {
    const preset = this.presets[presetName];
    if (!preset || !preset.micSettings) {
      console.warn(`Invalid mic preset: ${presetName}`);
      return false;
    }

    try {
      const settings = preset.micSettings;

      // First clear all mic-related modulators
      inputUi.clearMicModulators();

      // Apply mic forces settings
      if (inputUi.main?.externalInput?.micForces) {
        if (settings.enabled) {
          inputUi.main.externalInput.micForces.enable();
        } else {
          inputUi.main.externalInput.micForces.disable();
        }

        if (settings.sensitivity) {
          inputUi.main.externalInput.micForces.setSensitivity(
            settings.sensitivity
          );
        }
      }

      // Create modulators from preset
      if (settings.modulators && Array.isArray(settings.modulators)) {
        settings.modulators.forEach((modData) => {
          const mod = inputUi.addInputModulator();

          // Apply properties
          if (modData.targetName) mod.setTarget(modData.targetName);
          mod.setInputSource("mic");
          if (modData.frequencyBand)
            mod.setFrequencyBand(modData.frequencyBand);
          mod.sensitivity = modData.sensitivity || 1.0;
          mod.smoothing = modData.smoothing || 0.7;
          mod.min = modData.min || 0;
          mod.max = modData.max || 1;
          mod.enabled = !!modData.enabled;
        });
      }

      // Update UI
      inputUi.updateUI();

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying mic preset ${presetName}:`, error);
      return false;
    }
  }

  // API compatibility methods
  saveMicPreset(presetName, inputUi) {
    const data = this.extractDataFromUI(inputUi);
    if (!data) return false;
    return this.savePreset(presetName, data, this.protectedPresets);
  }

  loadMicPreset(presetName, inputUi) {
    return this.applyDataToUI(presetName, inputUi);
  }

  deleteMicPreset(presetName) {
    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
