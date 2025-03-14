import { BaseUi } from "../baseUi.js";

export class BoundaryUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Boundary");

    // Initialize folders and controllers
    this.initBoundaryControls();
  }

  initBoundaryControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.boundary) return;

    const boundary = particles.boundary;

    if (boundary.radius !== undefined) {
      this.boundarySizeController = this.gui
        .add(boundary, "radius", 0.1, 0.55, 0.005)
        .name("B-Size")
        .onChange((value) => {
          if (boundary.update) boundary.update({ radius: value });
        });
    }

    // Check if properties exist before adding controllers
    if (particles.boundaryDamping !== undefined) {
      this.boundaryFrictionController = this.gui
        .add(particles, "boundaryDamping", 0.0, 1.0, 0.01)
        .name("B-Friction");
    }

    if (boundary.cBoundaryRestitution !== undefined) {
      this.boundaryBounceController = this.gui
        .add(boundary, "cBoundaryRestitution", 0.0, 1.0, 0.05)
        .name("B-Bounce");
    }

    if (boundary.boundaryRepulsion !== undefined) {
      this.boundaryRepulsionController = this.gui
        .add(boundary, "boundaryRepulsion", 0.0, 20, 0.01)
        .name("B-Repulse");
    }
  }

  getControlTargets() {
    const targets = {};

    if (this.boundarySizeController)
      targets["B-Size"] = this.boundarySizeController;
    if (this.boundaryRepulsionController)
      targets["B-Repulse"] = this.boundaryRepulsionController;
    if (this.boundaryFrictionController)
      targets["B-Friction"] = this.boundaryFrictionController;
    if (this.boundaryBounceController)
      targets["B-Bounce"] = this.boundaryBounceController;

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
      console.warn("Invalid Boudary preset data");
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
      console.error("Error applying Boudary preset:", error);
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

    safeUpdateDisplay(this.boundarySizeController);
    safeUpdateDisplay(this.boundaryRepulsionController);
    safeUpdateDisplay(this.boundaryFrictionController);
    safeUpdateDisplay(this.boundaryBounceController);
  }
}
