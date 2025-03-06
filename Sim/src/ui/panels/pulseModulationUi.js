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
        this.modulatorManager.modulators.forEach((mod) => {
          if (mod.sync) {
            mod.frequency = value;
            console.log(`Updating synced modulator to frequency: ${value}Hz`);
          }
        });

        // Update displays after changing values
        if (typeof this.updateModulatorDisplays === "function") {
          this.updateModulatorDisplays();
        }
      });
    this.gui.open(false);
  }

  // Replace registerAvailableTargets with this simplified version
  registerAvailableTargets() {
    console.log(
      "PulseModulationUi delegating target registration to ModulatorManager"
    );

    // Make sure the manager exists
    if (!this.modulatorManager) {
      this.modulatorManager = new ModulatorManager();
      console.warn(
        "Had to create a new ModulatorManager during target registration"
      );
    }

    // Use the centralized method from ModulatorManager
    if (this.leftUi && this.rightUi) {
      this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);
    } else {
      console.warn(
        "PulseModulationUi missing UI panel references for target registration"
      );
    }
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
    // Refresh available targets before checking
    if (!this.leftUi || !this.rightUi || !this.modulatorManager) {
      console.error(
        "Cannot add pulse modulator: UI panels or ModulatorManager not initialized"
      );
      alert("System not fully initialized. Please try again in a moment.");
      return null;
    }
    this.registerAvailableTargets();

    // Check if we have any targets
    const targetNames = this.modulatorManager.getTargetNames();
    if (targetNames.length === 0) {
      console.warn("No targets available for modulation");
      alert("No modulatable targets found. Please check console for details.");
      return null;
    }

    // Make sure folders array is initialized
    if (!this.folders) {
      this.folders = [];
    }

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

        // Connect the modulator to its target - THIS IS THE KEY ADDITION
        if (typeof modulator.setTarget === "function") {
          // Use the proper method to connect the modulator
          modulator.setTarget(value);
        } else {
          // Fallback if setTarget doesn't exist
          modulator.targetName = value;
        }

        // ALWAYS update the controllers' allowed range to match the target
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

          // Only update VALUES of controllers if not loading from preset
          if (!modulator._loadingFromPreset) {
            console.log(`Auto-ranging for target ${value}`);

            // Set values to match target min/max
            minController.setValue(min);
            maxController.setValue(max);

            // Update modulator properties directly too
            modulator.min = min;
            modulator.max = max;
          } else {
            console.log(
              `Using preset values for target ${value}, updating only input ranges`
            );
            // Reset the flag after first use
            modulator._loadingFromPreset = false;
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

    // // Add auto-range button
    // const autoRangeControl = {
    //   autoRange: () => {
    //     this.updateRangeForTarget(modulator, minController, maxController);
    //   },
    // };
    // folder.add(autoRangeControl, "autoRange").name("Auto Range");

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

  // Find the actual controller for a given target name - directly from the LeftUi implementation

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

  // Fix the updateRangeForTarget method
  updateRangeForTarget(modulator, minController, maxController) {
    const targetName = modulator.targetName;
    if (!targetName) {
      console.warn("No target name specified for auto-range");
      return;
    }

    // Directly access the target from ModulatorManager
    const targetController = this.modulatorManager.targets[targetName];
    if (!targetController) {
      console.warn(`Target "${targetName}" not found for auto-range`);
      return;
    }

    // Extract min and max directly from the target controller
    const min = targetController.min;
    const max = targetController.max;
    const step = targetController.step || 0.01;

    // Check if we have valid numeric values
    if (min !== undefined && max !== undefined && !isNaN(min) && !isNaN(max)) {
      console.log(
        `Auto-ranging ${targetName} from ${min} to ${max}, step ${step}`
      );

      // Update modulator's min/max
      modulator.min = min;
      modulator.max = max;

      // Update controller ranges
      if (minController) {
        minController.min(min);
        minController.max(max);
        minController.setValue(min);
        minController.step(step);
        minController.updateDisplay();
      }

      if (maxController) {
        maxController.min(min);
        maxController.max(max);
        maxController.setValue(max);
        maxController.step(step);
        maxController.updateDisplay();
      }
    } else {
      console.warn(
        `Invalid range for target ${targetName}: min=${min}, max=${max}`
      );

      // Set default values as fallback
      modulator.min = 0;
      modulator.max = 1;

      if (minController) {
        minController.min(0);
        minController.max(1);
        minController.setValue(0);
      }

      if (maxController) {
        maxController.min(0);
        maxController.max(1);
        maxController.setValue(1);
      }
    }
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
    console.log("PulseModulationUi: Loading preset data directly");

    try {
      // Validate preset data
      if (!preset || !preset.modulators || !Array.isArray(preset.modulators)) {
        console.warn("Invalid preset data format");
        return false;
      }

      // Clear existing modulators - use our own internal method
      this._clearAllModulators();

      // For "None" preset, just clear modulators and return
      if (preset.modulators.length === 0) {
        if (typeof this.update === "function") {
          this.update();
        }
        return true;
      }

      // Create new modulators from preset data
      preset.modulators.forEach((modData) => {
        // Use addPulseModulator which is the correct method
        const mod = this.addPulseModulator();

        if (!mod) {
          console.error("Failed to create modulator");
          return;
        }

        // Apply target if specified
        if (modData.targetName && typeof mod.setTarget === "function") {
          mod.setTarget(modData.targetName);
        }

        // Apply wave type if specified
        if (modData.type && typeof mod.setWaveType === "function") {
          mod.setWaveType(modData.type);
        }

        // Apply basic properties
        mod.frequency = modData.frequency || 0.5;
        mod.amplitude = modData.amplitude || 0.5;
        mod.phase = modData.phase || 0;
        mod.bias = modData.bias || 0.5;
        mod.min = modData.min || 0;
        mod.max = modData.max || 1;
        mod.enabled = !!modData.enabled;
      });

      // Use update() instead of updateUI()
      if (typeof this.update === "function") {
        this.update();
      }

      return true;
    } catch (error) {
      console.error("Error loading pulse preset data:", error);
      return false;
    }
  }

  /**
   * Internal method to clear all modulators
   * @private
   */
  _clearAllModulators() {
    console.log("PulseModulationUi: Clearing all modulators");

    // First disable all modulators to reset target values
    if (this.modulatorManager && this.modulatorManager.modulators) {
      // Create a copy of the array since we'll be modifying it
      const modulatorsToRemove = [...this.modulatorManager.modulators];

      // Disable and remove each modulator from the manager
      modulatorsToRemove.forEach((modulator, index) => {
        if (modulator) {
          // Disable the modulator to reset target to original value
          if (typeof modulator.disable === "function") {
            modulator.disable();
          } else {
            modulator.enabled = false;
          }

          // Remove from the manager
          this.modulatorManager.removeModulator(index);
        }
      });
    }

    // Remove all folders from the UI
    if (this.folders && Array.isArray(this.folders)) {
      this.folders.forEach((folder) => {
        if (folder && typeof folder.destroy === "function") {
          folder.destroy();
        }
      });
    }

    // Reset our tracking arrays
    this.folders = [];
  }

  /**
   * Clear all modulators from the UI
   * This is called by the preset system before loading new modulators
   */
  clearAllModulators() {
    console.log("PulseModulationUI: Clearing all modulators");

    // Keep track of whether we successfully removed modulators
    let cleared = false;

    try {
      // If we track our active modulators internally, use that
      if (Array.isArray(this.activeModulators)) {
        // Clone the array since we'll be modifying it while iterating
        const modulatorsToRemove = [...this.activeModulators];

        modulatorsToRemove.forEach((mod) => {
          if (mod) {
            // If we have a direct method to remove a modulator by ID
            if (
              mod.id &&
              this.modulatorManager &&
              typeof this.modulatorManager.removeModulator === "function"
            ) {
              this.modulatorManager.removeModulator(mod.id);
            }

            // If there's a disable method on the modulator itself
            if (typeof mod.disable === "function") {
              mod.disable();
            }

            // If there's a dispose method on the modulator
            if (typeof mod.dispose === "function") {
              mod.dispose();
            }
          }
        });

        // Clear the array
        this.activeModulators = [];
        cleared = true;
      }

      // Alternative method - remove by type if that method exists
      if (
        this.modulatorManager &&
        typeof this.modulatorManager.removeModulatorsByType === "function"
      ) {
        this.modulatorManager.removeModulatorsByType("pulse");
        cleared = true;
      }

      // If we have a method to remove all modulators, try that as a last resort
      if (
        !cleared &&
        this.modulatorManager &&
        typeof this.modulatorManager.clearModulators === "function"
      ) {
        this.modulatorManager.clearModulators("pulse");
        cleared = true;
      }
    } catch (error) {
      console.warn("Error while clearing modulators:", error);
    }

    // Clean up UI elements regardless of whether removing from manager succeeded
    if (this.modulatorControls && Array.isArray(this.modulatorControls)) {
      this.modulatorControls.forEach((control) => {
        try {
          if (control && control.domElement && control.domElement.parentNode) {
            control.domElement.parentNode.removeChild(control.domElement);
          }
        } catch (e) {
          console.warn("Error removing modulator control from DOM:", e);
        }
      });

      // Clear controls array
      this.modulatorControls = [];
    }

    // Update the UI to reflect the changes
    if (typeof this.updateModulatorList === "function") {
      this.updateModulatorList();
    } else if (this.modulatorListElement) {
      // Direct DOM manipulation fallback
      this.modulatorListElement.innerHTML = "";
    }

    return true;
  }

  /**
   * Load modulators from preset data
   * @param {Array|Object} data - Modulator data from preset
   */
  loadFromData(data) {
    console.log("PulseModulationUI: Loading modulators from preset data");

    if (!data) {
      console.log("No modulator data to load");
      return false;
    }

    try {
      // First clear existing modulators
      this.clearAllModulators();

      // Parse data if it's a string
      const modulatorData = typeof data === "string" ? JSON.parse(data) : data;

      // If it's an array, process each modulator
      if (Array.isArray(modulatorData)) {
        modulatorData.forEach((mod) => {
          if (typeof this.addModulator === "function") {
            this.addModulator(
              mod.type || "sine",
              mod.target || "Animation Speed",
              {
                frequency: mod.frequency || 1,
                amplitude: mod.amplitude || 0.5,
                phase: mod.phase || 0,
                offset: mod.offset || 0.5,
                enabled: mod.enabled !== undefined ? mod.enabled : true,
              }
            );
          }
        });
      }
      // If it's an object with a modulators property
      else if (
        modulatorData.modulators &&
        Array.isArray(modulatorData.modulators)
      ) {
        modulatorData.modulators.forEach((mod) => {
          if (typeof this.addModulator === "function") {
            this.addModulator(
              mod.type || "sine",
              mod.target || "Animation Speed",
              {
                frequency: mod.frequency || 1,
                amplitude: mod.amplitude || 0.5,
                phase: mod.phase || 0,
                offset: mod.offset || 0.5,
                enabled: mod.enabled !== undefined ? mod.enabled : true,
              }
            );
          }
        });
      }

      return true;
    } catch (error) {
      console.error("Error loading pulse modulator data:", error);
      return false;
    }
  }

  /**
   * Alias for loadFromData to support multiple method names
   */
  loadModulators(data) {
    return this.loadFromData(data);
  }

  /**
   * Get modulator data for saving to preset
   * @returns {Array} Array of modulator configuration objects
   */
  saveToData() {
    const modulators = [];

    try {
      // If we track modulators internally
      if (Array.isArray(this.activeModulators)) {
        this.activeModulators.forEach((mod) => {
          if (mod) {
            modulators.push({
              type: mod.type || "sine",
              target: mod.target || "Animation Speed",
              frequency: mod.frequency || 1,
              amplitude: mod.amplitude || 0.5,
              phase: mod.phase || 0,
              offset: mod.offset || 0.5,
              enabled: mod.enabled !== undefined ? mod.enabled : true,
            });
          }
        });
      }
    } catch (error) {
      console.error("Error extracting modulator data:", error);
    }

    return modulators;
  }

  /**
   * Alias for saveToData to support multiple method names
   */
  getModulatorsData() {
    return this.saveToData();
  }
}
