import { BaseUi } from "../baseUi.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Grid");

    this.initGridControls();

    // Open GUI by default
    this.gui.open(false);
  }

  initGridControls() {
    const gridRenderer = this.main.gridRenderer;
    if (!gridRenderer) return;

    const gradient = this.main.gridRenderer.gradient;

    // Add theme selector at the top level
    const presetOptions = {};
    gradient.getPresetNames().forEach((name) => {
      presetOptions[name] = name;
    });

    this.themeController = this.gui
      .add({ theme: gradient.getCurrentPreset() }, "theme", presetOptions)
      .name("Theme")
      .onChange((presetName) => {
        // Apply the preset
        gradient.applyPreset(presetName);
      });

    // Grid parameters
    if (gridRenderer.gridParams) {
      const gridParamFolder = this.gui.addFolder("Parameters");

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

    // Update theme controller
    safeUpdateDisplay(this.themeController);

    // Update grid controllers
    safeUpdateDisplay(this.gridTargetCellsController);
    safeUpdateDisplay(this.gridGapController);
    safeUpdateDisplay(this.gridAspectRatioController);
    safeUpdateDisplay(this.gridScaleController);
  }
}
