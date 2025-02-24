export class PresetManager {
  constructor(leftGui, rightGui) {
    if (!leftGui || !rightGui) {
      throw new Error("Both GUI instances required");
    }

    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.presets = {
      main: {},
      turbulences: {},
    };
    this.defaultPreset = null;
    this.currentPreset = null;
    this._debug = true; // Enable debug logging
    this.serverUrl = "http://localhost:5502"; // Updated server URL
    this.initLocalStorage();
  }

  getPresetList() {
    return Object.keys(this.presets?.main || {});
  }

  getTurbulencePresetList() {
    return Object.keys(this.presets?.turbulences || {});
  }

  initLocalStorage() {
    const savedPresets = localStorage.getItem("flipsim_presets");
    if (savedPresets) {
      try {
        this.presets = JSON.parse(savedPresets);
      } catch (e) {
        console.warn("Failed to load presets from localStorage:", e);
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    this.presets = {
      main: {
        Default: {
          // Default preset values
          particles: { count: 500, radius: 0.01 },
          physics: { damping: 0.98, stiffness: 0.3 },
          turbulence: { strength: 0, scale: 1 },
        },
      },
      turbulences: {},
    };
    this.saveToLocalStorage();
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem("flipsim_presets", JSON.stringify(this.presets));
    } catch (e) {
      console.warn("Failed to save presets to localStorage:", e);
    }
  }

  async scanPresetFolder(type) {
    try {
      const response = await fetch(`${this.serverUrl}/list-presets/${type}`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (this._debug) {
        console.log(`Found ${type} presets:`, data.presets);
      }

      return data.presets;
    } catch (error) {
      console.error(`Error scanning ${type} presets:`, error);
      return [];
    }
  }

  async loadPreset(name, type = "main") {
    try {
      // Check cache first
      if (this.presets[type][name]) {
        if (this._debug) {
          console.log(`Using cached ${type} preset: ${name}`);
        }
        return this.presets[type][name];
      }

      // Load from server
      const response = await fetch(
        `${this.serverUrl}/load-preset/${type}/${name}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const preset = await response.json();

      // Handle different preset structures
      if (type === "turbulences") {
        // Turbulence presets are flat objects
        this.presets[type][name] = preset;
        return preset;
      } else {
        // Main presets use left/right structure
        if (!preset || (!preset.left && !preset.right)) {
          throw new Error("Invalid main preset structure");
        }

        // Store in cache
        this.presets[type][name] = preset;

        // Apply to both GUIs
        if (preset.left) {
          this.leftGui.load(preset.left);
          if (this._debug) console.log("Loaded left GUI state");
        }
        if (preset.right) {
          // Save current turbulence preset
          const currentTurbulencePreset =
            this.rightGui.save().folders?.Turbulence?.controllers?.Preset;

          // Load right GUI state
          this.rightGui.load(preset.right);

          // Restore turbulence preset if it exists
          if (currentTurbulencePreset) {
            const turbulenceFolder = this.rightGui.folders.Turbulence;
            if (turbulenceFolder) {
              turbulenceFolder.controllers.Preset = currentTurbulencePreset;
            }
          }
          if (this._debug) console.log("Loaded right GUI state");
        }

        // Update current preset
        this.currentPreset = name;
      }

      if (this._debug) {
        console.log(`Loaded ${type} preset: ${name}`, preset);
      }

      return preset;
    } catch (error) {
      console.error(`Failed to load preset ${name}:`, error);
      return null;
    }
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  exportCurrentState() {
    return this.leftGui.save();
  }

  async exportToFile(type = "main") {
    try {
      const state = this.leftGui.save();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `preset_${timestamp}.json`;

      // Create blob and download
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      if (this._debug) {
        console.log(`Exported preset to ${filename}`);
      }
      return filename;
    } catch (error) {
      console.error("Error exporting preset:", error);
      return null;
    }
  }

  async savePreset(name, type = "main") {
    try {
      if (!this.leftGui || !this.rightGui) {
        throw new Error("GUI instances not properly initialized");
      }

      // Get current GUI states
      const leftState = this.leftGui.save();
      const rightState = this.rightGui.save();

      // Create clean state
      const cleanState = {
        left: {
          controllers: leftState.controllers || {},
          folders: {},
        },
        right: {
          controllers: rightState.controllers || {},
          folders: {},
        },
      };

      // Define folders to exclude
      const excludeFolders = ["Presets", "UDP Network", "Debug"];
      // Define controllers to exclude from Turbulence folder
      const excludeTurbulenceControllers = ["Preset"];

      // Copy left GUI folders except excluded ones
      for (const [key, value] of Object.entries(leftState.folders)) {
        if (!excludeFolders.includes(key)) {
          cleanState.left.folders[key] = value;
        }
      }

      // Copy right GUI folders with specific exclusions
      for (const [key, value] of Object.entries(rightState.folders)) {
        if (key === "Grid") {
          // Only keep Gradient subfolder from Grid
          cleanState.right.folders[key] = {
            controllers: value.controllers || {},
            folders: {
              Gradient: value.folders.Gradient,
            },
          };
        } else if (key === "Turbulence") {
          // Copy Turbulence folder but exclude the Preset controller
          const turbulenceFolder = {
            controllers: {},
            folders: value.folders || {},
          };

          // Copy only non-excluded controllers
          for (const [ctrlKey, ctrlValue] of Object.entries(
            value.controllers
          )) {
            if (!excludeTurbulenceControllers.includes(ctrlKey)) {
              turbulenceFolder.controllers[ctrlKey] = ctrlValue;
            }
          }

          cleanState.right.folders[key] = turbulenceFolder;
        } else if (!excludeFolders.includes(key)) {
          cleanState.right.folders[key] = value;
        }
      }

      // Save to server
      const response = await fetch(`${this.serverUrl}/save-preset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          data: cleanState,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      if (this._debug) {
        console.log(`Saved preset: ${result.filename}`);
      }

      // Refresh preset list
      await this.scanPresetFolder(type);
      return result.filename;
    } catch (error) {
      console.error("Error saving preset:", error);
      return null;
    }
  }
}
