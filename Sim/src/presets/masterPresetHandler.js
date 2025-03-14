import { PresetBaseHandler } from "./presetBaseHandler.js";

export class MasterPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
    this.uiComponents = {};
    this.initialState = null;
  }

  setComponents(components) {
    this.uiComponents = components;
    this.captureInitialState();
  }

  captureInitialState() {
    // console.log("Capturing initial UI state for Default preset");
    this.initialState = {};

    try {
      Object.entries(this.uiComponents).forEach(([key, component]) => {
        try {
          this.initialState[key] = component.getData();
          // console.log(`Captured initial state from ${key}`);
        } catch (error) {
          console.error(`Error capturing initial state from ${key}:`, error);
        }
      });

      this.presets["Default"] = this.initialState;
      this.saveToStorage();
      // console.log("Initial state captured and saved as Default preset");
    } catch (error) {
      console.error("Error in captureInitialState:", error);
    }
  }

  applyDefaultPreset() {
    console.log("Applying Default master preset");
    let success = true;

    try {
      if (this.initialState) {
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
        console.warn("No initial state captured - resetting critical components");
        this.resetCriticalComponents();
      }

      this.selectedPreset = "Default";
    } catch (error) {
      console.error("Error applying Default preset:", error);
      success = false;
    }

    return success;
  }

  resetCriticalComponents() {
    console.log("Resetting critical components to defaults");
    let success = true;

    try {
      ["turbulenceUi", "voronoiUi"].forEach((key) => {
        try {
          const component = this.uiComponents[key];
          component.setData("None");
        } catch (error) {
          console.error(`Error resetting ${key}:`, error);
          success = false;
        }
      });

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
    if (presetName === "Default") {
      // console.log("Loading Default master preset");
      return this.applyDefaultPreset();
    }

    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    let success = true;
    // console.log(`Applying master preset: ${presetName}`);

    try {
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
      ].forEach((key) => {
        const component = this.uiComponents[key];
        if (component && preset[key] && typeof component.setData === "function") {
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

      if (this.uiComponents.pulseModUi && preset.pulseModUi) {
        // console.log("Applying pulse modulation preset");
        const pulseSuccess = this.uiComponents.pulseModUi.setData(preset.pulseModUi);
        success = success && pulseSuccess;
      }

      if (this.uiComponents.inputModUi && preset.inputModUi) {
        // console.log("Applying input modulation preset");
        const inputSuccess = this.uiComponents.inputModUi.setData(preset.inputModUi);
        success = success && inputSuccess;
      }
    } catch (error) {
      console.error("Error applying master preset:", error);
      success = false;
    }

    if (success) {
      this.selectedPreset = presetName;
      // console.log(`Successfully applied master preset: ${presetName}`);
    }

    return success;
  }

  savePresetFromUI(presetName) {
    if (!this.uiComponents) {
      // console.warn("No UI components registered");
      return false;
    }

    try {
      const data = {};
      Object.entries(this.uiComponents).forEach(([key, component]) => {
        if (component && typeof component.getData === "function") {
          try {
            data[key] = component.getData();
            // console.log(`Saved data from ${key}`);
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