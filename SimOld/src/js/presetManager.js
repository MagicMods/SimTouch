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
    this.defaultPreset = null; // Store default preset name
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

      // Load first preset as default
      const presetNames = this.getPresetNames();
      if (presetNames.length > 0) {
        this.defaultPreset = presetNames[0];
        this.applyPreset(this.defaultPreset);
      }

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
      const { sliders } = preset;
      const { grid } = this.simulation;

      // Simulation settings
      if ("gravitySlider" in sliders)
        grid.fluidSolver.gravity = Number(sliders.gravitySlider);
      if ("velocityDampingSlider" in sliders)
        grid.fluidSolver.velocityDamping = Number(
          sliders.velocityDampingSlider
        );
      if ("flipRatioSlider" in sliders)
        grid.fluidSolver.flipRatio = Number(sliders.flipRatioSlider);
      if ("pressureSlider" in sliders)
        grid.fluidSolver.numPressureIters = Number(sliders.pressureSlider);
      if ("relaxSlider" in sliders)
        grid.fluidSolver.overRelaxation = Number(sliders.relaxSlider);

      // Particle settings
      if ("particleCountSlider" in sliders)
        grid.particleSystem.particleCount = Number(sliders.particleCountSlider);
      if ("particleSizeSlider" in sliders)
        grid.particleSystem.particleRadius = Number(sliders.particleSizeSlider);
      if ("collisionDampingSlider" in sliders)
        grid.particleSystem.collisionDamping = Number(
          sliders.collisionDampingSlider
        );
      if ("repulsionSlider" in sliders)
        grid.particleSystem.repulsionStrength = Number(sliders.repulsionSlider);
      if ("opacitySlider" in sliders)
        grid.particleSystem.particleColor[3] = Number(sliders.opacitySlider);

      // Obstacle settings
      if ("obstacleSizeSlider" in sliders)
        grid.particleSystem.circleRadius = Number(sliders.obstacleSizeSlider);

      console.log(`Successfully applied preset: ${name}`);
      console.log("Applied values:", sliders);
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
