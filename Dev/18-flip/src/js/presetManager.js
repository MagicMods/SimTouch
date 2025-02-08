class PresetManager {
  constructor() {
    this.STORAGE_KEY = "FLIP_SIM_PRESETS";
    this.presets = this.loadPresets();
  }

  loadPresets() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  savePreset(name, config) {
    this.presets[name] = {
      ...config,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.presets));
  }

  loadPreset(name) {
    return this.presets[name];
  }

  deletePreset(name) {
    delete this.presets[name];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.presets));
  }

  getAllPresets() {
    return Object.entries(this.presets).map(([name, preset]) => ({
      name,
      timestamp: preset.timestamp,
    }));
  }
}
export { PresetManager };
