import { BaseUi } from "../baseUi.js";
import { eventBus } from '../../util/eventManager.js';

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
    // Add Enabled control
    this.collisionEnabledController = this.gui
      .add(this.main.simParams.collision, "enabled")
      .name("C-Enabled")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'collision.enabled', value });
      });

    // Add GridSize control
    this.collisionGridSizeController = this.gui
      .add(this.main.simParams.collision, "gridSize", 8, 128, 1) // Assuming step 1
      .name("C-GridSize")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'collision.gridSize', value });
      });

    this.collisionRepulsionController = this.gui
      // Bind to simParams
      .add(this.main.simParams.collision, "repulsion", 0, 4, 0.01)
      .name("C-Repulse")
      // Add onChange handler
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'collision.repulsion', value });
      });

    // Check if properties exist before adding them - Bind to simParams
    if (this.main.simParams.collision.particleRestitution !== undefined) {
      this.collisionBounceController = this.gui
        // Bind to simParams
        .add(this.main.simParams.collision, "particleRestitution", 0.0, 1.0, 0.05)
        .name("C-Bounce")
        // Add onChange handler
        .onChange((value) => {
          eventBus.emit('uiControlChanged', { paramPath: 'collision.particleRestitution', value });
        });
    }
  }

  getControlTargets() {
    const targets = {};

    // Update targets list
    if (this.collisionEnabledController)
      targets["C-Enabled"] = this.collisionEnabledController;
    if (this.collisionGridSizeController)
      targets["C-GridSize"] = this.collisionGridSizeController;
    if (this.collisionRepulsionController)
      targets["C-Repulse"] = this.collisionRepulsionController;
    if (this.collisionBounceController)
      targets["C-Bounce"] = this.collisionBounceController;

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

    // Update relevant collision controllers
    safeUpdateDisplay(this.collisionEnabledController);
    safeUpdateDisplay(this.collisionGridSizeController);
    safeUpdateDisplay(this.collisionRepulsionController);
    safeUpdateDisplay(this.collisionBounceController);
  }
}
