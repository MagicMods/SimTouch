import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMasterHandler extends PresetBaseHandler {
  constructor(leftGui, rightGui, pulseModUi, inputModUi) {
    // Call super first with empty default presets
    super("savedPresets", {});

    // Store references to UI components
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputModUi = inputModUi;

    this.protectedPresets = ["Default"];
    this.defaultPreset = "Default";

    // Now create the default preset data
    const defaultPresetData = {
      left: this.filterInputFolders(leftGui?.save?.() || {}),
      right: rightGui?.save?.() || {},
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
      right: {},
      pulseModulation: null,
      micSettings: null,
      _meta: {
        timestamp: Date.now(),
      },
    };

    try {
      // Get data from left UI - save with input-related folders filtered out
      if (this.leftGui && typeof this.leftGui.save === "function") {
        const leftData = this.leftGui.save();
        // Use the shared filtering method
        data.left = this.filterInputFolders(leftData);
        console.log("Extracted and filtered leftUi data");
      }

      // Rest of method remains unchanged
      if (this.rightGui && typeof this.rightGui.save === "function") {
        data.right = this.rightGui.save();
        console.log("Extracted rightUi data");
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
      safeLoad(this.leftGui, preset.left, "leftUi");

      // Apply right GUI settings safely
      safeLoad(this.rightGui, preset.right, "rightUi");

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
