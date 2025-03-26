import { BaseUi } from "../baseUi.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

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
        this.main.paused = !this.main.paused;
        this.pauseButtonController.name(this.main.paused ? "Resume" : "Pause");
        // console.log(`Simulation is ${this.main.paused ? "paused" : "running"}`);
      },
    };

    // Store as class property instead of local variable
    this.pauseButtonController = this.gui.add(pauseControl, "togglePause");

    // Set initial button text based on current state
    this.pauseButtonController.name(this.main.paused ? "Resume" : "Pause");
    this.pauseButtonController.domElement.style.marginBottom = "10px";

    if (this.main.gridRenderer.renderModes) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      // Store as class property instead of in this.controls
      this.fieldTypeController = this.gui
        .add(fieldControl, "field", Object.values(GridField))
        // .className("full-width")
        .name("Mode")
        .onChange((value) => {
          // Set new mode
          this.main.gridRenderer.renderModes.currentMode = value;
          // Update display
          this.fieldTypeController.updateDisplay();
        });

      this.fieldTypeController.domElement.classList.add("full-width");
      // presetSelect.classList = "preset-select";

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
      this.boundaryModeController.domElement.classList.add("full-width");
      this.boundaryModeController.domElement.style.marginBottom = "10px";
      const smoothing = this.main.gridRenderer.renderModes.smoothing;


      this.maxDensityController = this.gui
        .add(this.main.gridRenderer, "maxDensity", 0.1, 10, 0.1)
        .name("Density");


      this.fadeInSpeedController = this.gui
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("FadInSpd")
      // .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));


      this.fadeOutSpeedController = this.gui
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("FadOutSpd")
      // .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));

      this.timeStepController = this.gui
        .add(particles, "timeStep", 0.001, 0.05, 0.001)
        .name("Time Step");
      this.timeStepController.domElement.style.marginTop = "10px";


      this.timeScaleController = this.gui
        .add(particles, "timeScale", 0, 4, 0.1)
        .name("SimSpeed")
      // .onFinishChange((value) => {
      // console.log(`Animation speed: ${value}x`);
      // });

      this.velocityDampingController = this.gui
        .add(particles, "velocityDamping", 0.8, 1, 0.01)
        .name("VeloDamp")
      // .onFinishChange((value) => {
      //   console.log(`Velocity damping set to ${value}`);
      // });

      this.maxVelocityController = this.gui
        .add(particles, "maxVelocity", 0.01, 1, 0.01)
        .name("MaxVelocity");

      this.ratioPicFlip = this.gui
        .add(particles, "picFlipRatio", 0, 1, 0.01)
        .name("PicFlipRatio")
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
