import { BaseUi } from "../baseUi.js";

export class RestStateUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Rest State");

    // Initialize folders and controllers
    this.initRestStateControls();
  }

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
      this.restDensityController = this.gui
        .add(controls, "density", 0, 10)
        .name("Rest Density")
        .onChange((value) => (particles.restDensity = value));
    }

    if (particles.gasConstant !== undefined) {
      this.gasConstantController = this.gui
        .add(controls, "gasConstant", 0, 100)
        .name("Gas Constant")
        .onChange((value) => (particles.gasConstant = value));
    }

    if (particles.velocityThreshold !== undefined) {
      this.velocityThresholdController = this.gui
        .add(controls, "velocityThreshold", 0, 0.1)
        .name("Velocity Threshold")
        .onChange((value) => (particles.velocityThreshold = value));
    }

    if (particles.positionThreshold !== undefined) {
      this.positionThresholdController = this.gui
        .add(controls, "positionThreshold", 0, 0.1)
        .name("Position Threshold")
        .onChange((value) => (particles.positionThreshold = value));
    }
  }

  getControlTargets() {
    const targets = {};
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
      console.warn("Invalid RestState preset data");
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
      console.error("Error applying RestState preset:", error);
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

    // Update rest state controllers
    safeUpdateDisplay(this.restDensityController);
    safeUpdateDisplay(this.gasConstantController);
    safeUpdateDisplay(this.velocityThresholdController);
    safeUpdateDisplay(this.positionThresholdController);
  }
}
