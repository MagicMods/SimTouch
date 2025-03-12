class PresetBaseHandler {
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

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }
}

export { PresetBaseHandler };