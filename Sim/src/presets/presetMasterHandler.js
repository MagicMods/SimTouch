import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMasterHandler extends PresetBaseHandler {
  constructor(
    leftUi,
    pulseModUi,
    inputModUi,
    turbulenceUi,
    voronoiUi,
    organicUi,
    gridUi
  ) {
    // Call super first with empty default presets
    super("savedPresets", {});

    // Store references to UI components
    this.leftUi = leftUi;

    // Store specialized UI components instead of rightGui
    this.turbulenceUi = turbulenceUi;
    this.voronoiUi = voronoiUi;
    this.organicUi = organicUi;
    this.gridUi = gridUi;

    this.pulseModUi = pulseModUi;
    this.inputModUi = inputModUi;

    this.protectedPresets = ["Default"];
    this.defaultPreset = "Default";

    // Now create the default preset data
    const defaultPresetData = {
      left: this.filterInputFolders(leftUi?.save?.() || {}),

      // Replace rightGui with individual UIs
      ui: {
        turbulence: turbulenceUi?.save?.() || {},
        voronoi: voronoiUi?.save?.() || {},
        organic: organicUi?.save?.() || {},
        grid: gridUi?.save?.() || {},
      },

      pulseModulation: null,
      micSettings: null,
    };

    // Only update the Default preset, preserve all other presets
    if (!this.presets.Default) {
      this.presets.Default = defaultPresetData;
      // Only save to storage if we had to create the Default preset
      this.saveToStorage();
    }
  }

  // Helper method to filter input folders from data
  filterInputFolders(data) {
    if (!data || !data.folders) return data;

    // Create deep copy to avoid modifying original
    const filteredData = JSON.parse(JSON.stringify(data));

    // List of input-related folders to remove
    const inputFolders = [
      "Inputs",
      "Debug",
      "Mouse Input",
      "EMU Input",
      "Touch Input",
      "External Input",
      "UDP Network",
    ];
    inputFolders.forEach((folder) => {
      if (filteredData.folders[folder]) {
        delete filteredData.folders[folder];
      }
    });

    return filteredData;
  }

  extractDataFromUI() {
    const data = {
      left: {},

      // Structure for specialized UI components
      ui: {
        turbulence: {},
        voronoi: {},
        organic: {},
        grid: {},
      },

      pulseModulation: null,
      micSettings: null,
      _meta: {
        timestamp: Date.now(),
      },
    };

    try {
      // Get data from left UI - save with input-related folders filtered out
      if (this.leftUi && typeof this.leftUi.save === "function") {
        const leftData = this.leftUi.save();
        // Use the shared filtering method
        data.left = this.filterInputFolders(leftData);
        console.log("Extracted and filtered leftUi data");
      }

      // Extract data from all specialized UI components
      if (this.turbulenceUi && typeof this.turbulenceUi.save === "function") {
        data.ui.turbulence = this.turbulenceUi.save();
        console.log("Extracted turbulenceUi data");
      }

      if (this.voronoiUi && typeof this.voronoiUi.save === "function") {
        data.ui.voronoi = this.voronoiUi.save();
        console.log("Extracted voronoiUi data");
      }

      if (this.organicUi && typeof this.organicUi.save === "function") {
        data.ui.organic = this.organicUi.save();
        console.log("Extracted organicUi data");
      }

      if (this.gridUi && typeof this.gridUi.save === "function") {
        data.ui.grid = this.gridUi.save();
        console.log("Extracted gridUi data");
      }

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
        data.micSettings = this.inputModUi.getModulatorsData();
      }
    } catch (error) {
      console.error("Error extracting UI data:", error);
    }

    return data;
  }

  // New method to sanitize the left UI data
  sanitizeLeftUiData(data) {
    if (!data) return;

    // Make sure folders exist
    data.folders = data.folders || {};

    // Check that Show folder exists
    if (data.folders.Show) {
      // Ensure show property exists on controllers
      for (const key in data.folders.Show.controllers) {
        if (
          data.folders.Show.controllers[key] &&
          !data.folders.Show.controllers[key].hasOwnProperty("show")
        ) {
          data.folders.Show.controllers[key].show = true;
        }
      }
    }

    // Check controllers
    data.controllers = data.controllers || {};

    return data;
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
      safeLoad(this.leftUi, preset.left, "leftUi");

      // Handle backward compatibility - if preset has right property but not ui
      if (preset.right && !preset.ui) {
        // Legacy format - load the right data into all UIs
        // This helps migrate old presets
        safeLoad(this.turbulenceUi, preset.right, "turbulenceUi");
        safeLoad(this.voronoiUi, preset.right, "voronoiUi");
        safeLoad(this.organicUi, preset.right, "organicUi");
        safeLoad(this.gridUi, preset.right, "gridUi");
      }
      // If we have the new ui format, apply to each component
      else if (preset.ui) {
        if (preset.ui.turbulence) {
          safeLoad(this.turbulenceUi, preset.ui.turbulence, "turbulenceUi");
        }
        if (preset.ui.voronoi) {
          safeLoad(this.voronoiUi, preset.ui.voronoi, "voronoiUi");
        }
        if (preset.ui.organic) {
          safeLoad(this.organicUi, preset.ui.organic, "organicUi");
        }
        if (preset.ui.grid) {
          safeLoad(this.gridUi, preset.ui.grid, "gridUi");
        }
      }

      // Apply pulse modulation
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

      // Apply mic settings
      if (
        preset.micSettings &&
        this.inputModUi &&
        typeof this.inputModUi.loadPresetData === "function"
      ) {
        try {
          this.inputModUi.loadPresetData(preset.micSettings);
        } catch (err) {
          console.error("Error loading mic settings:", err);
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

      // Sanitize the data
      if (data.left) {
        this.sanitizeLeftUiData(data.left);
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
