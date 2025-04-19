import { BaseUi } from "../baseUi.js";
import { eventBus } from '../../util/eventManager.js';

export class CollisionUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.debugFlag = this.main.debugFlags.debugCollision;

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Collisions");

    // Initialize folders and controllers
    this.initCollisionControls();
  }

  initCollisionControls() {

    this.collisionRepulsionController = this.gui.add(this.main.simParams.collision, "repulsion", 0, 4, 0.01).name("C-Repulse")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'collision.repulsion', value }); });

    this.collisionGridSizeController = this.gui.add(this.main.simParams.collision, "gridSizeCollision", 8, 128, 1).name("C-GridSizeColl")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'collision.gridSizeCollision', value }); });

    this.collisionDampingController = this.gui.add(this.main.simParams.collision, "damping", 8, 128, 1).name("C-Damping")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'collision.damping', value }); });

    this.collisionBounceController = this.gui.add(this.main.simParams.collision, "particleRestitution", 0.0, 1.0, 0.05).name("C-Bounce")
      .onChange((value) => { eventBus.emit('uiControlChanged', { paramPath: 'collision.particleRestitution', value }); });

    this.restDensityController = this.gui.add(this.main.simParams.simulation, "restDensity", 0, 10, 0.1).name("C-RestDens")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'simulation.restDensity', value });
      });



  }

  getControlTargets() {
    const targets = {};
    if (this.collisionRepulsionController) targets["C-Repulse"] = this.collisionRepulsionController;
    if (this.collisionGridSizeController) targets["C-GridSizeColl"] = this.collisionGridSizeController;
    if (this.collisionDampingController) targets["C-Damping"] = this.collisionDampingController;
    if (this.collisionBounceController) targets["C-Bounce"] = this.collisionBounceController;
    if (this.restDensityController) targets["C-RestDens"] = this.restDensityController;



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
    safeUpdateDisplay(this.collisionGridSizeController);
    safeUpdateDisplay(this.collisionRepulsionController);
    safeUpdateDisplay(this.collisionBounceController);
    safeUpdateDisplay(this.restDensityController);
    safeUpdateDisplay(this.collisionDampingController);
  }
}
