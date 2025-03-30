import { PresetBaseHandler } from "./presetBaseHandler.js";

export class RandomizerPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
  }

  applyPreset(presetName, uiComponent) {
    console.log(`RandomizerPresetHandler: Applying preset "${presetName}"`);

    if (!uiComponent) {
      console.error("RandomizerPresetHandler: UI component not provided");
      return false;
    }

    // Special case handling for None/All
    if (presetName === "None" || presetName === "All") {
      if (typeof uiComponent.setData === "function") {
        console.log(`RandomizerPresetHandler: Applying special preset "${presetName}"`);
        const success = uiComponent.setData(presetName);
        if (success) this.selectedPreset = presetName;
        return success;
      }
      return false;
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.error(`RandomizerPresetHandler: Preset not found: ${presetName}`);
      return false;
    }

    if (typeof uiComponent.setData === "function") {
      console.log(`RandomizerPresetHandler: Applying preset data for "${presetName}"`, preset);
      const success = uiComponent.setData(preset);
      if (success) this.selectedPreset = presetName;
      return success;
    }

    console.error("RandomizerPresetHandler: UI component doesn't implement setData()");
    return false;
  }

  savePresetFromUI(presetName, uiComponent) {
    console.log(`RandomizerPresetHandler: Saving preset "${presetName}" from UI`);

    if (!uiComponent || typeof uiComponent.getData !== "function") {
      console.error("RandomizerPresetHandler: UI component doesn't implement getData()");
      return false;
    }

    const data = uiComponent.getData();
    console.log(`RandomizerPresetHandler: Got data for preset "${presetName}"`, data);

    this.selectedPreset = presetName;
    return this.savePreset(presetName, data);
  }

  deletePreset(presetName) {
    if (this.protectedPresets.includes(presetName)) {
      console.warn(`RandomizerPresetHandler: Cannot delete protected preset: ${presetName}`);
      return false;
    }

    if (!this.presets[presetName]) {
      console.warn(`RandomizerPresetHandler: Preset not found: ${presetName}`);
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


