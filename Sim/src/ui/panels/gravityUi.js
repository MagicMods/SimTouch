import { BaseUi } from "../baseUi.js";

export class GravityUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Gravity");

    // Initialize folders and controllers
    this.initGravityControls();
  }

  //#region Physics
  initGravityControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.gravity) return;

    // Add gravity strength control
    this.gravityStrengthController = this.gui
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

    this.gravityXController = this.gui
      .add(gravityDirection, "x", -1, 1, 0.1)
      .name("Gravity X")
      .onChange((value) => {
        particles.gravity.directionX = value;
      });

    this.gravityYController = this.gui
      .add(gravityDirection, "y", -1, 1, 0.1)
      .name("Gravity Y")
      .onChange((value) => {
        particles.gravity.directionY = value;
      });
  }
  //#endregion

  getControlTargets() {
    const targets = {};

    if (this.gravityStrengthController)
      targets["Gravity Strength"] = this.gravityStrengthController;
    if (this.gravityXController) targets["Gravity X"] = this.gravityXController;
    if (this.gravityYController) targets["Gravity Y"] = this.gravityYController;

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
      console.warn("Invalid Gravity preset data");
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
      console.error("Error applying Gravity preset:", error);
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
          console.warn("Error updating GRAVITY display:", e);
        }
      }
    };
    safeUpdateDisplay(this.gravityStrengthController);
    safeUpdateDisplay(this.gravityXController);
    safeUpdateDisplay(this.gravityYController);
    safeUpdateDisplay(this.gravityEnabledController);
  }
}
