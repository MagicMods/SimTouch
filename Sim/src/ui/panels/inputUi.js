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

    // Sensitivity control
    this.micSensitivityController = this.micInputFolder
      .add({ sensitivity: 1.0 }, "sensitivity", 0.1, 10.0, 0.1)
      .name("Mic Sensitivity")
      .onChange((value) => {
        externalInput.setMicSensitivity(value);
      });

    // Smoothing control
    this.micSmoothingController = this.micInputFolder
      .add({ smoothing: 0.8 }, "smoothing", 0, 1, 0.01)
      .name("Smoothing")
      .onChange((value) => {
        externalInput.setMicSmoothing(value);
      });

    // Target selection (similar to PulseModulator)
    const targets = this.getControlTargets();
    const targetController = {
      target: "None",
      min: 0,
      max: 1,
    };

    this.micTargetController = this.micInputFolder
      .add(targetController, "target", targets)
      .name("Target Parameter")
      .onChange((value) => {
        // Remove previous target
        micForces.clearTargets();

        if (value !== "None") {
          const controlInfo = this.getControllerForTarget(value);
          if (controlInfo && controlInfo.controller) {
            // Update min/max
            targetController.min = controlInfo.min;
            targetController.max = controlInfo.max;

            minController.min(controlInfo.min * 0.5);
            minController.max(controlInfo.max * 1.5);
            maxController.min(controlInfo.min * 0.5);
            maxController.max(controlInfo.max * 1.5);

            minController.setValue(controlInfo.min);
            maxController.setValue(controlInfo.max);

            // Add the target
            micForces.addTarget(
              controlInfo.controller,
              targetController.min,
              targetController.max
            );
          }
        }
      });

    // Min/max range controls
    this.micMinController = this.micInputFolder
      .add(targetController, "min", 0, 1, 0.01)
      .name("Min Value")
      .onChange((value) => {
        if (targetController.target !== "None") {
          micForces.clearTargets();

          const controlInfo = this.getControllerForTarget(
            targetController.target
          );
          if (controlInfo && controlInfo.controller) {
            micForces.addTarget(
              controlInfo.controller,
              value,
              targetController.max
            );
          }
        }
      });

    this.micMaxController = this.micInputFolder
      .add(targetController, "max", 0, 1, 0.01)
      .name("Max Value")
      .onChange((value) => {
        if (targetController.target !== "None") {
          micForces.clearTargets();

          const controlInfo = this.getControllerForTarget(
            targetController.target
          );
          if (controlInfo && controlInfo.controller) {
            micForces.addTarget(
              controlInfo.controller,
              targetController.min,
              value
            );
          }
        }
      });

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
}
