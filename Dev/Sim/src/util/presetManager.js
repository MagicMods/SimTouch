class PresetManager {
  constructor(gui) {
    this.gui = gui;
    this.presets = {};
    this.defaultPreset = null;
  }

  async loadPresets() {
    try {
      const response = await fetch("./presets/index.json");
      if (!response.ok) throw new Error("Could not load preset index");

      const { presetFiles } = await response.json();

      // Reset presets
      this.presets = {};

      // Load each preset
      for (const name of presetFiles) {
        const response = await fetch(`./presets/${name}.json`);
        if (response.ok) {
          this.presets[name] = await response.json();
        }
      }

      // Set first preset as default
      const presetNames = this.getPresetNames();
      if (presetNames.length > 0) {
        this.defaultPreset = presetNames[0];
      }

      console.log(`Loaded ${presetNames.length} presets:`, presetNames);
      return presetNames;
    } catch (error) {
      console.error("Error loading presets:", error);
      return [];
    }
  }

  getPresetNames() {
    return Object.keys(this.presets);
  }

  exportCurrentState() {
    const state = this.gui.save();
    return state;
  }
}
export { PresetManager };
