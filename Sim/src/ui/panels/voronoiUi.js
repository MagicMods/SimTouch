import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class VoronoiUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = null;
    this.gui.title("Voronoi Field");
    this.initVoronoiControls();
    this.gui.open();
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;

    const voronoiContainer = this.gui.domElement.querySelector(".children");
    if (voronoiContainer) {
      this.presetControls = this.presetManager.createPresetControls(
        PresetManager.TYPES.VORONOI,
        voronoiContainer,
        { insertFirst: true }
      );
    }

    if (this.main && this.main.voronoiField && this.presetManager) {
      this.presetManager.setVoronoiField(this.main.voronoiField);
    }
  }

  initVoronoiControls() {
    const voronoi = this.main.voronoiField;
    if (!voronoi) return;

    this.voronoiStrengthController = this.gui.add(voronoi, "strength", 0, 10).name("V-Strength");
    this.voronoiEdgeWidthController = this.gui.add(voronoi, "edgeWidth", 0.1, 50).name("V-EdgeWidth");
    this.voronoiAttractionController = this.gui.add(voronoi, "attractionFactor", 0, 8).name("V-Attract");
    this.voronoiCellCountController = this.gui.add(voronoi, "cellCount", 1, 10, 1).name("V-CellCount").onChange(() => voronoi.regenerateCells());
    this.voronoiSpeedController = this.gui.add(voronoi, "cellMovementSpeed", 0, 4).name("V-CellSpeed");
    this.voronoiDecayRateController = this.gui.add(voronoi, "decayRate", 0.9, 1).name("V-Decay");
    this.voronoiBlendController = this.gui.add(voronoi, "velocityBlendFactor", 0, 1).name("V-ForceBlend");
  }

  getControlTargets() {
    const targets = {};

    if (this.voronoiStrengthController) targets["V-Strength"] = this.voronoiStrengthController;
    if (this.voronoiSpeedController) targets["V-CellSpeed"] = this.voronoiSpeedController;
    if (this.voronoiEdgeWidthController) targets["V-EdgeWidth"] = this.voronoiEdgeWidthController;
    if (this.voronoiAttractionController) targets["V-Attract"] = this.voronoiAttractionController;
    if (this.voronoiCellCountController) targets["V-CellCount"] = this.voronoiCellCountController;
    if (this.voronoiDecayRateController) targets["V-Decay"] = this.voronoiDecayRateController;

    return targets;
  }

  updateControllerDisplays() {

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
    console.log("VoronoiUi.setData called with:", data);

    // Handle "None" preset case
    if (!data || data === "None") {
      console.log("Resetting voronoi to default");

      // Properly reset using controllers
      this.voronoiStrengthController.setValue(0);
      // this.voronoiSpeedController.setValue(0);
      // this.voronoiEdgeWidthController.setValue(0);
      // this.voronoiAttractionController.setValue(0);
      // this.voronoiCellCountController.setValue(3);
      // this.main.voronoiField.regenerateCells();
      // this.voronoiDecayRateController.setValue(0.95);

      this.updateControllerDisplays();
      return true;
    }

    // Regular preset handling
    try {
      if (!data.controllers) {
        console.error("Invalid voronoi preset data: missing controllers");
        return false;
      }

      const controllerMap = {
        "V-Strength": this.voronoiStrengthController,
        "V-CellSpeed": this.voronoiSpeedController,
        "V-EdgeWidth": this.voronoiEdgeWidthController,
        "V-Attract": this.voronoiAttractionController,
        "V-CellCount": this.voronoiCellCountController,
        "V-Decay": this.voronoiDecayRateController,
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

      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying voronoi preset:", error);
      return false;
    }
  }
}
