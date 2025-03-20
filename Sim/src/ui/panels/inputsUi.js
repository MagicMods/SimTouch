import { BaseUi } from "../baseUi.js";
import { socketManager } from "../../network/socketManager.js";

export class InputsUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Inputs");

    this.mouseInputFolder = this.gui.addFolder("Mouse Input");
    this.emuInputFolder = this.gui.addFolder("EMU Input");
    this.externalInputFolder = this.gui.addFolder("Touch Input");
    this.networkControlsFolder = this.gui.addFolder("Network Controls");

    // Initialize input controls
    this.initMouseControls();
    this.initEmuInputControls();
    this.initExternalInputControls();
    this.initNetworkControls();

    // Set default open states
    this.mouseInputFolder.open(true);
    this.emuInputFolder.open(false);
    this.externalInputFolder.open(false);
    this.networkControlsFolder.open(true);
  }

  //#region Inputs

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

        // console.log("Button type changed to:", value);
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

    // Add turbulence bias strength control
    if (this.main.turbulenceField) {
      this.turbulenceBiasStrengthController = this.emuInputFolder
        .add(
          { strength: this.main.turbulenceField.biasStrength },
          "strength",
          0.1,
          5.0,
          0.1
        )
        .name("T-Bias Strength")
        .onChange((value) => {
          // Store the new strength value in the turbulence field
          this.main.turbulenceField.biasStrength = value;

          // Bias speeds now work independently of pattern speed
          // The strength is applied in the applyOffset method when rendering:
          // timeOffsetX = time * this.biasSpeedX * this.biasStrength

          // If EMU input is active, reapply current values to update immediately
          if (this.main.externalInput?.emuForces?.enabled) {
            this.main.externalInput.emuForces.apply(0.016);
          }

          // Update the turbulence bias UI controllers to reflect the change
          this.updateTurbulenceBiasUI();
        });
    }

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

  initNetworkControls() {
    // Brightness control
    this.networkControlsFolder
      .add({ brightness: 100 }, "brightness", 0, 100, 1)
      .name("N-Brightness")
      .onChange((value) => {
        socketManager.sendBrightness(value);
      });

    // Power control
    this.networkControlsFolder
      .add({ power: 50 }, "power", 0, 100, 1)
      .name("N-PowerMx")
      .onChange((value) => {
        socketManager.sendPower(value);
      });
  }

  updateTurbulenceBiasUI() {
    // First try using the direct controller update method if available
    if (this.main.turbulenceUi && typeof this.main.turbulenceUi.updateBiasControllers === 'function') {
      this.main.turbulenceUi.updateBiasControllers();
      console.log("Updated turbulence bias UI via updateBiasControllers");
      return;
    }

    console.log("Falling back to manual DOM updates for turbulence bias UI");
    // Find the T-BiasX and T-BiasY controllers in the turbulence UI
    const targets = document.querySelectorAll('.dg .c input[type="text"]');

    targets.forEach(input => {
      const label = input.parentElement?.parentElement?.querySelector('.property-name');
      if (!label) return;

      const name = label.textContent?.trim();

      // Only update these if they exist
      if (name === 'T-BiasX' && this.main.turbulenceField) {
        input.value = this.main.turbulenceField.biasSpeedX.toFixed(2);
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
      else if (name === 'T-BiasY' && this.main.turbulenceField) {
        input.value = this.main.turbulenceField.biasSpeedY.toFixed(2);
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    });
  }

  //#endregion
}
