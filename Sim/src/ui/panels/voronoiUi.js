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

  // Add this method to the VoronoiUi class
  loadPresetData(preset) {
    if (!preset || !preset.controllers) {
      console.warn("Invalid voronoi preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Apply values from preset
      for (const key in preset.controllers) {
        if (targets.hasOwnProperty(key)) {
          targets[key] = preset.controllers[key];
        }
      }

      // Update UI
      this.updateControllerDisplays();

      // Important: Update the actual voronoi field with new values
      if (this.main && this.main.voronoiField) {
        this.main.voronoiField.setParameters(targets);
      }

      return true;
    } catch (error) {
      console.error("Error applying voronoi preset data:", error);
      return false;
    }
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

    // Always handle "None" as a special case to reset
    if (!data || data === "None" || data.name === "None") {
      console.log("Resetting voronoi to default");

      if (this.main && this.main.voronoiField) {
        // Direct approach: just set strength to 0
        this.main.voronoiField.strength = 0;

        // Update controllers to match
        if (this.voronoiStrengthController) {
          this.voronoiStrengthController.setValue(0);
        }

        // Update UI display
        this.updateControllerDisplays();
      }

      return true;
    }

    try {
      // For non-None presets, just apply the values directly to the field
      if (data.controllers && this.main && this.main.voronoiField) {
        // Get the actual field object
        const field = this.main.voronoiField;

        // Apply relevant properties directly
        if (typeof data.controllers["Voronoi Strength"] !== "undefined") {
          field.strength = data.controllers["Voronoi Strength"];
        }
        if (typeof data.controllers["Cell Speed"] !== "undefined") {
          field.cellMovementSpeed = data.controllers["Cell Speed"];
        }
        if (typeof data.controllers["Edge Width"] !== "undefined") {
          field.edgeWidth = data.controllers["Edge Width"];
        }
        if (typeof data.controllers["Attraction"] !== "undefined") {
          field.attractionFactor = data.controllers["Attraction"];
        }
        if (typeof data.controllers["Cell Count"] !== "undefined") {
          field.cellCount = data.controllers["Cell Count"];
          field.regenerateCells();
        }

        // Update UI
        this.updateControllerDisplays();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error applying voronoi preset:", error);
      return false;
    }
  }
}
