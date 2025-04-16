// filepath: /project-root/src/presets/modulatorPresetHandler.js
import { PresetBaseHandler } from "./presetBaseHandler.js";

export class ModulatorPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets, debugFlag) {
    super(storageKey, defaultPresets, protectedPresets);
    this.debugFlag = debugFlag;
  }

  applyPreset(presetName, uiComponent) {
    if (presetName === "None") {
      if (uiComponent && typeof uiComponent.clearAllModulators === "function") {
        uiComponent.clearAllModulators();
        this.selectedPreset = "None";
        return true;
      }
    }

    if (!uiComponent) {
      console.error("UI component not provided");
      return false;
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.error(`Preset not found: ${presetName}`);
      return false;
    }

    if (this.debugFlag) console.log(`Applying preset ${presetName}:`, JSON.stringify(preset));

    if (typeof uiComponent.setData === "function") {
      const success = uiComponent.setData(preset);
      if (success) this.selectedPreset = presetName;
      return success;
    } else {
      console.error(`UI component for ${presetName} doesn't implement setData()`);
      return false;
    }
  }

  savePresetFromUI(presetName, uiComponent) {
    if (!uiComponent) return false;

    let data;
    if (typeof uiComponent.getModulatorsData === "function") {
      data = uiComponent.getModulatorsData();
    } else if (typeof uiComponent.getData === "function") {
      data = uiComponent.getData();
    } else {
      console.warn("UI component doesn't implement getModulatorsData() or getData()");
      return false;
    }
    this.selectedPreset = presetName;
    return this.savePreset(presetName, data);
  }
}