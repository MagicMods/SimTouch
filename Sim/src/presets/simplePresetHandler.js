import { PresetBaseHandler } from "./presetBaseHandler.js";

export class SimplePresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets, debugFlag) {
    super(storageKey, defaultPresets, protectedPresets);
    this.debugFlag = debugFlag;
  }

  applyPreset(presetName, uiComponent) {
    if (presetName === "None") {
      if (uiComponent && typeof uiComponent.setData === "function") {
        const success = uiComponent.setData("None");
        if (success) this.selectedPreset = "None";
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
    this.selectedPreset = presetName;
    return this.savePreset(presetName, data);
  }
}