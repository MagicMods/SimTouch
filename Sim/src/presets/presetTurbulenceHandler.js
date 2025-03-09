import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetTurbulenceHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { turb: { controllers: [{ property: "strength", value: 0 }] } },
    };
    super("savedTurbPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
    this.debug = false;
    this.turbulenceField = null;
  }

  extractDataFromUI(turbFolder) {
    if (!turbFolder) {
      console.warn("No turbulence folder provided");
      return null;
    }

    try {
      if (this.debug) console.log("Extracting turbulence data from UI");

      // Extract the full state from the folder
      const fullState = turbFolder.save();
      return { turb: fullState };
    } catch (error) {
      console.error("Error extracting turbulence data:", error);
      return null;
    }
  }

  applyDataToUI(presetName, turbFolder) {
    if (this.debug) console.log(`Applying turbulence preset: ${presetName}`);

    if (!turbFolder) {
      console.warn("No turbulence folder provided for loading");
      return false;
    }

    // Special handling for "None" preset
    if (presetName === "None") {
      console.warn("Applying Turbulence None preset");
      const strengthController = this._findController(turbFolder, "strength");
      if (strengthController) {
        strengthController.setValue(0);
      }
      return true;
    }

    // Regular preset handling
    const preset = this.presets[presetName];
    if (!preset || !preset.turb) {
      console.warn(`Invalid preset or missing turb data: ${presetName}`);
      return false;
    }

    try {
      turbFolder.load(preset.turb);
      this.selectedPreset = presetName;

      return true;
    } catch (error) {
      console.error("Error applying turbulence preset:", error);
      return false;
    }
  }

  _findController(folder, propertyName) {
    if (!folder || !folder.controllers) return null;

    for (const controller of folder.controllers) {
      if (controller.property === propertyName) {
        return controller;
      }
    }
    return null;
  }

  // Standard method for saving
  savePreset(presetName, turbFolder) {
    if (this.debug) console.log(`Saving turbulence preset: ${presetName}`);

    const data = this.extractDataFromUI(turbFolder);
    if (!data) return false;

    const result = super.savePreset(presetName, data, this.protectedPresets);
    // if (result) {
    //   this.selectedPreset = presetName; // Update selected preset after successful save
    // }
    return result;
  }

  // Standard method for deleting
  deletePreset(presetName) {
    if (this.debug) console.log(`Deleting turbulence preset: ${presetName}`);

    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }

  setDebug(enabled) {
    this.debug = enabled;
  }

  setTurbulenceField(turbulenceField) {
    this.turbulenceField = turbulenceField;
  }
}
