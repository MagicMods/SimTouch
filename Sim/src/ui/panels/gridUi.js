import { BaseUi } from "../baseUi.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Grid");

    // Create the main folder
    this.gridFolder = this.createFolder("Grid Controls");
    this.gradientPointControllers = [];
    this.initGridControls();

    // Open GUI by default
    this.gui.open();
    this.gridFolder.open();
  }

  initGridControls() {
    const gridRenderer = this.main.gridRenderer;
    if (!gridRenderer) return;

    // Grid parameters
    if (gridRenderer.gridParams) {
      const gridParamFolder = this.gridFolder.addFolder("Parameters");

      this.gridTargetCellsController = gridParamFolder
        .add(gridRenderer.gridParams, "target", 1, 800, 1)
        .name("Target Cells")
        .onChange(() => gridRenderer.updateGrid());

      this.gridGapController = gridParamFolder
        .add(gridRenderer.gridParams, "gap", 0, 20, 1)
        .name("Gap (px)")
        .onChange(() => gridRenderer.updateGrid());

      this.gridAspectRatioController = gridParamFolder
        .add(gridRenderer.gridParams, "aspectRatio", 0.5, 4, 0.01)
        .name("Cell Ratio")
        .onChange(() => gridRenderer.updateGrid());

      this.gridScaleController = gridParamFolder
        .add(gridRenderer.gridParams, "scale", 0.1, 1, 0.01)
        .name("Grid Scale")
        .onChange(() => gridRenderer.updateGrid());

      // Grid Stats
      const stats = gridParamFolder.addFolder("Stats");
      stats.add(gridRenderer.gridParams, "cols").name("Columns").listen();
      stats.add(gridRenderer.gridParams, "rows").name("Rows").listen();
      stats.add(gridRenderer.gridParams, "width").name("Rect Width").listen();
      stats.add(gridRenderer.gridParams, "height").name("Rect Height").listen();
    }

    // Gradient controls - store in arrays if needed
    const gradientFolder = this.gridFolder.addFolder("Gradient");
    const gradientPoints = this.main.gridRenderer.gradient.points;

    gradientPoints.forEach((point, index) => {
      const pointFolder = gradientFolder.addFolder(`Point ${index + 1}`);
      const posController = pointFolder
        .add(point, "pos", 0, 100, 1)
        .name("Position")
        .onChange(() => this.main.gridRenderer.gradient.update());

      const colorController = pointFolder
        .addColor(point, "color")
        .name("Color")
        .onChange(() => this.main.gridRenderer.gradient.update());

      this.gradientPointControllers.push({
        position: posController,
        color: colorController,
      });
    });
  }

  getControlTargets() {
    const targets = {};

    // Grid controls
    if (this.gridTargetCellsController)
      targets["Target Cells"] = this.gridTargetCellsController;
    if (this.gridGapController) targets["Grid Gap"] = this.gridGapController;
    if (this.gridScaleController)
      targets["Grid Scale"] = this.gridScaleController;

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

    // Update grid controllers
    safeUpdateDisplay(this.gridTargetCellsController);
    safeUpdateDisplay(this.gridGapController);
    safeUpdateDisplay(this.gridAspectRatioController);
    safeUpdateDisplay(this.gridScaleController);

    // Update gradient controllers
    this.gradientPointControllers.forEach((controllers) => {
      safeUpdateDisplay(controllers.position);
      safeUpdateDisplay(controllers.color);
    });
  }
}
