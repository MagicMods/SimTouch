import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetVoronoiHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { voronoi: { controllers: [{ property: "strength", value: 0 }] } },
      Default: {
        voronoi: {
          controllers: [
            { property: "strength", value: 1.0 },
            { property: "edgeWidth", value: 10 },
            { property: "attractionFactor", value: 1.0 },
            { property: "cellCount", value: 10 },
            { property: "cellMovementSpeed", value: 0.2 },
            { property: "decayRate", value: 0.99 },
            { property: "affectPosition", value: true },
            { property: "affectScale", value: true },
            { property: "minScale", value: 0.4 },
            { property: "maxScale", value: 1.5 },
          ],
        },
      },
    };
    super("savedVoronoiPresets", defaultPresets);

    this.protectedPresets = ["None", "Default"];
    this.defaultPreset = "None";
    this.debug = false; // Enable for debugging
  }

  extractDataFromUI(voronoiFolder) {
    if (!voronoiFolder) {
      console.warn("No voronoi folder provided for data extraction");
      return null;
    }

    try {
      if (this.debug) console.log("Extracting voronoi data from folder");

      const fullState = voronoiFolder.save();

      if (this.debug) {
        console.log(
          "Extracted voronoi state:",
          JSON.stringify(fullState).substring(0, 100) + "..."
        );
      }

      return { voronoi: fullState };
    } catch (error) {
      console.error("Error extracting voronoi data:", error);
      return null;
    }
  }

  applyDataToUI(presetName, voronoiFolder) {
    console.log(`Applying voronoi preset: ${presetName}`);

    if (!voronoiFolder) {
      console.warn("No voronoi folder provided for applying preset");
      return false;
    }

    const preset = this.presets[presetName];
    if (!preset || !preset.voronoi) {
      console.warn(`Invalid voronoi preset: ${presetName}`);
      return false;
    }

    try {
      // For None preset, just set strength to 0
      if (presetName === "None") {
        const strengthController = this._findController(
          voronoiFolder,
          "strength"
        );
        if (strengthController) {
          console.log("Setting Voronoi strength to 0 for None preset");
          strengthController.setValue(0);
          this.selectedPreset = presetName;
          return true;
        } else {
          console.warn("Could not find strength controller in Voronoi folder");
        }
      }

      // Apply the full preset
      console.log("Loading voronoi settings from preset");
      voronoiFolder.load(preset.voronoi);

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying voronoi preset ${presetName}:`, error);
      return false;
    }
  }

  _findController(folder, propertyName) {
    if (!folder || !folder.controllers) return null;

    return folder.controllers.find((ctrl) => ctrl.property === propertyName);
  }

  // API compatibility methods
  saveVoronoiPreset(presetName, voronoiFolder) {
    console.log(`Saving voronoi preset: ${presetName}`);

    const data = this.extractDataFromUI(voronoiFolder);
    if (!data) {
      console.error("Failed to extract voronoi data");
      return false;
    }

    const result = this.savePreset(presetName, data, this.protectedPresets);
    console.log(`Voronoi preset save result: ${result}`);

    return result;
  }

  loadVoronoiPreset(presetName, voronoiFolder) {
    console.log(`Loading voronoi preset: ${presetName}`);
    return this.applyDataToUI(presetName, voronoiFolder);
  }

  deleteVoronoiPreset(presetName) {
    console.log(`Deleting voronoi preset: ${presetName}`);
    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }

  /**
   * Enable/disable debug logging
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Set direct reference to the voronoi field
   * @param {Object} voronoiField - The voronoi field object
   */
  setVoronoiField(voronoiField) {
    this.voronoiField = voronoiField;
    console.log("PresetVoronoiHandler: VoronoiField reference set");
  }
}
