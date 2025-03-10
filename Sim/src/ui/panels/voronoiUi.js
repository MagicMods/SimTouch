import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class VoronoiUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = null;

    // Change the GUI title
    this.gui.title("Voronoi Field");

    // Create the main folder
    this.voronoiFolder = this.createFolder("Voronoi Controls");
    this.initVoronoiControls();

    // Open GUI by default
    this.gui.open();
    this.voronoiFolder.open();
  }

  setPresetManager(presetManager) {
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
    this.voronoiStrengthController = this.voronoiFolder
      .add(voronoi, "strength", 0, 10)
      .name("Strength");

    this.voronoiEdgeWidthController = this.voronoiFolder
      .add(voronoi, "edgeWidth", 0.1, 50)
      .name("Edge Width");

    this.voronoiAttractionController = this.voronoiFolder
      .add(voronoi, "attractionFactor", 0, 8)
      .name("Attraction");

    this.voronoiCellCountController = this.voronoiFolder
      .add(voronoi, "cellCount", 1, 10, 1)
      .name("Cell Count")
      .onChange(() => voronoi.regenerateCells());

    this.voronoiSpeedController = this.voronoiFolder
      .add(voronoi, "cellMovementSpeed", 0, 4)
      .name("Cell Speed");

    this.voronoiDecayRateController = this.voronoiFolder
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
}
