class PresetBaseHandler {
  constructor(storageKey, defaultPresets = {}) {
    this.storageKey = storageKey;
    this.presets = this.loadFromStorage() || defaultPresets;
    this.selectedPreset = Object.keys(this.presets)[0] || null;
    this.version = 1; // Add versioning for future migrations
  }

  // Core methods that standardize operations
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Error loading from ${this.storageKey}:`, error);
      return null;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
      return true;
    } catch (error) {
      console.error(`Error saving to ${this.storageKey}:`, error);
      return false;
    }
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }

  // Validate preset name and provide consistent error handling
  validatePresetName(presetName, protectedPresets = []) {
    if (!presetName || presetName.trim() === "") {
      console.warn("Preset name cannot be empty");
      return false;
    }

    if (protectedPresets.includes(presetName)) {
      console.warn(`Cannot modify protected preset: ${presetName}`);
      return false;
    }

    return true;
  }

  // Base save preset with safety checks
  savePreset(presetName, data, protectedPresets = []) {
    if (!this.validatePresetName(presetName, protectedPresets)) {
      return false;
    }

    this.presets[presetName] = { ...data, _meta: { timestamp: Date.now() } };
    this.selectedPreset = presetName;
    this.saveToStorage();
    return true;
  }

  // Base delete preset with safety checks
  deletePreset(presetName, protectedPresets = [], defaultPreset = null) {
    if (protectedPresets.includes(presetName)) {
      console.warn(`Cannot delete protected preset: ${presetName}`);
      return false;
    }

    if (!this.presets[presetName]) {
      console.warn("Preset not found:", presetName);
      return false;
    }

    delete this.presets[presetName];
    this.selectedPreset = defaultPreset || Object.keys(this.presets)[0] || null;
    this.saveToStorage();
    return true;
  }

  // Generic method to extract data from a UI component
  extractDataFromUI(uiComponent) {
    // To be implemented by subclasses
    throw new Error("extractDataFromUI must be implemented by subclass");
  }

  // Generic method to apply data to a UI component
  applyDataToUI(presetName, uiComponent) {
    // To be implemented by subclasses
    throw new Error("applyDataToUI must be implemented by subclass");
  }

  // Export/import functionality
  exportData() {
    return {
      version: this.version,
      storageKey: this.storageKey,
      presets: this.presets,
      selected: this.selectedPreset,
    };
  }

  importData(data, merge = false) {
    if (!data || !data.presets) {
      console.warn("Invalid import data format");
      return false;
    }

    if (data.version > this.version) {
      console.warn(
        `Importing data from newer version (${data.version} > ${this.version})`
      );
      // Could add migration logic here
    }

    if (merge) {
      this.presets = { ...this.presets, ...data.presets };
    } else {
      this.presets = data.presets;
    }

    this.selectedPreset = data.selected || Object.keys(this.presets)[0] || null;
    this.saveToStorage();
    return true;
  }
}

export { PresetBaseHandler };
