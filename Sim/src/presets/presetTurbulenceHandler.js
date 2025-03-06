import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetTurbulenceHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { turb: { controllers: [{ property: "strength", value: 0 }] } },
    };
    super("savedTurbPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
    this.debug = false; // Set to true for debugging
  }

  /**
   * Extract turbulence settings from UI folder
   * @param {Object} turbFolder - The dat.GUI folder containing turbulence controls
   * @returns {Object|null} Extracted settings or null if failed
   */
  extractDataFromUI(turbFolder) {
    if (!turbFolder) {
      console.warn("No turbulence folder provided");
      return null;
    }

    try {
      if (this.debug) {
        console.log(
          "Extracting turbulence data from folder:",
          turbFolder._title || "Unnamed folder"
        );
      }

      // Extract the full state from the folder
      const fullState = turbFolder.save();

      // Optional: Filter or transform extracted data here if needed

      return { turb: fullState };
    } catch (error) {
      console.error("Error extracting turbulence data:", error);
      return null;
    }
  }

  /**
   * Apply turbulence settings to the UI folder
   * @param {string} presetName - Name of the preset to apply
   * @param {Object} turbFolder - The dat.GUI folder to apply settings to
   * @returns {boolean} Success/failure
   */
  applyDataToUI(presetName, turbFolder) {
    if (!turbFolder) {
      console.warn("No turbulence folder provided");
      return false;
    }

    // Special handling for "None" preset
    if (presetName === "None") {
      try {
        // For None preset, just set strength to 0
        const controllers = turbFolder.controllers || [];
        for (const controller of controllers) {
          if (controller.property === "strength") {
            controller.setValue(0);
            break;
          }
        }

        this.selectedPreset = "None";
        return true;
      } catch (error) {
        console.error("Error applying 'None' turbulence preset:", error);
        return false;
      }
    }

    // Regular preset handling
    const preset = this.presets[presetName];
    if (!preset || !preset.turb) {
      console.warn(`Invalid turbulence preset: ${presetName}`);
      return false;
    }

    try {
      if (this.debug) {
        console.log("Applying turbulence preset:", presetName);
      }

      // Load settings to the folder
      turbFolder.load(preset.turb);

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying turbulence preset ${presetName}:`, error);
      return false;
    }
  }

  /**
   * Save a turbulence preset
   * @param {string} presetName - Name to save the preset as
   * @param {Object} turbFolder - The dat.GUI folder to save from
   * @returns {boolean} Success/failure
   */
  saveTurbPreset(presetName, turbFolder) {
    if (this.debug) {
      console.log(`Saving turbulence preset: ${presetName}`);
    }

    const data = this.extractDataFromUI(turbFolder);
    if (!data) return false;

    return this.savePreset(presetName, data, this.protectedPresets);
  }

  /**
   * Load a turbulence preset
   * @param {string} presetName - Name of preset to load
   * @param {Object} turbFolder - The dat.GUI folder to load into
   * @returns {boolean} Success/failure
   */
  loadTurbPreset(presetName, turbFolder) {
    if (this.debug) {
      console.log(`Loading turbulence preset: ${presetName}`);
    }

    return this.applyDataToUI(presetName, turbFolder);
  }

  /**
   * Delete a turbulence preset
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success/failure
   */
  deleteTurbPreset(presetName) {
    if (this.debug) {
      console.log(`Deleting turbulence preset: ${presetName}`);
    }

    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Whether to enable debugging
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}
