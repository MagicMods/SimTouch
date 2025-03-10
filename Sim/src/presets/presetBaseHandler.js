export class PresetBaseHandler {
  constructor(storageKey, defaultPresets = {}) {
    this.storageKey = storageKey;
    this.presets = this.loadFromStorage() || {};
    this.selectedPreset = null;
    this.debug = false;
    this.protectedPresets = [];
    this.defaultPreset = null;

    if (defaultPresets) {
      for (const key in defaultPresets) {
        if (!this.presets[key]) {
          this.presets[key] = defaultPresets[key];
        }
      }
      this.saveToStorage();
    }
  }

  extractDataFromUI(uiComponent) {
    console.warn(
      `extractDataFromUI not implemented for ${this.constructor.name}`
    );
    return null;
  }

  applyDataToUI(presetName, uiComponent) {
    console.warn(`applyDataToUI not implemented for ${this.constructor.name}`);
    return false;
  }

  savePreset(presetName, data) {
    if (!presetName) {
      console.error("Invalid preset name");
      return false;
    }

    if (this.protectedPresets && this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot overwrite protected preset: ${presetName}`);
      return false;
    }

    // Handle direct UI component passing
    let presetData = data;
    if (
      data &&
      typeof data === "object" &&
      this.extractDataFromUI &&
      !data.hasOwnProperty("id")
    ) {
      presetData = this.extractDataFromUI(data);
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
  }

  deletePreset(presetName) {
    if (!presetName || !this.presets[presetName]) {
      console.error(`Preset not found: ${presetName}`);
      return false;
    }

    if (this.protectedPresets && this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot delete protected preset: ${presetName}`);
      return false;
    }

    delete this.presets[presetName];

    if (this.selectedPreset === presetName) {
      this.selectedPreset = this.defaultPreset;
    }

    this.saveToStorage();
    return true;
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }

  setSelectedPreset(presetName) {
    if (this.presets[presetName]) {
      this.selectedPreset = presetName;
      return true;
    }
    return false;
  }

  loadFromStorage() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error(
        `Error loading presets from storage (${this.storageKey}):`,
        error
      );
      return null;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
      if (this.debug) {
        console.log(`Saved presets to ${this.storageKey}`);
      }
      return true;
    } catch (error) {
      console.error(
        `Error saving presets to storage (${this.storageKey}):`,
        error
      );
      return false;
    }
  }

  setDebug(enabled) {
    this.debug = enabled;
  }
}
