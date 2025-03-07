import { BaseUi } from "./baseUi.js";
import { ModulatorManager } from "../../input/modulatorManager.js";

export class PulseModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.masterFrequency = 1.0; // For pulse modulators

    // Don't create a new ModulatorManager here! It should be set by UiManager
    // this.modulatorManager = new ModulatorManager();
    this.modulatorManager = null; // Will be set by UiManager later

    // Initialize arrays
    this.folders = [];
    this.presets = [];

    // Change the GUI title
    this.gui.title("Pulse Modulation");

    // Initialize basic controls
    this.initBasicControls();

    // PresetManager will be initialized later when available
    this.presetManager = null;
    this.presetController = null;

    // Initialize target controller map
    this.targetControllerMap = new Map();
  }

  initBasicControls() {
    // Add button to add a new modulator
    const addButton = { add: () => this.addPulseModulator() };
    this.gui.add(addButton, "add").name("Add Modulator");

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
    this.gui.open(false);
  }

  // Update the initializeWithUiPanels method to accept a targetsRegistered flag
  initializeWithUiPanels(leftUi, rightUi, targetsRegistered = false) {
    console.log("PulseModulationUi initializing with UI panels");

    // Store UI references
    this.leftUi = leftUi;
    this.rightUi = rightUi;

    // No need to register targets since they're registered by UiManager

    console.log("PulseModulationUi initialized with UI panels");
  }

  // Add a new pulse modulator
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
    if (!this.folders) {
      this.folders = [];
    }

    // Create a new modulator through ModulatorManager
    const modulator = this.modulatorManager.createPulseModulator();

    // Create folder for this modulator
    const index = this.folders.length;
    const folder = this.gui.addFolder(`Modulator ${index + 1}`);

    // Store the folder reference
    this.folders.push(folder);

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

        // Fix: Use this.folders instead of this.modulatorFolders
        const folderIndex = this.folders.indexOf(folder);
        if (folderIndex > -1) {
          this.folders.splice(folderIndex, 1);
        }
      },
    };
    folder.add(removeButton, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    return modulator;
  }

  update() {
    this.modulatorManager.modulators.forEach((modulator) => {
      if (modulator.sync) {
        modulator.frequency = this.masterFrequency;
      }
    });
    if (this.modulatorManager) {
      this.modulatorManager.update();

      // After modulations are applied, update all potential target displays
      if (
        this.rightUi &&
        typeof this.rightUi.updateControllerDisplays === "function"
      ) {
        this.rightUi.updateControllerDisplays();
      }
      if (
        this.leftUi &&
        typeof this.leftUi.updateControllerDisplays === "function"
      ) {
        this.leftUi.updateControllerDisplays();
      }

      // Update our own modulator displays as well
      this.updateModulatorDisplays();
    }
  }

  initPresetControls(presetManager) {
    if (!presetManager) {
      console.warn("PresetManager not provided to PulseModulationUi");
      return;
    }

    this.presetManager = presetManager;

    // Find the correct container in GUI structure
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in GUI");
      return;
    }

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";

    presetSelect.style.margin = "5px";

    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Pulse modulation preset selector changed to:", value);
      this.presetManager.loadPulsePreset(value, this);
    });

    this.pulsePresetControls = { selector: presetSelect };

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px";

    actionsContainer.style.flexWrap = "wrap"; // Allow wrapping if needed

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter pulse modulation preset name:");
      if (
        this.presetManager.savePulsePreset(presetName, this.modulatorManager)
      ) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPulsePreset();
        alert(`Pulse modulation preset "${presetName}" saved.`);
      }
    });

    // DELETE BUTTON
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.style.margin = "0 2px";
    deleteButton.addEventListener("click", () => {
      const current = presetSelect.value;
      if (current === "None") {
        alert("Cannot delete the None preset!");
        return;
      }
      console.log("Attempting to delete pulse modulation preset:", current);
      if (
        confirm(`Delete preset "${current}"?`) &&
        this.presetManager.deletePulsePreset(current)
      ) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPulsePreset();
        alert(`Pulse modulation preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Get the Add Modulator button (first controller)
    const addModulatorController = this.gui.controllers[0];
    const addModulatorElement = addModulatorController.domElement;

    // Remove the Add Modulator button from its current position
    if (addModulatorElement && addModulatorElement.parentNode) {
      addModulatorElement.parentNode.removeChild(addModulatorElement);
    }

    // Insert preset controls at the top of the GUI
    this.gui.domElement.insertBefore(
      presetSelect,
      this.gui.domElement.querySelector(".children")
    );

    this.gui.domElement.insertBefore(
      actionsContainer,
      this.gui.domElement.querySelector(".children")
    );

    // Add the Add Modulator button back after the preset controls
    if (addModulatorElement) {
      this.gui.domElement
        .querySelector(".children")
        .insertBefore(
          addModulatorElement,
          this.gui.domElement.querySelector(".children").firstChild
        );
    }

    // Remove any existing lil-gui preset controllers
    if (this.presetController) {
      this.presetController.destroy();
      this.presetController = null;
    }
  }

  // Helper method to update dropdown options
  updatePresetDropdown(selectElement) {
    const options = this.presetManager.getPulsePresetOptions();
    console.log(
      "Updating pulse modulation preset dropdown with options:",
      options
    );

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.presetManager.getSelectedPulsePreset();
  }

  initWithPresetManager(presetManager) {
    if (presetManager) {
      this.initPresetControls(presetManager);
    } else {
      console.warn(
        "PresetManager not provided to PulseModulationUi.initWithPresetManager"
      );
    }
  }

  // Add this method to the PulseModulationUi class
  updateModulatorDisplays() {
    // Update all modulator UI controllers to reflect current values
    if (!this.modulatorManager || !this.folders) return; // Changed from this.modulatorFolders

    this.modulatorManager.modulators.forEach((modulator, index) => {
      // Find the folder for this modulator
      const folder = this.folders[index]; // Changed from this.modulatorFolders
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

  // Add this method to PulseModulationUi class
  setModulatorManager(manager) {
    this.modulatorManager = manager;
  }

  /**
   * Load pulse modulators from preset data
   * @param {Object} preset The preset data containing modulators
   * @returns {boolean} True if successful
   */
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
          const folder = this.folders[this.folders.length - 1];
          const targetController = folder.controllers.find(
            (c) => c.property === "targetName"
          );
          if (targetController) {
            targetController.setValue(modData.targetName);
          }
        }

        // Now we need to find the min/max controllers and update them with preset values
        const folder = this.folders[this.folders.length - 1];
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

  /**
   * Clear all modulators from the UI
   * This is called by the preset system before loading new modulators
   */
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
      if (Array.isArray(this.folders)) {
        // Create a copy of the array since we'll be modifying it while iterating
        const foldersToRemove = [...this.folders];

        foldersToRemove.forEach((folder) => {
          if (folder && typeof folder.destroy === "function") {
            folder.destroy();
          }
        });

        // Clear the folders array
        this.folders = [];
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

  /**
   * Get modulator data for saving to preset
   * @returns {Object} Object with modulators array
   */
  saveToData() {
    if (!this.modulatorManager) {
      return { modulators: [] };
    }

    // Use the modulatorManager to get modulator states
    const modulatorData = this.modulatorManager.getModulatorsState("pulse");

    return {
      modulators: modulatorData,
    };
  }

  /**
   * Alias for saveToData to support multiple method names
   */
  getModulatorsData() {
    return this.saveToData();
  }
}
