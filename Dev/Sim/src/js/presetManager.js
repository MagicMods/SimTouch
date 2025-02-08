class PresetManager {
  constructor(simulation) {
    this.simulation = simulation; // Store simulation reference
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

    try {
      // Apply preset values
      Object.entries(preset.sliders).forEach(([id, value]) => {
        switch (id) {
          case "gravitySlider":
            this.simulation.grid.fluidSolver.gravity = Number(value);
            break;
          case "velocityDampingSlider":
            this.simulation.grid.fluidSolver.velocityDamping = Number(value);
            break;
          case "flipRatioSlider":
            this.simulation.grid.fluidSolver.flipRatio = Number(value);
            break;
          case "pressureSlider":
            this.simulation.grid.fluidSolver.numPressureIters = Number(value);
            break;
          case "relaxSlider":
            this.simulation.grid.fluidSolver.overRelaxation = Number(value);
            break;
          case "particleSizeSlider":
            this.simulation.grid.particleSystem.particleRadius = Number(value);
            break;
          case "collisionDampingSlider":
            this.simulation.grid.particleSystem.collisionDamping =
              Number(value);
            break;
          case "repulsionSlider":
            this.simulation.grid.particleSystem.repulsionStrength =
              Number(value);
            break;
        }
      });

      console.log(`Successfully applied preset: ${name}`);
      return true;
    } catch (error) {
      console.error(`Error applying preset ${name}:`, error);
      return false;
    }
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
