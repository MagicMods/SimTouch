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

  /**
   * Migrate from old preset format to new format if needed
   * @private
   */
  _migrateExistingPresets() {
    // Check if there are legacy presets to migrate
    try {
      // Implement migration logic here if needed
      // For now, just a placeholder
    } catch (error) {
      console.error("Error migrating presets:", error);
    }
  }

  /**
   * Enable/disable detailed debug logging
   * @param {boolean} enabled - Whether to enable debug logs
   */
  setDebug(enabled) {
    this.enableDebugLogging = !!enabled;
    console.log(
      `PresetManager debug logging: ${enabled ? "enabled" : "disabled"}`
    );
  }

  //#region Master Preset Methods

  /**
   * Load master presets from storage
   */
  loadPresetsFromStorage() {
    return this.masterHandler.loadFromStorage();
  }

  /**
   * Save master presets to storage
   */
  savePresetsToStorage() {
    return this.masterHandler.saveToStorage();
  }

  /**
   * Get available master preset options
   * @returns {Array<string>} Array of preset names
   */
  getPresetOptions() {
    return this.masterHandler.getPresetOptions();
  }

  /**
   * Save current state as a master preset
   * @param {string} presetName - Name for the preset
   * @returns {boolean} Success/failure
   */
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

  /**
   * Delete a master preset
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success/failure
   */
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

  /**
   * Load and apply a master preset
   * @param {string} presetName - Name of preset to load
   * @returns {boolean} Success/failure
   */
  loadPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Loading master preset: ${presetName}`);
    }

    return this.masterHandler.applyDataToUI(presetName);
  }

  /**
   * Get the name of the currently selected master preset
   * @returns {string} Preset name
   */
  getSelectedPreset() {
    return this.masterHandler.getSelectedPreset();
  }

  /**
   * Set auto-play mode
   * @param {boolean} enabled - Whether to enable auto-play
   */
  setAutoPlay(enabled) {
    if (this.masterHandler.setAutoPlay) {
      this.masterHandler.setAutoPlay(enabled);
    }
  }

  /**
   * Get auto-play status
   * @returns {boolean} Whether auto-play is enabled
   */
  isAutoPlay() {
    return this.masterHandler.isAutoPlay
      ? this.masterHandler.isAutoPlay()
      : false;
  }

  //#endregion

  //#region Turbulence Preset Methods

  /**
   * Load turbulence presets from storage
   */
  loadTurbPresetsFromStorage() {
    return this.turbulenceHandler.loadFromStorage();
  }

  /**
   * Save turbulence presets to storage
   */
  saveTurbPresetsToStorage() {
    return this.turbulenceHandler.saveToStorage();
  }

  /**
   * Get available turbulence preset options
   * @returns {Array<string>} Array of preset names
   */
  getTurbPresetOptions() {
    return this.turbulenceHandler.getPresetOptions();
  }

  /**
   * Save current state as a turbulence preset
   * @param {string} presetName - Name for the preset
   * @param {Object} turbFolder - The dat.GUI folder with turbulence settings
   * @returns {boolean} Success/failure
   */
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

  /**
   * Delete a turbulence preset
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success/failure
   */
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

  /**
   * Load and apply a turbulence preset
   * @param {string} presetName - Name of preset to load
   * @param {Object} turbFolder - The dat.GUI folder to apply settings to
   * @returns {boolean} Success/failure
   */
  loadTurbPreset(presetName, turbFolder) {
    if (this.enableDebugLogging) {
      console.log(`Loading turbulence preset: ${presetName}`);
    }

    return this.turbulenceHandler.loadTurbPreset(presetName, turbFolder);
  }

  /**
   * Get the currently selected turbulence preset
   * @returns {string} Preset name
   */
  getSelectedTurbPreset() {
    return this.turbulenceHandler.getSelectedPreset();
  }

  //#endregion

  //#region Voronoi Preset Methods

  /**
   * Store a direct reference to the voronoi field for cell regeneration
   * @param {Object} field - The voronoi field object
   */
  setVoronoiField(field) {
    this.voronoiField = field;
    console.log("PresetManager: VoronoiField reference set");

    // Also set in the handler
    if (
      this.voronoiHandler &&
      typeof this.voronoiHandler.setVoronoiField === "function"
    ) {
      this.voronoiHandler.setVoronoiField(field);
    }
  }

  /**
   * Get available voronoi preset options
   * @returns {Array<string>} Array of preset names
   */
  getVoronoiPresetOptions() {
    return this.voronoiHandler.getPresetOptions();
  }

  /**
   * Save current state as a voronoi preset
   * @param {string} presetName - Name for the preset
   * @param {Object} voronoiFolder - The dat.GUI folder with voronoi settings
   * @returns {boolean} Success/failure
   */
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

  /**
   * Delete a voronoi preset
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success/failure
   */
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

  /**
   * Load and apply a voronoi preset
   * @param {string} presetName - Name of preset to load
   * @param {Object} voronoiFolder - The dat.GUI folder to apply settings to
   * @returns {boolean} Success/failure
   */
  loadVoronoiPreset(presetName, voronoiFolder) {
    if (this.enableDebugLogging) {
      console.log(`Loading voronoi preset in manager: ${presetName}`);
    }

    // First apply the preset to the folder using the handler
    const result = this.voronoiHandler.loadVoronoiPreset(
      presetName,
      voronoiFolder
    );

    // Only attempt to regenerate if the preset was successfully loaded
    if (result) {
      try {
        // Try direct reference first (most reliable)
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
        // Don't fail the preset load just because regeneration failed
      }
    }

    return result;
  }

  /**
   * Get the currently selected voronoi preset
   * @returns {string} Preset name
   */
  getSelectedVoronoiPreset() {
    return this.voronoiHandler.getSelectedPreset();
  }

  //#endregion

  //#region Pulse Modulation Preset Methods

  /**
   * Get available pulse modulation preset options
   * @returns {Array<string>} Array of preset names
   */
  getPulsePresetOptions() {
    return this.pulseHandler.getPresetOptions();
  }

  /**
   * Save current state as a pulse modulation preset
   * @param {string} presetName - Name for the preset
   * @param {Object} pulseModUi - The UI component with pulse modulation settings
   * @returns {boolean} Success/failure
   */
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

  /**
   * Delete a pulse modulation preset
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success/failure
   */
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

  /**
   * Load and apply a pulse modulation preset
   * @param {string} presetName - Name of preset to load
   * @param {Object} pulseModUi - The UI component to apply settings to
   * @returns {boolean} Success/failure
   */
  loadPulsePreset(presetName, pulseModUi) {
    if (this.enableDebugLogging) {
      console.log(`Loading pulse modulation preset: ${presetName}`);
    }

    return this.pulseHandler.loadPulsePreset(presetName, pulseModUi);
  }

  /**
   * Get the currently selected pulse modulation preset
   * @returns {string} Preset name
   */
  getSelectedPulsePreset() {
    return this.pulseHandler.getSelectedPreset();
  }

  //#endregion

  //#region Microphone Preset Methods

  /**
   * Get available microphone preset options
   * @returns {Array<string>} Array of preset names
   */
  getMicPresetOptions() {
    return this.micHandler.getPresetOptions();
  }

  /**
   * Save current state as a microphone preset
   * @param {string} presetName - Name for the preset
   * @param {Object} inputUi - The UI component with microphone settings
   * @returns {boolean} Success/failure
   */
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

  /**
   * Delete a microphone preset
   * @param {string} presetName - Name of preset to delete
   * @returns {boolean} Success/failure
   */
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

  /**
   * Load and apply a microphone preset
   * @param {string} presetName - Name of preset to load
   * @param {Object} inputUi - The UI component to apply settings to
   * @returns {boolean} Success/failure
   */
  loadMicPreset(presetName, inputUi) {
    if (this.enableDebugLogging) {
      console.log(`Loading microphone preset: ${presetName}`);
    }

    return this.micHandler.loadMicPreset(presetName, inputUi);
  }

  /**
   * Get the currently selected microphone preset
   * @returns {string} Preset name
   */
  getSelectedMicPreset() {
    return this.micHandler.getSelectedPreset();
  }

  //#endregion

  //#region Preset Export/Import

  /**
   * Export all presets to a downloadable JSON file
   */
  exportPresets() {
    try {
      // Gather all preset data
      const exportData = {
        version: 1,
        masterPresets: this.masterHandler.presets,
        turbPresets: this.turbulenceHandler.presets,
        voronoiPresets: this.voronoiHandler.presets,
        pulsePresets: this.pulseHandler.presets,
        micPresets: this.micHandler.presets,
        timestamp: Date.now(),
      };

      // Create a downloadable JSON file
      const jsonString = JSON.stringify(exportData);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `Svibe_Presets_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();

      // Clean up URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);

      return true;
    } catch (error) {
      console.error("Error exporting presets:", error);
      return false;
    }
  }

  /**
   * Import presets from a JSON string
   * @param {string} jsonString - JSON string containing exported presets
   * @returns {number} Number of preset categories imported
   */
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
