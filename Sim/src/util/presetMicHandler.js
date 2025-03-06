import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMicHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: {
        micSettings: {
          enabled: false,
          sensitivity: 1.0,
          modulators: [],
        },
      },
    };
    super("savedMicPresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
  }

  // Fix the extractDataFromUI method to properly get modulator data
  extractDataFromUI(inputUi) {
    if (!inputUi || !inputUi.main || !inputUi.main.externalInput) {
      console.warn("No input UI or external input provided");
      return null;
    }

    try {
      console.log("Extracting mic input data from UI");

      // Get the micForces object
      const micForces = inputUi.main.externalInput.micForces;

      if (!micForces) {
        console.warn("No micForces available");
        return null;
      }

      // Check if enabled
      let enabled = false;
      if (micForces.enabled !== undefined) {
        enabled = !!micForces.enabled;
      } else {
        // Fallback: check if the UI checkbox is checked
        enabled = inputUi.micEnableController
          ? inputUi.micEnableController.getValue()
          : false;
      }

      // Get sensitivity
      let sensitivity = 1.0;
      if (typeof micForces.sensitivity !== "undefined") {
        sensitivity = micForces.sensitivity;
      } else if (typeof micForces.getSensitivity === "function") {
        sensitivity = micForces.getSensitivity();
      } else if (inputUi.micSensitivityController) {
        sensitivity = inputUi.micSensitivityController.getValue();
      }

      // Get modulator data using our helper method
      let modulators = [];
      if (typeof inputUi.getModulatorData === "function") {
        modulators = inputUi.getModulatorData();
        console.log(`Got ${modulators.length} modulators from helper method`);
      } else {
        // Fallback to direct access
        modulators = [];
        if (Array.isArray(inputUi.modulatorFolders)) {
          inputUi.modulatorFolders.forEach((folder, idx) => {
            if (folder._modulator) {
              const mod = folder._modulator;
              const data = {
                enabled: mod.enabled || false,
                targetName: mod.targetName || null,
                frequencyBand: mod.frequencyBand || 0,
                sensitivity: mod.sensitivity || 1.0,
                smoothing: mod.smoothing || 0.7,
                min: mod.min !== undefined ? mod.min : 0,
                max: mod.max !== undefined ? mod.max : 1,
              };

              modulators.push(data);
              console.log(
                `Extracted modulator ${idx} with target: ${data.targetName}`
              );
            }
          });
        }
      }

      const result = {
        micSettings: {
          enabled,
          sensitivity,
          modulators,
        },
      };

      console.log(`Extracted mic preset: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      console.error("Error extracting mic input data:", error);
      return null;
    }
  }

  // Fix the applyDataToUI method to handle mic loading correctly
  applyDataToUI(presetName, inputUi) {
    console.log(`Applying mic preset: ${presetName}`);

    const preset = this.presets[presetName];
    if (!preset || !preset.micSettings) {
      console.warn(`Invalid mic preset: ${presetName}`);
      return false;
    }

    try {
      const settings = preset.micSettings;
      console.log("Mic preset data:", JSON.stringify(settings)); // Debug the preset structure

      const micForces = inputUi.main?.externalInput?.micForces;

      if (!micForces) {
        console.error("No mic forces object found in InputUi");
        return false;
      }

      // First, enable the mic input if preset requires it
      if (settings.enabled) {
        console.log("Enabling mic input from preset");

        // Enable mic forces
        micForces.enable();

        // Update UI checkbox if available
        if (inputUi.micEnableController) {
          inputUi.micEnableController.setValue(true);
        }
      } else {
        console.log("Disabling mic input from preset");

        // Disable mic forces
        micForces.disable();

        // Update UI checkbox if available
        if (inputUi.micEnableController) {
          inputUi.micEnableController.setValue(false);
        }
      }

      // Set sensitivity
      if (typeof settings.sensitivity === "number") {
        console.log(`Setting mic sensitivity to ${settings.sensitivity}`);
        micForces.setSensitivity(settings.sensitivity);

        // Update UI slider
        if (inputUi.micSensitivityController) {
          inputUi.micSensitivityController.setValue(settings.sensitivity);
        }
      }

      // Clear existing modulators first
      console.log("Clearing existing mic modulators");

      // Clear this way first - specific to InputUi
      if (Array.isArray(inputUi.modulatorFolders)) {
        // Work with a copy to avoid modification issues
        const foldersToRemove = [...inputUi.modulatorFolders];
        console.log(
          `Found ${foldersToRemove.length} existing modulators to clear`
        );

        // Force clear existing modulators by calling their remove methods
        for (let i = foldersToRemove.length - 1; i >= 0; i--) {
          const folder = foldersToRemove[i];

          // Find the remove function - it's usually attached to a button in the folder
          let remover = null;

          // Look for explicit remove method on folder
          if (folder.remove && typeof folder.remove === "function") {
            remover = folder.remove;
          }
          // Look for remove controller (usually a button)
          else if (folder.controllers) {
            for (const ctrl of folder.controllers) {
              if (
                ctrl.property === "remove" &&
                ctrl.object &&
                typeof ctrl.object.remove === "function"
              ) {
                remover = () => ctrl.object.remove();
                break;
              }
            }
          }

          // If found, use it
          if (remover) {
            console.log(`Removing modulator ${i}`);
            try {
              remover();
            } catch (e) {
              console.error(`Error removing modulator ${i}:`, e);
            }
          }
        }
      }

      // Double check if all modulators are removed
      if (inputUi.modulatorFolders && inputUi.modulatorFolders.length > 0) {
        console.warn(
          `Still have ${inputUi.modulatorFolders.length} modulators after clearing. Forcing empty.`
        );
        inputUi.modulatorFolders = [];
      }

      // Create new modulators from preset
      if (
        settings.modulators &&
        Array.isArray(settings.modulators) &&
        settings.modulators.length > 0
      ) {
        console.log(
          `Creating ${settings.modulators.length} mic modulators from preset`
        );

        settings.modulators.forEach((modData, i) => {
          console.log(
            `Creating modulator ${i + 1} for target: ${modData.targetName}`
          );

          // Make sure we have the method to add modulators
          if (typeof inputUi.addMicModulator !== "function") {
            console.error("Missing addMicModulator method in InputUi");
            return;
          }

          // Create the modulator
          const mod = inputUi.addMicModulator();
          if (!mod) {
            console.warn(`Failed to create modulator ${i + 1}`);
            return;
          }

          console.log(`Modulator ${i + 1} created, setting properties...`);

          // Set target
          if (modData.targetName && typeof mod.setTarget === "function") {
            mod.setTarget(modData.targetName);
          }

          // Set band and other properties
          mod.frequencyBand = modData.frequencyBand || 0;
          mod.sensitivity = modData.sensitivity || 1.0;
          mod.smoothing = modData.smoothing || 0.7;
          mod.min = modData.min || 0;
          mod.max = modData.max || 1;
          mod.enabled = !!modData.enabled;

          // Get the UI folder for this modulator
          const folder =
            inputUi.modulatorFolders[inputUi.modulatorFolders.length - 1];
          if (folder && folder.controllers) {
            // Update all controllers to match the modulator values
            folder.controllers.forEach((controller) => {
              if (
                controller.property &&
                typeof mod[controller.property] !== "undefined"
              ) {
                try {
                  controller.setValue(mod[controller.property]);
                } catch (err) {
                  console.warn(
                    `Error updating controller for ${controller.property}:`,
                    err
                  );
                }
              }
            });
          }
        });
      } else {
        console.log("No modulators in preset data or empty modulators array");
      }

      // Update UI visuals
      if (typeof inputUi.updateAllBandVisualizations === "function") {
        inputUi.updateAllBandVisualizations();
      }

      // Force UI update
      if (typeof inputUi.update === "function") {
        inputUi.update();
      }

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying mic preset ${presetName}:`, error);
      return false;
    }
  }

  // API compatibility methods
  // Update saveMicPreset to provide more feedback
  saveMicPreset(presetName, inputUi) {
    console.log(`Saving mic preset: ${presetName}`);

    const data = this.extractDataFromUI(inputUi);
    if (!data) {
      console.error("Failed to extract data from InputUi");
      return false;
    }

    // Log what we're about to save
    const modulatorCount = data.micSettings.modulators.length;
    console.log(
      `Saving preset with ${modulatorCount} modulators, enabled=${data.micSettings.enabled}`
    );

    const result = this.savePreset(presetName, data, this.protectedPresets);
    console.log(`Save result: ${result ? "success" : "failed"}`);

    return result;
  }

  loadMicPreset(presetName, inputUi) {
    return this.applyDataToUI(presetName, inputUi);
  }

  deleteMicPreset(presetName) {
    return this.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
