import { PresetMasterHandler } from "./presetMasterHandler.js";
import { PresetTurbulenceHandler } from "./presetTurbulenceHandler.js";
import { PresetVoronoiHandler } from "./presetVoronoiHandler.js";
import { PresetPulseHandler } from "./presetPulseHandler.js";
import { PresetMicHandler } from "./presetMicHandler.js";

class PresetManager {
  constructor(leftGui, rightGui, pulseModUi, inputUi) {
    if (!leftGui || !rightGui) {
      throw new Error("Both GUI instances required");
    }

    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputUi = inputUi;

    // Create our specialized handlers
    this.masterHandler = new PresetMasterHandler(
      leftGui,
      rightGui,
      pulseModUi,
      inputUi
    );
    this.turbHandler = new PresetTurbulenceHandler();
    this.voronoiHandler = new PresetVoronoiHandler();
    this.pulseHandler = new PresetPulseHandler();
    this.micHandler = new PresetMicHandler();

    // Set up backward compatibility references
    this.presets = this.masterHandler.presets;
    this.turbPresets = this.turbHandler.presets;
    this.voronoiPresets = this.voronoiHandler.presets;
    this.pulsePresets = this.pulseHandler.presets;
    this.micPresets = this.micHandler.presets;

    this.selectedPreset = this.masterHandler.selectedPreset;
    this.selectedTurbPreset = this.turbHandler.selectedPreset;
    this.selectedVoronoiPreset = this.voronoiHandler.selectedPreset;
    this.selectedPulsePreset = this.pulseHandler.selectedPreset;
    this.selectedMicPreset = this.micHandler.selectedPreset;

    // For debugging - enable feature flag if needed
    this.enableDebugLogging = false;

    // Run compatibility check for old presets
    this._migrateExistingPresets();
  }

  /**
   * Migrate from old preset format to new format if needed
   * @private
   */
  _migrateExistingPresets() {
    // TODO: Implement migration path from old format to new if needed
    // This would check localStorage for old formats and convert them
  }

  //#region Master Preset Methods

  loadPresetsFromStorage() {
    // Forward to handler
    return this.masterHandler.presets;
  }

  savePresetsToStorage() {
    // Forward to handler
    return this.masterHandler.saveToStorage();
  }

  getPresetOptions() {
    return this.masterHandler.getPresetOptions();
  }

  savePreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Saving master preset: ${presetName}`);
    }

    const result = this.masterHandler.savePreset(presetName);

    // Update backward compatibility reference
    this.presets = this.masterHandler.presets;
    this.selectedPreset = this.masterHandler.selectedPreset;

    return result;
  }

  deletePreset(presetName) {
    if (presetName === "Default") {
      alert("Cannot delete the Default preset!");
      return false;
    }

    const result = this.masterHandler.deletePreset(presetName);

    // Update backward compatibility reference
    this.presets = this.masterHandler.presets;
    this.selectedPreset = this.masterHandler.selectedPreset;

    return result;
  }

  loadPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Loading master preset: ${presetName}`);
    }

    const result = this.masterHandler.loadPreset(presetName);

    // Update backward compatibility reference
    this.selectedPreset = this.masterHandler.selectedPreset;

    return result;
  }

  getSelectedPreset() {
    return this.masterHandler.getSelectedPreset();
  }

  setAutoPlay(enabled) {
    return this.masterHandler.setAutoPlay(enabled);
  }

  isAutoPlay() {
    return this.masterHandler.isAutoPlay();
  }

  //#endregion

  //#region Turbulence Preset Methods

  loadTurbPresetsFromStorage() {
    // Forward to handler
    return this.turbHandler.presets;
  }

  saveTurbPresetsToStorage() {
    // Forward to handler
    return this.turbHandler.saveToStorage();
  }

  getTurbPresetOptions() {
    return this.turbHandler.getPresetOptions();
  }

  saveTurbPreset(presetName, turbFolder) {
    if (this.enableDebugLogging) {
      console.log(`Saving turbulence preset: ${presetName}`);
    }

    const result = this.turbHandler.saveTurbPreset(presetName, turbFolder);

    // Update backward compatibility reference
    this.turbPresets = this.turbHandler.presets;
    this.selectedTurbPreset = this.turbHandler.selectedPreset;

    return result;
  }

  deleteTurbPreset(presetName) {
    const result = this.turbHandler.deleteTurbPreset(presetName);

    // Update backward compatibility reference
    this.turbPresets = this.turbHandler.presets;
    this.selectedTurbPreset = this.turbHandler.selectedPreset;

    return result;
  }

  loadTurbPreset(presetName, turbFolder) {
    if (this.enableDebugLogging) {
      console.log(`Loading turbulence preset: ${presetName}`);
    }

    const result = this.turbHandler.loadTurbPreset(presetName, turbFolder);

    // Update backward compatibility reference
    this.selectedTurbPreset = this.turbHandler.selectedPreset;

    return result;
  }

  getSelectedTurbPreset() {
    return this.turbHandler.getSelectedPreset();
  }

  //#endregion

  //#region Voronoi Preset Methods

  loadVoronoiPresetsFromStorage() {
    // Forward to handler
    return this.voronoiHandler.presets;
  }

  saveVoronoiPresetsToStorage() {
    // Forward to handler
    return this.voronoiHandler.saveToStorage();
  }

  getVoronoiPresetOptions() {
    return this.voronoiHandler.getPresetOptions();
  }

  saveVoronoiPreset(presetName, voronoiFolder) {
    if (this.enableDebugLogging) {
      console.log(`Saving voronoi preset: ${presetName}`);
    }

    const result = this.voronoiHandler.saveVoronoiPreset(
      presetName,
      voronoiFolder
    );

    // Update backward compatibility reference
    this.voronoiPresets = this.voronoiHandler.presets;
    this.selectedVoronoiPreset = this.voronoiHandler.selectedPreset;

    return result;
  }

  deleteVoronoiPreset(presetName) {
    const result = this.voronoiHandler.deleteVoronoiPreset(presetName);

    // Update backward compatibility reference
    this.voronoiPresets = this.voronoiHandler.presets;
    this.selectedVoronoiPreset = this.voronoiHandler.selectedPreset;

    return result;
  }

  /**
   * Load a voronoi preset
   * @param {string} presetName - Name of preset to load
   * @param {Object} voronoiFolder - The dat.GUI folder to apply settings to
   * @returns {boolean} Success/failure
   */
  loadVoronoiPreset(presetName, voronoiFolder) {
    if (this.enableDebugLogging) {
      console.log(`Loading voronoi preset in manager: ${presetName}`);
    }

    // First apply the preset to the folder using the handler
    const result = this.voronoiHandler.loadVoronoiPreset(
      presetName,
      voronoiFolder
    );

    // Only attempt to regenerate if the preset was successfully loaded
    if (result) {
      try {
        // Try to find the voronoiField through multiple possible paths
        let voronoiField = null;

        // Try rightGui.main.voronoiField
        if (this.rightGui?.main?.voronoiField) {
          voronoiField = this.rightGui.main.voronoiField;
          console.log("Found voronoiField through rightGui.main");
        }
        // Try directly from main if available
        else if (window.app?.voronoiField) {
          voronoiField = window.app.voronoiField;
          console.log("Found voronoiField through window.app");
        }
        // Try through the voronoiFolder's object if available
        else if (voronoiFolder?.object?.voronoiField) {
          voronoiField = voronoiFolder.object.voronoiField;
          console.log("Found voronoiField through voronoiFolder.object");
        }
        // Try through controller values
        else if (voronoiFolder?.controllers) {
          // Look for a controller that might have a reference to voronoiField
          for (const ctrl of voronoiFolder.controllers) {
            if (ctrl.object && typeof ctrl.object.__voronoiField === "object") {
              voronoiField = ctrl.object.__voronoiField;
              console.log("Found voronoiField through controller reference");
              break;
            }
          }
        }

        // Now regenerate cells if we found the voronoiField
        if (
          voronoiField &&
          typeof voronoiField.regenerateCells === "function"
        ) {
          console.log("Regenerating voronoi cells after preset load");
          voronoiField.regenerateCells();
        } else {
          // Try alternative approach - get the cellCount from voronoiFolder and call
          // a global regenerate function if available
          let cellCount = 10; // Default

          // Try to find the cell count controller
          if (voronoiFolder?.controllers) {
            const cellCountCtrl = voronoiFolder.controllers.find(
              (c) => c.property === "cellCount" || c.property === "numCells"
            );

            if (cellCountCtrl) {
              cellCount = cellCountCtrl.getValue();
              console.log(`Found cellCount value: ${cellCount}`);

              // Try to find global regenerate method
              if (window.app?.regenerateVoronoiCells) {
                console.log(
                  `Calling global regenerateVoronoiCells with count: ${cellCount}`
                );
                window.app.regenerateVoronoiCells(cellCount);
              } else if (window.regenerateVoronoiCells) {
                console.log(
                  `Calling window.regenerateVoronoiCells with count: ${cellCount}`
                );
                window.regenerateVoronoiCells(cellCount);
              }
            }
          }

          console.log(
            "Could not regenerate voronoi cells - voronoiField not accessible"
          );
        }
      } catch (error) {
        console.error("Error regenerating voronoi cells:", error);
        // Don't fail the preset load just because regeneration failed
      }
    }

    return result;
  }

  getSelectedVoronoiPreset() {
    return this.voronoiHandler.getSelectedPreset();
  }

  /**
   * Set a direct reference to the voronoiField
   * @param {Object} field - The voronoi field object
   */
  setVoronoiField(field) {
    this.voronoiField = field;
    console.log("Direct voronoiField reference set in PresetManager");
  }

  //#endregion

  //#region Pulse Preset Methods

  loadPulsePresetsFromStorage() {
    // Forward to handler
    return this.pulseHandler.presets;
  }

  savePulsePresetsToStorage() {
    // Forward to handler
    return this.pulseHandler.saveToStorage();
  }

  getPulsePresetOptions() {
    return this.pulseHandler.getPresetOptions();
  }

  savePulsePreset(presetName, pulseModUi) {
    if (this.enableDebugLogging) {
      console.log(`Saving pulse preset: ${presetName}`);
    }

    // Pass the UI object directly instead of expecting pulseModManager
    const result = this.pulseHandler.savePulsePreset(presetName, pulseModUi);

    // Update backward compatibility reference
    this.pulsePresets = this.pulseHandler.presets;
    this.selectedPulsePreset = this.pulseHandler.selectedPreset;

    return result;
  }

  deletePulsePreset(presetName) {
    const result = this.pulseHandler.deletePulsePreset(presetName);

    // Update backward compatibility reference
    this.pulsePresets = this.pulseHandler.presets;
    this.selectedPulsePreset = this.pulseHandler.selectedPreset;

    return result;
  }

  loadPulsePreset(presetName, pulseModUi) {
    if (this.enableDebugLogging) {
      console.log(`Loading pulse preset: ${presetName}`);
    }

    const result = this.pulseHandler.loadPulsePreset(presetName, pulseModUi);

    // Update backward compatibility reference
    this.selectedPulsePreset = this.pulseHandler.selectedPreset;

    return result;
  }

  getSelectedPulsePreset() {
    return this.pulseHandler.getSelectedPreset();
  }

  //#endregion

  //#region Mic Preset Methods

  loadMicPresetsFromStorage() {
    // Forward to handler
    return this.micHandler.presets;
  }

  saveMicPresetsToStorage() {
    // Forward to handler
    return this.micHandler.saveToStorage();
  }

  getMicPresetOptions() {
    return this.micHandler.getPresetOptions();
  }

  saveMicPreset(presetName, inputUi) {
    if (this.enableDebugLogging) {
      console.log(`Saving mic preset: ${presetName}`);
    }

    const result = this.micHandler.saveMicPreset(presetName, inputUi);

    // Update backward compatibility reference
    this.micPresets = this.micHandler.presets;
    this.selectedMicPreset = this.micHandler.selectedPreset;

    if (result && this.inputUi && this.inputUi.updatePresetDropdown) {
      this.inputUi.updatePresetDropdown();
    }

    return result;
  }

  deleteMicPreset(presetName) {
    if (this.enableDebugLogging) {
      console.log(`Deleting mic preset: ${presetName}`);
    }

    const result = this.micHandler.deleteMicPreset(presetName);

    // Update backward compatibility reference
    this.micPresets = this.micHandler.presets;
    this.selectedMicPreset = this.micHandler.selectedPreset;

    if (result && this.inputUi && this.inputUi.updatePresetDropdown) {
      this.inputUi.updatePresetDropdown();
    }

    return result;
  }

  loadMicPreset(presetName, inputUi = null) {
    if (this.enableDebugLogging) {
      console.log(`Loading mic preset: ${presetName}`);
    }

    const result = this.micHandler.loadMicPreset(
      presetName,
      inputUi || this.inputUi
    );

    // Update backward compatibility reference
    this.selectedMicPreset = this.micHandler.selectedPreset;

    return result;
  }

  getSelectedMicPreset() {
    return this.micHandler.getSelectedPreset();
  }

  //#endregion

  //#region Export/Import

  // Export all presets (master, turbulence, voronoi, pulse, mic) to a JSON file
  exportPresets() {
    const allPresets = {
      version: 2, // Increment version to indicate the new format
      presets: this.masterHandler.exportData(),
      turbPresets: this.turbHandler.exportData(),
      voronoiPresets: this.voronoiHandler.exportData(),
      pulsePresets: this.pulseHandler.exportData(),
      micPresets: this.micHandler.exportData(),
    };

    const dataStr = JSON.stringify(allPresets, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileName = `svibe-presets-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileName);
    linkElement.style.display = "none";
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    console.log("Exported presets to file:", exportFileName);
    return true;
  }

  // Import presets from a JSON file
  importPresets(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);
      let importCount = 0;

      // Check version and handle accordingly
      const isNewFormat = importedData.version && importedData.version >= 2;

      if (isNewFormat) {
        // Import using the new format with handlers
        if (importedData.presets) {
          this.masterHandler.importData(importedData.presets);
          this.presets = this.masterHandler.presets;
          importCount++;
        }

        if (importedData.turbPresets) {
          this.turbHandler.importData(importedData.turbPresets);
          this.turbPresets = this.turbHandler.presets;
          importCount++;
        }

        if (importedData.voronoiPresets) {
          this.voronoiHandler.importData(importedData.voronoiPresets);
          this.voronoiPresets = this.voronoiHandler.presets;
          importCount++;
        }

        if (importedData.pulsePresets) {
          this.pulseHandler.importData(importedData.pulsePresets);
          this.pulsePresets = this.pulseHandler.presets;
          importCount++;
        }

        if (importedData.micPresets) {
          this.micHandler.importData(importedData.micPresets);
          this.micPresets = this.micHandler.presets;
          importCount++;
        }
      } else {
        // Legacy format import
        console.log("Importing legacy format presets");

        // Import main presets
        if (importedData.presets) {
          Object.assign(this.presets, importedData.presets);
          importCount++;
        }

        // Import turbulence presets
        if (importedData.turbPresets) {
          Object.assign(this.turbPresets, importedData.turbPresets);
          importCount++;
        }

        // Import voronoi presets
        if (importedData.voronoiPresets) {
          Object.assign(this.voronoiPresets, importedData.voronoiPresets);
          importCount++;
        }

        // Import pulse presets
        if (importedData.pulsePresets) {
          Object.assign(this.pulsePresets, importedData.pulsePresets);
          importCount++;
        }

        // Import mic presets
        if (importedData.micPresets) {
          Object.assign(this.micPresets, importedData.micPresets);
          importCount++;
        }

        // Save changes to storage
        this.savePresetsToStorage();
        this.saveTurbPresetsToStorage();
        this.saveVoronoiPresetsToStorage();
        this.savePulsePresetsToStorage();
        this.saveMicPresetsToStorage();
      }

      console.log(`Successfully imported ${importCount} preset types`);
      return importCount;
    } catch (error) {
      console.error("Failed to import presets:", error);
      return false;
    }
  }

  //#endregion

  //#region Controller Path Resolution (Simplified & Improved)

  // Find controller path with better identification
  findControllerPath(controller) {
    if (!controller) return null;

    // Create a more robust identifier
    const guiName = controller.parent?._title || "unknown";
    const propName = controller.property || "unknown";
    const objectPath =
      controller.object && controller.object.constructor
        ? controller.object.constructor.name
        : "unknown";

    return `${guiName}.${propName}.${objectPath}`;
  }

  // Find controller by path with improved error handling
  findControllerByPath(path) {
    if (!path) {
      console.warn("Empty controller path provided");
      return null;
    }

    // Parse path components
    const [guiName, propName, objectType] = path.split(".");

    if (!guiName || !propName) {
      console.warn(`Invalid controller path: ${path}`);
      return null;
    }

    if (this.enableDebugLogging) {
      console.log(`Finding controller: ${path}`);
    }

    // Helper function to search in a GUI recursively
    const findInGui = (gui) => {
      // Check controllers in current level
      for (const controller of gui.controllers) {
        if (controller.property === propName) {
          // Further validate if we have object type info
          if (
            !objectType ||
            (controller.object &&
              controller.object.constructor &&
              controller.object.constructor.name === objectType)
          ) {
            return controller;
          }
        }
      }

      // Search in folders
      for (const folder of gui.folders) {
        // Skip if folder name doesn't match (optimization)
        if (guiName !== "unknown" && folder._title !== guiName) {
          continue;
        }

        const result = findInGui(folder);
        if (result) return result;
      }

      return null;
    };

    // Try both GUIs
    const allGuis = [this.leftGui, this.rightGui];
    for (const gui of allGuis) {
      if (!gui) continue;

      const result = findInGui(gui);
      if (result) return result;
    }

    // If not found, try just by property name as last resort
    for (const gui of allGuis) {
      if (!gui) continue;

      const findByProp = (g) => {
        for (const controller of g.controllers) {
          if (controller.property === propName) return controller;
        }

        for (const folder of g.folders) {
          const result = findByProp(folder);
          if (result) return result;
        }

        return null;
      };

      const result = findByProp(gui);
      if (result) return result;
    }

    // Not found
    if (this.enableDebugLogging) {
      console.warn(`Controller not found: ${path}`);
    }
    return null;
  }

  //#endregion

  //#region Debug Methods

  // Enable or disable debug messages
  setDebug(enabled) {
    this.enableDebugLogging = enabled;
  }

  // Dump controller paths for debugging
  dumpControllerPaths() {
    console.log("=== Available Controller Paths ===");

    if (this.leftGui) {
      console.log("Left GUI controllers:");
      this._dumpGuiControllers(this.leftGui);
    }

    if (this.rightGui) {
      console.log("Right GUI controllers:");
      this._dumpGuiControllers(this.rightGui);
    }

    console.log("=== End Controller Paths ===");
  }

  // Helper method to recursively dump controllers
  _dumpGuiControllers(gui, path = "") {
    // Log controllers in this GUI
    gui.controllers.forEach((controller) => {
      const name = controller.property || "unknown";
      const fullPath = path ? `${path}.${name}` : name;
      console.log(`- ${fullPath}: ${controller.getValue()}`);
    });

    // Recursively check folders
    gui.folders.forEach((folder) => {
      const folderName = folder._title || "unknown";
      const folderPath = path ? `${path}.${folderName}` : folderName;
      console.log(`Folder: ${folderPath}`);
      this._dumpGuiControllers(folder, folderPath);
    });
  }

  //#endregion
}

export { PresetManager };
