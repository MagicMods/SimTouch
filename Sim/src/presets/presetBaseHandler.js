export class PresetBaseHandler {
  constructor(storageKey, defaultPresets = {}, options = {}) {
    this.storageKey = storageKey;
    this.presets = this.loadFromStorage() || {};
    this.selectedPreset = null;
    this.debug = false;

    // Standardized options with defaults
    this.protectedPresets = options.protectedPresets || [];
    this.defaultPreset = options.defaultPreset || null;

    // Add extraction/application strategies
    this.extractionMethod = options.extractionMethod || "save";
    this.applicationMethod = options.applicationMethod || "load";

    // Apply default presets if provided and not already present
    if (defaultPresets) {
      for (const key in defaultPresets) {
        if (!this.presets[key]) {
          this.presets[key] = defaultPresets[key];
        }
      }
      this.saveToStorage();
    }
  }

  // Missing storage methods
  loadFromStorage() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error(`Error loading presets from storage:`, error);
    }
    return {};
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
      return true;
    } catch (error) {
      console.error(`Error saving presets to storage:`, error);
      return false;
    }
  }

  // Extract data using configured strategy
  extractDataFromUI(uiComponent) {
    if (!uiComponent) {
      console.warn(`Cannot extract data: UI component not provided`);
      return null;
    }

    try {
      if (this.debug)
        console.log(`Extracting data using ${this.extractionMethod}`);

      // Use the configured extraction method
      if (
        this.extractionMethod === "save" &&
        typeof uiComponent.save === "function"
      ) {
        return uiComponent.save();
      } else if (
        this.extractionMethod === "getModulatorsData" &&
        typeof uiComponent.getModulatorsData === "function"
      ) {
        return uiComponent.getModulatorsData();
      } else {
        console.error(
          `Extraction method ${this.extractionMethod} not supported by UI component`
        );
        return null;
      }
    } catch (error) {
      console.error(`Error extracting data from UI:`, error);
      return null;
    }
  }

  // Apply data using configured strategy
  applyDataToUI(presetName, uiComponent) {
    if (!uiComponent) {
      console.warn(`Cannot apply data: UI component not provided`);
      return false;
    }

    try {
      if (this.debug)
        console.log(
          `Applying preset ${presetName} using ${this.applicationMethod}`
        );

      // Handle special case for None preset
      if (presetName === "None") {
        if (typeof uiComponent.clearAllModulators === "function") {
          uiComponent.clearAllModulators();
          this.selectedPreset = presetName;
          return true;
        }
      }

      const preset = this.presets[presetName];
      if (!preset) {
        console.warn(`Preset not found: ${presetName}`);
        return false;
      }

      // Use the configured application method
      if (
        this.applicationMethod === "load" &&
        typeof uiComponent.load === "function"
      ) {
        uiComponent.load(preset);
        this.selectedPreset = presetName;
        return true;
      } else if (
        this.applicationMethod === "loadPresetData" &&
        typeof uiComponent.loadPresetData === "function"
      ) {
        const result = uiComponent.loadPresetData(preset);
        if (result) this.selectedPreset = presetName;
        return result;
      } else {
        console.error(
          `Application method ${this.applicationMethod} not supported by UI component`
        );
        return false;
      }
    } catch (error) {
      console.error(`Error applying preset ${presetName}:`, error);
      return false;
    }
  }

  // Simplified save preset that uses extractDataFromUI
  savePreset(presetName, uiComponent) {
    if (!presetName) {
      console.error("Invalid preset name");
      return false;
    }

    if (this.protectedPresets && this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot overwrite protected preset: ${presetName}`);
      return false;
    }

    try {
      // Extract data if UI component provided, otherwise use direct data
      let presetData = uiComponent;
      if (
        uiComponent &&
        typeof uiComponent !== "string" &&
        !uiComponent.hasOwnProperty("id")
      ) {
        presetData = this.extractDataFromUI(uiComponent);
      }

      if (!presetData) {
        console.error("Invalid preset data");
        return false;
      }

      // Store a deep copy to prevent reference issues
      this.presets[presetName] = JSON.parse(JSON.stringify(presetData));
      this.selectedPreset = presetName;

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error(`Error saving preset ${presetName}:`, error);
      return false;
    }
  }

  // Delete preset with protection checks
  deletePreset(presetName) {
    if (!presetName || !this.presets[presetName]) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    if (this.protectedPresets && this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot delete protected preset: ${presetName}`);
      return false;
    }

    try {
      delete this.presets[presetName];

      // If the deleted preset was selected, switch to default
      if (this.selectedPreset === presetName) {
        this.selectedPreset = this.defaultPreset || null;
      }

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error(`Error deleting preset ${presetName}:`, error);
      return false;
    }
  }

  // Get preset options for dropdown
  getPresetOptions() {
    return Object.keys(this.presets);
  }

  // Get selected preset
  getSelectedPreset() {
    return this.selectedPreset;
  }

  // Set debug mode
  setDebug(enabled) {
    this.debug = !!enabled;
  }
}
