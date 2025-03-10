import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetVoronoiHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { voronoi: { controllers: [{ property: "strength", value: 0 }] } },
    };
    super("savedVoronoiPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
    this.voronoiField = null;
  }

  /**
   * Extract voronoi data from UI folder
   * @param {Object} voronoiFolder - dat.GUI folder for voronoi controls
   * @returns {Object|null} Extracted data or null if failed
   */
  extractDataFromUI(voronoiFolder) {
    if (!voronoiFolder) {
      console.warn("No voronoi folder provided");
      return null;
    }

    try {
      if (this.debug) console.log("Extracting voronoi data from UI");

      // Extract the full state from the folder
      const fullState = voronoiFolder.save();
      return { voronoi: fullState };
    } catch (error) {
      console.error("Error extracting voronoi data:", error);
      return null;
    }
  }

  /**
   * Apply voronoi preset data to UI
   * @param {string} presetName - Name of preset to apply
   * @param {Object} voronoiFolder - dat.GUI folder for voronoi controls
   * @returns {boolean} Success status
   */
  applyDataToUI(presetName, voronoiFolder) {
    if (this.debug) console.log(`Applying voronoi preset: ${presetName}`);

    if (!voronoiFolder) {
      console.warn("No voronoi folder provided for loading");
      return false;
    }

    // Handle None preset specially
    if (presetName === "None") {
      if (this.debug) console.log("Applying Voronoi None preset");
      const strengthController = this._findController(
        voronoiFolder,
        "strength"
      );
      if (strengthController) {
        strengthController.setValue(0);
      }
      this.selectedPreset = presetName;
      return true;
    }

    // Regular preset handling
    const preset = this.presets[presetName];
    if (!preset || !preset.voronoi) {
      console.warn(`Invalid preset or missing voronoi data: ${presetName}`);
      return false;
    }

    try {
      voronoiFolder.load(preset.voronoi);
      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error("Error applying voronoi preset:", error);
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
   * Save a voronoi preset
   * @param {string} presetName - Name to save preset as
   * @param {Object} voronoiFolder - dat.GUI folder for voronoi controls
   * @returns {boolean} Success status
   */
  savePreset(presetName, voronoiFolder) {
    if (this.debug) console.log(`Saving voronoi preset: ${presetName}`);

    const data = this.extractDataFromUI(voronoiFolder);
    if (!data) return false;

    return super.savePreset(presetName, data, this.protectedPresets);
  }

  /**
   * Standard method for deleting
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success status
   */
  deletePreset(presetName) {
    if (this.debug) console.log(`Deleting voronoi preset: ${presetName}`);

    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }

  /**
   * Set the debug mode
   * @param {boolean} enabled - Enable or disable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Set the voronoi field reference
   * @param {Object} voronoiField - Voronoi field object
   */
  setVoronoiField(voronoiField) {
    this.voronoiField = voronoiField;
  }
}
