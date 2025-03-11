import { PresetBaseHandler } from "./presetBaseHandler.js";

// For simple controller-based UIs (Turbulence, Voronoi)
export class SimplePresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
  }

  applyPreset(presetName, uiComponent) {
    // Special handling for "None" preset
    if (presetName === "None") {
      if (uiComponent && typeof uiComponent.setData === "function") {
        // Pass "None" directly to setData to trigger special handling
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

    // Use setData method (existing code)
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

  // Update the ModulatorPresetHandler.applyPreset method to debug
  applyPreset(presetName, uiComponent) {
    // Handle special case for "None" preset
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

    // DIAGNOSTIC: Log the preset structure
    console.log(`Applying preset ${presetName}:`, JSON.stringify(preset));

    // Use setData method
    if (typeof uiComponent.setData === "function") {
      const success = uiComponent.setData(preset);
      if (success) this.selectedPreset = presetName;
      return success;
    } else {
      console.error(
        `UI component for ${presetName} doesn't implement setData()`
      );
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
    // Special handling for Default preset
    if (presetName === "Default") {
      console.log("Loading Default master preset");
      return this.applyDefaultPreset();
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    let success = true;
    console.log(`Applying master preset: ${presetName}`);

    try {
      // Apply data to standard UI components
      [
        "paramUi",
        "particleUi",
        "gravityUi",
        "collisionUi",
        "boundaryUi",
        "restStateUi",
        "turbulenceUi",
        "voronoiUi",
        "organicUi",
        "gridUi",
      ].forEach((key) => {
        const component = this.uiComponents[key];
        if (
          component &&
          preset[key] &&
          typeof component.setData === "function"
        ) {
          try {
            console.log(`Applying preset to ${key}`);
            const componentSuccess = component.setData(preset[key]);
            success = success && componentSuccess;
          } catch (error) {
            console.error(`Error applying preset to ${key}:`, error);
            success = false;
          }
        }
      });

      // Handle special modulation components
      if (this.uiComponents.pulseModUi && preset.pulseModUi) {
        console.log("Applying pulse modulation preset");
        const pulseSuccess = this.uiComponents.pulseModUi.setData(
          preset.pulseModUi
        );
        success = success && pulseSuccess;
      }

      if (this.uiComponents.inputModUi && preset.inputModUi) {
        console.log("Applying input modulation preset");
        const inputSuccess = this.uiComponents.inputModUi.setData(
          preset.inputModUi
        );
        success = success && inputSuccess;
      }
    } catch (error) {
      console.error("Error applying master preset:", error);
      success = false;
    }

    if (success) {
      this.selectedPreset = presetName;
      console.log(`Successfully applied master preset: ${presetName}`);
    }

    return success;
  }

  // Apply default settings to all components
  applyDefaultPreset() {
    let success = true;

    try {
      // Reset all simple UI components to defaults
      ["turbulenceUi", "voronoiUi"].forEach((key) => {
        const component = this.uiComponents[key];
        if (component && typeof component.setData === "function") {
          try {
            console.log(`Resetting ${key} to None`);
            const componentSuccess = component.setData("None");
            success = success && componentSuccess;
          } catch (error) {
            console.error(`Error resetting ${key}:`, error);
            success = false;
          }
        }
      });

      // Reset modulation components
      if (
        this.uiComponents.pulseModUi &&
        typeof this.uiComponents.pulseModUi.clearAllModulators === "function"
      ) {
        console.log("Clearing pulse modulators");
        this.uiComponents.pulseModUi.clearAllModulators();
      }

      if (
        this.uiComponents.inputModUi &&
        typeof this.uiComponents.inputModUi.clearAllModulators === "function"
      ) {
        console.log("Clearing input modulators");
        this.uiComponents.inputModUi.clearAllModulators();
      }

      this.selectedPreset = "Default";
    } catch (error) {
      console.error("Error applying default preset:", error);
      success = false;
    }

    return success;
  }

  // More consistent implementation that matches individual handlers
  savePresetFromUI(presetName) {
    if (!this.uiComponents) {
      console.warn("No UI components registered");
      return false;
    }

    try {
      const data = {};

      // Extract data from each UI component using getData
      Object.entries(this.uiComponents).forEach(([key, component]) => {
        if (component && typeof component.getData === "function") {
          try {
            data[key] = component.getData();
            console.log(`Saved data from ${key}`);
          } catch (error) {
            console.error(`Error getting data from ${key}:`, error);
          }
        }
      });

      return this.savePreset(presetName, data);
    } catch (error) {
      console.error("Error saving master preset:", error);
      return false;
    }
  }
}
