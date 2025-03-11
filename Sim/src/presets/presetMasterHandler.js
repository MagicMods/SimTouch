import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMasterHandler extends PresetBaseHandler {
  constructor(
    paramUi,
    particleUi,
    gravityUi,
    collisionUi,
    boundaryUi,
    restStateUi,
    pulseModUi,
    inputModUi,
    turbulenceUi,
    voronoiUi,
    organicUi
  ) {
    // Call super first with empty default presets
    super("savedPresets", {});

    this.paramUi = paramUi;
    this.particleUi = particleUi;
    this.gravityUi = gravityUi;
    this.collisionUi = collisionUi;
    this.boundaryUi = boundaryUi;
    this.restStateUi = restStateUi;
    this.pulseModUi = pulseModUi;
    this.inputModUi = inputModUi;
    this.turbulenceUi = turbulenceUi;
    this.voronoiUi = voronoiUi;
    this.organicUi = organicUi;

    this.protectedPresets = ["Default"];
    this.defaultPreset = "Default";

    // TODO - REVIEW DEFAULT PRESET LOGIC
    // SHOULD BE CREATED FROM START VALUES

    if (!this.presets.Default) {
      this.presets.Default = defaultPresetData;

      this.saveToStorage();
    }
  }

  // REDONE - WORKING?
  extractDataFromUI() {
    try {
      const data = {
        param: {},
        particle: {},
        gravity: {},
        collision: {},
        boundary: {},
        restState: {},
        turbulence: {},
        voronoi: {},
        organic: {},
        pulseModulation: null,
        inputModulation: null,
        _meta: {
          timestamp: Date.now(),
          version: "1.0",
        },
      };

      // For each UI component, use getControlTargets() if available
      if (
        this.paramUi &&
        typeof this.paramUi.getControlTargets === "function"
      ) {
        data.param = this.paramUi.getControlTargets();
      }

      if (
        this.particleUi &&
        typeof this.particleUi.getControlTargets === "function"
      ) {
        data.particle = this.particleUi.getControlTargets();
      }

      if (
        this.gravityUi &&
        typeof this.gravityUi.getControlTargets === "function"
      ) {
        data.gravity = this.gravityUi.getControlTargets();
      }

      if (
        this.collisionUi &&
        typeof this.collisionUi.getControlTargets === "function"
      ) {
        data.collision = this.collisionUi.getControlTargets();
      }

      if (
        this.boundaryUi &&
        typeof this.boundaryUi.getControlTargets === "function"
      ) {
        data.boundary = this.boundaryUi.getControlTargets();
      }

      if (
        this.restStateUi &&
        typeof this.restStateUi.getControlTargets === "function"
      ) {
        data.restState = this.restStateUi.getControlTargets();
      }

      if (
        this.turbulenceUi &&
        typeof this.turbulenceUi.getControlTargets === "function"
      ) {
        data.turbulence = this.turbulenceUi.getControlTargets();
      }

      if (
        this.voronoiUi &&
        typeof this.voronoiUi.getControlTargets === "function"
      ) {
        data.voronoi = this.voronoiUi.getControlTargets();
      }

      if (
        this.organicUi &&
        typeof this.organicUi.getControlTargets === "function"
      ) {
        data.organic = this.organicUi.getControlTargets();
      }

      // Use getModulatorsData for modulator UIs
      if (
        this.pulseModUi &&
        typeof this.pulseModUi.getModulatorsData === "function"
      ) {
        data.pulseModulation = this.pulseModUi.getModulatorsData();
      }

      if (
        this.inputModUi &&
        typeof this.inputModUi.getModulatorsData === "function"
      ) {
        data.inputModulation = this.inputModUi.getModulatorsData();
      }

      return data;
    } catch (error) {
      console.error("Error extracting UI data:", error);
      return null;
    }
  }

  // Improved data loading with sanitization
  applyDataToUI(presetName, uiComponent = null) {
    try {
      const preset = this.presets[presetName];
      if (!preset) {
        console.error(`Preset "${presetName}" not found`);
        return false;
      }

      // A safe load function that catches errors and sanitizes data
      const safeLoad = (ui, data, name) => {
        if (!ui || typeof ui.load !== "function") return false;

        try {
          console.log(`Loading ${name} data`);
          ui.load(data);
          return true;
        } catch (err) {
          console.error(`Error loading ${name} data:`, err);
          return false;
        }
      };

      // Apply left GUI settings safely
      safeLoad(this.paramUi, preset.param, "paramUi");
      safeLoad(this.particleUi, preset.particle, "particleUi");
      safeLoad(this.gravityUi, preset.gravity, "gravityUi");
      safeLoad(this.collisionUi, preset.collision, "collisionUi");
      safeLoad(this.boundaryUi, preset.boundary, "boundaryUi");
      safeLoad(this.restStateUi, preset.restState, "restStateUi");
      safeLoad(this.turbulenceUi, preset.turbulence, "turbulenceUi");
      safeLoad(this.voronoiUi, preset.voronoi, "voronoiUi");
      safeLoad(this.organicUi, preset.organic, "organicUi");

      if (
        preset.pulseModulation &&
        this.pulseModUi &&
        typeof this.pulseModUi.loadPresetData === "function"
      ) {
        try {
          this.pulseModUi.loadPresetData(preset.pulseModulation);
        } catch (err) {
          console.error("Error loading pulse modulation:", err);
        }
      }

      if (
        preset.inputModulation &&
        this.inputModUi &&
        typeof this.inputModUi.loadPresetData === "function"
      ) {
        try {
          this.inputModUi.loadPresetData(preset.inputModulation);
        } catch (err) {
          console.error("Error loading InputModulation settings:", err);
        }
      }

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying master preset ${presetName}:`, error);
      return false;
    }
  }

  // Add import/export methods
  importPreset(presetName, data) {
    try {
      if (!data || typeof data !== "object") {
        console.error("Invalid import data format");
        return false;
      }

      // Add metadata if not present
      if (!data._meta) {
        data._meta = {
          timestamp: Date.now(),
          imported: true,
        };
      }

      // Save the imported data as a preset
      return this.savePreset(presetName, data);
    } catch (error) {
      console.error("Error importing preset:", error);
      return false;
    }
  }

  exportPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.error(`Preset "${presetName}" not found for export`);
      return null;
    }

    // Return a deep copy to prevent modification
    return JSON.parse(JSON.stringify(preset));
  }

  savePreset(presetName, data = null, protectedList = this.protectedPresets) {
    // Extract data if not provided (main use case)
    const presetData = data || this.extractDataFromUI();
    if (!presetData) return false;

    console.log(`Saving master preset ${presetName}`);
    return super.savePreset(presetName, presetData, protectedList);
  }

  loadPreset(presetName) {
    return this.applyDataToUI(presetName);
  }

  deletePreset(presetName) {
    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
