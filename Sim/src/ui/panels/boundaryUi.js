import { BaseUi } from "../baseUi.js";
import { CircularBoundary } from "../../simulation/boundary/circularBoundary.js";
import { RectangularBoundary } from "../../simulation/boundary/rectangularBoundary.js";
import { BoundaryUtils } from "../../simulation/boundary/boundaryUtils.js";

export class BoundaryUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Boundary");

    // Store boundary types
    this.boundaryTypes = {
      CIRCULAR: "Circular",
      RECTANGULAR: "Rectangular"
    };

    // Create a boundary type property for binding to UI
    this.boundaryTypeProperty = {
      type: this.boundaryTypes.CIRCULAR // Default to circular
    };

    // Initialize folders and controllers
    this.initBoundaryControls();
  }

  initBoundaryControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.boundary) return;

    const boundary = particles.boundary;

    // Add boundary type selector
    this.boundaryTypeController = this.gui
      .add(this.boundaryTypeProperty, "type", Object.values(this.boundaryTypes))
      .name("B-Type")
      .onChange((value) => {
        this.changeBoundaryType(value);
      });

    // Create type-specific folder for shape parameters
    this.shapeFolder = this.gui.addFolder("Shape");

    // Determine current boundary type
    const currentType = boundary instanceof CircularBoundary
      ? this.boundaryTypes.CIRCULAR
      : this.boundaryTypes.RECTANGULAR;

    // Set initial value
    this.boundaryTypeProperty.type = currentType;
    this.boundaryTypeController.updateDisplay();

    // Initialize shape controls based on current boundary type
    this.updateShapeControls();

    // Common controls for all boundary types
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

  updateShapeControls() {
    // Clear existing shape controls
    if (this.shapeFolder) {
      // Most GUI libraries don't allow removing controllers directly from a folder
      // Instead, we'll hide existing controllers and create new ones

      // First, store reference to old controllers
      const oldControllers = this.shapeFolder.controllers.slice();

      // Hide or disable old controllers (we can't remove them)
      oldControllers.forEach(controller => {
        if (controller.domElement) {
          controller.domElement.style.display = 'none';
        }
      });
    }

    const boundary = this.main.particleSystem.boundary;

    // Add shape-specific controllers based on current boundary type
    if (this.boundaryTypeProperty.type === this.boundaryTypes.CIRCULAR) {
      if (boundary.radius !== undefined) {
        this.boundarySizeController = this.shapeFolder
          .add(boundary, "radius", 0.1, 0.55, 0.001)
          .name("Radius")
          .onChange((value) => {
            if (boundary.update) boundary.update({ radius: value });
          });
      }
    } else if (this.boundaryTypeProperty.type === this.boundaryTypes.RECTANGULAR) {
      if (boundary.width !== undefined) {
        this.boundaryWidthController = this.shapeFolder
          .add(boundary, "width", 0.1, 1.0, 0.01)
          .name("Width")
          .onChange((value) => {
            if (boundary.update) boundary.update({ width: value });
          });
      }

      if (boundary.height !== undefined) {
        this.boundaryHeightController = this.shapeFolder
          .add(boundary, "height", 0.1, 1.0, 0.01)
          .name("Height")
          .onChange((value) => {
            if (boundary.update) boundary.update({ height: value });
          });
      }
    }
  }

  changeBoundaryType(typeName) {
    const particles = this.main.particleSystem;
    if (!particles) return;

    const currentBoundary = particles.boundary;
    if (!currentBoundary) return;

    // Determine the new boundary type
    const newType = typeName === this.boundaryTypes.CIRCULAR
      ? "CIRCULAR"
      : "RECTANGULAR";

    // Skip if already the right type
    if (currentBoundary.getBoundaryType() === newType) return;

    // Convert parameters between boundary types
    let newBoundaryParams;
    if (newType === "CIRCULAR") {
      newBoundaryParams = BoundaryUtils.rectangularToCircular(currentBoundary);
    } else {
      newBoundaryParams = BoundaryUtils.circularToRectangular(currentBoundary);
    }

    // Create new boundary
    let newBoundary;
    if (newType === "CIRCULAR") {
      newBoundary = new CircularBoundary(newBoundaryParams);
    } else {
      newBoundary = new RectangularBoundary(newBoundaryParams);
    }

    // Transfer callbacks from old boundary to new boundary
    currentBoundary.updateCallbacks.forEach(callback => {
      newBoundary.addUpdateCallback(callback);
    });

    // Replace boundary in particle system
    particles.boundary = newBoundary;

    // Update fluid system to use the new boundary
    if (particles.fluid) {
      particles.fluid.boundary = newBoundary;
      particles.fluid.initializeBoundary();
    }

    // Update shape controls for the new boundary type
    this.updateShapeControls();
  }

  getControlTargets() {
    const targets = {};

    // Common controls
    if (this.boundaryRepulsionController)
      targets["B-Repulse"] = this.boundaryRepulsionController;
    if (this.boundaryFrictionController)
      targets["B-Friction"] = this.boundaryFrictionController;
    if (this.boundaryBounceController)
      targets["B-Bounce"] = this.boundaryBounceController;

    // Type-specific controls
    if (this.boundaryTypeProperty.type === this.boundaryTypes.CIRCULAR) {
      if (this.boundarySizeController)
        targets["Radius"] = this.boundarySizeController;
    } else {
      if (this.boundaryWidthController)
        targets["Width"] = this.boundaryWidthController;
      if (this.boundaryHeightController)
        targets["Height"] = this.boundaryHeightController;
    }

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

    // Add boundary type
    controllers["B-Type"] = this.boundaryTypeProperty.type;

    return { controllers };
  }

  setData(data) {
    if (!data || !data.controllers) {
      console.warn("Invalid Boundary preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Set boundary type first if specified
      if (data.controllers["B-Type"]) {
        this.boundaryTypeProperty.type = data.controllers["B-Type"];
        this.boundaryTypeController.updateDisplay();
        this.changeBoundaryType(data.controllers["B-Type"]);
      }

      // Apply values from preset to controllers
      for (const [key, value] of Object.entries(data.controllers)) {
        if (key !== "B-Type" && targets[key] && typeof targets[key].setValue === "function") {
          targets[key].setValue(value);
        }
      }

      // Update UI display
      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying Boundary preset:", error);
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

    // Update all controllers
    safeUpdateDisplay(this.boundaryTypeController);

    // Shape controllers
    if (this.boundaryTypeProperty.type === this.boundaryTypes.CIRCULAR) {
      safeUpdateDisplay(this.boundarySizeController);
    } else {
      safeUpdateDisplay(this.boundaryWidthController);
      safeUpdateDisplay(this.boundaryHeightController);
    }

    // Common controllers
    safeUpdateDisplay(this.boundaryRepulsionController);
    safeUpdateDisplay(this.boundaryFrictionController);
    safeUpdateDisplay(this.boundaryBounceController);
  }
}
