class PresetManager {
  constructor(gui) {
    this.gui = gui;
    this.presets = {};
    this.defaultPreset = null;
    this.currentPreset = null;
  }

  async loadPresets() {
    try {
      const response = await fetch("./presets/index.json");
      if (!response.ok) throw new Error("Could not load preset index");

      const { presetFiles } = await response.json();
      this.presets = {};

      // Load each preset
      for (const name of presetFiles) {
        const response = await fetch(`./presets/${name}.json`);
        if (response.ok) {
          this.presets[name] = await response.json();
        }
      }

      // Set and load first preset as default
      const presetNames = this.getPresetNames();
      if (presetNames.length > 0) {
        this.defaultPreset = presetNames[0];
        await this.loadPreset(this.defaultPreset);
      }

      console.log(`Loaded ${presetNames.length} presets:`, presetNames);
      return presetNames;
    } catch (error) {
      console.error("Error loading presets:", error);
      return [];
    }
  }

  async loadPreset(presetName) {
    if (!this.presets[presetName]) {
      console.error(`Preset '${presetName}' not found`);
      return false;
    }

    try {
      // Load preset values into GUI
      this.gui.load(this.presets[presetName]);
      this.currentPreset = presetName;
      console.log(`Loaded preset: ${presetName}`);
      return true;
    } catch (error) {
      console.error(`Error loading preset '${presetName}':`, error);
      return false;
    }
  }

  getPresetNames() {
    return Object.keys(this.presets);
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  exportCurrentState() {
    const state = this.gui.save();
    return state;
  }
}

export { PresetManager };
