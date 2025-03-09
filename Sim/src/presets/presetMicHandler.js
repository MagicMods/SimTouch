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

  // Fix the extractDataFromUI method to properly get modulator data
  extractDataFromUI(inputUi) {
    if (!inputUi) return null;

    try {
      // Get modulators data from UI directly
      const modulatorData = inputUi.getModulatorsData();

      // Create a clean, serializable preset structure
      const cleanPreset = {
        micSettings: {
          enabled: true,
          modulators: modulatorData.modulators.map((mod) => ({
            // Only include primitive values that can be safely serialized
            type: "input",
            inputSource: mod.inputSource || "mic",
            enabled: mod.sensitivity > 0,
            targetName: mod.targetName || "None",
            frequencyBand: mod.frequencyBand || "none",
            sensitivity: Number(mod.sensitivity) || 0,
            smoothing: Number(mod.smoothing) || 0.7,
            min: Number(mod.min) || 0,
            max: Number(mod.max) || 1,
          })),
        },
      };

      console.log("Clean preset data for saving:", cleanPreset);
      return cleanPreset;
    } catch (error) {
      console.error("Error extracting input modulation data:", error);
      return { micSettings: { enabled: true, modulators: [] } };
    }
  }

  // Fix the applyDataToUI method to handle mic loading correctly
  applyDataToUI(presetName, inputUi) {
    const preset = this.presets[presetName];
    if (!preset) return false;

    try {
      console.log(`Applying mic preset: ${presetName}`);
      console.log(`Mic preset data:`, JSON.stringify(preset));

      // Handle different preset formats gracefully
      let modulators = [];

      // Format 1: Direct modulators array (new format)
      if (Array.isArray(preset.modulators)) {
        modulators = preset.modulators;
      }
      // Format 2: Nested in micSettings (old format)
      else if (
        preset.micSettings &&
        Array.isArray(preset.micSettings.modulators)
      ) {
        modulators = preset.micSettings.modulators;
      }
      // Fallback: Empty preset
      else {
        console.warn(`Unknown preset format in ${presetName}`);
        return false;
      }

      // Create normalized preset format for loading
      const normalizedPreset = { modulators };

      // Load the normalized preset data
      return inputUi.loadPresetData(normalizedPreset);
    } catch (error) {
      console.error(`Error applying mic preset ${presetName}:`, error);
      return false;
    }
  }

  deleteMicPreset(presetName) {
    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
