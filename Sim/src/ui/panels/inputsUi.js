import { BaseUi } from "../baseUi.js";

export class InputsUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Validate required dependencies
    this.validateDependencies();

    this.controls = {};
    this.gui.title("Inputs");

    this.mouseInputFolder = this.gui.addFolder("Mouse Input");
    this.joystickInputFolder = this.gui.addFolder("Joystick Controls");
    this.emuInputFolder = this.gui.addFolder("EMU Input");
    this.externalInputFolder = this.gui.addFolder("Touch Input");

    // Set reference in emuRenderer
    if (this.main.emuRenderer) {
      this.main.emuRenderer.inputsUi = this;
    }

    // Initialize input controls
    this.initMouseControls();
    this.initJoystickControls();
    this.initEmuInputControls();
    this.initExternalInputControls();

    // Set default open states
    this.mouseInputFolder.open(true);
    this.emuInputFolder.open(false);
    this.externalInputFolder.open(false);
    this.joystickInputFolder.open(true);

    // Register joystick controls as modulation targets if modulation system exists
    if (this.main.modulation) {
      this.registerJoystickAsModulationTargets();
    }
  }

  validateDependencies() {
    if (!this.main.particleSystem) {
      throw new Error("ParticleSystem is required in main for InputsUi");
    }

    if (!this.main.particleSystem.mouseForces) {
      throw new Error("MouseForces is required in particleSystem for InputsUi");
    }

    if (!this.main.externalInput) {
      throw new Error("ExternalInput is required in main for InputsUi");
    }
  }

  registerJoystickAsModulationTargets() {
    if (!this.main.modulation) {
      throw new Error("Modulation system is required for registering joystick targets");
    }

    const modulation = this.main.modulation;

    // Register joystick X controller if it exists
    if (this.joystickXController) {
      modulation.registerTarget({
        id: "joystick_x",
        name: "J-X Position",
        category: "Joystick",
        min: -1,
        max: 1,
        defaultValue: 0,
        apply: (value) => {
          if (this.main.emuRenderer) {
            // Update joystick X position
            this.main.emuRenderer.joystickX = value * 10; // Convert to -10,10 range
            this.main.emuRenderer.joystickActive = true;

            // Update UI and physics
            this.main.emuRenderer.updateGravityUI();
            this.main.emuRenderer.updateTurbulenceBiasUI();

            // Update slider
            if (this.joystickXController && this.joystickXController.object) {
              this.joystickXController.object.x = value;
              this.joystickXController.updateDisplay();
            }
          }
        }
      });
    }

    // Register joystick Y controller if it exists
    if (this.joystickYController) {
      modulation.registerTarget({
        id: "joystick_y",
        name: "J-Y Position",
        category: "Joystick",
        min: -1,
        max: 1,
        defaultValue: 0,
        apply: (value) => {
          if (this.main.emuRenderer) {
            // Update joystick Y position
            this.main.emuRenderer.joystickY = value * 10; // Convert to -10,10 range
            this.main.emuRenderer.joystickActive = true;

            // Update UI and physics
            this.main.emuRenderer.updateGravityUI();
            this.main.emuRenderer.updateTurbulenceBiasUI();

            // Update slider
            if (this.joystickYController && this.joystickYController.object) {
              this.joystickYController.object.y = value;
              this.joystickYController.updateDisplay();
            }
          }
        }
      });
    }

    // Register gravity and turbulence strength controllers
    if (this.joystickGravityStrengthController) {
      modulation.registerTarget({
        id: "joystick_gravity_strength",
        name: "Joystick J-G-Strength",
        category: "Joystick",
        min: 0,
        max: 1,
        defaultValue: 1.0,
        apply: (value) => {
          if (this.joystickGravityStrengthController && this.joystickGravityStrengthController.object) {
            this.joystickGravityStrengthController.setValue(value);
          }
        }
      });
    }

    if (this.joystickBiasStrengthController) {
      modulation.registerTarget({
        id: "joystick_bias_strength",
        name: "Joystick Turbulence Bias Strength",
        category: "Joystick",
        min: 0,
        max: 1,
        defaultValue: 0.3,
        apply: (value) => {
          if (this.joystickBiasStrengthController && this.joystickBiasStrengthController.object) {
            this.joystickBiasStrengthController.setValue(value);
          }
        }
      });
    }
  }

  //#region Inputs

  initMouseControls() {
    const particles = this.main.particleSystem;
    const mouseForces = particles.mouseForces;

    this.mouseInputFolder
      .add(mouseForces, "impulseRadius", 0.5, 2, 0.01)
      .name("Input Radius");

    this.mouseInputFolder
      .add(mouseForces, "impulseMag", 0.01, 0.12, 0.001)
      .name("Impulse Mag");
  }

  initExternalInputControls() {
    const externalInput = this.main.externalInput;
    const mouseForces = this.main.particleSystem.mouseForces;

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
      });

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
    if (!this.main.externalInput || !this.main.externalInput.emuForces) {
      console.warn("EMU forces not available for InputsUi");
      return;
    }

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
  }

  initJoystickControls() {
    // Make sure EMU renderer exists before adding joystick controls
    if (!this.main.emuRenderer) {
      console.warn("EMU renderer not available for joystick controls");
      return;
    }

    // Add reset button for joystick
    const resetJoystickButton = {
      reset: () => {
        if (this.main.emuRenderer) {
          this.main.emuRenderer.resetJoystick();
          console.log("Joystick reset to center");
        }
      }
    };

    this.joystickInputFolder
      .add(resetJoystickButton, "reset")
      .name("Reset Joystick");

    // Add X and Y position sliders
    const joystickPosition = {
      x: this.main.emuRenderer.joystickX / 10, // Convert from -10,10 to -1,1 range
      y: this.main.emuRenderer.joystickY / 10
    };

    // Add X position slider
    this.joystickXController = this.joystickInputFolder
      .add(joystickPosition, "x", -1, 1, 0.01)
      .name("J-X")
      .onChange((value) => {
        if (this.main.emuRenderer) {
          // Update the joystick X position (scaled to -10,10 range)
          this.main.emuRenderer.joystickX = value * 10;
          this.main.emuRenderer.joystickActive = true;

          // Apply the changes immediately to both gravity and turbulence
          this.main.emuRenderer.updateGravityUI();
          this.main.emuRenderer.updateTurbulenceBiasUI();

          // If we have access to the turbulence field directly, make sure bias is updated
          if (this.main.turbulenceField) {
            // For turbulence field, the biasAccel X is inverted in the UI
            this.main.turbulenceField._displayBiasAccelX = -value * this.main.turbulenceField.biasStrength;

            // Update the turbulence UI controllers if they exist
            if (this.main.turbulenceUi && typeof this.main.turbulenceUi.updateBiasControllers === 'function') {
              this.main.turbulenceUi.updateBiasControllers();
            }
          }
        }
      });

    // Add Y position slider
    this.joystickYController = this.joystickInputFolder
      .add(joystickPosition, "y", -1, 1, 0.01)
      .name("J-Y")
      .onChange((value) => {
        if (this.main.emuRenderer) {
          // Update the joystick Y position (scaled to -10,10 range)
          this.main.emuRenderer.joystickY = value * 10;
          this.main.emuRenderer.joystickActive = true;

          // Apply the changes immediately to both gravity and turbulence
          this.main.emuRenderer.updateGravityUI();
          this.main.emuRenderer.updateTurbulenceBiasUI();

          // If we have access to the turbulence field directly, make sure bias is updated
          if (this.main.turbulenceField) {
            // For turbulence field, the biasAccel Y is not inverted
            this.main.turbulenceField._displayBiasAccelY = value * this.main.turbulenceField.biasStrength;

            // Update the turbulence UI controllers if they exist
            if (this.main.turbulenceUi && typeof this.main.turbulenceUi.updateBiasControllers === 'function') {
              this.main.turbulenceUi.updateBiasControllers();
            }
          }
        }
      });

    // Wait until controllers are created, then register them as modulation targets
    if (this.main.modulation) {
      // We need to make sure this is called after the controllers are created
      setTimeout(() => this.registerJoystickAsModulationTargets(), 0);
    }

    const springControl = {
      strength: this.main.emuRenderer.springStrength || 0.05
    };

    // Add spring strength slider
    this.joystickInputFolder
      .add(springControl, "strength", 0, 1, 0.01)
      .name("J-SpringStrength")
      .onChange((value) => {
        if (this.main.emuRenderer) {
          this.main.emuRenderer.setSpringStrength(value);
          this.main.emuRenderer.setSpringEnabled(value > 0);
        }
      });

    // Add gravity strength control to joystick folder
    if (this.main.externalInput && this.main.externalInput.emuForces) {
      const emuForces = this.main.externalInput.emuForces;
      this.joystickGravityStrengthController = this.joystickInputFolder
        .add(
          { multiplier: emuForces.accelGravityMultiplier || 1.0 },
          "multiplier",
          0,
          1.0,
          0.1
        )
        .name("J-G-Strength")
        .onChange((value) => {
          // Update the EMU forces
          emuForces.setAccelGravityMultiplier(value);
        });
    }

    // Add turbulence bias strength control to joystick folder
    if (this.main && this.main.turbulenceField) {
      const turbulenceField = this.main.turbulenceField;

      this.joystickBiasStrengthController = this.joystickInputFolder
        .add(
          { strength: turbulenceField.biasStrength },
          "strength",
          0,
          1.0,
          0.1
        )
        .name("J-T-BiasStrength")
        .onChange((value) => {
          turbulenceField.biasStrength = value;

          // If EMU input is active, reapply current values to update immediately
          if (this.main.externalInput?.emuForces?.enabled) {
            this.main.externalInput.emuForces.apply(0.016);
          }

          if (this.main.turbulenceUi && typeof this.main.turbulenceUi.updateBiasControllers === 'function') {
            this.main.turbulenceUi.updateBiasControllers();
          }
        });
    }

    // Force hide the joystick initially (override main.js setting)
    if (this.main.emuRenderer) {
      this.main.emuRenderer.hide();
    }

    // Monitor folder open/close state to show/hide joystick
    // Get the folder DOM element
    const folderElement = this.joystickInputFolder.domElement;

    // Set up a MutationObserver to watch for class changes on the folder
    const folderObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Check if folder is closed by looking for the 'closed' class
          const isClosed = folderElement.classList.contains('closed');

          // Update joystick visibility based on folder state
          if (this.main.emuRenderer) {
            if (isClosed) {
              this.main.emuRenderer.hide();
            } else {
              this.main.emuRenderer.show();
            }
          }
        }
      });
    });

    folderObserver.observe(folderElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also handle the initial folder state when UI is first created
    // We need to use a small delay to ensure the DOM is ready
    setTimeout(() => {
      // Get the initial state (closed or open)
      const isClosed = folderElement.classList.contains('closed');

      // Set joystick visibility based on initial folder state
      if (this.main.emuRenderer) {
        if (isClosed) {
          this.main.emuRenderer.hide();
        } else {
          this.main.emuRenderer.show();
        }
      }
    }, 100);
  }

  updateTurbulenceBiasUI() {
    // First try using the direct controller update method if available
    if (this.main.turbulenceUi) {
      try {
        this.main.turbulenceUi.updateBiasControllers();
        return;
      } catch (e) {
        console.warn("Failed to update turbulence bias UI via updateBiasControllers:", e);
        // Fall through to manual method
      }
    }

    console.warn("Falling back to manual DOM updates for turbulence bias UI");
    // Find the T-BiasX and T-BiasY controllers in the turbulence UI
    const targets = document.querySelectorAll('.dg .c input[type="text"]');

    targets.forEach(input => {
      if (!input.parentElement || !input.parentElement.parentElement) return;

      const label = input.parentElement.parentElement.querySelector('.property-name');
      if (!label || !label.textContent) return;

      const name = label.textContent.trim();

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

  getControlTargets() {
    const targets = {};

    if (this.joystickXController) targets["J-X"] = this.joystickXController;
    if (this.joystickYController) targets["J-Y"] = this.joystickYController;

    if (this.joystickGravityStrengthController) targets["J-G-Strength"] = this.joystickGravityStrengthController;
    if (this.joystickBiasStrengthController) targets["J-T-BiasStrength"] = this.joystickBiasStrengthController;

    return targets;
  }

  destroy() {
    if (this.joystickRefreshInterval) {
      clearInterval(this.joystickRefreshInterval);
    }
    super.destroy && super.destroy();
  }
}
