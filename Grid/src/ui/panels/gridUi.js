import { BaseUi } from "../baseUi.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Grid");

    this.initGridControls();

    // Open GUI by default
    this.gui.open(true);

    // Debug state tracking
    this.debugSettings = { showBoundaryDebug: false };
  }

  // Add an update method to handle debug visualization state
  update(deltaTime) {
    // Check if debug visualization is active and needs to be redrawn
    if (this.debugSettings && this.debugSettings.showBoundaryDebug) {
      // We need to keep showing the debug view until user disables it
      if (this.main && this.main.renderer) {
        // Call the appropriate debug visualization function
        // This will depend on the implementation in GridGenRenderer
      }
    }
  }

  initGridControls() {
    const renderer = this.main.renderer;
    if (!renderer) return;

    // Grid parameters
    const gridParamFolder = this.gui.addFolder("Parameters");

    // Get current params from renderer
    const params = this.main.params;

    this.gridTargetCellsController = gridParamFolder
      .add(params, "target", 1, 800, 1)
      .name("Target Cells")
      .onChange(() => renderer.updateGrid(params));

    this.gridGapController = gridParamFolder
      .add(params, "gap", 0, 20, 1)
      .name("Gap (px)")
      .onChange(() => renderer.updateGrid(params));

    this.gridAspectRatioController = gridParamFolder
      .add(params, "aspectRatio", 0.5, 4, 0.01)
      .name("Cell Ratio")
      .onChange(() => renderer.updateGrid(params));

    this.gridScaleController = gridParamFolder
      .add(params, "scale", 0.1, 1.1, 0.001)
      .name("Grid Scale")
      .onChange(() => {
        renderer.boundary.setScale(params.scale);
        renderer.updateGrid(params);
      });

    // Boundary type selection
    const boundaryFolder = gridParamFolder.addFolder('Boundary Settings');

    // Add boundary type selector
    this.boundaryTypeController = boundaryFolder
      .add(params, "boundaryType", ['circular', 'rectangular'])
      .name("Boundary Type")
      .onChange((value) => {
        // Get current center coordinates
        const centerX = 120;
        const centerY = 120;

        // Update boundary based on type
        if (value === 'circular') {
          const radius = 120;
          // Create a new circular boundary
          const CircularBoundary = this.main.CircularBoundary;
          renderer.boundary = new CircularBoundary(centerX, centerY, radius, params.scale);
        } else {
          // Create a new rectangular boundary
          const RectangularBoundary = this.main.RectangularBoundary;
          renderer.boundary = new RectangularBoundary(
            centerX,
            centerY,
            params.boundaryParams.width,
            params.boundaryParams.height,
            params.scale
          );
        }

        // Update the grid with the new boundary
        renderer.updateGrid(params);
      });

    // Boundary parameters folder (for rectangular boundary)
    const boundaryParamsFolder = boundaryFolder.addFolder('Rectangular Size');

    // Width control
    this.boundaryWidthController = boundaryParamsFolder
      .add(params.boundaryParams, "width", 100, 300, 1)
      .name("Width")
      .onChange(() => {
        if (params.boundaryType === 'rectangular') {
          const RectangularBoundary = this.main.RectangularBoundary;
          renderer.boundary = new RectangularBoundary(
            120,
            120,
            params.boundaryParams.width,
            params.boundaryParams.height,
            params.scale
          );
          renderer.updateGrid(params);
        }
      });

    // Height control
    this.boundaryHeightController = boundaryParamsFolder
      .add(params.boundaryParams, "height", 100, 300, 1)
      .name("Height")
      .onChange(() => {
        if (params.boundaryType === 'rectangular') {
          const RectangularBoundary = this.main.RectangularBoundary;
          renderer.boundary = new RectangularBoundary(
            120,
            120,
            params.boundaryParams.width,
            params.boundaryParams.height,
            params.scale
          );
          renderer.updateGrid(params);
        }
      });

    // Add allowCut parameter
    this.gridAllowCutController = gridParamFolder
      .add(params, "allowCut", 0, 3, 1)
      .name("Allow Cut")
      .onChange(() => renderer.updateGrid(params));

    // Add tooltip for Allow Cut parameter
    this.gridAllowCutController.domElement.parentElement.setAttribute('title',
      'Controls how many corners of a cell can be outside the boundary. ' +
      '0 = strict (only cells with center inside), ' +
      '1-3 = progressively more cells at the boundary.');

    // Display Controls
    const displayFolder = gridParamFolder.addFolder("Display");

    // Display Mode
    this.displayModeController = displayFolder
      .add(params, "displayMode", ['all', 'inside', 'boundary', 'masked'])
      .name("Display Mode")
      .onChange(() => renderer.updateGrid(params));

    // Show cell centers
    this.gridShowCellCentersController = displayFolder
      .add(params, "showCellCenters")
      .name("Show Centers")
      .onChange(() => renderer.updateGrid(params));

    // Show cell indices
    this.gridShowIndicesController = displayFolder
      .add(params, "showIndices")
      .name("Show Indices")
      .onChange(() => renderer.updateGrid(params));

    // Show cell counts
    this.showCellCountsController = displayFolder
      .add(params, "showCellCounts")
      .name("Show Cell Counts")
      .onChange(() => renderer.updateGrid(params));

    // Color controls
    const colorFolder = gridParamFolder.addFolder("Colors");

    colorFolder
      .addColor(params.colors, "background")
      .name("Background")
      .onChange(() => renderer.updateGrid(params));

    colorFolder
      .addColor(params.colors, "insideCells")
      .name("Inside Cells")
      .onChange(() => renderer.updateGrid(params));

    colorFolder
      .addColor(params.colors, "boundaryCells")
      .name("Boundary Cells")
      .onChange(() => renderer.updateGrid(params));

    colorFolder
      .addColor(params.colors, "outsideCells")
      .name("Outside Cells")
      .onChange(() => renderer.updateGrid(params));

    colorFolder
      .addColor(params.colors, "indexText")
      .name("Index Text")
      .onChange(() => renderer.updateGrid(params));

    // Grid Stats
    const statsFolder = gridParamFolder.addFolder("Stats");

    this.colsController = statsFolder.add(params, "cols").name("Columns").listen();
    this.rowsController = statsFolder.add(params, "rows").name("Rows").listen();
    this.widthController = statsFolder.add(params, "width").name("Cell Width").listen();
    this.heightController = statsFolder.add(params, "height").name("Cell Height").listen();

    // Add cell counts
    this.totalCellsController = statsFolder.add(params.cellCount, "total").name("Total Cells").listen();
    this.insideCellsController = statsFolder.add(params.cellCount, "inside").name("Inside Cells").listen();
    this.boundaryCellsController = statsFolder.add(params.cellCount, "boundary").name("Boundary Cells").listen();
  }

  getControlTargets() {
    const targets = {};

    // Grid controls
    if (this.gridTargetCellsController)
      targets["Target Cells"] = this.gridTargetCellsController;
    if (this.gridGapController)
      targets["Grid Gap"] = this.gridGapController;
    if (this.gridAspectRatioController)
      targets["Cell Ratio"] = this.gridAspectRatioController;
    if (this.gridScaleController)
      targets["Grid Scale"] = this.gridScaleController;
    if (this.gridAllowCutController)
      targets["Allow Cut"] = this.gridAllowCutController;
    if (this.gridShowCellCentersController)
      targets["Show Centers"] = this.gridShowCellCentersController;
    if (this.gridShowIndicesController)
      targets["Show Indices"] = this.gridShowIndicesController;
    if (this.boundaryTypeController)
      targets["Boundary Type"] = this.boundaryTypeController;

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
    safeUpdateDisplay(this.gridAllowCutController);
    safeUpdateDisplay(this.gridShowCellCentersController);
    safeUpdateDisplay(this.gridShowIndicesController);
    safeUpdateDisplay(this.boundaryTypeController);
    safeUpdateDisplay(this.boundaryWidthController);
    safeUpdateDisplay(this.boundaryHeightController);
    safeUpdateDisplay(this.displayModeController);

    // Update stats
    safeUpdateDisplay(this.colsController);
    safeUpdateDisplay(this.rowsController);
    safeUpdateDisplay(this.widthController);
    safeUpdateDisplay(this.heightController);
    safeUpdateDisplay(this.totalCellsController);
    safeUpdateDisplay(this.insideCellsController);
    safeUpdateDisplay(this.boundaryCellsController);
  }
}
