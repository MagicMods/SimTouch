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
    this.gui
      .add(this, "masterFrequency", 0.01, 3, 0.01)
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
      if (
        presetName &&
        this.presetManager.savePreset(
          PresetManager.TYPES.PULSE,
          presetName,
          this
        )
      ) {
        this.updatePresetDropdown(presetSelect);
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

    // Get the Add Modulator button (second controller after master frequency)
    const addModulatorController = this.gui.controllers[1];
    const addModulatorElement = addModulatorController?.domElement;

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

  //#region Modulator Management

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
      },
    };
    folder.add(removeButton, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    return modulator;
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

  //#region Update and State Management

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

  getModulatorsData() {
    if (!this.modulatorManager) {
      return { modulators: [] };
    }

    return {
      modulators: this.modulatorManager.getModulatorsState("pulse") || [],
    };
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
        // Create a new modulator
        const mod = this.addPulseModulator();

        if (!mod) {
          console.error("Failed to create modulator");
          return;
        }

        // Set a flag to prevent auto-ranging from overriding preset values
        mod._loadingFromPreset = true;

        // Store the preset's min/max values
        const presetMin = modData.min !== undefined ? Number(modData.min) : 0;
        const presetMax = modData.max !== undefined ? Number(modData.max) : 1;

        // Find the folder for this modulator
        const folder = this.modulatorFolders[this.modulatorFolders.length - 1];

        // Set target first (this will set up controller ranges but not values)
        if (modData.targetName) {
          const targetController = folder.controllers.find(
            (c) => c.property === "targetName"
          );
          if (targetController) targetController.setValue(modData.targetName);
        }

        // Find controllers
        const minController = folder.controllers.find(
          (c) => c.property === "min"
        );
        const maxController = folder.controllers.find(
          (c) => c.property === "max"
        );

        // Set other properties from preset
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

            // Update frequency controller visibility
            const freqController = folder.controllers.find(
              (c) => c.property === "frequency"
            );
            if (freqController) {
              freqController.domElement.style.display = mod.sync ? "none" : "";
            }
          }
        }

        // Apply min/max values explicitly
        mod.min = presetMin;
        mod.max = presetMax;

        // Update controllers if they exist
        if (minController) minController.setValue(presetMin);
        if (maxController) maxController.setValue(presetMax);

        // Enable the modulator if it was enabled in the preset
        mod.enabled = !!modData.enabled;
        const enabledController = folder.controllers.find(
          (c) => c.property === "enabled"
        );
        if (enabledController) enabledController.setValue(mod.enabled);

        // Clear the loading flag
        delete mod._loadingFromPreset;
      });

      return true;
    } catch (error) {
      console.error("Error loading pulse preset data:", error);
      return false;
    }
  }
  //#endregion
}
