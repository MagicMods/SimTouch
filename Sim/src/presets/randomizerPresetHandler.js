import { PresetBaseHandler } from "./presetBaseHandler.js";

export class RandomizerPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
  }

  applyPreset(presetName, uiComponent) {
    if (presetName === "None" || presetName === "All") {
      if (uiComponent && typeof uiComponent.setData === "function") {
        const success = uiComponent.setData(presetName);
        if (success) this.selectedPreset = presetName;
        return success;
      }
      return false;
    }

    if (!uiComponent) {
      console.warn("UI component not provided");
      return false;
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    if (typeof uiComponent.setData === "function") {
      const success = uiComponent.setData(preset);
      if (success) this.selectedPreset = presetName;
      return success;
    }

    console.warn("UI component doesn't implement setData()");
    return false;
  }

  savePresetFromUI(presetName, uiComponent) {
    if (!uiComponent || typeof uiComponent.getData !== "function") {
      console.warn("UI component doesn't implement getData()");
      return false;
    }

    const data = uiComponent.getData();
    return this.savePreset(presetName, data);
  }

  deletePreset(presetName) {
    if (this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot delete protected preset: ${presetName}`);
      return false;
    }

    if (!this.presets[presetName]) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    delete this.presets[presetName];
    this.saveToStorage();

    if (this.selectedPreset === presetName) {
      this.selectedPreset = null;
    }

    return true;
  }
}


