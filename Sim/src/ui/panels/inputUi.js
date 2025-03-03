import { BaseUi } from "./baseUi.js";

export class InputUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Inputs");

    this.initInputControls();
  }

  initInputControls() {
    // Create top-level folders for each input type
    this.mouseInputFolder = this.createFolder("Mouse Input");
    this.emuInputFolder = this.createFolder("EMU Input");
    this.externalInputFolder = this.createFolder("Touch Input");
    this.micInputFolder = this.createFolder("Microphone Input");

    // Initialize input controls
    this.initMouseControls();
    this.initEmuInputControls();
    this.initExternalInputControls();
    this.initMicInputControls();

    // Set default open states
    this.mouseInputFolder.open(true);
    this.emuInputFolder.open(false);
    this.externalInputFolder.open(false);
  }

  initMouseControls() {
    const particles = this.main.particleSystem;
    if (!particles?.mouseForces) return;

    this.mouseInputFolder
      .add(particles.mouseForces, "impulseRadius", 0.5, 2, 0.01)
      .name("Input Radius");

    this.mouseInputFolder
      .add(particles.mouseForces, "impulseMag", 0.01, 0.12, 0.001)
      .name("Impulse Magnitude");
  }

  initExternalInputControls() {
    if (!this.main.externalInput) return;

    const externalInput = this.main.externalInput;
    const mouseForces = this.main.mouseForces;

    // External input enable/disable
    this.externalInputFolder
      .add({ enabled: mouseForces.externalInputEnabled }, "enabled")
      .name("Enable External Input")
      .onChange((value) => {
        if (value) {
          externalInput.enable();
        } else {
          externalInput.disable();
        }
      });

    // Create a persistent button type object
    const buttonTypeControl = {
      type: mouseForces.externalMouseState.button,
    };

    // Button type selector
    const buttonController = this.externalInputFolder
      .add(buttonTypeControl, "type", {
        "Left (Attract)": 0,
        "Middle (Drag)": 1,
        "Right (Repulse)": 2,
      })
      .name("Button Type")
      .onChange((value) => {
        // Update the actual button type in mouseForces
        mouseForces.externalMouseState.button = value;

        // Apply the change via externalInput
        externalInput.setMouseButton(
          value,
          mouseForces.externalMouseState.isPressed
        );

        console.log("Button type changed to:", value);
      });

    // Update the UI when external data changes button type
    externalInput.onButtonTypeChange = (type) => {
      buttonTypeControl.type = type;
      buttonController.updateDisplay();
    };

    // Sensitivity control
    this.externalInputFolder
      .add(
        { sensitivity: mouseForces.externalSensitivity },
        "sensitivity",
        0.0001,
        0.01
      )
      .name("Sensitivity")
      .onChange((value) => {
        externalInput.setSensitivity(value);
      });

    // Position display (read-only)
    const positionDisplay = {
      position: `X: ${mouseForces.externalMouseState.position.x.toFixed(
        2
      )}, Y: ${mouseForces.externalMouseState.position.y.toFixed(2)}`,
    };

    const positionController = this.externalInputFolder
      .add(positionDisplay, "position")
      .name("Position")
      .disable();

    // Update position display periodically
    setInterval(() => {
      if (mouseForces.externalInputEnabled) {
        positionDisplay.position = `X: ${mouseForces.externalMouseState.position.x.toFixed(
          2
        )}, Y: ${mouseForces.externalMouseState.position.y.toFixed(2)}`;
        positionController.updateDisplay();
      }
    }, 100);
  }

  initEmuInputControls() {
    // Make sure EMU forces exist before adding controls
    if (!this.main.externalInput?.emuForces) return;

    const externalInput = this.main.externalInput;
    const emuForces = externalInput.emuForces;

    // EMU input enable/disable
    this.emuInputFolder
      .add({ enabled: false }, "enabled")
      .name("Enable EMU Input")
      .onChange((value) => {
        if (value) {
          externalInput.enableEmu();
        } else {
          externalInput.disableEmu();
        }
      });

    // Accel sensitivity
    this.emuInputFolder
      .add({ sensitivity: 1.0 }, "sensitivity", 0.1, 5.0, 0.1)
      .name("Accel Sensitivity")
      .onChange((value) => {
        externalInput.setAccelSensitivity(value);
      });

    // Accel gravity multiplier - adjust the range for better control
    this.emuInputFolder
      .add(
        { multiplier: emuForces.accelGravityMultiplier },
        "multiplier",
        0.1,
        5.0,
        0.1
      )
      .name("Gravity Strength")
      .onChange((value) => {
        emuForces.setAccelGravityMultiplier(value);
      });

    // Add a toggle for 360-degree gravity
    this.emuInputFolder
      .add({ enabled: true }, "enabled")
      .name("360° Gravity")
      .onChange((value) => {
        // This is already the default behavior, but adding a UI control for clarity
      });

    // Calibration button
    const calibrateButton = {
      calibrate: () => {
        externalInput.calibrateEmu();
        console.log("EMU sensors calibrated");
      },
    };

    this.emuInputFolder
      .add(calibrateButton, "calibrate")
      .name("Calibrate Sensors");

    // EMU data display (read-only)
    const dataDisplay = {
      accel: "X: 0.00, Y: 0.00, Z: 0.00",
    };

    const accelController = this.emuInputFolder
      .add(dataDisplay, "accel")
      .name("Accelerometer")
      .disable();

    // Update sensor displays periodically
    setInterval(() => {
      if (emuForces?.enabled) {
        const data = emuForces.emuData;
        dataDisplay.accel = `X: ${data.accelX.toFixed(
          2
        )}, Y: ${data.accelY.toFixed(2)}, Z: ${data.accelZ.toFixed(2)}`;
        accelController.updateDisplay();
      }
    }, 100);

    // Add visualizer toggle
    this.emuInputFolder
      .add({ showVisualizer: true }, "showVisualizer")
      .name("Show Visualization")
      .onChange((value) => {
        if (value) {
          this.main.emuVisualizer.show();
        } else {
          this.main.emuVisualizer.hide();
        }
      });
  }

  initMicInputControls() {
    if (!this.main.externalInput?.micForces) return;

    const externalInput = this.main.externalInput;
    const micForces = externalInput.micForces;

    // Add preset controls
    this.micPresetController = null;
    this.initMicPresetControls();

    // Store mic modulators folders
    this.micModulatorFolders = [];

    // Create a basic controls folder for global settings
    const basicControls = this.micInputFolder.addFolder("Controls");

    // Enable toggle
    basicControls
      .add({ enabled: false }, "enabled")
      .name("Enable Microphone")
      .onChange((value) => {
        if (value) {
          externalInput.enableMic();
        } else {
          externalInput.disableMic();
        }
      });

    // Global sensitivity control
    this.micSensitivityController = basicControls
      .add(
        { sensitivity: micForces.sensitivity || 1.0 },
        "sensitivity",
        0.1,
        10.0,
        0.1
      )
      .name("Global Sensitivity")
      .onChange((value) => {
        externalInput.setMicSensitivity(value);
      });

    // Global smoothing control
    this.micSmoothingController = basicControls
      .add({ smoothing: micForces.smoothing || 0.8 }, "smoothing", 0, 1, 0.01)
      .name("Smoothing")
      .onChange((value) => {
        externalInput.setMicSmoothing(value);
      });

    // Calibrate button
    const calibrationControl = {
      calibrate: () => {
        if (externalInput.micForces && externalInput.micForces.enabled) {
          externalInput.calibrateMic();
          alert("Microphone calibrated to current ambient level");
        } else {
          alert("Please enable microphone input first");
        }
      },
    };

    basicControls.add(calibrationControl, "calibrate").name("Calibrate Mic");

    // Open basic controls by default
    basicControls.open();

    // Modulation section header
    const modulationHeader = this.micInputFolder.addFolder("Modulations");

    // Add modulator button
    const addModulatorControl = {
      add: () => this.addMicModulator(),
    };

    modulationHeader.add(addModulatorControl, "add").name("Add Modulator");

    // Open modulations by default
    modulationHeader.open();

    // Audio level visualization
    const visualElement = document.createElement("div");
    visualElement.classList.add("mic-visualization");
    visualElement.style.height = "12px";
    visualElement.style.backgroundColor = "#444";
    visualElement.style.marginTop = "10px";
    visualElement.style.marginBottom = "5px";
    visualElement.style.position = "relative";
    visualElement.style.borderRadius = "3px";

    const levelElement = document.createElement("div");
    levelElement.style.height = "100%";
    levelElement.style.backgroundColor = "#0f0";
    levelElement.style.width = "0%";
    levelElement.style.position = "absolute";
    levelElement.style.borderRadius = "3px";
    levelElement.style.transition = "width 0.05s ease-out";

    const levelLabel = document.createElement("div");
    levelLabel.textContent = "Audio Level";
    levelLabel.style.fontSize = "10px";
    levelLabel.style.color = "#aaa";
    levelLabel.style.position = "absolute";
    levelLabel.style.top = "-16px";
    levelLabel.style.left = "0";

    visualElement.appendChild(levelElement);
    visualElement.appendChild(levelLabel);
    this.micInputFolder.domElement.appendChild(visualElement);

    // Update visualization
    setInterval(() => {
      if (micForces && micForces.enabled) {
        const level = Math.min(
          100,
          Math.max(0, micForces.smoothedAmplitude * 200) // Multiply by 200 for better visibility
        );
        levelElement.style.width = level + "%";

        // Change color based on level
        if (level > 80) {
          levelElement.style.backgroundColor = "#f44";
        } else if (level > 50) {
          levelElement.style.backgroundColor = "#ff4";
        } else {
          levelElement.style.backgroundColor = "#4f4";
        }
      } else {
        levelElement.style.width = "0%";
      }
    }, 50);
  }

  // Add these methods to the InputUi class
  getControlTargets() {
    // Access leftUi implementation if available
    if (
      this.main.ui &&
      this.main.ui.leftUi &&
      typeof this.main.ui.leftUi.getControlTargets === "function"
    ) {
      return this.main.ui.leftUi.getControlTargets();
    }

    // Fallback to a minimal implementation
    return ["None", "Particle Size", "Gravity Strength", "Repulsion"];
  }

  getControllerForTarget(targetName) {
    // Access leftUi implementation if available
    if (
      this.main.ui &&
      this.main.ui.leftUi &&
      typeof this.main.ui.leftUi.getControllerForTarget === "function"
    ) {
      return this.main.ui.leftUi.getControllerForTarget(targetName);
    }

    // Fallback to null
    return null;
  }

  updateMicInputDisplay() {
    if (!this.main.externalInput?.micForces) return;

    const micForces = this.main.externalInput.micForces;

    // Update sensitivity controller
    if (this.micSensitivityController) {
      this.micSensitivityController.setValue(micForces.sensitivity);
      this.micSensitivityController.updateDisplay();
    }

    // Update smoothing controller
    if (this.micSmoothingController) {
      this.micSmoothingController.setValue(micForces.smoothing);
      this.micSmoothingController.updateDisplay();
    }

    // Update target controller if present
    if (this.micTargetController && micForces.targetControllers.size > 0) {
      // Get the first target info
      const [controller, config] = Array.from(
        micForces.targetControllers.entries()
      )[0];

      // Find target name based on controller
      const targetName = this.findTargetNameByController(controller);
      if (targetName) {
        this.micTargetController.setValue(targetName);
        this.micTargetController.updateDisplay();

        // Update min/max controllers
        if (this.micMinController) {
          this.micMinController.setValue(config.min);
          this.micMinController.updateDisplay();
        }

        if (this.micMaxController) {
          this.micMaxController.setValue(config.max);
          this.micMaxController.updateDisplay();
        }
      }
    }
  }

  findTargetNameByController(controller) {
    const targets = this.getControlTargets();
    for (const targetName of targets) {
      const info = this.getControllerForTarget(targetName);
      if (info?.controller === controller) {
        return targetName;
      }
    }
    return "None";
  }

  // Add a new method to create mic modulators
  addMicModulator() {
    if (!this.main.externalInput?.micForces) return null;

    const externalInput = this.main.externalInput;
    const micForces = externalInput.micForces;

    // Create a modulator index
    const index = this.micModulatorFolders
      ? this.micModulatorFolders.length + 1
      : 1;
    if (!this.micModulatorFolders) this.micModulatorFolders = [];

    // Create the modulator data
    const modulator = {
      target: "None",
      min: 0,
      max: 1,
      sensitivity: 1.0,
      frequencyMin: 0,
      frequencyMax: 20000,
      // Store the active controller reference
      _activeController: null,
    };

    // Create a folder for this modulator
    const folder = this.micInputFolder.addFolder(`Mic Modulator ${index}`);
    this.micModulatorFolders.push(folder);

    // Target selection
    const targets = this.getControlTargets();

    const targetController = folder
      .add(modulator, "target", targets)
      .name("Target Parameter")
      .onChange((value) => {
        // Remove previous target if one exists
        if (modulator._activeController) {
          micForces.removeTarget(modulator._activeController);
          modulator._activeController = null;
        }

        if (value === "None") {
          return;
        }

        const controlInfo = this.getControllerForTarget(value);
        if (controlInfo && controlInfo.controller) {
          // Update min/max based on the controller's range
          modulator.min = controlInfo.min;
          modulator.max = controlInfo.max;

          // Update the UI sliders
          minController.min(controlInfo.min * 0.5);
          minController.max(controlInfo.max * 1.5);
          maxController.min(controlInfo.min * 0.5);
          maxController.max(controlInfo.max * 1.5);

          minController.setValue(controlInfo.min);
          maxController.setValue(controlInfo.max);

          // Add/update the target in micForces
          micForces.addTarget(
            controlInfo.controller,
            modulator.min,
            modulator.max,
            folder,
            modulator.sensitivity,
            {
              min: modulator.frequencyMin,
              max: modulator.frequencyMax,
            }
          );

          // Store the active controller reference for cleanup
          modulator._activeController = controlInfo.controller;
        }
      });

    // Sensitivity for this specific modulator
    folder
      .add(modulator, "sensitivity", 0.1, 10.0, 0.1)
      .name("Sensitivity")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetSensitivity(modulator._activeController, value);
        }
      });

    // Min/max range controls
    const minController = folder
      .add(modulator, "min", 0, 1, 0.01)
      .name("Min Value")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetRange(
            modulator._activeController,
            value,
            modulator.max
          );
        }
      });

    const maxController = folder
      .add(modulator, "max", 0, 1, 0.01)
      .name("Max Value")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetRange(
            modulator._activeController,
            modulator.min,
            value
          );
        }
      });

    // Frequency filtering
    folder
      .add(modulator, "frequencyMin", 0, 20000, 10)
      .name("Min Frequency")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetFrequencyRange(
            modulator._activeController,
            value,
            modulator.frequencyMax
          );
        }
      });

    folder
      .add(modulator, "frequencyMax", 0, 20000, 10)
      .name("Max Frequency")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetFrequencyRange(
            modulator._activeController,
            modulator.frequencyMin,
            value
          );
        }
      });

    // Remove button
    const removeControl = {
      remove: () => {
        // First remove from MicForces
        if (modulator._activeController) {
          micForces.removeTarget(modulator._activeController);
        }

        // Remove folder from UI
        folder.destroy();

        // Remove from tracking array
        const folderIndex = this.micModulatorFolders.indexOf(folder);
        if (folderIndex > -1) {
          this.micModulatorFolders.splice(folderIndex, 1);
        }
      },
    };

    folder.add(removeControl, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    return modulator;
  }

  // Update the microphone UI display from preset
  updateMicInputDisplay() {
    if (!this.main.externalInput?.micForces) return;

    const micForces = this.main.externalInput.micForces;

    // Update global controls
    if (this.micSensitivityController) {
      this.micSensitivityController.setValue(micForces.sensitivity);
      this.micSensitivityController.updateDisplay();
    }

    if (this.micSmoothingController) {
      this.micSmoothingController.setValue(micForces.smoothing);
      this.micSmoothingController.updateDisplay();
    }

    // Clear existing modulators
    if (this.micModulatorFolders) {
      this.micModulatorFolders.forEach((folder) => folder.destroy());
      this.micModulatorFolders = [];
    }

    // Recreate modulators based on targets in micForces
    if (micForces.targetControllers.size > 0) {
      Array.from(micForces.targetControllers.entries()).forEach(
        ([controller, config]) => {
          // Find target name for this controller
          const targetName = this.findTargetNameByController(controller);
          if (!targetName || targetName === "None") return;

          // Create new modulator
          const modulator = this.addMicModulator();

          // Set values
          const folder =
            this.micModulatorFolders[this.micModulatorFolders.length - 1];

          // Update the modulator to store the controller reference
          modulator._activeController = controller;

          // Set target (this triggers onChange which sets up the controller)
          folder.controllers[0].setValue(targetName);

          // Update other values directly without triggering onChange
          if (config.sensitivity) {
            modulator.sensitivity = config.sensitivity;
            folder.controllers[1].updateDisplay();
          }

          modulator.min = config.min;
          folder.controllers[2].updateDisplay();

          modulator.max = config.max;
          folder.controllers[3].updateDisplay();

          if (config.frequency) {
            modulator.frequencyMin = config.frequency.min || 0;
            folder.controllers[4].updateDisplay();

            modulator.frequencyMax = config.frequency.max || 20000;
            folder.controllers[5].updateDisplay();
          }
        }
      );
    }
  }

  findTargetNameByController(controller) {
    const targets = this.getControlTargets();
    for (const targetName of targets) {
      if (targetName === "None") continue;
      const info = this.getControllerForTarget(targetName);
      if (info?.controller === controller) {
        return targetName;
      }
    }
    return null;
  }

  // Add preset control methods
  initMicPresetControls() {
    if (!this.main.presetManager) return;

    const presetManager = this.main.presetManager;

    // Find the correct container in the mic input folder structure
    const containerElement =
      this.micInputFolder.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in mic input folder");
      return;
    }

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";
    presetSelect.style.margin = "5px";
    presetSelect.style.width = "100%";

    this.updateMicPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Mic input preset selector changed to:", value);
      presetManager.loadMicPreset(value, this);
    });

    this.micPresetControls = { selector: presetSelect };

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px";
    actionsContainer.style.width = "100%";
    actionsContainer.style.flexWrap = "wrap";

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter microphone preset name:");
      if (
        presetName &&
        presetManager.saveMicPreset(
          presetName,
          this.main.externalInput.micForces
        )
      ) {
        this.updateMicPresetDropdown(presetSelect);
        presetSelect.value = presetManager.getSelectedMicPreset();
        alert(`Microphone preset "${presetName}" saved.`);
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
      console.log("Attempting to delete mic preset:", current);
      if (
        confirm(`Delete mic preset "${current}"?`) &&
        presetManager.deleteMicPreset(current)
      ) {
        this.updateMicPresetDropdown(presetSelect);
        presetSelect.value = presetManager.getSelectedMicPreset();
        alert(`Microphone preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Insert elements at the beginning of the mic input folder
    this.micInputFolder.domElement.insertBefore(
      actionsContainer,
      this.micInputFolder.domElement.querySelector(".children")
    );

    this.micInputFolder.domElement.insertBefore(
      presetSelect,
      this.micInputFolder.domElement.querySelector(".children")
    );
  }

  // Helper method to update preset dropdown
  updateMicPresetDropdown(selectElement) {
    if (!this.main.presetManager) return;

    const options = this.main.presetManager.getMicPresetOptions();
    console.log("Updating mic preset dropdown with options:", options);

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.main.presetManager.getSelectedMicPreset();
  }

  // Add a helper method to enable/disable modulations when switching presets
  disableMicModulations() {
    const externalInput = this.main.externalInput;
    if (externalInput?.micForces) {
      externalInput.micForces.clearTargets();
    }

    // Clear UI representation
    if (this.micModulatorFolders) {
      this.micModulatorFolders.forEach((folder) => folder.destroy());
      this.micModulatorFolders = [];
    }
  }

  initWithPresetManager(presetManager) {
    if (presetManager) {
      this.initMicPresetControls(presetManager);
    } else {
      console.warn(
        "PresetManager not provided to InputUi.initWithPresetManager"
      );
    }
  }

  initMicPresetControls(presetManager) {
    if (!presetManager) {
      console.warn("PresetManager not provided to InputUi");
      return;
    }

    this.presetManager = presetManager;

    // Find the correct container in GUI structure
    const containerElement =
      this.micInputFolder.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in mic input folder");
      return;
    }

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";
    presetSelect.style.margin = "5px";
    presetSelect.style.width = "100%";

    this.updateMicPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Mic input preset selector changed to:", value);
      this.presetManager.loadMicPreset(value, this);
    });

    this.micPresetControls = { selector: presetSelect };

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px";
    actionsContainer.style.flexWrap = "wrap";

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter microphone preset name:");
      if (
        presetName &&
        this.presetManager.saveMicPreset(
          presetName,
          this.main.externalInput.micForces
        )
      ) {
        this.updateMicPresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedMicPreset();
        alert(`Microphone preset "${presetName}" saved.`);
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
      console.log("Attempting to delete mic preset:", current);
      if (
        confirm(`Delete mic preset "${current}"?`) &&
        this.presetManager.deleteMicPreset(current)
      ) {
        this.updateMicPresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedMicPreset();
        alert(`Microphone preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Get any existing top-level controller for the mic input (like the enable button)
    const enableControls = Array.from(this.micInputFolder.controllers);
    const enableElement =
      enableControls.length > 0 ? enableControls[0].domElement : null;

    // Remove enable button from its current position if needed
    if (enableElement && enableElement.parentNode) {
      enableElement.parentNode.removeChild(enableElement);
    }

    // Insert preset controls at the top of the mic input folder
    this.micInputFolder.domElement.insertBefore(
      presetSelect,
      this.micInputFolder.domElement.querySelector(".children")
    );

    this.micInputFolder.domElement.insertBefore(
      actionsContainer,
      this.micInputFolder.domElement.querySelector(".children")
    );

    // Add the enable button back after the preset controls
    if (enableElement) {
      this.micInputFolder.domElement
        .querySelector(".children")
        .insertBefore(
          enableElement,
          this.micInputFolder.domElement.querySelector(".children").firstChild
        );
    }
  }

  // Helper method to update dropdown options
  updateMicPresetDropdown(selectElement) {
    const options = this.presetManager.getMicPresetOptions();
    console.log("Updating mic preset dropdown with options:", options);

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.presetManager.getSelectedMicPreset();
  }
}
