import { BaseUi } from "../baseUi.js";
import { eventBus } from '../../util/eventManager.js';

export class GravityUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.controls = {};
    this.gui.title("Gravity");

    // Add class to identify gravity controllers
    this.gui.domElement.classList.add('gravity-controller');

    // Store reference to this instance on the DOM element
    this.gui.domElement.__controller = this;

    this.initGravityControls();
  }

  //#region Physics
  initGravityControls() {
    // Wider range for X and Y to control both direction and strength
    this.gravityXController = this.gui
      // Bind to simParams
      .add(this.main.simParams.gravity, "directionX", -10, 10, 0.5)
      .name("G-X")
      .onChange((value) => {
        // Emit event
        eventBus.emit('uiControlChanged', { paramPath: 'gravity.directionX', value });
      });

    this.gravityYController = this.gui
      // Bind to simParams
      .add(this.main.simParams.gravity, "directionY", -10, 10, 0.5)
      .name("G-Y")
      .onChange((value) => {
        // Emit event
        eventBus.emit('uiControlChanged', { paramPath: 'gravity.directionY', value });
      });
  }

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

  // Clean up when UI is destroyed
  destroy() {
    super.destroy && super.destroy();
  }
}
