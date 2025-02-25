class PresetManager {
  constructor(leftGui, rightGui) {
    if (!leftGui || !rightGui) {
      throw new Error("Both GUI instances required");
    }
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.presets = this.loadPresetsFromStorage();
    this.turbPresets = this.loadTurbPresetsFromStorage();
    this.selectedPreset = "Default";
    this.selectedTurbPreset = "None";
  }

  loadPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedPresets");
    return storedPresets
      ? JSON.parse(storedPresets)
      : { Default: { left: this.leftGui.save(), right: this.rightGui.save() } };
  }

  savePresetsToStorage() {
    localStorage.setItem("savedPresets", JSON.stringify(this.presets));
    console.log("Saved presets to storage:", this.presets);
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  savePreset(presetName) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }
    if (this.presets[presetName]) {
      alert("Preset name already exists!");
      return false;
    }
    this.presets[presetName] = {
      left: this.leftGui.save(),
      right: this.rightGui.save(),
    };
    this.selectedPreset = presetName;
    this.savePresetsToStorage();
    return true;
  }

  deletePreset(presetName) {
    if (presetName === "Default") {
      alert("Cannot delete the Default preset!");
      return false;
    }
    if (!this.presets[presetName]) {
      console.warn("Preset not found:", presetName);
      return false;
    }
    delete this.presets[presetName];
    this.selectedPreset = "Default";
    this.savePresetsToStorage();
    return true;
  }

  loadPreset(presetName) {
    const preset = this.presets[presetName];
    if (preset) {
      if (preset.left) this.leftGui.load(preset.left);
      if (preset.right) this.rightGui.load(preset.right);
      this.selectedPreset = presetName;
      console.log(`Loaded preset "${presetName}":`, preset);
      return true;
    }
    return false;
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }

  loadTurbPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedTurbPresets");
    const defaults = {
      None: { turb: { controllers: [{ property: "strength", value: 0 }] } },
    };
    return storedPresets
      ? { ...defaults, ...JSON.parse(storedPresets) }
      : defaults;
  }

  saveTurbPresetsToStorage() {
    localStorage.setItem("savedTurbPresets", JSON.stringify(this.turbPresets));
    console.log("Saved turbulence presets to storage:", this.turbPresets);
  }

  getTurbPresetOptions() {
    return Object.keys(this.turbPresets);
  }

  saveTurbPreset(presetName, turbGui) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }
    if (this.turbPresets[presetName]) {
      alert("Turbulence preset name already exists!");
      return false;
    }
    const fullState = turbGui.save();
    console.log("Full turbulence GUI state:", fullState);
    this.turbPresets[presetName] = { turb: fullState };
    this.selectedTurbPreset = presetName;
    this.saveTurbPresetsToStorage();
    return true;
  }

  deleteTurbPreset(presetName) {
    if (presetName === "None") {
      alert("Cannot delete the None turbulence preset!");
      return false;
    }
    if (!this.turbPresets[presetName]) {
      console.warn("Turbulence preset not found:", presetName);
      return false;
    }
    delete this.turbPresets[presetName];
    this.selectedTurbPreset = "None";
    this.saveTurbPresetsToStorage();
    return true;
  }

  loadTurbPreset(presetName, turbGui) {
    const preset = this.turbPresets[presetName];
    if (preset && preset.turb) {
      console.log("Loading turbulence preset state:", preset.turb);
      try {
        turbGui.load(preset.turb);
      } catch (e) {
        console.error("Failed to load preset via lil-gui load:", e);
        const applyControllers = (controllers, gui) => {
          controllers.forEach((c) => {
            const controller = gui
              .controllersRecursive()
              .find((ctrl) => ctrl.property === c.property);
            if (controller) controller.setValue(c.value);
          });
        };
        const traverseFolders = (state, gui) => {
          if (state.controllers) applyControllers(state.controllers, gui);
          if (state.folders) {
            Object.entries(state.folders).forEach(([key, folderState]) => {
              const folder = gui.folders.find((f) => f._title === key);
              if (folder) traverseFolders(folderState, folder);
            });
          }
        };
        traverseFolders(preset.turb, turbGui);
      }
      // Always enforce strength = 0 for "None"
      if (presetName === "None") {
        const strengthController = turbGui
          .controllersRecursive()
          .find((c) => c.property === "strength");
        if (strengthController) {
          strengthController.setValue(0);
          console.log("Manually set strength to 0 for 'None'");
        } else {
          console.warn(
            "Strength controller not found in RightUi GUI controllersRecursive"
          );
        }
      }
      this.selectedTurbPreset = presetName;
      console.log(`Loaded turbulence preset "${presetName}":`, preset);
      return true;
    }
    return false;
  }

  getSelectedTurbPreset() {
    return this.selectedTurbPreset;
  }
}

export { PresetManager };
