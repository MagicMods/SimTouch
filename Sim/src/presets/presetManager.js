import { PresetMasterHandler } from "./presetMasterHandler.js";
import { PresetTurbulenceHandler } from "./presetTurbulenceHandler.js";
import { PresetVoronoiHandler } from "./presetVoronoiHandler.js";
import { PresetPulseHandler } from "./presetPulseHandler.js";
import { PresetMicHandler } from "./presetMicHandler.js";

class PresetManager {
  constructor(leftGui, rightGui, pulseModUi, inputUi) {
    // Store UI references
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputUi = inputUi;

    // Create preset handlers for specialized presets
    this.masterHandler = new PresetMasterHandler(
      leftGui,
      rightGui,
      pulseModUi,
      inputUi
    );
    this.turbulenceHandler = new PresetTurbulenceHandler();
    this.voronoiHandler = new PresetVoronoiHandler();
    this.pulseHandler = new PresetPulseHandler();
    this.micHandler = new PresetMicHandler();

    // Enable for debugging
    this.enableDebugLogging = false;

    // Attempt to migrate existing presets
    this._migrateExistingPresets();
  }

  _migrateExistingPresets() {
    try {
    } catch (error) {
      console.error("Error migrating presets:", error);
    }
  }

  setDebug(enabled) {
    this.enableDebugLogging = !!enabled;
    console.log(
      `PresetManager debug logging: ${enabled ? "enabled" : "disabled"}`
    );
  }

  //#region Master Preset Methods

  loadPresetsFromStorage() {
    return this.masterHandler.loadFromStorage();
  }

  savePresetsToStorage() {
    return this.masterHandler.saveToStorage();
  }

  getPresetOptions() {
    return this.masterHandler.getPresetOptions();
  }

  savePreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Saving master preset: ${presetName}`);
    }

    const result = this.masterHandler.savePreset(presetName);

    if (result) {
      this.masterHandler.saveToStorage();
    }

    return result;
  }

  deletePreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Deleting master preset: ${presetName}`);
    }

    const result = this.masterHandler.deletePreset(presetName);

    if (result) {
      this.masterHandler.saveToStorage();
    }

    return result;
  }

  loadPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Loading master preset: ${presetName}`);
    }

    return this.masterHandler.applyDataToUI(presetName);
  }

  getSelectedPreset() {
    return this.masterHandler.getSelectedPreset();
  }

  setAutoPlay(enabled) {
    if (this.masterHandler.setAutoPlay) {
      this.masterHandler.setAutoPlay(enabled);
    }
  }

  isAutoPlay() {
    return this.masterHandler.isAutoPlay
      ? this.masterHandler.isAutoPlay()
      : false;
  }

  //#endregion

  //#region Turbulence Preset Methods

  loadTurbPresetsFromStorage() {
    return this.turbulenceHandler.loadFromStorage();
  }

  saveTurbPresetsToStorage() {
    return this.turbulenceHandler.saveToStorage();
  }

  getTurbPresetOptions() {
    return this.turbulenceHandler.getPresetOptions();
  }

  saveTurbPreset(presetName, turbFolder) {
    if (this.enableDebugLogging) {
      console.log(`Saving turbulence preset: ${presetName}`);
    }

    const result = this.turbulenceHandler.saveTurbPreset(
      presetName,
      turbFolder
    );

    if (result) {
      this.turbulenceHandler.saveToStorage();
    }

    return result;
  }

  deleteTurbPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Deleting turbulence preset: ${presetName}`);
    }

    const result = this.turbulenceHandler.deleteTurbPreset(presetName);

    if (result) {
      this.turbulenceHandler.saveToStorage();
    }

    return result;
  }

  loadTurbPreset(presetName, turbFolder) {
    if (this.enableDebugLogging) {
      console.log(`Loading turbulence preset: ${presetName}`);
    }

    return this.turbulenceHandler.loadTurbPreset(presetName, turbFolder);
  }

  getSelectedTurbPreset() {
    return this.turbulenceHandler.getSelectedPreset();
  }

  //#endregion

  //#region Voronoi Preset Methods

  setVoronoiField(field) {
    this.voronoiField = field;
    console.log("PresetManager: VoronoiField reference set");

    if (
      this.voronoiHandler &&
      typeof this.voronoiHandler.setVoronoiField === "function"
    ) {
      this.voronoiHandler.setVoronoiField(field);
    }
  }

  getVoronoiPresetOptions() {
    return this.voronoiHandler.getPresetOptions();
  }

  saveVoronoiPreset(presetName, voronoiFolder) {
    if (this.enableDebugLogging) {
      console.log(`Saving voronoi preset: ${presetName}`);
    }

    const result = this.voronoiHandler.saveVoronoiPreset(
      presetName,
      voronoiFolder
    );

    if (result) {
      this.voronoiHandler.saveToStorage();
    }

    return result;
  }

  deleteVoronoiPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Deleting voronoi preset: ${presetName}`);
    }

    const result = this.voronoiHandler.deleteVoronoiPreset(presetName);

    if (result) {
      this.voronoiHandler.saveToStorage();
    }

    return result;
  }

  loadVoronoiPreset(presetName, voronoiFolder) {
    if (this.enableDebugLogging) {
      console.log(`Loading voronoi preset in manager: ${presetName}`);
    }

    const result = this.voronoiHandler.loadVoronoiPreset(
      presetName,
      voronoiFolder
    );

    if (result) {
      try {
        if (
          this.voronoiField &&
          typeof this.voronoiField.regenerateCells === "function"
        ) {
          console.log("Regenerating voronoi cells using direct reference");
          this.voronoiField.regenerateCells();
        } else if (this.voronoiHandler?.voronoiField?.regenerateCells) {
          console.log("Regenerating voronoi cells using handler reference");
          this.voronoiHandler.voronoiField.regenerateCells();
        } else {
          console.log(
            "Cannot regenerate voronoi cells - voronoiField not available"
          );
        }
      } catch (error) {
        console.error("Error regenerating voronoi cells:", error);
      }
    }

    return result;
  }

  getSelectedVoronoiPreset() {
    return this.voronoiHandler.getSelectedPreset();
  }

  //#endregion

  //#region Pulse Modulation Preset Methods

  getPulsePresetOptions() {
    return this.pulseHandler.getPresetOptions();
  }

  savePulsePreset(presetName, pulseModUi) {
    if (this.enableDebugLogging) {
      console.log(`Saving pulse modulation preset: ${presetName}`);
    }

    const result = this.pulseHandler.savePulsePreset(presetName, pulseModUi);

    if (result) {
      this.pulseHandler.saveToStorage();
    }

    return result;
  }

  deletePulsePreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Deleting pulse modulation preset: ${presetName}`);
    }

    const result = this.pulseHandler.deletePulsePreset(presetName);

    if (result) {
      this.pulseHandler.saveToStorage();
    }

    return result;
  }

  loadPulsePreset(presetName, pulseModUi) {
    if (this.enableDebugLogging) {
      console.log(`Loading pulse modulation preset: ${presetName}`);
    }

    return this.pulseHandler.loadPulsePreset(presetName, pulseModUi);
  }

  getSelectedPulsePreset() {
    return this.pulseHandler.getSelectedPreset();
  }

  //#endregion

  //#region Microphone Preset Methods

  getMicPresetOptions() {
    return this.micHandler.getPresetOptions();
  }

  saveMicPreset(presetName, inputUi) {
    if (this.enableDebugLogging) {
      console.log(`Saving microphone preset: ${presetName}`);
    }

    const result = this.micHandler.saveMicPreset(presetName, inputUi);

    if (result) {
      this.micHandler.saveToStorage();
    }

    return result;
  }

  deleteMicPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Deleting microphone preset: ${presetName}`);
    }

    const result = this.micHandler.deleteMicPreset(presetName);

    if (result) {
      this.micHandler.saveToStorage();
    }

    return result;
  }

  loadMicPreset(presetName, inputUi) {
    if (this.enableDebugLogging) {
      console.log(`Loading microphone preset: ${presetName}`);
    }

    return this.micHandler.loadMicPreset(presetName, inputUi);
  }

  getSelectedMicPreset() {
    return this.micHandler.getSelectedPreset();
  }

  //#endregion

  //#region Preset Export/Import

  exportPresets() {
    try {
      const exportData = {
        version: 1,
        masterPresets: this.masterHandler.presets,
        turbPresets: this.turbulenceHandler.presets,
        voronoiPresets: this.voronoiHandler.presets,
        pulsePresets: this.pulseHandler.presets,
        micPresets: this.micHandler.presets,
        timestamp: Date.now(),
      };

      const jsonString = JSON.stringify(exportData);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Svibe_Presets_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return true;
    } catch (error) {
      console.error("Error exporting presets:", error);
      return false;
    }
  }

  importPresets(jsonString) {
    try {
      // Parse the JSON string
      const importData = JSON.parse(jsonString);
      let importCount = 0;

      // Check if the import data is valid
      if (!importData || typeof importData !== "object") {
        console.error("Invalid import data format");
        return 0;
      }

      // Import master presets if available
      if (
        importData.masterPresets &&
        typeof importData.masterPresets === "object"
      ) {
        this.masterHandler.presets = {
          ...this.masterHandler.presets,
          ...importData.masterPresets,
        };
        this.masterHandler.saveToStorage();
        importCount++;
      }

      // Import turbulence presets if available
      if (
        importData.turbPresets &&
        typeof importData.turbPresets === "object"
      ) {
        this.turbulenceHandler.presets = {
          ...this.turbulenceHandler.presets,
          ...importData.turbPresets,
        };
        this.turbulenceHandler.saveToStorage();
        importCount++;
      }

      // Import voronoi presets if available
      if (
        importData.voronoiPresets &&
        typeof importData.voronoiPresets === "object"
      ) {
        this.voronoiHandler.presets = {
          ...this.voronoiHandler.presets,
          ...importData.voronoiPresets,
        };
        this.voronoiHandler.saveToStorage();
        importCount++;
      }

      // Import pulse modulation presets if available
      if (
        importData.pulsePresets &&
        typeof importData.pulsePresets === "object"
      ) {
        this.pulseHandler.presets = {
          ...this.pulseHandler.presets,
          ...importData.pulsePresets,
        };
        this.pulseHandler.saveToStorage();
        importCount++;
      }

      // Import microphone presets if available
      if (importData.micPresets && typeof importData.micPresets === "object") {
        this.micHandler.presets = {
          ...this.micHandler.presets,
          ...importData.micPresets,
        };
        this.micHandler.saveToStorage();
        importCount++;
      }

      return importCount;
    } catch (error) {
      console.error("Error importing presets:", error);
      return 0;
    }
  }

  //#endregion
}

export { PresetManager };
