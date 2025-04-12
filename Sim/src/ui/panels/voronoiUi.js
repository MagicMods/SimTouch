import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";
import { eventBus } from '../../util/eventManager.js';

export class VoronoiUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = null;
    this.gui.title("Voronoi Field");
    this.initVoronoiControls();
    this.gui.open(false);
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
    const voronoiParams = this.main.simParams.voronoi;
    const voronoiField = this.main.voronoiField;

    this.voronoiStrengthController = this.gui.add(voronoiParams, "strength", 0, 10).name("V-Strength")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.strength', value }));

    this.voronoiEdgeWidthController = this.gui.add(voronoiParams, "edgeWidth", 0.01, 3, 0.01).name("V-EdgeWidth")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.edgeWidth', value }));

    this.voronoiAttractionController = this.gui.add(voronoiParams, "attractionFactor", 0, 8).name("V-Attract")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.attractionFactor', value }));

    this.voronoiCellCountController = this.gui.add(voronoiParams, "cellCount", 1, 10, 1).name("V-CellCount")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.cellCount', value }));

    this.voronoiSpeedController = this.gui.add(voronoiParams, "cellMovementSpeed", 0, 4).name("V-CellSpeed")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.cellMovementSpeed', value }));

    this.voronoiDecayRateController = this.gui.add(voronoiParams, "decayRate", 0.1, 1).name("V-Decay")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.decayRate', value }));

    this.voronoiBlendController = this.gui.add(voronoiParams, "velocityBlendFactor", 0, 1).name("V-ForceBlend")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.velocityBlendFactor', value }));

    this.voronoiPullModeController = this.gui.add(voronoiParams, "pullMode").name("V-Pull Mode")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'voronoi.pullMode', value }));
  }

  getControlTargets() {
    const targets = {};
    if (this.voronoiStrengthController) targets["V-Strength"] = this.voronoiStrengthController;
    if (this.voronoiSpeedController) targets["V-CellSpeed"] = this.voronoiSpeedController;
    if (this.voronoiEdgeWidthController) targets["V-EdgeWidth"] = this.voronoiEdgeWidthController;
    if (this.voronoiAttractionController) targets["V-Attract"] = this.voronoiAttractionController;
    if (this.voronoiCellCountController) targets["V-CellCount"] = this.voronoiCellCountController;
    if (this.voronoiDecayRateController) targets["V-Decay"] = this.voronoiDecayRateController;
    if (this.voronoiPullModeController) targets["V-Pull Mode"] = this.voronoiPullModeController;

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
    safeUpdateDisplay(this.voronoiPullModeController);
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

      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying voronoi preset:", error);
      return false;
    }
  }
}
