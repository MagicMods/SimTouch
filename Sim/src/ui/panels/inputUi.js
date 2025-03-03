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

    // Store mic modulators folders
    this.micModulatorFolders = [];

    // Enable toggle
    this.micInputFolder
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
    this.micSensitivityController = this.micInputFolder
      .add({ sensitivity: 1.0 }, "sensitivity", 0.1, 10.0, 0.1)
      .name("Global Sensitivity")
      .onChange((value) => {
        externalInput.setMicSensitivity(value);
      });

    // Global smoothing control
    this.micSmoothingController = this.micInputFolder
      .add({ smoothing: 0.8 }, "smoothing", 0, 1, 0.01)
      .name("Smoothing")
      .onChange((value) => {
        externalInput.setMicSmoothing(value);
      });

    // Add modulator button
    const addModulatorControl = {
      add: () => this.addMicModulator(),
    };

    this.micInputFolder.add(addModulatorControl, "add").name("Add Modulation");

    // Audio level visualization
    const visualElement = document.createElement("div");
    visualElement.style.height = "10px";
    visualElement.style.backgroundColor = "#444";
    visualElement.style.marginTop = "5px";
    visualElement.style.position = "relative";

    const levelElement = document.createElement("div");
    levelElement.style.height = "100%";
    levelElement.style.backgroundColor = "#0f0";
    levelElement.style.width = "0%";
    levelElement.style.position = "absolute";

    visualElement.appendChild(levelElement);
    this.micInputFolder.domElement.appendChild(visualElement);

    // Update visualization
    setInterval(() => {
      if (micForces && micForces.enabled) {
        const level = Math.min(
          100,
          Math.max(0, micForces.smoothedAmplitude * 100)
        );
        levelElement.style.width = level + "%";
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
    if (!this.main.externalInput?.micForces) return;

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
        if (value === "None") {
          // Remove this target
          if (micForces.hasTarget(folder)) {
            micForces.removeTargetByFolder(folder);
          }
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
        }
      });

    // Sensitivity for this specific modulator
    folder
      .add(modulator, "sensitivity", 0.1, 10.0, 0.1)
      .name("Sensitivity")
      .onChange((value) => {
        if (modulator.target !== "None") {
          const controlInfo = this.getControllerForTarget(modulator.target);
          if (controlInfo && controlInfo.controller) {
            micForces.updateTargetSensitivity(controlInfo.controller, value);
          }
        }
      });

    // Min/max range controls
    const minController = folder
      .add(modulator, "min", 0, 1, 0.01)
      .name("Min Value")
      .onChange((value) => {
        if (modulator.target !== "None") {
          const controlInfo = this.getControllerForTarget(modulator.target);
          if (controlInfo && controlInfo.controller) {
            micForces.updateTargetRange(
              controlInfo.controller,
              value,
              modulator.max
            );
          }
        }
      });

    const maxController = folder
      .add(modulator, "max", 0, 1, 0.01)
      .name("Max Value")
      .onChange((value) => {
        if (modulator.target !== "None") {
          const controlInfo = this.getControllerForTarget(modulator.target);
          if (controlInfo && controlInfo.controller) {
            micForces.updateTargetRange(
              controlInfo.controller,
              modulator.min,
              value
            );
          }
        }
      });

    // Frequency filtering
    folder
      .add(modulator, "frequencyMin", 0, 20000, 10)
      .name("Min Frequency")
      .onChange((value) => {
        if (modulator.target !== "None") {
          const controlInfo = this.getControllerForTarget(modulator.target);
          if (controlInfo && controlInfo.controller) {
            micForces.updateTargetFrequencyRange(
              controlInfo.controller,
              value,
              modulator.frequencyMax
            );
          }
        }
      });

    folder
      .add(modulator, "frequencyMax", 0, 20000, 10)
      .name("Max Frequency")
      .onChange((value) => {
        if (modulator.target !== "None") {
          const controlInfo = this.getControllerForTarget(modulator.target);
          if (controlInfo && controlInfo.controller) {
            micForces.updateTargetFrequencyRange(
              controlInfo.controller,
              modulator.frequencyMin,
              value
            );
          }
        }
      });

    // Remove button
    const removeControl = {
      remove: () => {
        // Remove from MicForces
        if (modulator.target !== "None") {
          const controlInfo = this.getControllerForTarget(modulator.target);
          if (controlInfo && controlInfo.controller) {
            micForces.removeTarget(controlInfo.controller);
          }
        }

        // Remove folder
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

          // Set target (this triggers onChange which sets up the controller)
          folder.controllers[0].setValue(targetName);

          // Update other values
          if (config.sensitivity) {
            folder.controllers[1].setValue(config.sensitivity);
          }

          folder.controllers[2].setValue(config.min);
          folder.controllers[3].setValue(config.max);

          if (config.frequency) {
            folder.controllers[4].setValue(config.frequency.min || 0);
            folder.controllers[5].setValue(config.frequency.max || 20000);
          }

          // Update all displays
          folder.controllers.forEach((c) => c.updateDisplay());
        }
      );
    }
  }
}
