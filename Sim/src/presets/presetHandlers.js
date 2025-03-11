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
    this.initialState = null;
  }

  setComponents(components) {
    this.uiComponents = components;

    // Capture initial state when components are set
    this.captureInitialState();
  }

  // Capture the initial state WITHOUT conditional checks
  captureInitialState() {
    console.log("Capturing initial UI state for Default preset");
    this.initialState = {};

    try {
      // Extract data from each UI component
      Object.entries(this.uiComponents).forEach(([key, component]) => {
        try {
          this.initialState[key] = component.getData();
          console.log(`Captured initial state from ${key}`);
        } catch (error) {
          console.error(`Error capturing initial state from ${key}:`, error);
        }
      });

      // Save this as the Default preset
      this.presets["Default"] = this.initialState;
      this.saveToStorage();

      console.log("Initial state captured and saved as Default preset");
    } catch (error) {
      console.error("Error in captureInitialState:", error);
    }
  }

  // Apply default preset WITHOUT conditional checks
  applyDefaultPreset() {
    console.log("Applying Default master preset");
    let success = true;

    try {
      if (this.initialState) {
        // Apply the captured initial state to each component
        Object.entries(this.initialState).forEach(([key, data]) => {
          try {
            const component = this.uiComponents[key];
            const componentSuccess = component.setData(data);
            if (!componentSuccess) {
              console.warn(`Component ${key} returned false from setData()`);
              success = false;
            }
          } catch (error) {
            console.error(`Error applying initial state to ${key}:`, error);
            success = false;
          }
        });
      } else {
        // No initial state captured, reset critical components
        console.warn("No initial state data - resetting critical components");
        this.resetCriticalComponents();
      }

      this.selectedPreset = "Default";
    } catch (error) {
      console.error("Error applying Default preset:", error);
      success = false;
    }

    return success;
  }

  // Reset critical components WITHOUT conditional checks
  resetCriticalComponents() {
    console.log("Resetting critical components to defaults");
    let success = true;

    try {
      // Reset turbulence and voronoi
      ["turbulenceUi", "voronoiUi"].forEach((key) => {
        try {
          const component = this.uiComponents[key];
          component.setData("None");
        } catch (error) {
          console.error(`Error resetting ${key}:`, error);
          success = false;
        }
      });

      // Clear modulators
      try {
        this.uiComponents.pulseModUi.clearAllModulators();
      } catch (error) {
        console.error("Error clearing pulse modulators:", error);
        success = false;
      }

      try {
        this.uiComponents.inputModUi.clearAllModulators();
      } catch (error) {
        console.error("Error clearing input modulators:", error);
        success = false;
      }
    } catch (error) {
      console.error("Error in resetCriticalComponents:", error);
      success = false;
    }

    return success;
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
