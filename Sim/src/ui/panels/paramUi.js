import { BaseUi } from "../baseUi.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

export class ParamUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Parameters");

    // Initialize folders and controllers
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
        console.log(`Simulation is ${this.main.paused ? "paused" : "running"}`);
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

          if (this.main.ui?.organicUi?.updateOrganicFolders) {
            this.main.ui.organicUi.updateOrganicFolders(value);
          }

          this.behaviorTypeController.updateDisplay();
        });

      this.behaviorTypeController.domElement.classList.add("full-width");
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
      this.timeStepController.domElement.style.marginTop = "10px";

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
      this.velocityDampingController.domElement.style.marginTop = "10px";
    }
  }
  //#endregion

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
    return targets;
  }

  // Add to ParamUi class
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
