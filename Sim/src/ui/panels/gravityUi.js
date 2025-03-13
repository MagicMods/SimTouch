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

    // Set a fixed strength value for gravity
    particles.gravity.setStrength(9.8); // Using the default value

    // Add gravity direction controls
    const gravityDirection = {
      x: particles.gravity.directionX,
      y: particles.gravity.directionY,
    };

    this.gravityXController = this.gui
      .add(gravityDirection, "x", -1, 1, 0.1)
      .name("G-X")
      .onChange((value) => {
        // Special handling for zero gravity case
        const bothZero = value === 0 && gravityDirection.y === 0;
        if (bothZero) {
          // This effectively disables gravity
          particles.gravity.directionX = 0;
          particles.gravity.directionY = 0;
        } else {
          particles.gravity.setDirection(value, gravityDirection.y);
        }
      });

    this.gravityYController = this.gui
      .add(gravityDirection, "y", -1, 1, 0.1)
      .name("G-Y")
      .onChange((value) => {
        // Special handling for zero gravity case
        const bothZero = gravityDirection.x === 0 && value === 0;
        if (bothZero) {
          // This effectively disables gravity
          particles.gravity.directionX = 0;
          particles.gravity.directionY = 0;
        } else {
          particles.gravity.setDirection(gravityDirection.x, value);
        }
      });
  }
  //#endregion

  getControlTargets() {
    const targets = {};

    // Only include X and Y controllers
    if (this.gravityXController) targets["G-X"] = this.gravityXController;
    if (this.gravityYController) targets["G-Y"] = this.gravityYController;

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

    // Only update X and Y controllers
    safeUpdateDisplay(this.gravityXController);
    safeUpdateDisplay(this.gravityYController);
    safeUpdateDisplay(this.gravityEnabledController);
  }
}
