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
  }

  extractDataFromUI(voronoiFolder) {
    try {
      const fullState = voronoiFolder.save();
      return { voronoi: fullState };
    } catch (error) {
      console.error("Error extracting voronoi data:", error);
      return null;
    }
  }

  applyDataToUI(presetName, voronoiFolder) {
    const preset = this.presets[presetName];
    if (!preset || !preset.voronoi) {
      console.warn(`Invalid voronoi preset: ${presetName}`);
      return false;
    }

    try {
      voronoiFolder.load(preset.voronoi);
      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying voronoi preset ${presetName}:`, error);
      return false;
    }
  }

  // API compatibility methods
  saveVoronoiPreset(presetName, voronoiFolder) {
    const data = this.extractDataFromUI(voronoiFolder);
    if (!data) return false;
    return this.savePreset(presetName, data, this.protectedPresets);
  }

  loadVoronoiPreset(presetName, voronoiFolder) {
    return this.applyDataToUI(presetName, voronoiFolder);
  }

  deleteVoronoiPreset(presetName) {
    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
