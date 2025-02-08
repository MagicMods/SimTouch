class PresetManager {
  constructor() {
    this.presets = {};
    this.sliderIds = [
      "gravitySlider",
      "velocityDampingSlider",
      "flipRatioSlider",
      "pressureSlider",
      "relaxSlider",
      "particleSizeSlider",
      "collisionDampingSlider",
      "repulsionSlider",
      "obstacleSlider",
    ];
  }

  async loadPresets() {
    try {
      const response = await fetch("./presets/index.json");
      if (!response.ok) {
        throw new Error("Could not load preset index");
      }
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

      // Log available presets
      const presetNames = this.getPresetNames();
      console.log(`Loaded ${presetNames.length} presets:`, presetNames);
      return presetNames;
    } catch (error) {
      console.error("Error loading presets:", error);
      return [];
    }
  }

  applyPreset(name) {
    const preset = this.presets[name];
    if (!preset?.sliders) {
      console.error("Invalid preset:", name);
      return false;
    }

    Object.entries(preset.sliders).forEach(([id, value]) => {
      const slider = document.getElementById(id);
      if (slider) {
        slider.value = value;
        slider.dispatchEvent(new Event("input"));
      }
    });
    return true;
  }

  exportCurrentState() {
    const state = { sliders: {} };
    this.sliderIds.forEach((id) => {
      const slider = document.getElementById(id);
      if (slider) {
        state.sliders[id] = parseFloat(slider.value);
      }
    });
    console.log("Copy this preset configuration:");
    console.log(JSON.stringify(state, null, 2));
    return state;
  }

  getPresetNames() {
    return Object.keys(this.presets);
  }
}

export { PresetManager };
