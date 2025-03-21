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

    // Only keep the commented out velocity and position threshold controls
    // Rest Density has been moved to CollisionUi

    // if (particles.velocityThreshold !== undefined) {
    //   this.velocityThresholdController = this.gui
    //     .add(controls, "velocityThreshold", 0, 0.1)
    //     .name("RS-VeloTH")
    //     .onChange((value) => (particles.velocityThreshold = value));
    // }

    // if (particles.positionThreshold !== undefined) {
    //   this.positionThresholdController = this.gui
    //     .add(controls, "positionThreshold", 0, 0.1)
    //     .name("RS-PosTH")
    //     .onChange((value) => (particles.positionThreshold = value));
    // }
  }

  getControlTargets() {
    const targets = {};
    // Only keep the velocity and position threshold controllers (if uncommented)
    if (this.velocityThresholdController)
      targets["RS-VeloTH"] = this.velocityThresholdController;
    if (this.positionThresholdController)
      targets["RS-PosTH"] = this.positionThresholdController;

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

    // Only update the commented out controllers (if uncommented)
    safeUpdateDisplay(this.velocityThresholdController);
    safeUpdateDisplay(this.positionThresholdController);
  }
}
