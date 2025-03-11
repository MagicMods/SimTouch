import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class VoronoiUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = null;

    // Change the GUI title
    this.gui.title("Voronoi Field");

    this.initVoronoiControls();

    // Open GUI by default
    this.gui.open();
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;

    // Create standardized preset controls for voronoi
    const voronoiContainer = this.gui.domElement.querySelector(".children");
    if (voronoiContainer) {
      this.presetControls = this.presetManager.createPresetControls(
        PresetManager.TYPES.VORONOI,
        voronoiContainer,
        { insertFirst: true }
      );
    }

    // Store reference to voronoiField for preset management
    if (this.main && this.main.voronoiField && this.presetManager) {
      this.presetManager.setVoronoiField(this.main.voronoiField);
    }
  }

  initVoronoiControls() {
    const voronoi = this.main.voronoiField;
    if (!voronoi) return;

    // Basic voronoi controls - store as class properties
    this.voronoiStrengthController = this.gui
      .add(voronoi, "strength", 0, 10)
      .name("Strength");

    this.voronoiEdgeWidthController = this.gui
      .add(voronoi, "edgeWidth", 0.1, 50)
      .name("Edge Width");

    this.voronoiAttractionController = this.gui
      .add(voronoi, "attractionFactor", 0, 8)
      .name("Attraction");

    this.voronoiCellCountController = this.gui
      .add(voronoi, "cellCount", 1, 10, 1)
      .name("Cell Count")
      .onChange(() => voronoi.regenerateCells());

    this.voronoiSpeedController = this.gui
      .add(voronoi, "cellMovementSpeed", 0, 4)
      .name("Cell Speed");

    this.voronoiDecayRateController = this.gui
      .add(voronoi, "decayRate", 0.9, 1)
      .name("Decay Rate");
  }

  getControlTargets() {
    const targets = {};

    if (this.voronoiStrengthController)
      targets["Voronoi Strength"] = this.voronoiStrengthController;
    if (this.voronoiSpeedController)
      targets["Cell Speed"] = this.voronoiSpeedController;
    if (this.voronoiEdgeWidthController)
      targets["Edge Width"] = this.voronoiEdgeWidthController;
    if (this.voronoiAttractionController)
      targets["Attraction"] = this.voronoiAttractionController;
    if (this.voronoiCellCountController)
      targets["Cell Count"] = this.voronoiCellCountController;

    return targets;
  }

  updateControllerDisplays() {
    // Helper function to safely update controllers
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };

    // Update all voronoi controllers
    safeUpdateDisplay(this.voronoiStrengthController);
    safeUpdateDisplay(this.voronoiEdgeWidthController);
    safeUpdateDisplay(this.voronoiAttractionController);
    safeUpdateDisplay(this.voronoiSpeedController);
    safeUpdateDisplay(this.voronoiCellCountController);
    safeUpdateDisplay(this.voronoiDecayRateController);
  }

  // Standard data extraction method
  getData() {
    // Create a clean copy of control values
    const controllers = {};
    const targets = this.getControlTargets();

    // Only include primitive values to avoid circular references
    for (const key in targets) {
      if (
        typeof targets[key] !== "function" &&
        typeof targets[key] !== "object"
      ) {
        controllers[key] = targets[key];
      }
    }

    return { controllers };
  }

  // Fix the setData method to handle "None" correctly
  setData(data) {
    console.log("VoronoiUi.setData called with:", data);

    // Handle "None" preset case
    if (!data || data === "None" || data.name === "None") {
      console.log("Resetting voronoi to default");

      // Properly reset using controllers
      if (this.voronoiStrengthController) {
        this.voronoiStrengthController.setValue(0);
      }
      if (this.voronoiSpeedController) {
        this.voronoiSpeedController.setValue(0);
      }
      if (this.voronoiEdgeWidthController) {
        this.voronoiEdgeWidthController.setValue(10);
      }
      if (this.voronoiAttractionController) {
        this.voronoiAttractionController.setValue(0);
      }
      if (this.voronoiCellCountController) {
        this.voronoiCellCountController.setValue(3);
        if (this.main && this.main.voronoiField) {
          this.main.voronoiField.regenerateCells();
        }
      }
      if (this.voronoiDecayRateController) {
        this.voronoiDecayRateController.setValue(0.95);
      }

      // Update UI display
      this.updateControllerDisplays();
      return true;
    }

    // Regular preset handling
    try {
      if (!data.controllers) {
        console.error("Invalid voronoi preset data: missing controllers");
        return false;
      }

      // Use all available controllers
      const controllerMap = {
        "Voronoi Strength": this.voronoiStrengthController,
        "Cell Speed": this.voronoiSpeedController,
        "Edge Width": this.voronoiEdgeWidthController,
        Attraction: this.voronoiAttractionController,
        "Cell Count": this.voronoiCellCountController,
        "Decay Rate": this.voronoiDecayRateController,
      };

      // Apply values from preset to controllers
      for (const [key, value] of Object.entries(data.controllers)) {
        const controller = controllerMap[key];
        if (controller && typeof controller.setValue === "function") {
          controller.setValue(value);
          console.log(`Set ${key} to ${value}`);
        }
      }

      // Special handling for cell count, which needs regeneration
      if (
        data.controllers["Cell Count"] !== undefined &&
        this.main?.voronoiField
      ) {
        this.main.voronoiField.regenerateCells();
      }

      // Update UI display
      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying voronoi preset:", error);
      return false;
    }
  }
}
