export class PresetBaseHandler {
  constructor(storageKey, defaultPresets = {}, protectedPresets = []) {
    this.storageKey = storageKey;
    this.protectedPresets = protectedPresets || [];
    this.selectedPreset = null;
    this.debug = false;

    // Load presets from storage
    this.presets = this.loadFromStorage() || {};
    this.initializeDefaultPresets(defaultPresets);
  }

  initializeDefaultPresets(defaultPresets) {
    // Add default presets if not present
    if (defaultPresets) {
      for (const key in defaultPresets) {
        if (!this.presets[key]) {
          this.presets[key] = defaultPresets[key];
        }
      }
      this.saveToStorage();
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error(`Error loading presets from ${this.storageKey}:`, error);
      return {};
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
      return true;
    } catch (error) {
      console.error(`Error saving presets to ${this.storageKey}:`, error);
      return false;
    }
  }

  getPreset(name) {
    return this.presets[name];
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }

  savePreset(name, data) {
    if (!name) return false;

    if (this.protectedPresets.includes(name)) {
      console.warn(`Cannot overwrite protected preset: ${name}`);
      return false;
    }

    try {
      // Store a clean copy to prevent reference issues
      this.presets[name] = JSON.parse(JSON.stringify(data));
      this.selectedPreset = name;
      this.saveToStorage();
      if (this.debug) console.log(`Saved preset: ${name}`);
      return true;
    } catch (error) {
      console.error(`Error saving preset ${name}:`, error);
      return false;
    }
  }

  deletePreset(name) {
    if (!name || !this.presets[name]) return false;

    if (this.protectedPresets.includes(name)) {
      console.warn(`Cannot delete protected preset: ${name}`);
      return false;
    }

    delete this.presets[name];

    if (this.selectedPreset === name) {
      // Reset to default preset if available, otherwise null
      this.selectedPreset = this.protectedPresets[0] || null;
    }

    this.saveToStorage();
    if (this.debug) console.log(`Deleted preset: ${name}`);
    return true;
  }

  setDebug(enabled) {
    this.debug = !!enabled;
  }
}
