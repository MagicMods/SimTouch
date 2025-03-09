import { PresetMasterHandler } from "./presetMasterHandler.js";
import { PresetTurbulenceHandler } from "./presetTurbulenceHandler.js";
import { PresetVoronoiHandler } from "./presetVoronoiHandler.js";
import { PresetPulseHandler } from "./presetPulseHandler.js";
import { PresetMicHandler } from "./presetMicHandler.js";

class PresetManager {
  // Define preset types as constants
  static TYPES = {
    MASTER: "master",
    TURBULENCE: "turb",
    VORONOI: "voronoi",
    PULSE: "pulse",
    MIC: "mic",
  };

  constructor(leftGui, rightGui, pulseModUi, inputUi) {
    // Store references to UI components
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputUi = inputUi;

    // Initialize handlers (no need for require since we're importing at the top)
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

  // Helper method to get the appropriate handler for a preset type
  getHandler(type) {
    return this.handlers[type] || null;
  }

  // Helper method to get the appropriate UI component for a preset type
  getUIComponent(type) {
    switch (type) {
      case PresetManager.TYPES.MASTER:
        return this.leftGui; // Just a placeholder, master handles all UIs
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

  // Set debug mode across all handlers
  setDebug(enabled) {
    Object.values(this.handlers).forEach((handler) => {
      if (typeof handler.setDebug === "function") {
        handler.setDebug(enabled);
      }
    });
  }

  // Set voronoi field reference (specific to voronoi handler)
  setVoronoiField(field) {
    const handler = this.getHandler(PresetManager.TYPES.VORONOI);
    if (handler && typeof handler.setVoronoiField === "function") {
      handler.setVoronoiField(field);
    }
  }

  // Get preset options for a specific type
  getPresetOptions(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getPresetOptions() : [];
  }

  // Save preset of a specific type
  savePreset(type, presetName, uiComponent = null) {
    const handler = this.getHandler(type);
    if (!handler) return false;

    // Use provided UI component or get default for this type
    const component = uiComponent || this.getUIComponent(type);

    if (type === PresetManager.TYPES.MASTER) {
      return handler.savePreset(presetName);
    } else {
      return handler.savePreset(presetName, component);
    }
  }

  // Delete preset of a specific type
  deletePreset(type, presetName) {
    const handler = this.getHandler(type);
    return handler ? handler.deletePreset(presetName) : false;
  }

  // Load preset of a specific type
  loadPreset(type, presetName, uiComponent = null) {
    const handler = this.getHandler(type);
    if (!handler) return false;

    // Use provided UI component or get default for this type
    const component = uiComponent || this.getUIComponent(type);

    if (type === PresetManager.TYPES.MASTER) {
      return handler.applyDataToUI(presetName);
    } else {
      return handler.applyDataToUI(presetName, component);
    }
  }

  // Get selected preset for a specific type
  getSelectedPreset(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getSelectedPreset() : null;
  }

  // Add these methods to the PresetManager class

  exportPresets() {
    try {
      // Get the Master handler since that's what we're exporting
      const masterHandler = this.getHandler(PresetManager.TYPES.MASTER);
      if (!masterHandler) {
        console.error("Master preset handler not found");
        return false;
      }

      // Export all presets
      const presets = masterHandler.presets;
      if (!presets || Object.keys(presets).length === 0) {
        console.warn("No presets to export");
        return false;
      }

      // Create a download link for the exported presets
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
      // Parse the imported data
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

      // Get the Master handler
      const masterHandler = this.getHandler(PresetManager.TYPES.MASTER);
      if (!masterHandler) {
        console.error("Master preset handler not found");
        return 0;
      }

      // Count imported presets
      let importCount = 0;

      // Import each preset
      for (const presetName in importedPresets) {
        // Skip the default preset if it exists in imported data
        if (masterHandler.protectedPresets.includes(presetName)) {
          console.log(`Skipping protected preset: ${presetName}`);
          continue;
        }

        // Use our sanitize-enabled import method
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
