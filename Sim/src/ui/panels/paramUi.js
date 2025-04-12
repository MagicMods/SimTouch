import { BaseUi } from "../baseUi.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";
import { eventBus } from "../../util/eventManager.js";

export class ParamUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.controls = {};
    this.gui.title("Parameters");
    this.initGlobalControls();
  }

  //#region Control
  initGlobalControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Pause control
    const pauseControl = {
      togglePause: () => {
        // Remove direct modification
        // this.main.paused = !this.main.paused;
        // Emit event instead
        const intendedState = !this.main.simParams.simulation.paused;
        eventBus.emit('uiControlChanged', { paramPath: 'simulation.paused', value: intendedState });
        // Update button name based on intended state
        this.pauseButtonController.name(intendedState ? "Resume" : "Pause");
        // console.log(`Simulation is ${intendedState ? "paused" : "running"}`);
      },
    };

    // Store as class property instead of local variable
    this.pauseButtonController = this.gui.add(pauseControl, "togglePause");

    // Set initial button text based on current simParams state
    this.pauseButtonController.name(this.main.simParams.simulation.paused ? "Resume" : "Pause");
    this.pauseButtonController.domElement.style.marginBottom = "10px";

    if (this.main.gridRenderer.renderModes) {
      // Removed fieldControl object, bind directly to simParams
      // const fieldControl = {
      //   field: this.main.gridRenderer.renderModes.currentMode,
      // };

      // Store as class property instead of in this.controls
      this.fieldTypeController = this.gui
        // Bind to simParams instead of fieldControl
        .add(this.main.simParams.rendering, "gridMode", Object.values(GridField))
        .name("Mode")
        .onChange((value) => {
          // Remove direct modifications
          // this.main.gridRenderer.renderModes.currentMode = value;
          // this.fieldTypeController.updateDisplay();
          // Emit event instead
          eventBus.emit('uiControlChanged', { paramPath: 'rendering.gridMode', value });
        });

      this.fieldTypeController.domElement.classList.add("full-width");
      // presetSelect.classList = "preset-select";

      // Store as class property
      this.boundaryModeController = this.gui
        // Bind to simParams instead of particleSystem.boundary
        .add(this.main.simParams.boundary, "mode", {
          Bounce: "BOUNCE",
          Warp: "WARP",
        })
        .name("Boundary")
        .onChange((value) => {
          // Remove direct call
          // this.main.particleSystem.setBoundaryMode(value);
          // Emit event instead
          eventBus.emit('uiControlChanged', { paramPath: 'boundary.mode', value });
        });
      this.boundaryModeController.domElement.classList.add("full-width");
      this.boundaryModeController.domElement.style.marginBottom = "10px";
      // Removed smoothing object reference, bind directly to simParams
      // const smoothing = this.main.gridRenderer.renderModes.smoothing;

      this.maxDensityController = this.gui
        // Bind to simParams instead of gridRenderer
        .add(this.main.simParams.rendering, "maxDensity", 0.1, 12, 0.1)
        .name("Density")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'rendering.maxDensity', value });
        });

      this.fadeInSpeedController = this.gui
        // Bind to simParams instead of smoothing
        .add(this.main.simParams.smoothing, "rateIn", 0.01, 0.5)
        .name("FadInSpd")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'smoothing.rateIn', value });
        });
      // .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));

      this.fadeOutSpeedController = this.gui
        // Bind to simParams instead of smoothing
        .add(this.main.simParams.smoothing, "rateOut", 0.01, 0.5)
        .name("FadOutSpd")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'smoothing.rateOut', value });
        });
      // .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));

      this.timeStepController = this.gui
        // Bind to simParams instead of particles
        .add(this.main.simParams.simulation, "timeStep", 0.001, 0.05, 0.001)
        .name("Time Step")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'simulation.timeStep', value });
        });
      this.timeStepController.domElement.style.marginTop = "10px";

      this.timeScaleController = this.gui
        // Bind to simParams instead of particles
        .add(this.main.simParams.simulation, "timeScale", 0, 4, 0.1)
        .name("SimSpeed")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'simulation.timeScale', value });
        });
      // .onFinishChange((value) => {
      // console.log(`Animation speed: ${value}x`);
      // });

      this.velocityDampingController = this.gui
        // Bind to simParams instead of particles
        .add(this.main.simParams.simulation, "velocityDamping", 0.8, 1, 0.01)
        .name("VeloDamp")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'simulation.velocityDamping', value });
        });
      // .onFinishChange((value) => {
      //   console.log(`Velocity damping set to ${value}`);
      // });

      this.maxVelocityController = this.gui
        // Bind to simParams instead of particles
        .add(this.main.simParams.simulation, "maxVelocity", 0.01, 1, 0.01)
        .name("MaxVelocity")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'simulation.maxVelocity', value });
        });

      this.ratioPicFlip = this.gui
        // Bind to simParams instead of particles
        .add(this.main.simParams.simulation, "picFlipRatio", 0, 1, 0.01)
        .name("PicFlipRatio")
        // Add onChange handler to emit event
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'simulation.picFlipRatio', value });
        });
      // .onFinishChange((value) => {

      this.velocityDampingController.domElement.style.marginTop = "10px";
    }
  }
  //#endregion

  getControlTargets() {
    const targets = {};
    if (this.fieldTypeController) targets["Mode"] = this.fieldTypeController;
    if (this.boundaryModeController) targets["Boundary"] = this.boundaryModeController;
    if (this.maxDensityController) targets["Density"] = this.maxDensityController;
    if (this.fadeInSpeedController) targets["FadInSpd"] = this.fadeInSpeedController;
    if (this.fadeOutSpeedController) targets["FadOutSpd"] = this.fadeOutSpeedController;
    if (this.timeStepController) targets["Time Step"] = this.timeStepController;
    if (this.timeScaleController) targets["SimSpeed"] = this.timeScaleController;
    if (this.velocityDampingController) targets["VeloDamp"] = this.velocityDampingController;
    if (this.maxVelocityController) targets["MaxVelocity"] = this.maxVelocityController;
    if (this.ratioPicFlip) targets["PicFlipRatio"] = this.ratioPicFlip;
    return targets;
  }

  getData() {
    const controllers = {};
    const targets = this.getControlTargets();

    // Extract values from controllers to create a serializable object
    for (const [key, controller] of Object.entries(targets)) {
      if (controller && typeof controller.getValue === "function") {
        controllers[key] = controller.getValue();
      }
    }

    return { controllers };
  }

  setData(data) {
    if (!data || !data.controllers) {
      console.warn("Invalid param preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Apply values from preset to controllers
      for (const [key, value] of Object.entries(data.controllers)) {
        if (targets[key] && typeof targets[key].setValue === "function") {
          targets[key].setValue(value);
        }
      }

      // Update UI display
      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying param preset:", error);
      return false;
    }
  }

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

    // Update render mode controllers
    safeUpdateDisplay(this.renderModeController);
    safeUpdateDisplay(this.particleRenderModeController);
  }
}
