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
    this.mouseInputFolder.open(false);
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

    // Store mic modulators folders
    this.micModulatorFolders = [];
    this.micControllers = [];

    // Enable toggle at ROOT level
    this.micEnableController = this.micInputFolder
      .add({ enabled: false }, "enabled")
      .name("Enable Audio Input") // Updated label to be more generic
      .onChange((value) => {
        if (value) {
          externalInput.enableMic();
          // Refresh device list when enabled
          if (this.audioInputDeviceSelect) {
            this.populateAudioDevices();
          }
        } else {
          externalInput.disableMic();
        }

        // Toggle visibility of all other controls
        this.toggleAllMicControlsVisibility(value);
      });

    // Add device selector right after the enable toggle
    this.addAudioDeviceSelector();

    // Continue with the rest of the existing code
    // Global sensitivity control
    this.micSensitivityController = this.micInputFolder
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
    this.micControllers.push(this.micSensitivityController);

    // Global smoothing control
    this.micSmoothingController = this.micInputFolder
      .add({ smoothing: micForces.smoothing || 0.8 }, "smoothing", 0, 1, 0.01)
      .name("Smoothing")
      .onChange((value) => {
        externalInput.setMicSmoothing(value);
      });
    this.micControllers.push(this.micSmoothingController);

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

    const calibrateController = this.micInputFolder
      .add(calibrationControl, "calibrate")
      .name("Calibrate Mic");
    this.micControllers.push(calibrateController);

    // Add modulator button
    const addModulatorControl = {
      add: () => this.addMicModulator(),
    };

    const addModulatorController = this.micInputFolder
      .add(addModulatorControl, "add")
      .name("Add Modulator");
    this.micControllers.push(addModulatorController);

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

    // const levelLabel = document.createElement("div");
    // levelLabel.textContent = "Audio Level";
    // levelLabel.style.fontSize = "10px";
    // levelLabel.style.color = "#aaa";
    // levelLabel.style.position = "absolute";
    // levelLabel.style.top = "-16px";
    // levelLabel.style.left = "0";

    visualElement.appendChild(levelElement);
    // visualElement.appendChild(levelLabel);
    this.micInputFolder.domElement.appendChild(visualElement);
    this.micVisualization = visualElement;

    // Hide controls initially
    this.toggleAllMicControlsVisibility(false);

    // Update visualization
    setInterval(() => {
      if (micForces && micForces.enabled) {
        const level = Math.min(
          100,
          Math.max(0, micForces.smoothedAmplitude * 200)
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

    // Add audio analyzer controls in a subfolder
    const analyzerFolder = this.micInputFolder.addFolder(
      "Audio Analysis Settings"
    );
    this.micControllers.push(analyzerFolder);

    // FFT size control
    const fftSizes = {
      "512 (Faster)": 512,
      "1024 (Default)": 1024,
      "2048 (Detailed)": 2048,
      "4096 (High Detail)": 4096,
      "8192 (Max Detail)": 8192,
    };

    analyzerFolder
      .add({ fftSize: "1024 (Default)" }, "fftSize", Object.keys(fftSizes))
      .name("FFT Resolution")
      .onChange((value) => {
        if (externalInput.micForces) {
          externalInput.micForces.setFftSize(fftSizes[value]);
        }
      });

    // Beat detection controls
    analyzerFolder
      .add({ threshold: 1.5 }, "threshold", 1.1, 3.0, 0.1)
      .name("Beat Threshold")
      .onChange((value) => {
        if (externalInput.micForces?.analyzer) {
          externalInput.micForces.analyzer.setBeatDetectionConfig({
            energyThreshold: value,
          });
        }
      });

    // Visualizer controls
    const visualizerFolder = this.micInputFolder.addFolder("Audio Visualizer");
    this.micControllers.push(visualizerFolder);

    // Toggle visualizer
    visualizerFolder
      .add({ show: false }, "show")
      .name("Show Visualizer")
      .onChange((value) => {
        if (externalInput.micForces) {
          if (value) {
            externalInput.micForces.showVisualizer();
          } else {
            externalInput.micForces.hideVisualizer();
          }
        }
      });

    // Theme selector
    visualizerFolder
      .add({ theme: "dark" }, "theme", ["dark", "light", "neon"])
      .name("Visualizer Theme")
      .onChange((value) => {
        if (externalInput.micForces) {
          externalInput.micForces.setVisualizerTheme(value);
        }
      });

    // Visualization modes
    const vizTypes = {
      "Frequency Spectrum": "spectrum",
      Waveform: "waveform",
      "Volume Level": "volume",
      "Frequency Bands": "bands",
      "Volume History": "history",
    };

    // Create a selection of checkboxes for visualizations
    const selectedVizs = {
      "Frequency Spectrum": true,
      Waveform: true,
      "Volume Level": true,
      "Frequency Bands": true,
      "Volume History": false,
    };

    // Add a checkbox for each visualization type
    Object.keys(vizTypes).forEach((vizName) => {
      visualizerFolder
        .add(selectedVizs, vizName)
        .name(vizName)
        .onChange(() => {
          // Create array of selected visualization types
          const selected = Object.keys(selectedVizs)
            .filter((key) => selectedVizs[key])
            .map((key) => vizTypes[key]);

          if (externalInput.micForces?.visualizer) {
            externalInput.micForces.setVisualizations(selected);
          }
        });
    });

    // Close these folders by default
    analyzerFolder.open(false);
    visualizerFolder.open(false);
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

  findTargetNameByController(controller) {
    if (!controller) {
      console.warn("Null controller provided to findTargetNameByController");
      return null;
    }

    // Log the controller we're trying to find
    console.log("Finding target name for controller:", controller.property);

    // Try exact controller matching first
    const targets = this.getControlTargets();
    for (const targetName of targets) {
      if (targetName === "None") continue;

      const info = this.getControllerForTarget(targetName);
      if (info?.controller === controller) {
        console.log(`Found exact match for controller: ${targetName}`);
        return targetName;
      }
    }

    // If no exact match, try matching by property
    const propertyName = controller.property;
    if (propertyName) {
      // Log all available target properties for debugging
      console.log("Available target properties:");
      for (const targetName of targets) {
        if (targetName === "None") continue;

        const info = this.getControllerForTarget(targetName);
        if (info?.controller) {
          console.log(`- ${targetName}: ${info.controller.property}`);
        }
      }

      // Try to find a match by property
      for (const targetName of targets) {
        if (targetName === "None") continue;

        const info = this.getControllerForTarget(targetName);
        if (info?.controller?.property === propertyName) {
          console.log(`Found property match for controller: ${targetName}`);
          return targetName;
        }
      }

      // As a last resort, try matching by similar property name
      for (const targetName of targets) {
        if (targetName === "None") continue;

        // If target name contains the property or vice versa
        if (
          targetName.toLowerCase().includes(propertyName.toLowerCase()) ||
          propertyName.toLowerCase().includes(targetName.toLowerCase())
        ) {
          console.log(`Found partial name match for controller: ${targetName}`);
          return targetName;
        }
      }
    }

    console.warn(
      `Could not find target name for controller: ${propertyName || "unknown"}`
    );
    return null;
  }

  // Add a new method to create mic modulators
  addMicModulator() {
    if (!this.main.externalInput?.micForces) {
      console.error("No mic forces available");
      return null;
    }

    const micForces = this.main.externalInput.micForces;

    // Create a new modulator object
    const modulator = {
      target: "None",
      sensitivity: 1.0,
      min: 0,
      max: 1,
      frequencyMin: 0,
      frequencyMax: 20000,
    };

    // Create a new folder for this modulator
    const index = this.micModulatorFolders
      ? this.micModulatorFolders.length
      : 0;
    const folder = this.micInputFolder.addFolder(`Modulator ${index + 1}`);

    if (!this.micModulatorFolders) {
      this.micModulatorFolders = [];
    }
    this.micModulatorFolders.push(folder);

    // Get control targets - THIS CHANGE IS CRITICAL
    const targets = this.getControlTargets();

    // Create a key-based array of target options (with "None")
    const targetOptions = ["None", ...Object.keys(targets)];

    console.log("Available targets for mic modulator:", targetOptions);

    // Add target selector - FIXED to use string names instead of objects
    const targetController = folder
      .add(modulator, "target", targetOptions)
      .name("Target Parameter")
      .onChange((targetName) => {
        // Log the actual targetName string
        console.log(`Mic modulator: selected target "${targetName}"`);

        // Remove previous target if one exists
        if (modulator._activeController) {
          micForces.removeTarget(modulator._activeController);
          modulator._activeController = null;
        }

        if (targetName === "None") {
          return;
        }

        // Get controller info using the string name
        const controlInfo = this.getControllerForTarget(targetName);
        console.log(
          `Mic modulator: got control info for "${targetName}":`,
          controlInfo
        );

        if (controlInfo && controlInfo.controller) {
          // Update min/max based on the controller's range
          modulator.min = controlInfo.min;
          modulator.max = controlInfo.max;

          console.log(
            `Mic modulator: setting range for ${targetName}: ${controlInfo.min} - ${controlInfo.max}`
          );

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

          console.log(
            `Mic modulator: successfully added target for ${targetName}`
          );

          // Store the active controller reference for cleanup
          modulator._activeController = controlInfo.controller;
        } else {
          console.warn(
            `Mic modulator: could not find controller for ${targetName}`
          );
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
      this.micSensitivityController.setValue(micForces.sensitivity || 1.0);
      this.micSensitivityController.updateDisplay();
    }

    if (this.micSmoothingController) {
      this.micSmoothingController.setValue(micForces.smoothing || 0.8);
      this.micSmoothingController.updateDisplay();
    }

    // Clear existing modulators
    if (this.micModulatorFolders && this.micModulatorFolders.length > 0) {
      console.log("Clearing existing microphone modulators");

      // Remove all GUI folders
      for (let i = this.micModulatorFolders.length - 1; i >= 0; i--) {
        if (this.micModulatorFolders[i]) {
          this.micModulatorFolders[i].destroy();
        }
      }
      this.micModulatorFolders = [];
    }

    // Get all active controllers from micForces
    const activeControllers = Array.from(micForces.targetControllers.entries());
    console.log(
      `Found ${activeControllers.length} active mic controllers to recreate`
    );

    // Get all control targets by name (not the controllers themselves)
    const targetNames = ["None", ...Object.keys(this.getControlTargets())];

    // For each active controller, find its matching target name
    activeControllers.forEach(([controller, config], index) => {
      // Create new modulator
      const modulator = this.addMicModulator();
      if (!modulator) return;

      // Get folder
      const folder =
        this.micModulatorFolders[this.micModulatorFolders.length - 1];
      if (!folder) return;

      // Store controller reference
      modulator._activeController = controller;

      // Find target name by property matching
      const propertyName = controller.property;
      let matchingTargetName = null;

      // Use property name to find matching target
      for (const targetName of targetNames) {
        if (targetName === "None") continue;

        const info = this.getControllerForTarget(targetName);
        if (info?.controller?.property === propertyName) {
          matchingTargetName = targetName;
          break;
        }
      }

      // Set values on modulator
      modulator.min = config.min;
      modulator.max = config.max;
      modulator.sensitivity = config.sensitivity || 1.0;

      // Set the target dropdown with the string name
      if (matchingTargetName) {
        console.log(`Setting target dropdown to "${matchingTargetName}"`);

        // Get target controller (first controller in folder)
        const targetController = folder.controllers[0];

        // Set value and explicitly call its callbacks
        targetController.setValue(matchingTargetName);
        targetController._callbacks.forEach((cb) => cb(matchingTargetName));
      }

      // Update displays for the other controllers
      for (let i = 1; i < folder.controllers.length; i++) {
        folder.controllers[i].updateDisplay();
      }
    });

    // Update UI input enabled state
    if (this.micEnableController) {
      const isEnabled = micForces.enabled || false;
      this.micEnableController.setValue(isEnabled);
      this.toggleAllMicControlsVisibility(isEnabled);
    }
  }

  // Add preset control methods
  initMicPresetControls(presetManager) {
    if (!presetManager) {
      console.warn("PresetManager not provided to InputUi");
      return;
    }

    this.presetManager = presetManager;

    // Create preset controls for the main mic input folder
    // const presetLabel = document.createElement("div");
    // presetLabel.style.paddingBottom = "6px";
    // presetLabel.style.paddingTop = "6px";
    // presetLabel.textContent = "Presets";
    // presetLabel.style.fontWeight = "bold";

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";
    presetSelect.style.margin = "5px 0";
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
    actionsContainer.style.margin = "0 0 8px 0";
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

    // Get the insertion point - after the enable button but before other controls
    const enableController = this.micEnableController;
    const insertionPoint = enableController
      ? enableController.domElement.nextSibling
      : this.micInputFolder.domElement.querySelector(".children").firstChild;

    // Create a container for our preset controls
    const presetContainer = document.createElement("div");
    presetContainer.classList.add("controller");
    presetContainer.style.marginTop = "4px";
    // presetContainer.appendChild(presetLabel);
    presetContainer.appendChild(presetSelect);
    presetContainer.appendChild(actionsContainer);

    // Store reference to the container for visibility toggling
    this.presetContainer = presetContainer;

    // Insert after the enable button
    if (insertionPoint) {
      this.micInputFolder.domElement
        .querySelector(".children")
        .insertBefore(presetContainer, insertionPoint);
    } else {
      this.micInputFolder.domElement
        .querySelector(".children")
        .appendChild(presetContainer);
    }

    // Set initial visibility based on microphone enabled state
    const isEnabled = this.main.externalInput?.micForces?.enabled || false;
    this.toggleMicPresetControlsVisibility(isEnabled);
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

  // Add a helper method to toggle preset controls visibility
  toggleMicPresetControlsVisibility(show) {
    if (this.presetContainer) {
      this.presetContainer.style.display = show ? "block" : "none";
    }
  }

  // Updated method to toggle visibility of all mic controls
  toggleAllMicControlsVisibility(show) {
    // Toggle preset controls
    if (this.presetContainer) {
      this.presetContainer.style.display = show ? "block" : "none";
    }

    // Toggle all other controllers
    if (this.micControllers) {
      for (const controller of this.micControllers) {
        if (controller) {
          // Handle both dat.gui controllers and direct DOM elements
          if (controller.domElement) {
            // Regular dat.gui controller
            controller.domElement.style.display = show ? "block" : "none";
          } else if (controller instanceof HTMLElement) {
            // Direct DOM element like our device container
            controller.style.display = show ? "block" : "none";
          }
        }
      }
    }

    // Toggle modulator folders
    if (this.micModulatorFolders) {
      for (const folder of this.micModulatorFolders) {
        if (folder && folder.domElement) {
          folder.domElement.style.display = show ? "block" : "none";
        }
      }
    }

    // Toggle visualization
    if (this.micVisualization) {
      this.micVisualization.style.display = show ? "block" : "none";
    }
  }

  ////////

  addAudioDeviceSelector() {
    if (!this.micInputFolder) return;

    // Container for device selection
    const deviceContainer = document.createElement("div");
    deviceContainer.classList.add("controller");
    deviceContainer.style.marginTop = "8px";
    deviceContainer.style.marginBottom = "8px";

    // Label for device selection
    const deviceLabel = document.createElement("div");
    deviceLabel.textContent = "Select Audio Input";
    deviceLabel.style.marginBottom = "4px";

    // Create select dropdown
    this.audioInputDeviceSelect = document.createElement("select");
    this.audioInputDeviceSelect.classList.add("preset-select");
    this.audioInputDeviceSelect.style.padding = "4px";
    this.audioInputDeviceSelect.style.width = "100%";

    // Add option for loading devices
    const loadingOption = document.createElement("option");
    loadingOption.textContent = "Loading audio devices...";
    this.audioInputDeviceSelect.appendChild(loadingOption);

    // Handle device change
    this.audioInputDeviceSelect.addEventListener("change", (e) => {
      const deviceId = e.target.value;
      console.log("Selected audio device:", deviceId);
      this.setAudioInputDevice(deviceId);
    });

    // Add elements to container
    deviceContainer.appendChild(deviceLabel);
    deviceContainer.appendChild(this.audioInputDeviceSelect);

    // Find insertion point - right after the enable button
    const insertionPoint = this.micEnableController
      ? this.micEnableController.domElement.nextSibling
      : this.micInputFolder.domElement.querySelector(".children").firstChild;

    // Add to UI folder
    this.micInputFolder.domElement
      .querySelector(".children")
      .insertBefore(deviceContainer, insertionPoint);

    // Store reference to the container for visibility toggling
    this.deviceContainer = deviceContainer;
    this.micControllers.push(deviceContainer);

    // Populate with available devices
    this.populateAudioDevices();
  }

  // Add method to populate audio devices
  async populateAudioDevices() {
    try {
      // Check if browser supports MediaDevices API
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("Browser doesn't support device enumeration");
        return;
      }

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );

      // Clear existing options
      this.audioInputDeviceSelect.innerHTML = "";

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "default";
      defaultOption.textContent = "Default Input";
      this.audioInputDeviceSelect.appendChild(defaultOption);

      // Add each audio input device
      audioInputDevices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        // Handle unnamed devices by giving them a generic name
        option.textContent =
          device.label ||
          `Audio Input ${audioInputDevices.indexOf(device) + 1}`;
        this.audioInputDeviceSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Error enumerating audio devices:", err);
      this.audioInputDeviceSelect.innerHTML =
        "<option>Error loading devices</option>";
    }
  }

  // Method to set the selected audio input device
  setAudioInputDevice(deviceId) {
    if (!this.main.externalInput) return;

    const constraints = {
      audio: {
        deviceId: deviceId !== "default" ? { exact: deviceId } : undefined,
      },
    };

    // Pass these constraints to the external input manager
    this.main.externalInput.setAudioInputDevice(constraints);
  }
}
