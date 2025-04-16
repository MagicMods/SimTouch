import { PresetBaseHandler } from "./presetBaseHandler.js";

export class MasterPresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets, debugFlag) {
    super(storageKey, defaultPresets, protectedPresets);
    this.debugFlag = debugFlag;
    this.uiComponents = {};
    this.initialState = null;
  }

  setComponents(components) {
    this.uiComponents = components;
    // setTimeout(() => this.captureInitialState(), 0); // Remove setTimeout
    // Don't call captureInitialState immediately
  }

  // New method to be called after handlers are set up
  finalizeInitialization() {
    this.captureInitialState();
  }

  captureInitialState() {
    if (this.getPreset("Default")) return; // Don't overwrite if Default exists
    if (this.debugFlag) console.log("Capturing initial UI state for Default preset");
    const initialState = {};
    for (const key of Object.keys(this.uiComponents)) {
      const uiComponent = this.uiComponents[key];
      if (uiComponent && typeof uiComponent.getData === "function") {
        initialState[key] = uiComponent.getData();
        if (this.debugFlag) console.log(`Captured initial state from ${key}`);
      } else {
        console.warn(`Could not capture initial state from ${key}`);
      }
    }
    this.savePreset("Default", initialState);
    if (this.debugFlag) console.log("Initial state captured and saved as Default preset");
  }

  applyDefaultPreset() {
    if (this.debugFlag) console.log("Applying Default master preset");
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
      if (this.debugFlag) console.log("Applying Default master preset");
      // Special handling for Default: Reload initial state
      const defaultState = this.getPreset("Default");
      if (defaultState) {
        // Add any specific reset logic here
        // Example: Reset simulation parameters or clear dynamic elements
        if (this.debugFlag) console.log("Resetting critical components to defaults");
        // TODO: Define what needs explicit resetting

        // After reset, apply the potentially modified 'Default' state
        let success = true;
        try {
          Object.entries(defaultState).forEach(([key, data]) => {
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
        } catch (error) {
          console.error("Error applying Default preset:", error);
          success = false;
        }

        if (success) {
          this.selectedPreset = "Default";
          if (this.debugFlag) console.log(`Successfully applied master preset: ${presetName}`);
        }
      }
      return success;
    }

    if (this.debugFlag) console.log("Loading Default master preset");
    const preset = this.getPreset(presetName);
    if (!preset) {
      console.warn(`Preset not found: ${presetName}`);
      return false;
    }

    if (this.debugFlag) console.log(`Applying master preset: ${presetName}`);
    let allSuccess = true;

    // Apply each part of the master preset
    [
      "paramUi",
      "particleUi",
      "gravityUi",
      "collisionUi",
      "boundaryUi",
      "turbulenceUi",
      "voronoiUi",
      "organicUi",
    ].forEach((key) => {
      const uiComponent = this.uiComponents[key];
      if (uiComponent && preset[key] && typeof uiComponent.setData === "function") {
        try {
          if (this.debugFlag) console.log(`Applying preset to ${key}`);
          const success = uiComponent.setData(preset[key]);
          if (!success) {
            console.error(`Error applying preset to ${key}:`, error);
            allSuccess = false;
          }
        } catch (error) {
          console.error(`Error applying preset to ${key}:`, error);
          allSuccess = false;
        }
      }
    });

    // Special handling for modulator types using dedicated presets
    if (this.uiComponents.pulseModUi && preset.pulseModUi) {
      const pulsePresetData = preset.pulseModUi;
      if (this.debugFlag) console.log("Applying pulse modulation preset");
      if (this.uiComponents.pulseModUi && typeof this.uiComponents.pulseModUi.setData === 'function') {
        this.uiComponents.pulseModUi.setData(pulsePresetData);
      }
    }

    if (this.uiComponents.inputModUi && preset.inputModUi) {
      const inputPresetData = preset.inputModUi;
      if (this.debugFlag) console.log("Applying input modulation preset");
      if (this.uiComponents.inputModUi && typeof this.uiComponents.inputModUi.setData === 'function') {
        this.uiComponents.inputModUi.setData(inputPresetData);
      }
    }

    if (allSuccess) {
      this.selectedPreset = presetName;
      if (this.debugFlag) console.log(`Successfully applied master preset: ${presetName}`);
    }

    return allSuccess;
  }

  savePresetFromUI(presetName) {
    if (!this.uiComponents) {
      console.warn("No UI components registered");
      return false;
    }

    try {
      const data = {};
      for (const key of Object.keys(this.uiComponents)) {
        const uiComponent = this.uiComponents[key];
        if (uiComponent && typeof uiComponent.getData === "function") {
          try {
            data[key] = uiComponent.getData();
            if (this.debugFlag) console.log(`Saved data from ${key}`);
          } catch (error) {
            console.error(`Error getting data from ${key}:`, error);
          }
        } else {
          console.warn(`Could not save state from ${key}`);
        }
      }

      return this.savePreset(presetName, data);
    } catch (error) {
      console.error("Error saving master preset:", error);
      return false;
    }
  }
}