import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetTurbulenceHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { turb: { controllers: [{ property: "strength", value: 0 }] } },
    };
    super("savedTurbPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
    this.turbulenceField = null;
  }

  /**
   * Extract turbulence data from UI folder
   * @param {Object} turbFolder - dat.GUI folder for turbulence controls
   * @returns {Object|null} Extracted data or null if failed
   */
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

  /**
   * Apply turbulence preset data to UI
   * @param {string} presetName - Name of preset to apply
   * @param {Object} turbFolder - dat.GUI folder for turbulence controls
   * @returns {boolean} Success status
   */
  applyDataToUI(presetName, turbFolder) {
    if (this.debug) console.log(`Applying turbulence preset: ${presetName}`);

    if (!turbFolder) {
      console.warn("No turbulence folder provided for loading");
      return false;
    }

    // Special handling for "None" preset
    if (presetName === "None") {
      if (this.debug) console.log("Applying Turbulence None preset");
      const strengthController = this._findController(turbFolder, "strength");
      if (strengthController) {
        strengthController.setValue(0);
      }
      this.selectedPreset = presetName;
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

  /**
   * Find a controller by property name in a folder
   * @private
   */
  _findController(folder, propertyName) {
    if (!folder || !folder.controllers) return null;

    for (const controller of folder.controllers) {
      if (controller.property === propertyName) {
        return controller;
      }
    }
    return null;
  }

  /**
   * Save a turbulence preset
   * @param {string} presetName - Name to save preset as
   * @param {Object} turbFolder - dat.GUI folder for turbulence controls
   * @returns {boolean} Success status
   */
  savePreset(presetName, turbFolder) {
    if (this.debug) console.log(`Saving turbulence preset: ${presetName}`);

    const data = this.extractDataFromUI(turbFolder);
    if (!data) return false;

    return super.savePreset(presetName, data, this.protectedPresets);
  }

  /**
   * Standard method for deleting
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success status
   */
  deletePreset(presetName) {
    if (this.debug) console.log(`Deleting turbulence preset: ${presetName}`);

    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }

  /**
   * Set the turbulence field reference
   * @param {Object} turbulenceField - Turbulence field object
   */
  setTurbulenceField(turbulenceField) {
    this.turbulenceField = turbulenceField;
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Debug mode status
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}
