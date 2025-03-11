import { PresetBaseHandler } from "./presetBaseHandler.js";

// For simple controller-based UIs (Turbulence, Voronoi)
export class SimplePresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
  }

  applyPreset(presetName, uiComponent) {
    if (!uiComponent) {
      console.warn("UI component not provided");
      return false;
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    // Standardized approach: use setData method
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
}

// For complex modulator-based UIs (Pulse, Input)
export class ModulatorPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
  }

  applyPreset(presetName, uiComponent) {
    if (!uiComponent) {
      console.warn("UI component not provided");
      return false;
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    // Use specific loadPresetData for modulators if available
    if (typeof uiComponent.loadPresetData === "function") {
      const success = uiComponent.loadPresetData(preset);
      if (success) this.selectedPreset = presetName;
      return success;
    } else if (typeof uiComponent.setData === "function") {
      // Fall back to standard interface
      const success = uiComponent.setData(preset);
      if (success) this.selectedPreset = presetName;
      return success;
    }

    console.warn(
      "UI component doesn't implement loadPresetData() or setData()"
    );
    return false;
  }

  savePresetFromUI(presetName, uiComponent) {
    if (!uiComponent) return false;

    let data;
    if (typeof uiComponent.getModulatorsData === "function") {
      data = uiComponent.getModulatorsData();
    } else if (typeof uiComponent.getData === "function") {
      data = uiComponent.getData();
    } else {
      console.warn(
        "UI component doesn't implement getModulatorsData() or getData()"
      );
      return false;
    }

    return this.savePreset(presetName, data);
  }
}

// For master presets (all UI components)
export class MasterPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
    this.uiComponents = {};
  }

  setComponents(components) {
    this.uiComponents = components;
  }

  applyPreset(presetName) {
    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    let success = true;

    // Apply data to each UI component
    for (const [key, component] of Object.entries(this.uiComponents)) {
      if (component && preset[key]) {
        if (typeof component.setData === "function") {
          try {
            const componentSuccess = component.setData(preset[key]);
            success = success && componentSuccess;
          } catch (error) {
            console.error(`Error applying preset to ${key}:`, error);
            success = false;
          }
        }
      }
    }

    if (success) this.selectedPreset = presetName;
    return success;
  }

  savePresetFromUI(presetName) {
    if (!this.uiComponents) {
      console.warn("No UI components registered");
      return false;
    }

    const data = {};

    // Extract data from each UI component
    for (const [key, component] of Object.entries(this.uiComponents)) {
      if (component && typeof component.getData === "function") {
        try {
          data[key] = component.getData();
        } catch (error) {
          console.error(`Error getting data from ${key}:`, error);
        }
      }
    }

    return this.savePreset(presetName, data);
  }
}
