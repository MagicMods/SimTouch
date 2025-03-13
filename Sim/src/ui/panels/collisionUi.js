import { BaseUi } from "../baseUi.js";

export class CollisionUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Collisions");

    // Initialize folders and controllers
    this.initCollisionControls();
  }

  initCollisionControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.collisionSystem) return;

    const collisionSystem = particles.collisionSystem;

    this.collisionRepulsionController = this.gui
      .add(collisionSystem, "repulsion", 0, 5, 0.01)
      .name("C-Repulse");

    // Check if properties exist before adding them
    if (collisionSystem.particleRestitution !== undefined) {
      this.collisionBounceController = this.gui
        .add(collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
        .name("C-Bounce");
    }

    if (collisionSystem.damping !== undefined) {
      this.collisionDampingController = this.gui
        .add(collisionSystem, "damping", 0.5, 1.0, 0.01)
        .name("C-Damping");
    }
  }

  getControlTargets() {
    const targets = {};

    // Collision controllers
    if (this.collisionRepulsionController)
      targets["C-Repulse"] = this.collisionRepulsionController;
    if (this.collisionBounceController)
      targets["C-Bounce"] = this.collisionBounceController;
    if (this.collisionDampingController)
      targets["C-Damping"] = this.collisionDampingController;

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
      console.warn("Invalid Collision preset data");
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
      console.error("Error applying Collision preset:", error);
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

    // Update collision controllers
    safeUpdateDisplay(this.collisionRepulsionController);
    safeUpdateDisplay(this.collisionBounceController);
    safeUpdateDisplay(this.collisionDampingController);
  }
}
