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

    // Add gravity enable/disable toggle
    this.gravityEnabledController = this.gui
      .add(particles.gravity, "enabled")
      .name("Gravity Enabled");
  }
  //#endregion

  getControlTargets() {
    const targets = {};
    // Physics controllers
    if (this.gravityStrengthController)
      targets["Gravity Strength"] = this.gravityStrengthController;
    if (this.gravityXController) targets["Gravity X"] = this.gravityXController;
    if (this.gravityYController) targets["Gravity Y"] = this.gravityYController;
    if (this.gravityEnabledController)
      targets["Gravity Enabled"] = this.gravityEnabledController;

    return targets;
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
