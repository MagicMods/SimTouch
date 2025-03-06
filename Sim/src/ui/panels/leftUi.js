import { BaseUi } from "./baseUi.js";
import { socketManager } from "../../network/socketManager.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

export class LeftUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Parameters");

    // Initialize folders and controllers
    this.initFolders();
  }

  setPresetManager(presetManager) {
    // No longer needed for LeftUi
  }

  initFolders() {
    // Persistent folders
    this.initGlobalControls();

    this.particleFolder = this.createFolder("Particles");
    this.initParticleControls();

    this.physicsFolder = this.createFolder("Physics");
    this.initPhysicsControls();

    this.collisionFolder = this.createFolder("Collision");
    this.initCollisionControls();

    this.boundaryFolder = this.createFolder("Boundary");
    this.initBoundaryControls();

    this.restFolder = this.createFolder("Rest State");
    this.initRestStateControls();

    this.inputFolder = this.createFolder("Inputs");
    this.initInputControls();

    this.debugFolder = this.createFolder("Debug");
    this.initDebugControls();

    // Set default open states
    this.particleFolder.open();
    this.physicsFolder.open();
    this.collisionFolder.open();
  }

  //#region Control
  initGlobalControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Pause control
    const pauseControl = {
      togglePause: () => {
        this.main.paused = !this.main.paused;
        this.pauseButtonController.name(this.main.paused ? "Resume" : "Pause");
        console.log(`Simulation is ${this.main.paused ? "paused" : "running"}`);
      },
    };

    // Store as class property instead of local variable
    this.pauseButtonController = this.gui.add(pauseControl, "togglePause");

    // Set initial button text based on current state
    this.pauseButtonController.name(this.main.paused ? "Resume" : "Pause");

    // Update the render mode dropdown to include the new "Overlap" option
    if (this.main.gridRenderer.renderModes) {
      const gridFields = Object.values(
        this.main.gridRenderer.renderModes.modes
      );
      // Make sure "Overlap" is included in gridFields from the updated GridField enum
      // this.gui
      //   .add(this.main.gridRenderer.renderModes, "currentMode", gridFields)
      //   .name("Grid Field")
      //   .onChange(() => this.main.gridRenderer.resetColors());
    }

    if (this.main.gridRenderer.renderModes) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      // Store as class property instead of in this.controls
      this.fieldTypeController = this.gui
        .add(fieldControl, "field", Object.values(GridField))
        // .className("preset-select")
        .name("Mode")
        .onChange((value) => {
          // Set new mode
          this.main.gridRenderer.renderModes.currentMode = value;
          // Update display
          this.fieldTypeController.updateDisplay();
        });

      const behaviorControl = {
        behavior: particles.organicBehavior.currentBehavior,
      };

      // Store as class property instead of in this.controls
      this.behaviorTypeController = this.gui
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Organic Behavior")
        .onChange((value) => {
          console.log("Behavior changed to:", value);
          particles.organicBehavior.currentBehavior = value;

          this.main.ui.rightUi.updateOrganicFolders(value);

          this.behaviorTypeController.updateDisplay();
        });

      // Store as class property
      this.boundaryModeController = this.gui
        .add(this.main.particleSystem.boundary, "mode", {
          Bounce: "BOUNCE",
          Warp: "WARP",
        })
        .name("Boundary")
        .onChange((value) => {
          this.main.particleSystem.setBoundaryMode(value);
        });

      const smoothing = this.main.gridRenderer.renderModes.smoothing;

      // Store as class property
      this.maxDensityController = this.gui
        .add(this.main.gridRenderer, "maxDensity", 0.1, 10, 0.1)
        .name("Max Density");

      // Store as class property
      this.fadeInSpeedController = this.gui
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("Fade In Speed")
        .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));

      // Store as class property
      this.fadeOutSpeedController = this.gui
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("Fade Out Speed")
        .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));

      // Store as class property
      this.timeStepController = this.gui
        .add(particles, "timeStep", 0.001, 0.05, 0.001)
        .name("Time Step");

      // Store as class property
      this.timeScaleController = this.gui
        .add(particles, "timeScale", 0, 2, 0.1)
        .name("Speed")
        .onFinishChange((value) => {
          console.log(`Animation speed: ${value}x`);
        });

      // Store as class property
      this.velocityDampingController = this.gui
        .add(particles, "velocityDamping", 0.8, 1, 0.01)
        .name("Velocity Damping")
        .onFinishChange((value) => {
          console.log(`Velocity damping set to ${value}`);
        });
    }
  }
  //#endregion

  //#region Particle
  initParticleControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Store controllers as class properties with clear naming
    this.particleCountController = this.particleFolder
      .add(particles, "numParticles", 1, 2000, 10)
      .name("Count")
      .onFinishChange((value) => {
        particles.reinitializeParticles(value);
      });

    this.particleSizeController = this.particleFolder
      .add(particles, "particleRadius", 0.005, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        particles.collisionSystem.particleRadius = value * 2;
        // Reset all particles to new base radius before turbulence affects them
        particles.particleRadii.fill(value);
      });

    this.particleOpacityController = this.particleFolder
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    this.particleColorController = this.particleFolder
      .addColor(this.main.particleRenderer.config, "color")
      .name("Color");
  }
  //#endregion

  //#region Physics
  initPhysicsControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.gravity) return;

    // Add gravity strength control
    this.gravityStrengthController = this.physicsFolder
      .add({ strength: particles.gravity.strength }, "strength", 0, 20, 0.1)
      .name("Gravity Strength")
      .onChange((value) => {
        particles.gravity.strength = value;
      });

    // Add gravity direction controls
    const gravityDirection = {
      x: particles.gravity.directionX,
      y: particles.gravity.directionY,
    };

    this.gravityXController = this.physicsFolder
      .add(gravityDirection, "x", -1, 1, 0.1)
      .name("Gravity X")
      .onChange((value) => {
        particles.gravity.directionX = value;
      });

    this.gravityYController = this.physicsFolder
      .add(gravityDirection, "y", -1, 1, 0.1)
      .name("Gravity Y")
      .onChange((value) => {
        particles.gravity.directionY = value;
      });

    // Add gravity enable/disable toggle
    this.gravityEnabledController = this.physicsFolder
      .add(particles.gravity, "enabled")
      .name("Gravity Enabled");
  }
  //#endregion

  //#region Collision
  initCollisionControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.collisionSystem) return;

    const collisionSystem = particles.collisionSystem;

    this.collisionRepulsionController = this.collisionFolder
      .add(collisionSystem, "repulsion", 0, 5, 0.01)
      .name("Repulsion");

    // Check if properties exist before adding them
    if (collisionSystem.particleRestitution !== undefined) {
      this.collisionBounceController = this.collisionFolder
        .add(collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
        .name("Bounce");
    }

    if (collisionSystem.damping !== undefined) {
      this.collisionDampingController = this.collisionFolder
        .add(collisionSystem, "damping", 0.5, 1.0, 0.01)
        .name("Collision Damping");
    }
  }
  //#endregion

  //#region Boundary
  initBoundaryControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.boundary) return;

    const boundary = particles.boundary;

    if (boundary.radius !== undefined) {
      this.boundarySizeController = this.boundaryFolder
        .add(boundary, "radius", 0.3, 0.55, 0.005)
        .name("Size")
        .onChange((value) => {
          if (boundary.update) boundary.update({ radius: value });
        });
    }

    // Check if properties exist before adding controllers
    if (particles.boundaryDamping !== undefined) {
      this.boundaryFrictionController = this.boundaryFolder
        .add(particles, "boundaryDamping", 0.0, 1.0, 0.01)
        .name("Wall Friction");
    }

    if (boundary.cBoundaryRestitution !== undefined) {
      this.boundaryBounceController = this.boundaryFolder
        .add(boundary, "cBoundaryRestitution", 0.0, 1.0, 0.05)
        .name("Bounce");
    }

    if (boundary.boundaryRepulsion !== undefined) {
      this.boundaryRepulsionController = this.boundaryFolder
        .add(boundary, "boundaryRepulsion", 0.0, 20, 0.01)
        .name("Wall Repulsion");
    }
  }
  //#endregion

  //#region Rest State
  initRestStateControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Create controls object with default values that checks for property existence
    const controls = {
      density: particles.restDensity || 1.0,
      gasConstant: particles.gasConstant || 2.0,
      velocityThreshold: particles.velocityThreshold || 0.01,
      positionThreshold: particles.positionThreshold || 0.01,
    };

    // Only add controllers if the corresponding properties exist
    if (particles.restDensity !== undefined) {
      this.restDensityController = this.restFolder
        .add(controls, "density", 0, 10)
        .name("Rest Density")
        .onChange((value) => (particles.restDensity = value));
    }

    if (particles.gasConstant !== undefined) {
      this.gasConstantController = this.restFolder
        .add(controls, "gasConstant", 0, 100)
        .name("Gas Constant")
        .onChange((value) => (particles.gasConstant = value));
    }

    if (particles.velocityThreshold !== undefined) {
      this.velocityThresholdController = this.restFolder
        .add(controls, "velocityThreshold", 0, 0.1)
        .name("Velocity Threshold")
        .onChange((value) => (particles.velocityThreshold = value));
    }

    if (particles.positionThreshold !== undefined) {
      this.positionThresholdController = this.restFolder
        .add(controls, "positionThreshold", 0, 0.1)
        .name("Position Threshold")
        .onChange((value) => (particles.positionThreshold = value));
    }
  }
  //#endregion

  //#region Inputs
  initInputControls() {
    // Create top-level folders for each input type
    this.mouseInputFolder = this.inputFolder.addFolder("Mouse Input");
    this.emuInputFolder = this.inputFolder.addFolder("EMU Input");
    this.externalInputFolder = this.inputFolder.addFolder("Touch Input");

    // Initialize input controls
    this.initMouseControls();
    this.initEmuInputControls();
    this.initExternalInputControls();

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

  //#endregion

  //#region Debug
  initDebugControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Create a debug display object that will store our debug properties
    const debugDisplay = {
      showDebug:
        this.main.showDebug !== undefined ? this.main.showDebug : false,
      fps: this.main.fps !== undefined ? this.main.fps : 0,
    };

    // Toggle debug display only if property exists
    if (this.main.showDebug !== undefined) {
      this.debugDisplayController = this.debugFolder
        .add(this.main, "showDebug")
        .name("Show Debug");
    } else {
      // Add a dummy control if property doesn't exist
      this.debugDisplayController = this.debugFolder
        .add(debugDisplay, "showDebug")
        .name("Show Debug");
    }

    // Display FPS if property exists
    if (this.main.fps !== undefined) {
      this.debugFpsController = this.debugFolder
        .add(this.main, "fps")
        .name("FPS")
        .listen();
    } else {
      // Add a dummy FPS display
      this.debugFpsController = this.debugFolder
        .add(debugDisplay, "fps")
        .name("FPS");
    }

    // Toggle velocity display if present
    if (
      this.main.particleRenderer &&
      this.main.particleRenderer.showVelocity !== undefined
    ) {
      this.debugVelocityController = this.debugFolder
        .add(this.main.particleRenderer, "showVelocity")
        .name("Show Velocity");
    }

    // Toggle showing grid if present
    if (
      this.main.gridRenderer &&
      this.main.gridRenderer.showGrid !== undefined
    ) {
      this.debugShowGridController = this.debugFolder
        .add(this.main.gridRenderer, "showGrid")
        .name("Show Grid");
    }
  }
  //#endregion

  /**
   * Get controllers that can be targeted by pulse modulators
   * @returns {Object} Map of target names to controllers
   */
  getControlTargets() {
    const targets = {};

    if (this.maxDensityController)
      targets["Max Density"] = this.maxDensityController;
    if (this.fadeInSpeedController)
      targets["Fade In Speed"] = this.fadeInSpeedController;
    if (this.fadeOutSpeedController)
      targets["Fade Out Speed"] = this.fadeOutSpeedController;
    if (this.timeStepController) targets["Time Step"] = this.timeStepController;
    if (this.timeScaleController)
      targets["Animation Speed"] = this.timeScaleController;
    if (this.velocityDampingController)
      targets["Velocity Damping"] = this.velocityDampingController;

    // // Particle controllers
    // if (this.particleCountController)
    //   targets["Particle Count"] = this.particleCountController;
    if (this.particleSizeController)
      targets["Particle Size"] = this.particleSizeController;
    // if (this.particleOpacityController)
    //   targets["Particle Opacity"] = this.particleOpacityController;

    // Physics controllers
    if (this.gravityStrengthController)
      targets["Gravity Strength"] = this.gravityStrengthController;
    if (this.gravityXController) targets["Gravity X"] = this.gravityXController;
    if (this.gravityYController) targets["Gravity Y"] = this.gravityYController;
    if (this.gravityEnabledController)
      targets["Gravity Enabled"] = this.gravityEnabledController;

    // Collision controllers
    if (this.collisionRepulsionController)
      targets["Repulsion"] = this.collisionRepulsionController;
    if (this.collisionBounceController)
      targets["Bounce"] = this.collisionBounceController;
    if (this.collisionDampingController)
      targets["Collision Damping"] = this.collisionDampingController;

    // Boundary controllers
    if (this.boundarySizeController)
      targets["Boundary Size"] = this.boundarySizeController;
    if (this.boundaryRepulsionController)
      targets["Wall Repulsion"] = this.boundaryRepulsionController;
    if (this.boundaryFrictionController)
      targets["Wall Friction"] = this.boundaryFrictionController;
    if (this.boundaryBounceController)
      targets["Boundary Bounce"] = this.boundaryBounceController;

    // Rest state controllers
    if (this.restDensityController)
      targets["Rest Density"] = this.restDensityController;
    if (this.gasConstantController)
      targets["Gas Constant"] = this.gasConstantController;
    if (this.velocityThresholdController)
      targets["Velocity Threshold"] = this.velocityThresholdController;
    if (this.positionThresholdController)
      targets["Position Threshold"] = this.positionThresholdController;

    return targets;
  }

  /**
   * Force update the display of all controllers that might be affected by modulators
   */
  updateControllerDisplays() {
    // Helper function to safely update a controller's display
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };

    // Update particle controllers
    safeUpdateDisplay(this.particleSizeController);
    safeUpdateDisplay(this.particleCountController);
    safeUpdateDisplay(this.particleOpacityController);
    safeUpdateDisplay(this.particleColorController);

    // Update physics controllers
    safeUpdateDisplay(this.gravityStrengthController);
    safeUpdateDisplay(this.gravityXController);
    safeUpdateDisplay(this.gravityYController);
    safeUpdateDisplay(this.gravityEnabledController);

    // Update collision controllers
    safeUpdateDisplay(this.collisionRepulsionController);
    safeUpdateDisplay(this.collisionBounceController);
    safeUpdateDisplay(this.collisionDampingController);

    // Update boundary controllers
    safeUpdateDisplay(this.boundarySizeController);
    safeUpdateDisplay(this.boundaryRepulsionController);
    safeUpdateDisplay(this.boundaryFrictionController);
    safeUpdateDisplay(this.boundaryBounceController);

    // Update rest state controllers
    safeUpdateDisplay(this.restDensityController);
    safeUpdateDisplay(this.gasConstantController);
    safeUpdateDisplay(this.velocityThresholdController);
    safeUpdateDisplay(this.positionThresholdController);

    // Update debug controllers
    safeUpdateDisplay(this.debugDisplayController);
    safeUpdateDisplay(this.debugFpsController);
    safeUpdateDisplay(this.debugVelocityController);
    safeUpdateDisplay(this.debugShowGridController);

    // Update render mode controllers
    safeUpdateDisplay(this.renderModeController);
    safeUpdateDisplay(this.particleRenderModeController);
  }
}
