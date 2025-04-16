
export class PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    this.storageKey = storageKey;
    this.presets = { ...defaultPresets };
    this.protectedPresets = protectedPresets || [];
    this.selectedPreset = null;
    this.loadFromStorage();
  }

  loadFromStorage() {
    const storedPresets = JSON.parse(localStorage.getItem(this.storageKey));
    if (storedPresets) {
      this.presets = { ...this.presets, ...storedPresets };
    }
  }

  saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
  }

  getPreset(presetName) {
    return this.presets[presetName] || null;
  }

  savePreset(presetName, data) {
    if (this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot overwrite protected preset: ${presetName}`);
      return false;
    }
    this.presets[presetName] = data;
    this.saveToStorage();
    return true;
  }

  deletePreset(presetName) {
    // Check if preset exists
    if (!this.presets[presetName]) {
      console.warn(`Preset "${presetName}" not found`);
      return false;
    }

    // Check if preset is protected
    if (this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot delete protected preset: ${presetName}`);
      return false;
    }

    // Delete the preset
    delete this.presets[presetName];

    // If the deleted preset was selected, clear selection
    if (this.selectedPreset === presetName) {
      this.selectedPreset = null;
    }

    // Save updated presets to storage
    this.saveToStorage();

    return true;
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }
}