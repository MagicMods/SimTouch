import { PresetBaseHandler } from "./presetBaseHandler.js";

export class SimplePresetHandler extends PresetBaseHandler {
  constructor(storageKey, defaultPresets, protectedPresets) {
    super(storageKey, defaultPresets, protectedPresets);
  }

  applyPreset(presetName, uiComponent) {
    try {
      console.log(`Applying preset "${presetName}" to UI component`);

      // Get the preset data
      const preset = this.presets[presetName];
      if (!preset) {
        console.error(`Preset not found: ${presetName}`);
        return false;
      }

      // Get the controllers from preset
      const controllers = preset.controllers || {};
      console.log(`Preset has ${Object.keys(controllers).length} controllers`);

      // Extract dimensions from preset for proper handling
      const dimensions = {
        screenShape: controllers["Screen Shape"],
        width: controllers["Width"],
        height: controllers["Height"],
        diameter: controllers["Diameter"]
      };

      // Validate dimensions to ensure they're reasonable
      if (dimensions.width && (!Number.isFinite(dimensions.width) || dimensions.width < 120)) {
        console.warn(`Invalid width in preset: ${dimensions.width}, using default 240`);
        dimensions.width = 240;
      }

      if (dimensions.height && (!Number.isFinite(dimensions.height) || dimensions.height < 120)) {
        console.warn(`Invalid height in preset: ${dimensions.height}, using default 240`);
        dimensions.height = 240;
      }

      if (dimensions.diameter && (!Number.isFinite(dimensions.diameter) || dimensions.diameter < 120)) {
        console.warn(`Invalid diameter in preset: ${dimensions.diameter}, using default 240`);
        dimensions.diameter = 240;
      }

      console.log(`Preset dimensions: Shape=${dimensions.screenShape}, Width=${dimensions.width}, Height=${dimensions.height}, Diameter=${dimensions.diameter}`);

      // Update model parameters first
      const main = uiComponent.main;
      if (!main) {
        console.error('Main component not found in UI component');
        return false;
      }

      // Keep track of processed controllers to avoid setting values twice
      const processedControllers = [];

      // Set the shape first, as it affects other parameters
      if (dimensions.screenShape) {
        // Map from the display value to the internal value if needed
        let actualShapeValue = dimensions.screenShape;
        if (dimensions.screenShape === "Round") actualShapeValue = "circular";
        if (dimensions.screenShape === "Rectangular") actualShapeValue = "rectangular";

        // Update the model
        main.params.boundaryType = actualShapeValue;
        main.params.shape = actualShapeValue;

        // Update the controller if it exists
        if (uiComponent.boundaryTypeController) {
          console.log(`Setting boundary type to ${actualShapeValue}`);
          // No need to convert values - the controller will take care of it
          uiComponent.boundaryTypeController.setValue(actualShapeValue);
          processedControllers.push("Screen Shape");
        }

        // Update visibility of controllers based on shape
        if (uiComponent.updateControllerVisibility) {
          uiComponent.updateControllerVisibility(actualShapeValue);
        }
      }

      // Now set dimensions based on the shape
      const isCircular = main.params.boundaryType === "circular";

      if (isCircular && dimensions.diameter) {
        // For circular, set width and height to the diameter
        main.params.physicalWidth = dimensions.diameter;
        main.params.physicalHeight = dimensions.diameter;

        // Update diameter controller if it exists
        if (uiComponent.diameterController) {
          console.log(`Setting diameter to ${dimensions.diameter}`);
          uiComponent.diameterController.setValue(dimensions.diameter);
          processedControllers.push("Diameter");
        }

        // Update saved values for later use
        if (uiComponent.savedDiameter !== undefined) {
          uiComponent.savedDiameter = dimensions.diameter;
        }
      } else if (!isCircular) {
        // For rectangular, set width and height separately
        if (dimensions.width) {
          main.params.physicalWidth = dimensions.width;
          // Update width controller if it exists
          if (uiComponent.physicalWidthController) {
            console.log(`Setting width to ${dimensions.width}`);
            uiComponent.physicalWidthController.setValue(dimensions.width);
            processedControllers.push("Width");
          }
          // Update saved values for later use
          if (uiComponent.savedWidth !== undefined) {
            uiComponent.savedWidth = dimensions.width;
          }
        }

        if (dimensions.height) {
          main.params.physicalHeight = dimensions.height;
          // Update height controller if it exists
          if (uiComponent.physicalHeightController) {
            console.log(`Setting height to ${dimensions.height}`);
            uiComponent.physicalHeightController.setValue(dimensions.height);
            processedControllers.push("Height");
          }
          // Update saved values for later use
          if (uiComponent.savedHeight !== undefined) {
            uiComponent.savedHeight = dimensions.height;
          }
        }
      }

      // Ensure boundary params are updated
      if (!main.params.boundaryParams) {
        main.params.boundaryParams = {};
      }
      main.params.boundaryParams.width = main.params.physicalWidth;
      main.params.boundaryParams.height = main.params.physicalHeight;

      // Now set all remaining controller values
      for (const [key, value] of Object.entries(controllers)) {
        // Skip already processed controllers
        if (processedControllers.includes(key)) {
          continue;
        }

        // Find the correct controller object by display name
        const controller = this._findControllerByName(uiComponent, key);
        if (controller) {
          console.log(`Setting ${key} = ${value}`);
          controller.setValue(value);
        } else {
          console.warn(`Controller not found for key: ${key}`);
        }
      }

      // Update the selected preset name
      this.selectedPreset = presetName;

      // Force canvas update with the new parameters
      try {
        if (main.updateCanvasDimensions) {
          main.updateCanvasDimensions();
        }

        // Update the grid renderer with the new parameters
        if (main.gridGen) {
          main.gridGen.updateGrid(main.params);
        }

        console.log(`Successfully applied preset "${presetName}"`);
        return true;
      } catch (err) {
        console.error(`Error updating after preset applied: ${err.message}`);
        return false;
      }
    } catch (err) {
      console.error(`Error applying preset: ${err.message}`);
      return false;
    }
  }

  // Helper to find controller by display name
  _findControllerByName(uiComponent, name) {
    // Check direct matches in UI component properties
    if (uiComponent[name + "Controller"]) {
      return uiComponent[name + "Controller"];
    }

    // Try to find by common controller naming patterns
    const possibleControllerNames = [
      name.toLowerCase() + "Controller",
      name.replace(/\s+/g, "") + "Controller",
      "controller" + name.replace(/\s+/g, "")
    ];

    for (const controllerName of possibleControllerNames) {
      if (uiComponent[controllerName]) {
        return uiComponent[controllerName];
      }
    }

    // Try controllers in targets (GridUI pattern)
    if (uiComponent.getControllers) {
      const targets = uiComponent.getControllers();
      if (targets && targets[name]) {
        return targets[name];
      }
    }

    return null;
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