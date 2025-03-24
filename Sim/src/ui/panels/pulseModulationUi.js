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

    // For tap tempo functionality
    this.beatTimes = [];
    this.maxTapHistory = 5; // Number of taps to remember
    this.tapTempoTimeout = null;
    this.tapTempoTimeoutDuration = 2000; // Reset after 2 seconds of inactivity
    this.beatButtonElement = null; // Store reference to beat button element

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

    // Add BPM property that maps to frequency
    modulator.frequencyBpm = this.hzToBpm(modulator.frequency);

    // Create folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Modulator ${index + 1}`);

    // Store the folder reference
    this.modulatorFolders.push(folder);

    // Create button group container for Enable and Sync
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "modulator-toggle-buttons";
    buttonContainer.style.cssText = `
      display: flex;
      gap: 5px;
      margin-bottom: 10px;
      width: 100%;
    `;

    // Create Enable button
    const enableButton = document.createElement("button");
    enableButton.textContent = "Enable";
    enableButton.className = "toggle-button";
    if (modulator.enabled) enableButton.classList.add("active");

    enableButton.addEventListener("click", () => {
      modulator.enabled = !modulator.enabled;
      enableButton.classList.toggle("active", modulator.enabled);

      // When enabling, reinitialize the modulator
      if (modulator.enabled) {
        if (typeof modulator.reinitialize === "function") {
          modulator.reinitialize();
        }
      } else {
        // When disabling, reset to original value
        if (typeof modulator.resetToOriginal === "function") {
          modulator.resetToOriginal();
        }
      }
    });

    // Create Sync button
    const syncButton = document.createElement("button");
    syncButton.textContent = "Sync";
    syncButton.className = "toggle-button";
    if (modulator.sync) syncButton.classList.add("active");
    syncButton.addEventListener("click", () => {
      modulator.sync = !modulator.sync;
      syncButton.classList.toggle("active", modulator.sync);

      // Show/hide the frequency control based on sync state
      if (frequencyController) {
        frequencyController.domElement.style.display = modulator.sync ? "none" : "";
      }

      // When enabling sync, update frequency to match master
      if (modulator.sync) {
        modulator.frequency = this.masterFrequency;
        modulator.frequencyBpm = this.hzToBpm(this.masterFrequency); // Update BPM value too
        modulator.currentPhase = 0; // Reset phase for better synchronization
        frequencyController.updateDisplay();
      }
    });


    // Add buttons to container
    buttonContainer.appendChild(enableButton);
    buttonContainer.appendChild(syncButton);

    // Add button container to the folder
    const folderContent = folder.domElement.querySelector(".children");
    if (folderContent) {
      folderContent.insertBefore(buttonContainer, folderContent.firstChild);
    }

    // Store buttons with the modulator for easier updates later
    modulator._uiElements = modulator._uiElements || {};
    modulator._uiElements.enableButton = enableButton;
    modulator._uiElements.syncButton = syncButton;

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

        // Update the folder name to include the target name
        folder.title(`Modulator ${index + 1}  |  ${value}`);

        // Check if this is a selector-type target
        const isSelector = modulator.isSelector || false;

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

    // Add modulation type
    folder
      .add(modulator, "type", [
        "sine",
        "square",
        "triangle",
        "sawtooth",
        "pulse",
        "random",
        "increment",
      ])
      .name("Wave Type")
      .domElement.classList.add("full-width");



    // Add beat division dropdown
    const beatDivisionController = folder
      .add(modulator, "beatDivision", [
        "1",    // Whole note (1 per beat)
        "1/2",  // Half note (2 per beat)
        "1/4",  // Quarter note (4 per beat)
        "1/8",  // Eighth note (8 per beat)
        "1/16", // Sixteenth note (16 per beat)
        "1/32", // Thirty-second note (32 per beat)
        "2",    // Half time (twice as slow)
        "4"     // Quarter time (4 times as slow)
      ])
      .name("Beat Division")
      .onChange(() => {
        // Reset phase when changing division for better sync
        if (modulator.sync) {
          modulator.currentPhase = 0;
        }
      });

    beatDivisionController.domElement.classList.add("full-width");
    beatDivisionController.domElement.style.marginTop = "10px";

    // Add frequency control (now as BPM)
    const frequencyController = folder
      .add(modulator, "frequencyBpm", 1, 180, 1)
      .name("BPM")
      .onChange((value) => {
        // Convert BPM to Hz for internal use
        modulator.frequency = this.bpmToHz(value);
      });

    // Initially hide the frequency controller if sync is enabled
    if (modulator.sync) {
      frequencyController.domElement.style.display = "none";
    }

    const phaseController = folder
      .add(modulator, "phase", 0, Math.PI)
      .name("Phase")
      .onChange(() => {
        // No additional handling needed
      });
    phaseController.domElement.style.marginBottom = "10px";


    const minController = folder
      .add(modulator, "min", -10, 10)
      .name("Min Value");

    const maxController = folder
      .add(modulator, "max", -10, 10)
      .name("Max Value");

    maxController.domElement.style.marginBottom = "10px";


    // Simplified remove button implementation
    const removeButton = {
      remove: () => {
        console.log(`Removing modulator with target ${modulator.targetName}`);

        // Reset to original value using the modulator's built-in method
        // This is the simplest approach - the modulator already knows its original value!
        if (modulator && typeof modulator.resetToOriginal === "function") {
          modulator.resetToOriginal();
        }

        // Disable the modulator (this also calls resetToOriginal internally)
        if (modulator && typeof modulator.disable === "function") {
          modulator.disable();
        } else if (modulator) {
          modulator.enabled = false;
        }

        // Remove from the manager
        const index = this.modulatorManager.modulators.indexOf(modulator);
        if (index !== -1) {
          this.modulatorManager.modulators.splice(index, 1);
        }

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

  getModulatorsData() {
    if (!this.modulatorManager) {
      console.error(
        `Error getting modulator data: modulatorManager is not defined`
      );
      return { modulators: [] };
    }

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
        beatDivision: "1", // Add default beatDivision
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

  // Fix getData method to return only modulators data
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

      // First clear existing modulators
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

          // Remove the loading flag
          modulator._loadingFromPreset = false;

          console.log(
            `Set target ${modData.targetName} with range: ${modulator.min} - ${modulator.max}`
          );
        }

        // Set min/max if available
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

  /**
   * Trigger a single beat pulse on all synced modulators
   * Also calculate BPM based on tap timing if clicked multiple times
   */
  triggerBeat() {
    if (!this.modulatorManager) return;

    // Get all pulse modulators that are synced and enabled
    const syncedModulators = this.modulatorManager.getModulatorsByType("pulse")
      .filter(mod => mod.sync && mod.enabled);

    // Reset their phases to 0 to trigger a synchronized beat
    syncedModulators.forEach(mod => {
      // Reset phase with respect to beat division
      // This ensures all divisions align properly when beat is triggered
      mod.currentPhase = 0;
      mod.phase = 0;

      // For special wave types, trigger their beat-specific behavior
      if (mod.type === "random" || mod.type === "increment") {
        if (typeof mod.resetOnBeat === "function") {
          mod.resetOnBeat();
        }
      }
    });

    // Calculate BPM based on tap tempo
    this.calculateTapTempo();

    console.log(`Triggered beat on ${syncedModulators.length} modulators`);
  }

  /**
   * Calculate BPM based on intervals between button clicks
   */
  calculateTapTempo() {
    const now = performance.now();

    // Clear timeout if it exists
    if (this.tapTempoTimeout) {
      clearTimeout(this.tapTempoTimeout);
    }

    // Set timeout to reset tap tempo counter after inactivity
    this.tapTempoTimeout = setTimeout(() => {
      this.beatTimes = [];
      console.log("Tap tempo reset due to inactivity");
    }, this.tapTempoTimeoutDuration);

    // Add current time to the history
    this.beatTimes.push(now);

    // Keep only the most recent taps
    if (this.beatTimes.length > this.maxTapHistory) {
      this.beatTimes.shift();
    }

    // Need at least 2 taps to calculate a tempo
    if (this.beatTimes.length >= 2) {
      // Calculate intervals between taps
      const intervals = [];
      for (let i = 1; i < this.beatTimes.length; i++) {
        intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
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

  /**
   * Add visual feedback when beat button is clicked
   */
  flashBeatButton() {
    if (!this.beatButtonElement) return;

    // Add/remove active class instead of directly manipulating style
    this.beatButtonElement.classList.add("active");

    // Reset after brief delay
    setTimeout(() => {
      this.beatButtonElement.classList.remove("active");
    }, 100);
  }

  //#endregion
}
