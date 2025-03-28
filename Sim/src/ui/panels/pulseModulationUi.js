import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class PulseModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.main = main;
    this.masterFrequency = 1.0;
    this.masterBpm = this.masterFrequency * 60; // Set BPM based on default frequency

    this.modulatorManager = null;
    this.modulatorFolders = [];
    this.presets = [];

    // Tap tempo state
    this.tapTempoTimes = [];
    this.tapTempoTimeoutId = null;
    this.tapTempoTimeoutDuration = 2000; // Reset after 2 seconds of inactivity
    this.beatButtonElement = null; // Store reference to beat button element

    this.modulators = [];
    this.targetSelectionMode = false;
    this.activeModulator = null;

    // Backwards compatibility properties - these will be populated dynamically
    // based on the active modulator during target selection
    this.targetSelectionButton = null;

    // Change the GUI title
    this.gui.title("Pulse Modulation");

    // Initialize basic controls
    this.initBasicControls();

    this.presetManager = null;
    this.presetSelect = null; // Reference to the HTML select element
  }

  //#region Ui Setup

  initBasicControls() {
    // Create a flex container for BPM and BEAT controls
    const controlsContainer = document.createElement("div");
    controlsContainer.style.display = "flex";
    controlsContainer.style.justifyContent = "space-between";
    // controlsContainer.style.alignItems = "center";
    controlsContainer.style.padding = "1px 8px";
    controlsContainer.style.width = "100%";
    // controlsContainer.style.marginTop = "10px";
    // Add to the GUI DOM directly
    const parentContainer = this.gui.domElement.querySelector(".children");
    if (parentContainer) {
      parentContainer.appendChild(controlsContainer);
    }

    // Create BPM slider directly
    const bpmContainer = document.createElement("div");
    bpmContainer.className = "bpm-container";
    bpmContainer.style.flex = "1";
    bpmContainer.style.marginRight = "10px";

    // Create slider row with label and value
    const bpmSliderRow = document.createElement("div");
    bpmSliderRow.className = "bpm-slider-row";

    // Add BPM label
    // const bpmLabel = document.createElement("div");
    // bpmLabel.className = "bpm-label";
    // bpmLabel.textContent = "BPM";

    const bpmSlider = document.createElement("input");
    bpmSlider.type = "range";
    bpmSlider.min = "1";
    bpmSlider.max = "220";
    bpmSlider.step = "1";
    bpmSlider.value = this.masterBpm.toString();
    bpmSlider.className = "bpm-slider";

    // Add BPM value display
    const bpmValue = document.createElement("input");
    bpmValue.type = "text";
    bpmValue.className = "bpm-value";
    bpmValue.value = this.masterBpm;


    // Add event listener for manual BPM input
    bpmValue.addEventListener("change", (e) => {
      // Parse input value and limit to valid range
      let value = parseInt(e.target.value);

      // Ensure the value is a valid number within range
      if (isNaN(value)) {
        value = this.masterBpm;
      } else {
        value = Math.max(1, Math.min(220, value));
      }

      // Update displayed value
      bpmValue.value = value;

      // Update slider position
      bpmSlider.value = value;

      // Update internal BPM and frequency
      this.masterBpm = value;
      const hzValue = this.bpmToHz(value);
      this.masterFrequency = hzValue;

      // Update synced modulators
      if (this.modulatorManager) {
        this.modulatorManager.setMasterFrequency(hzValue);
      }
    });

    // Handle Enter key press and prevent non-numeric input
    bpmValue.addEventListener("keydown", (e) => {
      // Allow: backspace, delete, tab, escape, enter
      if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {

        // Enter key - trigger change event
        if (e.keyCode === 13) {
          bpmValue.dispatchEvent(new Event('change'));
          bpmValue.blur(); // Remove focus
        }

        return;
      }

      // Ensure that it's a number and stop the keypress if not
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) &&
        (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    });

    // Add elements to slider row
    // bpmSliderRow.appendChild(bpmLabel);
    bpmSliderRow.appendChild(bpmSlider);
    bpmSliderRow.appendChild(bpmValue);

    // Add slider row to container
    bpmContainer.appendChild(bpmSliderRow);

    bpmSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.masterBpm = value;

      // Convert BPM to Hz for internal use
      const hzValue = this.bpmToHz(value);
      this.masterFrequency = hzValue;

      // When master frequency changes, update all modulators that are synced
      if (this.modulatorManager) {
        this.modulatorManager.setMasterFrequency(hzValue);
      }

      // Update BPM display value
      bpmValue.value = value;
    });

    // Create BEAT button directly
    const beatButton = document.createElement("button");
    beatButton.textContent = "BPM";
    beatButton.className = "bpm-button";


    beatButton.addEventListener("click", () => {
      this.triggerBeat();
      this.flashBeatButton();
    });

    // Store button reference for visual effects
    this.beatButtonElement = beatButton;

    // Add elements to the container
    controlsContainer.appendChild(bpmContainer);
    controlsContainer.appendChild(beatButton);

    // Store reference to BPM elements for tap tempo updates
    this.bpmValueElement = bpmValue;
    this.bpmSliderElement = bpmSlider;

    // Add button to add a new modulator
    const addButton = { add: () => this.addPulseModulator() };
    const addModulatorController = this.gui
      .add(addButton, "add")
      .name("Add Modulator");

    // Add margin to the add modulator button
    // addModulatorController.domElement.style.marginTop = "10px";
  }

  initPresetControls(presetManager) {
    if (!presetManager) return;

    this.presetManager = presetManager;

    // Find the correct container in GUI structure
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) return;

    // Create standardized preset controls
    this.presetControl = this.presetManager.createPresetControls(
      PresetManager.TYPES.PULSE,
      containerElement,
      { insertFirst: true }
    );
  }

  // Initialize with preset manager
  initWithPresetManager(presetManager) {
    console.log("PulseModulationUi initialized with preset manager");
    if (presetManager) {
      this.initPresetControls(presetManager);
    }
  }


  bpmToHz(bpm) {
    return bpm / 60;
  }


  hzToBpm(hz) {
    return hz * 60;
  }

  //#endregion

  //#region Modulator

  setModulatorManager(manager) {
    this.modulatorManager = manager;
  }

  addPulseModulator() {
    const modulator = this.modulatorManager.createPulseModulator();

    // Add BPM property that maps to frequency
    modulator.frequencyBpm = this.hzToBpm(modulator.frequency);

    // Create folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Modulator ${index + 1}`);

    // Store folder reference on the modulator object
    modulator.folder = folder;

    // Store the folder reference in the UI class array (optional, but maybe useful)
    this.modulatorFolders.push(folder);

    // Create button group container for Enable and Sync
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";
    buttonContainer.style.margin = "0px 10px";

    // Create Enable button
    const enableButton = document.createElement("button");
    enableButton.textContent = "Enabled";
    enableButton.className = "toggle-button";

    enableButton.style.backgroundColor = modulator.enabled ? "#ffbb00" : "#333";
    enableButton.style.color = modulator.enabled ? "#000" : "#ccc";

    enableButton.addEventListener("click", () => {
      modulator.enabled = !modulator.enabled;
      enableButton.style.backgroundColor = modulator.enabled ? "#ffbb00" : "#333";
      enableButton.style.color = modulator.enabled ? "#000" : "#ccc";
    });

    // Create Sync button
    const syncButton = document.createElement("button");
    syncButton.textContent = "Sync";
    syncButton.className = "toggle-button";
    syncButton.style.backgroundColor = modulator.sync ? "#ffbb00" : "#333";
    syncButton.style.color = modulator.sync ? "#000" : "#ccc";

    syncButton.addEventListener("click", () => {
      modulator.sync = !modulator.sync;
      syncButton.style.backgroundColor = modulator.sync ? "#ffbb00" : "#333";
      syncButton.style.color = modulator.sync ? "#000" : "#ccc";

      // If sync is enabled, update frequency from master
      if (modulator.sync) {
        modulator.frequency = this.masterFrequency;
        modulator.frequencyBpm = this.masterBpm;

        // Update BPM slider if it exists
        if (modulator._uiElements && modulator._uiElements.bpmController) {
          modulator._uiElements.bpmController.setValue(modulator.frequencyBpm);
          // Hide BPM controller when synced
          modulator._uiElements.bpmController.domElement.style.display = "none";
        }

        // Update frequency slider if it exists
        if (modulator._uiElements && modulator._uiElements.frequencyController) {
          modulator._uiElements.frequencyController.setValue(modulator.frequency);
        }
      } else {
        // Show BPM controller when not synced
        if (modulator._uiElements && modulator._uiElements.bpmController) {
          modulator._uiElements.bpmController.domElement.style.display = "";
        }
      }
    });

    // Add buttons to container
    buttonContainer.appendChild(enableButton);
    buttonContainer.appendChild(syncButton);

    // Add button container to the folder
    const buttonContainerChildren = folder.domElement.querySelector('.children');
    if (buttonContainerChildren) {
      buttonContainerChildren.insertBefore(buttonContainer, buttonContainerChildren.firstChild);
    }

    // Store buttons with the modulator for easier updates later
    modulator._uiElements = modulator._uiElements || {};
    modulator._uiElements.enableButton = enableButton;
    modulator._uiElements.syncButton = syncButton;

    // Get available targets from ModulatorManager
    const targetNames = ["None"].concat(this.modulatorManager.getTargetNames());

    // Add target selector
    const targetController = folder
      .add(modulator, "targetName", targetNames)
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

        // Update the folder name to include the target name
        folder.title(`Modulator ${index + 1}  |  ${value}`);

        // Check if this is a selector-type target
        const isSelector = modulator.isSelector || false;

        // Update the wave type controller options based on target type
        this.updateWaveTypeOptions(modulator, waveTypeController);

        // Update min/max controllers with the target's range
        const target = this.modulatorManager.getTargetInfo(value);
        if (target && target.min !== undefined && target.max !== undefined) {
          const min = target.min;
          const max = target.max;
          const step = target.step || 0.01;

          // Always update the controller ranges
          if (minController) {
            if (isSelector) {
              // For selectors, set fixed range from 0 to number of options-1
              minController.min(0);
              minController.max(modulator.selectorOptions?.length - 1 || 1);
              minController.step(1);
            } else {
              minController.min(min);
              minController.max(max);
              minController.step(step);
            }
          }

          if (maxController) {
            if (isSelector) {
              // For selectors, set fixed range from 0 to number of options-1
              maxController.min(0);
              maxController.max(modulator.selectorOptions?.length - 1 || 1);
              maxController.step(1);
            } else {
              maxController.min(min);
              maxController.max(max);
              maxController.step(step);
            }
          }

          // Only update VALUES if not loading from preset
          if (!modulator._loadingFromPreset) {
            if (isSelector) {
              // For selectors, set min to 0 and max to last option index
              modulator.min = 0;
              modulator.max = modulator.selectorOptions?.length - 1 || 1;
            } else {
              console.log(`Auto-ranging for target ${value}`);
              modulator.min = min;
              modulator.max = max;
            }
            minController.updateDisplay();
            maxController.updateDisplay();
          } else {
            console.log(
              `Using preset values for target ${value}, updating only input ranges`
            );
          }
        }

        // Update description for min/max sliders if this is a selector target
        if (isSelector && minController && maxController) {
          minController.name("Min Index");
          maxController.name("Max Index");
        } else if (minController && maxController) {
          minController.name("Min Value");
          maxController.name("Max Value");
        }
      });

    targetController.domElement.classList.add("full-width");

    // Add target selection function to the modulator folder
    const addTargetSelectionUI = () => {
      // Create controller wrapper
      const controllerWrapper = document.createElement('div');
      controllerWrapper.className = 'controller';

      // Create button
      const targetSelectionButton = document.createElement('button');
      targetSelectionButton.textContent = 'Select Target';
      targetSelectionButton.className = 'target-selection-button';

      targetSelectionButton.addEventListener('click', () => {
        this.toggleTargetSelectionMode(modulator);
      });

      // Add button to controller wrapper
      controllerWrapper.appendChild(targetSelectionButton);

      // Add elements to folder
      const folderChildren = folder.domElement.querySelector('.children');
      const targetControllerElement = targetController.domElement;
      if (folderChildren && targetControllerElement) {
        folderChildren.insertBefore(controllerWrapper, targetControllerElement);
      }

      // Store references on modulator
      modulator._uiElements = modulator._uiElements || {};
      modulator._uiElements.targetSelectionButton = targetSelectionButton;
    };

    // Add the target selection UI
    addTargetSelectionUI();

    // Add modulation type
    const waveTypeController = folder
      .add(modulator, "type", ["sine", "square", "triangle", "sawtooth", "pulse", "random", "increment"])
      .name("Wave Type")
      .onChange((value) => {
        // Update the modulator's wave type
        modulator.type = value;
      });

    // Store reference to the wave type controller
    modulator._uiElements.waveTypeController = waveTypeController;
    waveTypeController.domElement.classList.add("full-width");

    // Add special selector loop type controller (hidden by default)
    const loopTypeController = folder
      .add(modulator, "type", ["forward", "backward", "loop"])
      .name("Loop Type")
      .onChange((value) => {
        // Reset direction for loop mode
        if (value === "loop") {
          modulator.direction = 1;
        }
      });

    // Store reference and hide by default
    modulator._uiElements.loopTypeController = loopTypeController;
    loopTypeController.domElement.style.display = "none";
    loopTypeController.domElement.classList.add("full-width");

    // // Add frequency controls (both Hz and BPM)
    // const frequencyController = folder
    //   .add(modulator, "frequency", 0.01, 5)
    //   .name("Frequency (Hz)")
    //   .onChange((value) => {
    //     // Update BPM based on Hz
    //     modulator.frequencyBpm = this.hzToBpm(value);

    //     // Update BPM slider if it exists
    //     if (modulator._uiElements.bpmController) {
    //       modulator._uiElements.bpmController.setValue(modulator.frequencyBpm);
    //     }
    //   });

    // // Store reference to the frequency controller
    // modulator._uiElements.frequencyController = frequencyController;

    // Add BPM controller
    const bpmController = folder
      .add(modulator, "frequencyBpm", 0.5, 300)
      .name("BPM")
      .onChange((value) => {
        // Update Hz frequency based on BPM
        modulator.frequency = this.bpmToHz(value);

        // Update frequency slider
        frequencyController.setValue(modulator.frequency);
      });

    // Store reference to the BPM controller
    modulator._uiElements.bpmController = bpmController;

    // Initially hide BPM controller if sync is enabled
    if (modulator.sync) {
      bpmController.domElement.style.display = "none";
    }

    // Add beat division options
    const beatDivisionController = folder
      .add(modulator, "beatDivision", [
        "1",
        "2",
        "4",
        "8",
        "1/2",
        "1/4",
        "1/8",
        "1/16",
      ])
      .name("Beat Division");

    beatDivisionController.domElement.classList.add("full-width");

    // Add phase control
    folder.add(modulator, "phase", 0, 1).name("Phase");

    // Add min/max controls
    const minController = folder
      .add(modulator, "min", 0, 1)
      .name("Min Value")
      .onChange((value) => {
        if (value > modulator.max) {
          modulator.min = modulator.max;
          minController.updateDisplay();
        }
      });

    const maxController = folder
      .add(modulator, "max", 0, 1)
      .name("Max Value")
      .onChange((value) => {
        if (value < modulator.min) {
          modulator.max = modulator.min;
          maxController.updateDisplay();
        }
      });

    // Create Remove button to delete the modulator
    const removeButton = { remove: () => this.removeModulator(index) };
    folder.add(removeButton, "remove").name("Remove");
    folder.open();

    return modulator;
  }

  // Modified method to update wave types based on target type
  updateWaveTypeOptions(modulator, waveTypeController) {
    if (!modulator || !waveTypeController) return;

    // Get reference to the loop type controller
    const loopTypeController = modulator._uiElements?.loopTypeController;
    if (!loopTypeController) return;

    if (modulator.isSelector) {
      // For selectors: hide wave type controller, show loop type controller
      waveTypeController.domElement.style.display = "none";
      loopTypeController.domElement.style.display = "";

      // Set appropriate type if needed
      if (!["forward", "backward", "loop"].includes(modulator.type)) {
        // First set the type directly on the modulator
        modulator.type = "forward"; // Default for selectors

        // Then force-update the Loop Type controller to show the correct value
        loopTypeController.setValue("forward");
        loopTypeController.updateDisplay();
      } else {
        // Make sure the Loop Type controller shows the current wave type
        loopTypeController.setValue(modulator.type);
        loopTypeController.updateDisplay();
      }
    } else {
      // For continuous values: show wave type controller, hide loop type controller
      waveTypeController.domElement.style.display = "";
      loopTypeController.domElement.style.display = "none";

      // Set appropriate type if needed
      if (!["sine", "square", "triangle", "sawtooth", "pulse", "random", "increment"].includes(modulator.type)) {
        // First set the type directly on the modulator
        modulator.type = "sine"; // Default for continuous

        // Then force-update the Wave Type controller to show the correct value
        waveTypeController.setValue("sine");
        waveTypeController.updateDisplay();
      } else {
        // Make sure the Wave Type controller shows the current wave type
        waveTypeController.setValue(modulator.type);
        waveTypeController.updateDisplay();
      }
    }
  }

  getModulatorsData() {
    if (!this.modulatorManager) {
      console.error(
        `Error getting modulator data: modulatorManager is not defined`
      );
      return { modulators: [] };
    }

    const modulators = [];

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
        beatDivision: "1",
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
    this.modulatorManager.update();
  }

  updateControllerDisplays() {
    // Update all modulator UI controllers to reflect current values
    if (!this.modulatorManager || !this.modulatorFolders) return;

    this.modulatorManager.modulators
      .filter((m) => m.type === "pulse")
      .forEach((modulator, index) => {
        // Find the folder for this modulator
        const folder = this.modulatorFolders[index];
        if (!folder) return;

        // Update the button states if available
        if (modulator._uiElements) {
          if (modulator._uiElements.enableButton) {
            modulator._uiElements.enableButton.classList.toggle("active", modulator.enabled);
            // Update button styling
            if (modulator.enabled) {
              modulator._uiElements.enableButton.style.backgroundColor = "#555";
              modulator._uiElements.enableButton.style.borderColor = "#888";
            } else {
              modulator._uiElements.enableButton.style.backgroundColor = "#333";
              modulator._uiElements.enableButton.style.borderColor = "#555";
            }
          }

          if (modulator._uiElements.syncButton) {
            modulator._uiElements.syncButton.classList.toggle("active", modulator.sync);
            // Update button styling
            if (modulator.sync) {
              modulator._uiElements.syncButton.style.backgroundColor = "#555";
              modulator._uiElements.syncButton.style.borderColor = "#888";
            } else {
              modulator._uiElements.syncButton.style.backgroundColor = "#333";
              modulator._uiElements.syncButton.style.borderColor = "#555";
            }
          }
        }

        // Update all controllers in the folder
        folder.controllers.forEach((controller) => {
          // Only update controllers for properties that exist on the modulator
          if (modulator.hasOwnProperty(controller.property)) {
            controller.updateDisplay();
          }
        });
      });
  }

  getData() {
    // Get modulators data using existing method (which already returns the correct structure)
    return this.getModulatorsData();
  }

  // Fix setData method to ensure modulators appear in UI
  setData(data) {
    // Validate data
    if (!data) {
      console.error(
        "Invalid pulse modulation preset data: data is null or undefined"
      );
      return false;
    }

    try {
      // Validate modulators array
      if (!data.modulators) {
        console.error("Invalid preset data: missing modulators array");
        return false;
      }

      if (!Array.isArray(data.modulators)) {
        console.error("Invalid preset data: modulators is not an array");
        return false;
      }

      if (!this.modulatorManager) {
        console.error(
          "Cannot load modulators: modulatorManager is not initialized"
        );
        return false;
      }
      console.log(`Loading ${data.modulators.length} modulators from preset`);

      this.clearAllModulators();

      // MANUALLY CREATE MODULATORS INSTEAD OF USING loadModulatorsState
      let success = true;

      // Loop through each modulator in the preset data
      for (let i = 0; i < data.modulators.length; i++) {
        const modData = data.modulators[i];
        console.log(
          `Creating modulator ${i + 1} with target: ${modData.targetName}`
        );

        // Create a new modulator
        const modulator = this.addPulseModulator();

        if (!modulator) {
          console.error(`Failed to create modulator ${i + 1}`);
          success = false;
          continue;
        }

        // Find the folder for this modulator
        const folder = this.modulatorFolders[i];
        if (!folder) {
          console.error(`Folder not found for modulator ${i + 1}`);
          continue;
        }

        // Reference to the frequency controller for showing/hiding based on sync
        let frequencyController = null;

        // Update UI controllers directly for special properties
        folder.controllers.forEach((controller) => {
          const prop = controller.property;

          // Store frequency controller reference for later use
          if (prop === "frequencyBpm") {
            frequencyController = controller;
          }

          if (prop === "targetName" && modData[prop] !== undefined) {
            // Explicitly set the UI value for target dropdown
            controller.setValue(modData[prop]);
            console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
          } else if (prop === "enabled" && modData[prop] !== undefined) {
            // Handle enabled separately with button UI
            modulator.enabled = modData[prop];
            if (modulator._uiElements && modulator._uiElements.enableButton) {
              modulator._uiElements.enableButton.classList.toggle("active", modulator.enabled);
              // Update button styling
              if (modulator.enabled) {
                modulator._uiElements.enableButton.style.backgroundColor = "#555";
                modulator._uiElements.enableButton.style.borderColor = "#888";
              } else {
                modulator._uiElements.enableButton.style.backgroundColor = "#333";
                modulator._uiElements.enableButton.style.borderColor = "#555";
              }
            }
            console.log(`Set enabled to ${modData[prop]}`);
          } else if (prop === "beatDivision" && modData[prop] !== undefined) {
            // Set beat division if present in preset
            controller.setValue(modData[prop]);
            console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
          } else if (prop === "sync" && modData[prop] !== undefined) {
            // Handle sync separately
            modulator.sync = modData[prop];
            if (modulator._uiElements && modulator._uiElements.syncButton) {
              modulator._uiElements.syncButton.classList.toggle("active", modulator.sync);
              // Update button styling
              if (modulator.sync) {
                modulator._uiElements.syncButton.style.backgroundColor = "#555";
                modulator._uiElements.syncButton.style.borderColor = "#888";
              } else {
                modulator._uiElements.syncButton.style.backgroundColor = "#333";
                modulator._uiElements.syncButton.style.borderColor = "#555";
              }
            }
            console.log(`Set sync to ${modData[prop]}`);
          }
          // Other properties are set normally on the modulator object
          else if (modData[prop] !== undefined) {
            modulator[prop] = modData[prop];

            // If we're setting frequency, also update the BPM value
            if (prop === "frequency") {
              modulator.frequencyBpm = this.hzToBpm(modData[prop]);
            }
          }
        });

        // Set target using the method which connects the modulator to its target
        if (modData.targetName && typeof modulator.setTarget === "function") {
          // Explicitly mark as loading from preset to prevent auto-ranging
          modulator._loadingFromPreset = true;

          // First set min/max directly if available in preset data
          if (modData.min !== undefined && !isNaN(modData.min)) {
            modulator.min = modData.min;
          }
          if (modData.max !== undefined && !isNaN(modData.max)) {
            modulator.max = modData.max;
          }

          // Then connect to target
          modulator.setTarget(modData.targetName);

          // If this is a selector-type target, ensure min/max are appropriate
          if (modulator.isSelector && modulator.selectorOptions) {
            // For selectors from presets, ensure min/max are within valid range
            const optionsCount = modulator.selectorOptions.length;
            modulator.min = Math.max(0, Math.min(modulator.min, optionsCount - 1));
            modulator.max = Math.max(0, Math.min(modulator.max, optionsCount - 1));

            // Find and update min/max controllers
            const minController = folder.controllers.find(c => c.property === "min");
            const maxController = folder.controllers.find(c => c.property === "max");

            if (minController) {
              minController.min(0);
              minController.max(optionsCount - 1);
              minController.step(1);
              minController.name("Min Index");
            }

            if (maxController) {
              maxController.min(0);
              maxController.max(optionsCount - 1);
              maxController.step(1);
              maxController.name("Max Index");
            }
          }
          modulator._loadingFromPreset = false;

          console.log(
            `Set target ${modData.targetName} with range: ${modulator.min} - ${modulator.max}`
          );
        }

        if (modData.min !== undefined && modData.max !== undefined) {
          // Find min/max controllers and update them
          const minController = folder.controllers.find(
            (c) => c.property === "min"
          );
          const maxController = folder.controllers.find(
            (c) => c.property === "max"
          );

          if (minController) minController.setValue(modData.min);
          if (maxController) maxController.setValue(modData.max);
        }

        // Update frequency controller visibility based on sync status
        if (frequencyController && modulator.sync) {
          frequencyController.domElement.style.display = "none";
        } else if (frequencyController) {
          frequencyController.domElement.style.display = "";
        }
      }

      // Update UI after all modulators are created
      this.update();
      // Force refresh of UI controllers
      this.updateControllerDisplays();

      console.log(
        `Successfully loaded ${data.modulators.length} modulators from preset`
      );

      return success;
    } catch (error) {
      console.error("Error applying pulse modulation preset:", error);
      return false;
    }
  }

  triggerBeat() {
    if (!this.modulatorManager) return;

    // Get all pulse modulators that are synced and enabled
    const syncedModulators = this.modulatorManager.getModulatorsByType("pulse")
      .filter(mod => mod.sync && mod.enabled);

    // Reset their phases to 0 to trigger a synchronized beat
    syncedModulators.forEach(mod => {
      // Reset phase with respect to beat division
      mod.currentPhase = 0;
      mod.phase = 0;

      // For special wave types, trigger their beat-specific behavior
      if (mod.type === "random" || mod.type === "increment") {
        if (typeof mod.resetOnBeat === "function") {
          mod.resetOnBeat();
        }
      }
    });
    this.calculateTapTempo();

    console.log(`Triggered beat on ${syncedModulators.length} modulators`);
  }

  calculateTapTempo() {
    const now = performance.now();

    if (this.tapTempoTimeoutId) {
      clearTimeout(this.tapTempoTimeoutId);
    }

    // Set timeout to reset tap tempo counter after inactivity
    this.tapTempoTimeoutId = setTimeout(() => {
      this.tapTempoTimes = [];
      console.log("Tap tempo reset due to inactivity");
    }, this.tapTempoTimeoutDuration);

    this.tapTempoTimes.push(now);

    // Keep only the most recent taps
    if (this.tapTempoTimes.length > this.maxTapHistory) {
      this.tapTempoTimes.shift();
    }

    // Need at least 2 taps to calculate a tempo
    if (this.tapTempoTimes.length >= 2) {
      // Calculate intervals between taps
      const intervals = [];
      for (let i = 1; i < this.tapTempoTimes.length; i++) {
        intervals.push(this.tapTempoTimes[i] - this.tapTempoTimes[i - 1]);
      }

      // Calculate average interval
      const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

      // Convert to BPM (60000ms = 1 minute)
      const calculatedBpm = Math.round(60000 / averageInterval);

      // Limit to reasonable BPM range (40-220 BPM)
      const limitedBpm = Math.max(40, Math.min(220, calculatedBpm));

      // Update UI only if BPM is in the valid range for our slider (1-180)
      if (limitedBpm >= 1 && limitedBpm <= 180) {
        this.masterBpm = limitedBpm;

        // Update the masterFrequency value
        const hzValue = this.bpmToHz(limitedBpm);
        this.masterFrequency = hzValue;

        // Update modulators using the new frequency
        if (this.modulatorManager) {
          this.modulatorManager.setMasterFrequency(hzValue);
        }

        // Update the BPM display in the UI
        if (this.bpmValueElement) {
          this.bpmValueElement.value = limitedBpm;
        }

        // Update the slider position
        if (this.bpmSliderElement) {
          this.bpmSliderElement.value = limitedBpm;
        }

        console.log(`Tap tempo detected: ${limitedBpm} BPM`);
      }
    }
  }


  flashBeatButton() {
    if (!this.beatButtonElement) return;
    this.beatButtonElement.classList.add("active");
    // Reset after brief delay
    setTimeout(() => {
      this.beatButtonElement.classList.remove("active");
    }, 100);
  }

  // Mark modulator controls to exclude them from selection
  markModulatorControls() {
    // First, get all folder elements for pulse modulators
    const modulatorFolders = Array.from(document.querySelectorAll('.lil-gui .title'))
      .filter(el => el.textContent.includes('Modulator'));

    // For each folder, mark all controllers inside as modulator controls
    modulatorFolders.forEach(folderTitle => {
      const folderElement = folderTitle.parentElement;
      if (folderElement) {
        const controllers = folderElement.querySelectorAll('.controller');
        controllers.forEach(controller => {
          controller.classList.add('pulse-modulator-control');
        });
      }
    });
  }

  // Toggle highlight on all potential target controls by adding/removing a class to body
  toggleTargetControlsHighlight(highlight) {
    if (highlight) {
      // First make sure modulator controls are marked
      this.markModulatorControls();

      // Add the selection class to body (will apply general styling)
      document.body.classList.add('target-selection-mode');

      // Get all registered target names
      const validTargetNames = this.modulatorManager ? this.modulatorManager.getTargetNames() : [];

      // For each controller, add highlight only if it's a valid target
      const controllers = document.querySelectorAll('.controller:not(.pulse-modulator-control)');
      controllers.forEach(controller => {
        const nameElement = controller.querySelector('.name');
        if (nameElement) {
          const controllerName = nameElement.textContent.trim();
          const isValidTarget = validTargetNames.includes(controllerName);

          // Add a custom attribute for targeting CSS
          controller.setAttribute('data-is-target', isValidTarget ? 'true' : 'false');
        }
      });

      console.log(`Enabled target selection highlighting (${validTargetNames.length} valid targets available)`);
    } else {
      // Remove the class from body
      document.body.classList.remove('target-selection-mode');

      // Clean up any data attributes we added
      const controllers = document.querySelectorAll('[data-is-target]');
      controllers.forEach(controller => {
        controller.removeAttribute('data-is-target');
      });

      console.log('Disabled target selection highlighting');
    }
  }

  toggleTargetSelectionMode(modulator) {
    // Exiting selection mode
    if (this.targetSelectionMode && this.activeModulator === modulator) {
      console.log('Cancelling target selection mode');
      this.targetSelectionMode = false;
      this.activeModulator = null;

      // Remove highlighting
      this.toggleTargetControlsHighlight(false);

      // Update button 
      this.updateTargetButtonIndicator(modulator, false);

      // Remove click listener with capture phase to match how it was added
      document.removeEventListener('click', this.handleTargetSelection, true);

      // Clear backwards compatibility references
      this.targetSelectionButton = null;
    }
    // Entering selection mode
    else if (modulator) {
      console.log(`Entering target selection mode for modulator: ${modulator.targetName || 'New Modulator'}`);

      // If already in selection mode for another modulator, cancel that first
      if (this.targetSelectionMode && this.activeModulator) {
        this.updateTargetButtonIndicator(this.activeModulator, false);
      }

      this.targetSelectionMode = true;
      this.activeModulator = modulator;

      // Update button
      this.updateTargetButtonIndicator(modulator, true);

      // Enable highlighting
      this.toggleTargetControlsHighlight(true);

      // Add click listener with capture phase to ensure it fires before other handlers
      document.removeEventListener('click', this.handleTargetSelection, true); // Remove first to prevent duplicates
      document.addEventListener('click', this.handleTargetSelection, true);

      // Backwards compatibility
      if (modulator._uiElements) {
        this.targetSelectionButton = modulator._uiElements.targetSelectionButton;
      }
    }
    // Called from elsewhere (e.g., handleTargetSelection) - just exit mode
    else {
      if (this.targetSelectionMode) {
        console.log('Exiting target selection mode');

        // Remove highlighting
        this.toggleTargetControlsHighlight(false);

        // Update button of active modulator
        if (this.activeModulator) {
          this.updateTargetButtonIndicator(this.activeModulator, false);
        }

        // Remove click listener with capture phase to match how it was added
        document.removeEventListener('click', this.handleTargetSelection, true);

        // Clear state
        this.targetSelectionMode = false;
        this.activeModulator = null;
        this.targetSelectionButton = null;
      }
    }
  }

  //#endregion

  handleTargetSelection = (e) => {
    console.log('Target selection click event');

    if (!this.targetSelectionMode || !this.activeModulator) {
      return;
    }

    // Find the clicked element
    let element = e.target;

    // Check if the click is on the selection button itself - ignore it
    if (element === this.activeModulator._uiElements.targetSelectionButton) {
      console.log('Clicked on the target selection button - ignoring');
      return;
    }

    while (element && !element.classList.contains('controller')) {
      element = element.parentElement;
    }

    if (!element) {
      return;
    }

    // Check if this is actually a valid target (has our data attribute)
    if (element.getAttribute('data-is-target') !== 'true') {
      console.log('Clicked on non-target controller - ignoring');
      return;
    }

    // Find the target name from the controller's label
    const labelElement = element.querySelector('.name');
    if (!labelElement) {
      return;
    }

    const targetName = labelElement.textContent.trim();
    if (!targetName) {
      return;
    }

    console.log('Selected target:', targetName);

    // Find the target selector controller in the active modulator's folder
    const folder = this.activeModulator.folder;
    if (!folder || !folder.controllers) {
      this.toggleTargetSelectionMode(null);
      return;
    }

    const targetController = folder.controllers.find(c => c.property === 'targetName');
    if (!targetController) {
      this.toggleTargetSelectionMode(null);
      return;
    }

    // Exit target selection mode before changing the target to prevent duplicate wave type controllers
    this.toggleTargetSelectionMode(null);

    // Set the value of the dropdown controller
    targetController.setValue(targetName);

    // Update folder title to include target name
    const index = this.modulatorFolders.indexOf(folder);
    if (index !== -1) {
      folder.title(`Modulator ${index + 1}  |  ${targetName}`);
    }
  }

  updateTargetButtonIndicator(modulator, isActive) {
    if (!modulator || !modulator._uiElements) {
      console.warn('Cannot update button: modulator or UI elements not available');
      return;
    }

    const button = modulator._uiElements.targetSelectionButton;

    if (button) {
      button.style.backgroundColor = isActive ? '#ff4444' : '';
      button.textContent = isActive ? 'Cancel Selection' : 'Select Target';
    }
  }

  // Method to remove a modulator
  removeModulator(index) {
    // Find the modulator folder
    const folder = this.modulatorFolders[index];
    if (!folder) {
      console.error(`No folder found at index ${index}`);
      return;
    }

    // Get the modulator from the manager
    const modulator = this.modulatorManager.modulators.find(
      (mod) => mod.folder === folder
    );

    if (!modulator) {
      console.error(`No modulator found for folder at index ${index}`);
      return;
    }

    console.log(`Removing modulator with target ${modulator.targetName}`);

    // Reset to original value
    if (typeof modulator.resetToOriginal === "function") {
      modulator.resetToOriginal();
    }

    // Disable the modulator
    if (typeof modulator.disable === "function") {
      modulator.disable();
    } else {
      modulator.enabled = false;
    }

    // Remove from the manager
    const modulatorIndex = this.modulatorManager.modulators.indexOf(modulator);
    if (modulatorIndex !== -1) {
      this.modulatorManager.modulators.splice(modulatorIndex, 1);
    }

    // Destroy the folder in the UI
    folder.destroy();

    // Remove from our tracking array
    this.modulatorFolders.splice(index, 1);
  }
}
