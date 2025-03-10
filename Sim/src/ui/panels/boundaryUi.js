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
        .add(boundary, "radius", 0.3, 0.55, 0.005)
        .name("Size")
        .onChange((value) => {
          if (boundary.update) boundary.update({ radius: value });
        });
    }

    // Check if properties exist before adding controllers
    if (particles.boundaryDamping !== undefined) {
      this.boundaryFrictionController = this.gui
        .add(particles, "boundaryDamping", 0.0, 1.0, 0.01)
        .name("Wall Friction");
    }

    if (boundary.cBoundaryRestitution !== undefined) {
      this.boundaryBounceController = this.gui
        .add(boundary, "cBoundaryRestitution", 0.0, 1.0, 0.05)
        .name("Bounce");
    }

    if (boundary.boundaryRepulsion !== undefined) {
      this.boundaryRepulsionController = this.gui
        .add(boundary, "boundaryRepulsion", 0.0, 20, 0.01)
        .name("Wall Repulsion");
    }
  }

  getControlTargets() {
    const targets = {};

    // Boundary controllers
    if (this.boundarySizeController)
      targets["Boundary Size"] = this.boundarySizeController;
    if (this.boundaryRepulsionController)
      targets["Wall Repulsion"] = this.boundaryRepulsionController;
    if (this.boundaryFrictionController)
      targets["Wall Friction"] = this.boundaryFrictionController;
    if (this.boundaryBounceController)
      targets["Boundary Bounce"] = this.boundaryBounceController;

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

    safeUpdateDisplay(this.boundarySizeController);
    safeUpdateDisplay(this.boundaryRepulsionController);
    safeUpdateDisplay(this.boundaryFrictionController);
    safeUpdateDisplay(this.boundaryBounceController);
  }
}
