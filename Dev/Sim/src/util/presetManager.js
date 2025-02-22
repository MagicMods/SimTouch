class PresetManager {
  constructor(leftGui) {
    this.leftGui = leftGui;
    this.presets = {
      main: {},
      turbulence: {},
      behaviors: {},
    };
    this.defaultPreset = null;
    this.currentPreset = null;
  }

  // Only load main presets at startup
  async loadMainPresets() {
    try {
      // Fix: correct path to index.json
      const response = await fetch("./presets/index.json");
      if (!response.ok) throw new Error("Could not load preset index");

      const { presetFiles } = await response.json();
      for (const name of presetFiles) {
        const response = await fetch(`./presets/main/${name}.json`);
        if (response.ok) {
          this.presets.main[name] = await response.json();
        }
      }

      // Set first preset as default if available
      const presetNames = Object.keys(this.presets.main);
      if (presetNames.length > 0) {
        this.defaultPreset = presetNames[0];
        await this.loadPreset(this.defaultPreset);
      }

      console.log("Main presets loaded:", presetNames);
      return presetNames;
    } catch (error) {
      console.error("Error loading main presets:", error);
      return [];
    }
  }

  async loadPreset(presetName) {
    if (!this.presets.main[presetName]) {
      console.error(`Main preset '${presetName}' not found`);
      return false;
    }

    try {
      this.leftGui.load(this.presets.main[presetName]);
      this.currentPreset = presetName;
      console.log(`Loaded main preset: ${presetName}`);
      return true;
    } catch (error) {
      console.error(`Error loading main preset '${presetName}':`, error);
      return false;
    }
  }

  // Load sub-presets on demand
  async loadSubPresets(type) {
    try {
      const files = await this.getPresetList(type);
      for (const name of files) {
        const response = await fetch(`./presets/${type}/${name}.json`);
        if (response.ok) {
          this.presets[type][name] = await response.json();
        }
      }
      console.log(`${type} presets loaded:`, Object.keys(this.presets[type]));
      return Object.keys(this.presets[type]);
    } catch (error) {
      console.error(`Error loading ${type} presets:`, error);
      return [];
    }
  }

  getPresetList(type) {
    switch (type) {
      case "turbulence":
        return ["None", "Chaos", "GentleBreeze", "Vortex"];
      case "behaviors":
        return ["Automata", "Fluid", "Swarm"];
      default:
        return [];
    }
  }

  applySubPreset(type, name) {
    return this.presets[type][name] || null;
  }

  getPresetNames(type = "main") {
    return Object.keys(this.presets[type] || {});
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  exportCurrentState() {
    return this.leftGui.save();
  }
}

export { PresetManager };
