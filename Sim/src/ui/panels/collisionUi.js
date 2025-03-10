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
      .name("Repulsion");

    // Check if properties exist before adding them
    if (collisionSystem.particleRestitution !== undefined) {
      this.collisionBounceController = this.gui
        .add(collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
        .name("Bounce");
    }

    if (collisionSystem.damping !== undefined) {
      this.collisionDampingController = this.gui
        .add(collisionSystem, "damping", 0.5, 1.0, 0.01)
        .name("Collision Damping");
    }
  }

  getControlTargets() {
    const targets = {};

    // Collision controllers
    if (this.collisionRepulsionController)
      targets["Repulsion"] = this.collisionRepulsionController;
    if (this.collisionBounceController)
      targets["Bounce"] = this.collisionBounceController;
    if (this.collisionDampingController)
      targets["Collision Damping"] = this.collisionDampingController;

    return targets;
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
