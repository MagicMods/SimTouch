class PresetManager {
  constructor(leftGui) {
    if (!leftGui) {
      throw new Error("Left GUI instance required");
    }
    this.leftGui = leftGui;
    this.presets = this.loadPresetsFromStorage();
    this.selectedPreset = "Default";
  }

  loadPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedPresets");
    return storedPresets
      ? JSON.parse(storedPresets)
      : { Default: { left: this.leftGui.save() } };
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
    this.presets[presetName] = { left: this.leftGui.save() };
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
    if (preset && preset.left) {
      this.leftGui.load(preset.left);
      this.selectedPreset = presetName;
      console.log(`Loaded preset "${presetName}":`, preset);
      return true;
    }
    return false;
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }
}

export { PresetManager };
