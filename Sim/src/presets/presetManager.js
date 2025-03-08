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

    this._migrateExistingPresets();
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

  // Migrate existing presets if needed
  _migrateExistingPresets() {
    // Migration logic would go here if needed
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
}

export { PresetManager };
