import { BaseUi } from "./baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class PulseModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.main = main;
    this.masterFrequency = 1.0;

    this.modulatorManager = null;
    this.modulatorFolders = [];
    this.presets = [];

    // Change the GUI title
    this.gui.title("Pulse Modulation");

    // Initialize basic controls
    this.initBasicControls();

    this.presetManager = null;
    this.presetSelect = null; // Reference to the HTML select element
    this.targetControllerMap = new Map();
  }

  //#region Ui Setup

  initBasicControls() {
    // Add master frequency slider
    const masterFreqController = this.gui
      .add(this, "masterFrequency", 0.01, 3, 0.01)
      .name("Master Frequency (Hz)")
      .onChange((value) => {
        // When master frequency changes, update all modulators that are synced
        if (this.modulatorManager) {
          this.modulatorManager.setMasterFrequency(value);
        }
      });

    // Add margin to master frequency controller
    masterFreqController.domElement.style.marginTop = "15px";

    // this.gui.push(this);

    // Add button to add a new modulator
    const addButton = { add: () => this.addPulseModulator() };
    const addModulatorController = this.gui
      .add(addButton, "add")
      .name("Add Modulator");

    // Add margin to the add modulator button
    addModulatorController.domElement.style.marginTop = "15px";
  }

  // Initialize with custom HTML preset controls - matching the original
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

    // Store reference to the select element
    this.presetSelect = presetSelect;

    // Populate dropdown options
    this.updatePresetDropdown(presetSelect);

    // Set up change event handler
    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Pulse modulation preset selector changed to:", value);
      this.presetManager.loadPreset(PresetManager.TYPES.PULSE, value, this);
    });

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
      if (!presetName) return;

      console.log(`Requesting save of pulse preset: ${presetName}`);

      try {
        // Get modulator data directly
        const data = this.getModulatorsData();
        console.log(
          `Prepared data for saving with ${data.modulators.length} modulators`
        );

        // Explicitly validate before saving
        if (!data || !Array.isArray(data.modulators)) {
          alert("Failed to save: Invalid modulator data");
          return;
        }

        // Try to save the preset
        const success = this.presetManager.savePreset(
          PresetManager.TYPES.PULSE,
          presetName,
          data // Pass data directly instead of 'this'
        );

        if (success) {
          this.updatePresetDropdown(presetSelect);
          alert(`Pulse modulation preset "${presetName}" saved.`);
        } else {
          alert("Failed to save preset.");
        }
      } catch (error) {
        console.error("Error saving preset:", error);
        alert(`Error saving preset: ${error.message}`);
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

      if (
        confirm(`Delete preset "${current}"?`) &&
        this.presetManager.deletePreset(PresetManager.TYPES.PULSE, current)
      ) {
        this.updatePresetDropdown(presetSelect);
        alert(`Pulse modulation preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // CHANGED: Insert preset controls INSIDE the container element (not before it)
    // This matches the InputModulationUi behavior
    containerElement.insertBefore(presetSelect, containerElement.firstChild);
    containerElement.insertBefore(actionsContainer, presetSelect.nextSibling);

    // Add the Add Modulator button at the appropriate position
    // Note: We're not removing and re-inserting it, just letting it stay in its normal position
    // This simplifies the code and matches InputModulationUi's approach
  }

  // Helper method to update dropdown options
  updatePresetDropdown(selectElement) {
    if (!this.presetManager || !selectElement) return;

    const options = this.presetManager.getPresetOptions(
      PresetManager.TYPES.PULSE
    );
    console.log(
      "Updating pulse modulation preset dropdown with options:",
      options
    );

    // Clear existing options
    selectElement.innerHTML = "";

    // Add all available presets
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Set current selection
    const currentPreset = this.presetManager.getSelectedPreset(
      PresetManager.TYPES.PULSE
    );
    if (currentPreset) {
      selectElement.value = currentPreset;
    }
  }

  // Initialize with preset manager
  initWithPresetManager(presetManager) {
    console.log("PulseModulationUi initialized with preset manager");
    if (presetManager) {
      this.initPresetControls(presetManager);
    }
  }

  // Initialize with UI panels
  initializeWithUiPanels(leftUi, rightUi) {
    console.log("PulseModulationUi initializing with UI panels");
    this.leftUi = leftUi;
    this.rightUi = rightUi;
  }

  //#endregion

  //#region Modulator
  // Set a modulator manager
  setModulatorManager(manager) {
    this.modulatorManager = manager;
  }

  // Add a new pulse modulator
  addPulseModulator() {
    // Check if we have ModulatorManager reference
    if (!this.modulatorManager) {
      console.error("ModulatorManager not initialized in PulseModulationUi");
      return null;
    }

    // Get target names from ModulatorManager
    const targetNames = this.modulatorManager.getTargetNames();
    if (targetNames.length === 0) {
      console.warn("No targets available for modulation");
      alert("No modulatable targets found. Please check console for details.");
      return null;
    }

    // Create a new modulator
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

        // Connect the modulator to its target
        if (typeof modulator.setTarget === "function") {
          modulator.setTarget(value);
        } else {
          modulator.targetName = value;
        }

        // Update min/max controllers with the target's range
        const target = this.modulatorManager.getTargetInfo(value);
        if (target && target.min !== undefined && target.max !== undefined) {
          const min = target.min;
          const max = target.max;
          const step = target.step || 0.01;

          // Always update the controller ranges
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
            modulator.min = min;
            modulator.max = max;
            minController.updateDisplay();
            maxController.updateDisplay();
          } else {
            console.log(
              `Using preset values for target ${value}, updating only input ranges`
            );
          }
        }
      });

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

        // When enabling sync, update frequency to match master
        if (value) {
          modulator.frequency = this.masterFrequency;
          modulator.currentPhase = 0; // Reset phase for better synchronization
          frequencyController.updateDisplay();
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

    // Add remove button
    const removeButton = {
      remove: () => {
        // Disable the modulator first
        modulator.enabled = false;

        // Remove the modulator from the manager
        this.modulatorManager.removeModulator(modulator);

        // Remove the folder
        folder.destroy();

        // Remove from our tracking array
        const folderIndex = this.modulatorFolders.indexOf(folder);
        if (folderIndex > -1) {
          this.modulatorFolders.splice(folderIndex, 1);
        }

        // If no modulators remain, set preset to "None" AND LOAD THE DEFAULT PRESET DATA
        if (this.modulatorFolders.length === 0 && this.presetSelect) {
          this.presetSelect.value = "None";

          // Actually load the "None" preset data instead of just changing the dropdown
          if (this.presetManager) {
            // This will trigger the same behavior as selecting "None" from dropdown
            this.presetManager.loadPreset(
              PresetManager.TYPES.PULSE,
              "None",
              this
            );
          }
        }
      },
    };
    folder.add(removeButton, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    return modulator;
  }

  getModulatorsData() {
    const modulators = [];

    // Extract data from each modulator folder in the UI
    this.modulatorFolders.forEach((folder) => {
      const modData = {
        type: "pulse",
        enabled: false,
        frequency: 1.0,
        amplitude: 1.0,
        phase: 0,
        waveform: "sine",
        min: 0,
        max: 1,
        targetName: "None",
      };

      // Extract values from controllers
      folder.controllers.forEach((controller) => {
        if (controller?.property) {
          const prop = controller.property;
          if (controller.getValue) {
            modData[prop] = controller.getValue();
          } else if (controller.object && prop in controller.object) {
            modData[prop] = controller.object[prop];
          }
        }
      });

      modulators.push(modData);
    });

    return { modulators };
  }

  clearAllModulators() {
    console.log("PulseModulationUI: Clearing all modulators");

    try {
      // First, disable all existing modulators
      if (
        this.modulatorManager &&
        Array.isArray(this.modulatorManager.modulators)
      ) {
        this.modulatorManager.modulators
          .filter((m) => m.type === "pulse")
          .forEach((modulator) => {
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

      // Clean up UI folders
      if (Array.isArray(this.modulatorFolders)) {
        // Create a copy since we'll be modifying it while iterating
        const foldersToRemove = [...this.modulatorFolders];

        foldersToRemove.forEach((folder) => {
          if (folder && typeof folder.destroy === "function") {
            folder.destroy();
          }
        });

        // Clear the folders array
        this.modulatorFolders = [];
      }

      return true;
    } catch (error) {
      console.error("Error clearing modulators:", error);
      return false;
    }
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

    // Update displays
    this.updateModulatorDisplays();
  }

  updateModulatorDisplays() {
    // Update all modulator UI controllers to reflect current values
    if (!this.modulatorManager || !this.modulatorFolders) return;

    this.modulatorManager.modulators
      .filter((m) => m.type === "pulse")
      .forEach((modulator, index) => {
        // Find the folder for this modulator
        const folder = this.modulatorFolders[index];
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

  loadPresetData(preset) {
    // Validate preset format
    if (!preset || typeof preset !== "object") {
      console.warn("Invalid preset data: not an object");
      return false;
    }

    // Ensure preset has modulators array
    if (!Array.isArray(preset.modulators)) {
      console.warn("Invalid preset data: missing modulators array");
      return false;
    }

    // Clear existing modulators
    this.clearAllModulators();

    // Empty preset case
    if (preset.modulators.length === 0) {
      return true;
    }

    // Create modulators from the data
    preset.modulators.forEach((modData, index) => {
      const mod = this.addPulseModulator();
      if (!mod) return;

      // Mark as loading from preset to prevent side effects
      mod._loadingFromPreset = true;

      // Get the folder for UI updates
      const folder = this.modulatorFolders[this.modulatorFolders.length - 1];

      // Apply basic properties
      Object.keys(modData).forEach((key) => {
        if (key in mod && key !== "target" && key !== "targetName") {
          mod[key] = modData[key];
        }
      });

      // Apply target last
      if (modData.targetName && modData.targetName !== "None") {
        mod.setTarget(modData.targetName);

        // Update target UI
        const targetController = folder.controllers.find(
          (c) => c.property === "targetName"
        );
        if (targetController?.setValue) {
          targetController.setValue(modData.targetName);
        }
      }

      // Update all other UI controls
      folder.controllers.forEach((controller) => {
        if (
          controller.property &&
          controller.property in mod &&
          controller.setValue
        ) {
          controller.setValue(mod[controller.property]);
        }
      });

      // Clear loading flag
      delete mod._loadingFromPreset;
    });

    return true;
  }

  //#endregion
}
