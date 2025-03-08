import { BaseUi } from "./baseUi.js";
import { ModulatorManager } from "../../input/modulatorManager.js";
import { PresetManager } from "../../presets/presetManager.js";

export class PulseModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.masterFrequency = 1.0;

    this.modulatorManager = null;
    this.modulatorFolders = [];
    this.presets = [];

    this.gui.title("Pulse Modulation");

    this.initBasicControls();

    this.presetManager = null;
    this.presetController = null;
    this.targetControllerMap = new Map();
  }

  //#region Ui

  initializeWithUiPanels(leftUi, rightUi) {
    console.log("PulseModulationUi initializing with UI panels");
    this.leftUi = leftUi;
    this.rightUi = rightUi;
  }

  initBasicControls() {
    // Add master frequency slider
    this.gui
      .add(this, "masterFrequency", 0.01, 3, 0.01) // Fixed: Use this instead of this.
      .name("Master Frequency (Hz)")
      .onChange((value) => {
        // When master frequency changes, update all modulators that are synced
        if (this.modulatorManager) {
          this.modulatorManager.setMasterFrequency(value);
        }
      });
    // Add button to add a new modulator
    const addButton = { add: () => this.addPulseModulator() };
    this.gui.add(addButton, "add").name("Add Modulator");
    this.gui.open(true);
  }

  initPresetControls(presetManager) {
    this.presetManager = presetManager;

    const folder = this.gui.addFolder("Presets");
    folder.open();

    // Add preset selection dropdown
    const presetOptions = this.presetManager.getPresetOptions(
      PresetManager.TYPES.PULSE
    );

    folder
      .add({ preset: presetOptions[0] || "None" }, "preset", presetOptions)
      .name("Presets")
      .onChange((value) => {
        if (value) {
          this.presetManager.loadPreset(PresetManager.TYPES.PULSE, value, this);
        }
      });

    // Save preset button
    const saveController = folder
      .add({ save: () => {} }, "save")
      .name("Save Preset");
    saveController.domElement.querySelector(".name").style.width =
      "calc(100% - 80px)";

    // Add save input and button
    const saveContainer = document.createElement("div");
    saveContainer.style.display = "flex";
    saveContainer.style.alignItems = "center";
    saveContainer.style.width = "100%";

    const saveInput = document.createElement("input");
    saveInput.type = "text";
    saveInput.placeholder = "Preset name";
    saveInput.style.flex = "1";
    saveInput.style.marginRight = "5px";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "0 0 auto";

    saveContainer.appendChild(saveInput);
    saveContainer.appendChild(saveButton);

    saveController.domElement
      .querySelector(".widget")
      .appendChild(saveContainer);

    // Save button click handler
    saveButton.addEventListener("click", () => {
      const name = saveInput.value;
      if (name) {
        this.presetManager.savePreset(PresetManager.TYPES.PULSE, name, this);
        this.updatePresetDropdown();
      }
    });

    // Delete preset button
    const deleteController = folder
      .add({ delete: () => {} }, "delete")
      .name("Delete Preset");
    deleteController.domElement.querySelector(".name").style.width =
      "calc(100% - 80px)";

    // Add delete input and button
    const deleteContainer = document.createElement("div");
    deleteContainer.style.display = "flex";
    deleteContainer.style.alignItems = "center";
    deleteContainer.style.width = "100%";

    const deleteInput = document.createElement("input");
    deleteInput.type = "text";
    deleteInput.placeholder = "Preset name";
    deleteInput.style.flex = "1";
    deleteInput.style.marginRight = "5px";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "0 0 auto";

    deleteContainer.appendChild(deleteInput);
    deleteContainer.appendChild(deleteButton);

    deleteController.domElement
      .querySelector(".widget")
      .appendChild(deleteContainer);

    // Delete button click handler
    deleteButton.addEventListener("click", () => {
      const name = deleteInput.value;
      if (name) {
        this.presetManager.deletePreset(PresetManager.TYPES.PULSE, name);
        this.updatePresetDropdown();
      }
    });
  }

  updatePresetDropdown(selectElement) {
    // Find the dropdown if not provided
    if (!selectElement) {
      const presetFolder = this.gui.__folders["Presets"];
      selectElement = presetFolder.__controllers.find(
        (c) => c.property === "preset"
      );
    }

    if (selectElement) {
      // Get the updated options
      const options = this.presetManager.getPresetOptions(
        PresetManager.TYPES.PULSE
      );

      // Update the options
      selectElement.options(options);
    }
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;
  }

  addPulseModulator() {
    // Check if we have ModulatorManager and UI references
    if (!this.modulatorManager) {
      console.error("ModulatorManager not initialized in PulseModulationUi");
      return null;
    }

    // Get target names directly from ModulatorManager
    const targetNames = this.modulatorManager.getTargetNames();
    if (targetNames.length === 0) {
      console.warn("No targets available for modulation");
      return null;
    }

    // Make sure folders array is initialized
    if (!this.modulatorFolders) {
      this.modulatorFolders = [];
    }

    // Create a new modulator through ModulatorManager
    const modulator = this.modulatorManager.createPulseModulator();

    // Create folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Modulator ${index + 1}`);

    // Store the folder reference
    this.modulatorFolders.push(folder);

    // Add enable/disable toggle
    folder
      .add(modulator, "enabled")
      .name("Enabled")
      .onChange((value) => {
        modulator.enabled = value;
      });

    // Add target selector
    const targetController = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        // Skip "None" option
        if (value === "None") return;

        // Get target info from the manager
        const targetInfo = this.modulatorManager.getTargetInfo(value);
        if (!targetInfo) return;

        // Connect the modulator to its target
        if (typeof modulator.setTarget === "function") {
          modulator.setTarget(value);
        } else {
          modulator.targetName = value;
        }

        // ALWAYS update the controllers' allowed RANGE to match the target
        if (
          targetInfo &&
          targetInfo.min !== undefined &&
          targetInfo.max !== undefined
        ) {
          const min = targetInfo.min;
          const max = targetInfo.max;
          const step = targetInfo.step || 0.01;

          // Update the RANGE of the controllers (not just values)
          if (minController) {
            minController.min(min);
            minController.max(max);
            minController.step(step);
          }

          if (maxController) {
            maxController.min(min);
            maxController.max(max);
            maxController.step(step);
          }

          // Only update VALUES if not loading from preset
          if (!modulator._loadingFromPreset) {
            console.log(`Auto-ranging for target ${value}`);
            minController.setValue(min);
            maxController.setValue(max);
            modulator.min = min;
            modulator.max = max;
          } else {
            console.log(
              `Using preset values for target ${value}, updating only input ranges`
            );
          }
        }
      });

    // Set the initial value to "None"
    targetController.setValue("None");

    // Add modulation type
    folder
      .add(modulator, "type", [
        "sine",
        "square",
        "triangle",
        "sawtooth",
        "sustainedPulse",
      ])
      .name("Wave Type");

    // Add sync control

    folder
      .add(modulator, "sync")
      .name("Sync with Master")
      .onChange((value) => {
        // Show/hide the frequency control based on sync state
        if (frequencyController) {
          frequencyController.domElement.style.display = value ? "none" : "";
        }

        // When enabling sync, immediately update frequency to match master
        if (value) {
          // Get the master frequency, ensure it's a valid number
          const masterFreq = this.masterFrequency || 1.0;

          // Update the modulator's frequency
          modulator.frequency = masterFreq;

          // Also ensure phase is aligned consistently
          modulator.currentPhase = 0;

          console.log(
            `Syncing modulator ${index} to master frequency: ${masterFreq}Hz`
          );

          // Force update the visuals
          if (frequencyController) {
            frequencyController.updateDisplay();
          }
        }
      });
    // Add frequency control
    const frequencyController = folder
      .add(modulator, "frequency", 0.01, 3, 0.01)
      .name("Frequency (Hz)");

    // Initially hide the frequency controller if sync is enabled
    if (modulator.sync) {
      frequencyController.domElement.style.display = "none";
    }

    // Add min/max controls
    const minController = folder
      .add(modulator, "min", -10, 10)
      .name("Min Value");
    const maxController = folder
      .add(modulator, "max", -10, 10)
      .name("Max Value");

    // Add phase control
    folder.add(modulator, "phase", 0, 3.9, 0.01).name("Phase");

    // Add remove button - FIXED using the correct method for lil-gui
    const removeButton = {
      remove: () => {
        // Disable the modulator first to reset target to original value
        modulator.disable();

        // Remove the modulator from the manager
        this.modulatorManager.removeModulator(index);

        // Remove the folder using the correct method for lil-gui
        folder.destroy();

        // Fix: Use this.modulatorFolders instead of this.modulatorFolders
        const folderIndex = this.modulatorFolders.indexOf(folder);
        if (folderIndex > -1) {
          this.modulatorFolders.splice(folderIndex, 1);
        }
      },
    };
    folder.add(removeButton, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    return modulator;
  }
  //#endregion

  //#region Update

  update() {
    if (!this.modulatorManager) return;

    // Update sync state with master frequency
    this.modulatorManager.modulators
      .filter((modulator) => modulator.type === "pulse" && modulator.sync)
      .forEach((modulator) => {
        modulator.frequency = this.masterFrequency;
      });

    // Let the manager handle the actual updates
    this.modulatorManager.update();

    // Update all UI displays
    this.updateUIDisplays();
  }

  updateUIDisplays() {
    // Update target controller displays in left/right UI
    if (this.rightUi?.updateControllerDisplays) {
      this.rightUi.updateControllerDisplays();
    }

    if (this.leftUi?.updateControllerDisplays) {
      this.leftUi.updateControllerDisplays();
    }

    // Update modulator displays
    this.updateModulatorDisplays();
  }

  updateModulatorDisplays() {
    // Update all modulator UI controllers to reflect current values
    if (!this.modulatorManager || !this.modulatorFolders) return; // Changed from this.modulatorFolders

    this.modulatorManager.modulators.forEach((modulator, index) => {
      // Find the folder for this modulator
      const folder = this.modulatorFolders[index]; // Changed from this.modulatorFolders
      if (!folder) return;

      // Update all controllers in the folder
      folder.controllers.forEach((controller) => {
        // Only update controllers for properties that exist on the modulator
        if (modulator.hasOwnProperty(controller.property)) {
          controller.updateDisplay();
        }
      });
    });
  }

  //#endregion

  //#region Preset Management

  updatePresetDropdown(selectElement) {
    // Find the dropdown if not provided
    if (!selectElement) {
      const presetFolder = this.gui.__folders["Presets"];
      selectElement = presetFolder.__controllers.find(
        (c) => c.property === "preset"
      );
    }

    if (selectElement) {
      // Get the updated options
      const options = this.presetManager.getPresetOptions(
        PresetManager.TYPES.PULSE
      );

      // Update the options
      selectElement.options(options);
    }
  }

  initWithPresetManager(presetManager) {
    if (!presetManager) {
      console.warn("PresetManager not provided");
      return;
    }

    this.presetManager = presetManager;
    this.initPresetControls(presetManager);
    console.log(`${this.constructor.name} initialized with preset manager`);
  }

  loadPresetData(preset) {
    console.log("PulseModulationUi: Loading preset data");

    try {
      // Validate preset data
      if (!preset || !preset.modulators || !Array.isArray(preset.modulators)) {
        console.warn("Invalid preset data format");
        return false;
      }

      // Clear existing modulators
      this.clearAllModulators();

      // For "None" preset, just clear modulators and return
      if (preset.modulators.length === 0) {
        return true;
      }

      // Process each modulator in the preset data
      preset.modulators.forEach((modData) => {
        // Create a new modulator through our standard method
        const mod = this.addPulseModulator();

        if (!mod) {
          console.error("Failed to create modulator");
          return;
        }

        // Set a flag to prevent auto-ranging from overriding preset values
        mod._loadingFromPreset = true;

        // Store the preset's min/max values first
        const presetMin = modData.min !== undefined ? Number(modData.min) : 0;
        const presetMax = modData.max !== undefined ? Number(modData.max) : 1;

        // Set target (this may trigger auto-ranging in the target onChange handler)
        if (modData.targetName && mod.targetName !== modData.targetName) {
          // Find the target controller in the folder
          const folder =
            this.modulatorFolders[this.modulatorFolders.length - 1];
          const targetController = folder.controllers.find(
            (c) => c.property === "targetName"
          );
          if (targetController) {
            targetController.setValue(modData.targetName);
          }
        }

        // Now we need to find the min/max controllers and update them with preset values
        const folder = this.modulatorFolders[this.modulatorFolders.length - 1];
        const minController = folder.controllers.find(
          (c) => c.property === "min"
        );
        const maxController = folder.controllers.find(
          (c) => c.property === "max"
        );

        // Update the modulator values from preset
        mod.min = presetMin;
        mod.max = presetMax;

        // Update other properties
        if (modData.type) {
          const typeController = folder.controllers.find(
            (c) => c.property === "type"
          );
          if (typeController) typeController.setValue(modData.type);
        }

        if (modData.frequency !== undefined) {
          mod.frequency = Number(modData.frequency);
          const freqController = folder.controllers.find(
            (c) => c.property === "frequency"
          );
          if (freqController) freqController.updateDisplay();
        }

        if (modData.phase !== undefined) {
          mod.phase = Number(modData.phase);
          const phaseController = folder.controllers.find(
            (c) => c.property === "phase"
          );
          if (phaseController) phaseController.updateDisplay();
        }

        if (modData.sync !== undefined) {
          mod.sync = Boolean(modData.sync);
          const syncController = folder.controllers.find(
            (c) => c.property === "sync"
          );
          if (syncController) {
            syncController.setValue(mod.sync);
            // Update frequency visibility
            const freqController = folder.controllers.find(
              (c) => c.property === "frequency"
            );
            if (freqController) {
              freqController.domElement.style.display = mod.sync ? "none" : "";
            }
          }
        }

        // Apply stored min/max values AFTER all other properties are set
        if (minController) minController.setValue(presetMin);
        if (maxController) maxController.setValue(presetMax);

        // Enable the modulator if it was enabled in the preset
        mod.enabled = !!modData.enabled;
        const enabledController = folder.controllers.find(
          (c) => c.property === "enabled"
        );
        if (enabledController) enabledController.setValue(mod.enabled);

        // Clear the loading flag
        mod._loadingFromPreset = false;
      });

      return true;
    } catch (error) {
      console.error("Error loading pulse preset data:", error);
      return false;
    }
  }
  //#endregion

  //#region Other

  setModulatorManager(manager) {
    this.modulatorManager = manager;
  }

  clearAllModulators() {
    console.log("PulseModulationUI: Clearing all modulators");

    try {
      // First, disable all existing modulators
      if (
        this.modulatorManager &&
        Array.isArray(this.modulatorManager.modulators)
      ) {
        this.modulatorManager.modulators.forEach((modulator) => {
          if (modulator && typeof modulator.disable === "function") {
            modulator.disable();
          }
        });
      }

      // Remove modulators from the manager
      if (
        this.modulatorManager &&
        typeof this.modulatorManager.removeModulatorsByType === "function"
      ) {
        this.modulatorManager.removeModulatorsByType("pulse");
      }

      // Clean up UI folders - this is the critical part that was missing
      if (Array.isArray(this.modulatorFolders)) {
        // Create a copy of the array since we'll be modifying it while iterating
        const foldersToRemove = [...this.modulatorFolders];

        foldersToRemove.forEach((folder) => {
          if (folder && typeof folder.destroy === "function") {
            folder.destroy();
          }
        });

        // Clear the folders array
        this.modulatorFolders = [];
      }

      // Also clean up any other tracked UI elements
      if (this.modulatorControls && Array.isArray(this.modulatorControls)) {
        this.modulatorControls.forEach((control) => {
          try {
            if (
              control &&
              control.domElement &&
              control.domElement.parentNode
            ) {
              control.domElement.parentNode.removeChild(control.domElement);
            }
          } catch (e) {
            console.warn("Error removing modulator control from DOM:", e);
          }
        });

        this.modulatorControls = [];
      }

      return true;
    } catch (error) {
      console.error("Error clearing modulators:", error);
      return false;
    }
  }

  getModulatorsData() {
    if (!this.modulatorManager) {
      return { modulators: [] };
    }

    // Use the modulatorManager to get modulator states
    const modulatorData = this.modulatorManager.getModulatorsState("pulse");

    return {
      modulators: modulatorData,
    };
  }

  //#endregion
}
