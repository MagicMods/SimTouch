class PresetManager {
  constructor(leftGui) {
    this.leftGui = leftGui;
    this.presets = {
      main: {},
      turbulences: {}, // Keep original folder name
    };
    this.defaultPreset = null;
    this.currentPreset = null;
    this._debug = false;
  }

  async scanPresetFolder(type) {
    try {
      const response = await fetch(`./presets/${type}/`);
      const html = await response.text();

      // Extract .json files from directory listing
      const fileNames = html.match(/href="([^"]+\.json)"/g) || [];
      const presetNames = fileNames
        .map((href) => href.match(/([^\/]+)\.json/)[1])
        .filter((name) => name);

      // Try to load default.json first
      if (presetNames.includes("default")) {
        presetNames.splice(presetNames.indexOf("default"), 1);
        presetNames.unshift("default");
      }

      // Load each preset
      for (const name of presetNames) {
        await this.loadPreset(name, type);
      }

      if (this._debug) {
        console.log(`Found ${type} presets:`, presetNames);
      }

      return presetNames;
    } catch (error) {
      console.error(`Error scanning ${type} presets:`, error);
      return [];
    }
  }

  async loadPreset(name, type = "main") {
    try {
      const response = await fetch(`./presets/${type}/${name}.json`);
      if (!response.ok) throw new Error(`Preset ${name} not found`);

      const preset = await response.json();
      this.presets[type][name] = preset;

      // For main presets, apply to leftGui
      if (type === "main") {
        this.leftGui.load(preset);
        this.currentPreset = name;
      }

      if (this._debug) {
        console.log(`Loaded ${type} preset: ${name}`);
      }
      return preset;
    } catch (error) {
      console.error(`Error loading preset ${name}:`, error);
      return null;
    }
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  exportCurrentState() {
    return this.leftGui.save();
  }
}

export { PresetManager };
