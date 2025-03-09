import { PresetMasterHandler } from "./presetMasterHandler.js";
import { PresetTurbulenceHandler } from "./presetTurbulenceHandler.js";
import { PresetVoronoiHandler } from "./presetVoronoiHandler.js";
import { PresetPulseHandler } from "./presetPulseHandler.js";
import { PresetMicHandler } from "./presetMicHandler.js";

class PresetManager {
  static TYPES = {
    MASTER: "master",
    TURBULENCE: "turb",
    VORONOI: "voronoi",
    PULSE: "pulse",
    MIC: "mic",
  };

  constructor(leftGui, rightGui, pulseModUi, inputUi) {
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputUi = inputUi;

    this.handlers = {
      [PresetManager.TYPES.MASTER]: new PresetMasterHandler(
        leftGui,
        rightGui,
        pulseModUi,
        inputUi
      ),
      [PresetManager.TYPES.TURBULENCE]: new PresetTurbulenceHandler(),
      [PresetManager.TYPES.VORONOI]: new PresetVoronoiHandler(),
      [PresetManager.TYPES.PULSE]: new PresetPulseHandler(),
      [PresetManager.TYPES.MIC]: new PresetMicHandler(),
    };
  }

  getHandler(type) {
    return this.handlers[type] || null;
  }

  getUIComponent(type) {
    switch (type) {
      case PresetManager.TYPES.MASTER:
        return this.leftGui;
      case PresetManager.TYPES.TURBULENCE:
        return this.rightGui;
      case PresetManager.TYPES.VORONOI:
        return this.rightGui;
      case PresetManager.TYPES.PULSE:
        return this.pulseModUi;
      case PresetManager.TYPES.MIC:
        return this.inputUi;
      default:
        return null;
    }
  }

  setDebug(enabled) {
    Object.values(this.handlers).forEach((handler) => {
      if (typeof handler.setDebug === "function") {
        handler.setDebug(enabled);
      }
    });
  }

  setVoronoiField(field) {
    const handler = this.getHandler(PresetManager.TYPES.VORONOI);
    if (handler && typeof handler.setVoronoiField === "function") {
      handler.setVoronoiField(field);
    }
  }

  getPresetOptions(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getPresetOptions() : [];
  }

  savePreset(type, presetName, uiComponent = null) {
    const handler = this.getHandler(type);
    if (!handler) return false;

    const component = uiComponent || this.getUIComponent(type);

    if (type === PresetManager.TYPES.MASTER) {
      return handler.savePreset(presetName);
    } else {
      return handler.savePreset(presetName, component);
    }
  }

  deletePreset(type, presetName) {
    const handler = this.getHandler(type);
    return handler ? handler.deletePreset(presetName) : false;
  }

  loadPreset(type, presetName, uiComponent = null) {
    const handler = this.getHandler(type);
    if (!handler) return false;

    const component = uiComponent || this.getUIComponent(type);

    if (type === PresetManager.TYPES.MASTER) {
      return handler.applyDataToUI(presetName);
    } else {
      return handler.applyDataToUI(presetName, component);
    }
  }

  getSelectedPreset(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getSelectedPreset() : null;
  }

  exportPresets() {
    try {
      const masterHandler = this.getHandler(PresetManager.TYPES.MASTER);
      if (!masterHandler) {
        console.error("Master preset handler not found");
        return false;
      }

      const presets = masterHandler.presets;
      if (!presets || Object.keys(presets).length === 0) {
        console.warn("No presets to export");
        return false;
      }

      const dataStr = JSON.stringify(presets, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileName =
        "svibe_presets_" + new Date().toISOString().slice(0, 10) + ".json";

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileName);
      linkElement.style.display = "none";
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      console.log(`Exported ${Object.keys(presets).length} presets`);
      return true;
    } catch (error) {
      console.error("Error exporting presets:", error);
      return false;
    }
  }

  importPresets(jsonData) {
    try {
      let importedPresets;
      try {
        importedPresets = JSON.parse(jsonData);
      } catch (e) {
        console.error("Failed to parse imported JSON:", e);
        return 0;
      }

      if (!importedPresets || typeof importedPresets !== "object") {
        console.error("Invalid imported preset format");
        return 0;
      }

      const masterHandler = this.getHandler(PresetManager.TYPES.MASTER);
      if (!masterHandler) {
        console.error("Master preset handler not found");
        return 0;
      }

      let importCount = 0;

      for (const presetName in importedPresets) {
        if (masterHandler.protectedPresets.includes(presetName)) {
          console.log(`Skipping protected preset: ${presetName}`);
          continue;
        }

        if (
          masterHandler.importPreset(presetName, importedPresets[presetName])
        ) {
          importCount++;
        }
      }

      console.log(`Successfully imported ${importCount} presets`);
      return importCount;
    } catch (error) {
      console.error("Error importing presets:", error);
      return 0;
    }
  }
}

export { PresetManager };
