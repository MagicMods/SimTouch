import { BaseUi } from "./baseUi.js";
import { ModulatorManager } from "../../input/modulatorManager.js";

export class PulseModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize the ModulatorManager (correct the variable name)
    this.modulatorManager = new ModulatorManager();

    // For backward compatibility with existing code
    this.pulseModManager = this.modulatorManager;

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
    this.initializeTargetControllerMap();
  }

  initBasicControls() {
    // Add button to add a new modulator
    const addButton = { add: () => this.addPulseModulator() };
    this.gui.add(addButton, "add").name("Add Modulator");

    // Add master frequency slider
    this.gui
      .add(this.pulseModManager, "masterFrequency", 0.01, 3, 0.01)
      .name("Master Frequency (Hz)")
      .onChange(() => {
        // When master frequency changes, update all modulators that are synced
        this.updateModulatorDisplays();
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
      this.pulseModManager = this.modulatorManager;
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
    this.registerAvailableTargets();

    // Check if we have any targets
    const targetNames = this.pulseModManager.getTargetNames();
    if (targetNames.length === 0) {
      console.warn("No targets available for modulation");
      alert("No modulatable targets found. Please check console for details.");
      return null;
    }

    // Make sure folders array is initialized
    if (!this.folders) {
      this.folders = [];
    }

    const modulator = this.pulseModManager.createPulseModulator();

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
      .add(modulator, "targetName", targetNames)
      .name("Target")
      .onChange((value) => {
        modulator.setTarget(value);
        this.updateRangeForTarget(modulator, minController, maxController);
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
        if (value) {
          // When sync is true, hide the frequency controller
          frequencyController.domElement.style.display = "none";
          // When enabling sync, update displays
          this.updateModulatorDisplays();
        } else {
          // When sync is false, show the frequency controller
          frequencyController.domElement.style.display = "";
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

    // Add auto-range button
    const autoRangeControl = {
      autoRange: () => {
        this.updateRangeForTarget(modulator, minController, maxController);
      },
    };
    folder.add(autoRangeControl, "autoRange").name("Auto Range");

    // Add remove button - FIXED using the correct method for lil-gui
    const removeButton = {
      remove: () => {
        // Disable the modulator first to reset target to original value
        modulator.disable();

        // Remove the modulator from the manager
        this.pulseModManager.removeModulator(index);

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
    if (this.pulseModManager) {
      this.pulseModManager.update();

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
        this.presetManager.savePulsePreset(presetName, this.pulseModManager)
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
    if (!this.pulseModManager || !this.folders) return; // Changed from this.modulatorFolders

    this.pulseModManager.modulators.forEach((modulator, index) => {
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

  // Add this method to maintain a mapping between target names and their GUI controllers
  initializeTargetControllerMap() {
    this.targetControllerMap = new Map();
  }

  // Add this helper method to find GUI controllers
  findGuiControllerForTarget(name) {
    // Check in leftUi
    if (this.leftUi && this.leftUi.gui) {
      for (const folder of this.leftUi.gui.folders) {
        for (const controller of folder.controllers) {
          if (controller.property === this.getPropertyForTargetName(name)) {
            return controller;
          }
        }
      }
    }

    // Check in rightUi
    if (this.rightUi && this.rightUi.gui) {
      for (const folder of this.rightUi.gui.folders) {
        for (const controller of folder.controllers) {
          if (controller.property === this.getPropertyForTargetName(name)) {
            return controller;
          }
        }
      }
    }

    return null;
  }

  // Helper to get property name from target name
  getPropertyForTargetName(name) {
    const target = this.leftUi.getControllerForTarget(name);
    return target ? target.property : null;
  }

  /**
   * Update target dropdown options in all modulator folders
   */
  updateTargetDropdowns() {
    // Get the updated list of target names
    const targetNames = this.pulseModManager?.getTargetNames() || [];

    // Skip if we don't have modulators or target names
    if (!this.folders || !targetNames.length) return; // Changed from this.modulatorFolders

    // Update each modulator folder's target dropdown
    this.folders.forEach((folder) => {
      // Changed from this.modulatorFolders
      // Find the target controller (usually the second controller in the folder)
      const targetController = folder.controllers.find(
        (c) => c.property === "targetName"
      );

      if (targetController && targetController.options) {
        // Update available options
        targetController.options(targetNames);
        targetController.updateDisplay();
      }
    });
  }

  updateRangeForTarget(modulator, minController, maxController) {
    const targetName = modulator.targetName;
    if (!targetName) return;

    // Get target info from either UI panel
    let controllerInfo = null;
    if (this.leftUi) {
      controllerInfo = this.leftUi.getControllerForTarget(targetName);
    }

    if (!controllerInfo && this.rightUi) {
      controllerInfo = this.rightUi.getControllerForTarget(targetName);
    }

    if (
      controllerInfo &&
      controllerInfo.min !== undefined &&
      controllerInfo.max !== undefined
    ) {
      // Get the target's min and max
      const min = controllerInfo.min;
      const max = controllerInfo.max;

      // Use the actual min/max from the target as the modulator's min/max
      modulator.min = min;
      modulator.max = max;

      // Set both min/max slider ranges to exactly match the target's range
      minController.min(min);
      minController.max(max);
      maxController.min(min);
      maxController.max(max);

      // Also set the actual values to match the target's range
      // This ensures the sliders display sensible values within the new range
      minController.setValue(min);
      maxController.setValue(max);

      // Set step value for precision
      if (controllerInfo.step !== undefined) {
        minController.step(controllerInfo.step);
        maxController.step(controllerInfo.step);
      }

      console.log(
        `Set range for ${targetName}: both sliders now have range ${min} to ${max}`
      );

      // Update controller displays
      minController.updateDisplay();
      maxController.updateDisplay();
    } else {
      console.warn(`No range information available for target: ${targetName}`);
    }
  }

  // Add this method to PulseModulationUi class
  setModulatorManager(manager) {
    this.modulatorManager = manager;
    this.pulseModManager = manager; // For backward compatibility
  }
}
