import { BaseUi } from "../baseUi.js";
import { CircularBoundary } from "../../simulation/boundary/circularBoundary.js";
import { RectangularBoundary } from "../../simulation/boundary/rectangularBoundary.js";
import { BoundaryUtils } from "../../simulation/boundary/boundaryUtils.js";
import { eventBus } from '../../util/eventManager.js';

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

    // Initialize folders and controllers
    this.initBoundaryControls();
  }

  initBoundaryControls() {
    const particles = this.main.particleSystem;
    if (!particles || !particles.boundary) return;

    const boundary = particles.boundary;

    // Add boundary type selector - BIND TO SIMPARAMS
    this.boundaryTypeController = this.gui
      // Bind to simParams.boundary.shape
      .add(this.main.simParams.boundary, "shape", Object.values(this.boundaryTypes))
      .name("B-Type")
      .onChange((value) => {
        // Remove direct call to changeBoundaryType
        // this.changeBoundaryType(value);
        // Emit event instead
        eventBus.emit('uiControlChanged', { paramPath: 'boundary.shape', value });
        // We might still need to update shape controls locally based on the new value
        // Ideally, this would happen in response to simParamsUpdated
        this.updateShapeControls(); // Keep for now to maintain UI responsiveness
      });

    // Create type-specific folder for shape parameters
    this.shapeFolder = this.gui.addFolder("Shape");

    // Determine current boundary type from simParams
    const currentType = this.main.simParams.boundary.shape;

    // Set initial value (binding should handle this, but updateDisplay might be needed)
    // this.boundaryTypeProperty.type = currentType;
    // this.boundaryTypeController.updateDisplay();

    // Initialize shape controls based on current boundary type
    this.updateShapeControls();

    // Add boundary mode control - BIND TO SIMPARAMS
    if (boundary.mode !== undefined) { // Check if mode exists on the initial boundary object
      this.boundaryModeController = this.gui
        .add(this.main.simParams.boundary, "mode", { // Bind to simParams
          Bounce: "BOUNCE",
          Warp: "WARP",
        })
        .name("B-Mode")
        .onChange((value) => {
          // Emit event
          eventBus.emit('uiControlChanged', { paramPath: 'boundary.mode', value });
        });
    }

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

    // Add shape-specific controllers based on current boundary type IN SIMPARAMS
    if (this.main.simParams.boundary.shape === this.boundaryTypes.CIRCULAR) {
      // Keep binding directly to boundary object for now
      if (boundary.radius !== undefined) {
        this.boundarySizeController = this.shapeFolder
          .add(boundary, "radius", 0.1, 0.55, 0.001)
          .name("Radius")
          .onChange((value) => {
            if (boundary.update) boundary.update({ radius: value });
          });
      }
    } else if (this.main.simParams.boundary.shape === this.boundaryTypes.RECTANGULAR) {
      // Keep binding directly to boundary object for now
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

  getControlTargets() {
    const targets = {};

    // Common controls
    if (this.boundaryRepulsionController)
      targets["B-Repulse"] = this.boundaryRepulsionController;
    if (this.boundaryFrictionController)
      targets["B-Friction"] = this.boundaryFrictionController;
    if (this.boundaryBounceController)
      targets["B-Bounce"] = this.boundaryBounceController;

    // Type-specific controls - READ SHAPE FROM SIMPARAMS
    if (this.main.simParams.boundary.shape === this.boundaryTypes.CIRCULAR) {
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

  getData() {
    const controllers = {};
    const targets = this.getControlTargets();

    // Extract values from controllers to create a serializable object
    for (const [key, controller] of Object.entries(targets)) {
      if (controller && typeof controller.getValue === "function") {
        controllers[key] = controller.getValue();
      }
    }

    // Remove boundary type as it's handled by simParams binding
    // controllers["B-Type"] = this.boundaryTypeProperty.type;

    return { controllers };
  }

  setData(data) {
    if (!data || !data.controllers) {
      console.warn("Invalid Boundary preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Apply values from preset to controllers (excluding B-Type)
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
    safeUpdateDisplay(this.boundaryModeController);
    safeUpdateDisplay(this.boundaryRepulsionController);
    safeUpdateDisplay(this.boundaryFrictionController);
    safeUpdateDisplay(this.boundaryBounceController);

    // Shape controllers
    if (this.main.simParams.boundary.shape === this.boundaryTypes.CIRCULAR) {
      safeUpdateDisplay(this.boundarySizeController);
    } else {
      safeUpdateDisplay(this.boundaryWidthController);
      safeUpdateDisplay(this.boundaryHeightController);
    }
  }
}
