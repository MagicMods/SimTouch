import { BaseUi } from "../baseUi.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Grid");

    this.initGridControls();

    // Open GUI by default
    this.gui.open(false);

    // Debug state tracking
    this.debugSettings = { showBoundaryDebug: false };
    this.isNormalViewPaused = false;
  }

  // Add an update method to handle debug visualization state
  update(deltaTime) {
    // Check if debug visualization is active and needs to be redrawn
    if (this.debugSettings && this.debugSettings.showBoundaryDebug) {
      // We need to keep showing the debug view until user disables it
      if (this.main && this.main.gridRenderer) {
        this.main.gridRenderer.drawDebugBoundary();
      }
    }
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
        .add(gridRenderer.gridParams, "scale", 0.1, 1.1, 0.001)
        .name("Grid Scale")
        .onChange(() => gridRenderer.updateGrid());

      // Add allowCut parameter
      this.gridAllowCutController = gridParamFolder
        .add(gridRenderer.gridParams, "allowCut", 0, 3, 1)
        .name("Allow Cut")
        .onChange(() => gridRenderer.updateGrid());

      // Add tooltip for Allow Cut parameter
      this.gridAllowCutController.domElement.parentElement.setAttribute('title',
        'Controls how many corners of a cell can be outside the circle. ' +
        '0 = strict (only cells with center inside circle), ' +
        '1-3 = progressively more cells at the boundary. ' +
        'Use "Visualize Boundary" in Debug Tools to see the effect.');

      // Add cell centers parameter
      this.gridShowCellCentersController = gridParamFolder
        .add(gridRenderer.gridParams, "showCellCenters")
        .name("Show Cell Centers")
        .onChange(() => gridRenderer.updateGrid());

      // Add cell indices parameter  
      this.gridShowIndicesController = gridParamFolder
        .add(gridRenderer.gridParams, "showIndices")
        .name("Show Cell Indices")
        .onChange(() => gridRenderer.updateGrid());

      // Add shadow controls
      const shadowFolder = gridParamFolder.addFolder("Shadow");

      // Basic shadow controls
      this.shadowIntensityController = shadowFolder
        .add(gridRenderer.gridParams, "shadowIntensity", 0, 1, 0.01)
        .name("Intensity")
        .onChange(() => gridRenderer.updateGrid());

      this.shadowThresholdController = shadowFolder
        .add(gridRenderer.gridParams, "shadowThreshold", 0, 0.5, 0.01)
        .name("Threshold")
        .onChange(() => gridRenderer.updateGrid());


      this.blurAmountController = shadowFolder
        .add(gridRenderer.gridParams, "blurAmount", 0, 1, 0.01)
        .name("Blur")
        .onChange(() => gridRenderer.updateGrid());

      // Add tooltips for shadow controls
      this.shadowIntensityController.domElement.parentElement.setAttribute('title',
        'Controls the overall strength of the shadow effect');

      this.shadowThresholdController.domElement.parentElement.setAttribute('title',
        'Distance from the edge where the shadow begins (0 = edge, 0.5 = center)');

      this.blurAmountController.domElement.parentElement.setAttribute('title',
        'Controls how soft the shadow edge is (0 = sharp, 1 = soft)');

      // Grid Stats
      const stats = gridParamFolder.addFolder("Stats");
      stats.add(gridRenderer.gridParams, "cols").name("Columns").listen();
      stats.add(gridRenderer.gridParams, "rows").name("Rows").listen();
      stats.add(gridRenderer.gridParams, "width").name("Rect Width").listen();
      stats.add(gridRenderer.gridParams, "height").name("Rect Height").listen();

      // Add debug tools for allowCut visualization
      const debugFolder = gridParamFolder.addFolder("Debug Tools");
      this.debugSettings = { showBoundaryDebug: false };

      debugFolder
        .add(this.debugSettings, "showBoundaryDebug")
        .name("Visualize Boundary")
        .onChange((value) => {
          if (value) {
            // Show boundary debug view
            this.isNormalViewPaused = this.main.paused;
            if (!this.isNormalViewPaused) {
              // Pause simulation while in debug view
              this.main.paused = true;
            }
            gridRenderer.drawDebugBoundary();
          } else {
            // Restore normal view
            if (!this.isNormalViewPaused) {
              this.main.paused = false;
            }
          }
        });
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
    if (this.gridAllowCutController)
      targets["Allow Cut"] = this.gridAllowCutController;
    if (this.gridShowCellCentersController)
      targets["Show Centers"] = this.gridShowCellCentersController;
    if (this.gridShowIndicesController)
      targets["Show Indices"] = this.gridShowIndicesController;

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
    safeUpdateDisplay(this.gridAllowCutController);
    safeUpdateDisplay(this.gridShowCellCentersController);
    safeUpdateDisplay(this.gridShowIndicesController);

    // Update shadow controllers
    safeUpdateDisplay(this.shadowIntensityController);
    safeUpdateDisplay(this.shadowThresholdController);
    safeUpdateDisplay(this.blurAmountController);
  }
}
