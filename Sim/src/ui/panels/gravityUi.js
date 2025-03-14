import { BaseUi } from "../baseUi.js";

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

    // Set up periodic UI refresh (every 100ms)
    this.refreshInterval = setInterval(() => this.updateFromGravity(), 100);
  }

  //#region Physics
  initGravityControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.gravity) return;

    // Create a reference object to track magnitude
    this.magnitudeObj = { magnitude: 0 };

    // Add gravity direction controls that directly control magnitude
    this.gravityDirection = {
      x: 0,
      y: 0,
    };

    // Wider range for X and Y to control both direction and strength
    this.gravityXController = this.gui
      .add(this.gravityDirection, "x", -10, 10, 0.5)
      .name("G-X")
      .onChange((value) => {
        // Don't normalize - use raw values
        particles.gravity.setRawDirection(value, this.gravityDirection.y);
        // Update magnitude display
        this.magnitudeObj.magnitude = Math.sqrt(
          value * value + this.gravityDirection.y * this.gravityDirection.y
        ).toFixed(2);
      });

    this.gravityYController = this.gui
      .add(this.gravityDirection, "y", -10, 10, 0.5)
      .name("G-Y")
      .onChange((value) => {
        // Don't normalize - use raw values
        particles.gravity.setRawDirection(this.gravityDirection.x, value);
        // Update magnitude display
        this.magnitudeObj.magnitude = Math.sqrt(
          this.gravityDirection.x * this.gravityDirection.x + value * value
        ).toFixed(2);
      });

    // Add magnitude display (read-only)
    this.magnitudeController = this.gui.add(this.magnitudeObj, 'magnitude')
      .name("Magnitude")
      .listen()
      .domElement.style.pointerEvents = 'none';

    // Initialize with current gravity values
    this.updateFromGravity();
  }

  // New method to update UI from gravity values
  updateFromGravity() {
    const gravity = this.main.particleSystem?.gravity;
    if (!gravity) return;

    // Update the local direction values
    this.gravityDirection.x = gravity.directionX;
    this.gravityDirection.y = gravity.directionY;

    // Update the magnitude display
    this.magnitudeObj.magnitude = gravity.strength.toFixed(2);

    // Update the controller UI elements
    this.updateControllerDisplays();
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
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    super.destroy && super.destroy();
  }
}
