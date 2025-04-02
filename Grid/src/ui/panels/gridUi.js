import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Grid");

    // Initialize preset manager
    this.presetManager = new PresetManager({
      gridUi: this
    });

    // Create preset controls in the Grid folder
    const containerElement = this.gui.domElement.querySelector(".children");
    if (containerElement) {
      this.presetManager.createPresetControls(
        PresetManager.TYPES.GRID,
        containerElement,
        { title: "Preset", insertFirst: true }
      );
    }

    // Initialize the UI in a single method
    this.initGridControls();

    // Load default preset
    this.presetManager.loadPreset(PresetManager.TYPES.GRID, "Default");

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

  // Add preset interface methods
  getData() {
    const controllers = this.getControlTargets();
    const values = {};

    Object.entries(controllers).forEach(([name, controller]) => {
      values[name] = controller.getValue();
    });

    return {
      controllers: values
    };
  }

  setData(data) {
    if (!data || !data.controllers) return false;

    // Apply each controller value
    Object.entries(data.controllers).forEach(([name, value]) => {
      const controller = this.getControlTargets()[name];
      if (controller) {
        controller.setValue(value);
      }
    });

    return true;
  }

  // Initialize grid configuration controls
  initGridControls() {
    const renderer = this.main.renderer;
    if (!renderer) return;

    // Create main folders in a logical hierarchy
    const screenFolder = this.gui.addFolder("1. Screen Configuration");
    const gridParamFolder = this.gui.addFolder("2. Grid Parameters");
    const displayFolder = this.gui.addFolder("3. Display Options");

    // Add stats folder at the end
    const statsFolder = this.gui.addFolder("4. Grid Statistics");

    // --- SCREEN CONFIGURATION ---

    // Add physical dimension controls
    const physicalDimensionsFolder = screenFolder.addFolder("Physical Dimensions");

    // Add boundary type selector to physical dimensions
    this.boundaryTypeController = physicalDimensionsFolder
      .add(this.main.params, "boundaryType", ['circular', 'rectangular'])
      .name("Screen Shape")
      .onChange((value) => {
        // Update shape parameter
        this.main.params.shape = value;

        // Update canvas border-radius based on boundary type
        const canvas = document.getElementById("glCanvas");
        if (value === 'circular') {
          // Set circular visual style
          canvas.style.borderRadius = '50%';

          // Get canvas dimensions
          const canvasDims = this.main.getCanvasDimensions();
          const centerX = canvasDims.centerX;
          const centerY = canvasDims.centerY;

          // Create circular boundary
          const radius = Math.min(this.main.params.physicalWidth, this.main.params.physicalHeight) / 2;
          const scaledRadius = centerX; // Center point for visual representation
          renderer.boundary = new this.main.CircularBoundary(centerX, centerY, scaledRadius, this.main.params.scale);
        } else {
          // Set rectangular visual style
          canvas.style.borderRadius = '1%';

          // Get canvas dimensions
          const canvasDims = this.main.getCanvasDimensions();
          const centerX = canvasDims.centerX;
          const centerY = canvasDims.centerY;

          // Create rectangular boundary
          renderer.boundary = new this.main.RectangularBoundary(
            centerX,
            centerY,
            this.main.params.physicalWidth,
            this.main.params.physicalHeight,
            this.main.params.scale
          );
        }

        // Update canvas dimensions based on the new boundary type
        this.main.updateCanvasDimensions();

        // Update the grid with the new boundary
        renderer.updateGrid(this.main.params);
      });

    // Add physical width controller
    this.physicalWidthController = physicalDimensionsFolder
      .add(this.main.params, "physicalWidth", 120, 1000, 1)
      .name("Width (px)")
      .onChange((value) => {
        // Update params
        this.main.params.physicalWidth = value;

        // If rectangular boundary, update boundary params
        if (this.main.params.boundaryType === 'rectangular') {
          this.main.params.boundaryParams.width = value;
        }

        // Update canvas dimensions
        this.main.updateCanvasDimensions();

        // Update grid
        renderer.updateGrid(this.main.params);
      });

    // Add physical height controller
    this.physicalHeightController = physicalDimensionsFolder
      .add(this.main.params, "physicalHeight", 120, 1000, 1)
      .name("Height (px)")
      .onChange((value) => {
        // Update params
        this.main.params.physicalHeight = value;

        // If rectangular boundary, update boundary params
        if (this.main.params.boundaryType === 'rectangular') {
          this.main.params.boundaryParams.height = value;
        }

        // Update canvas dimensions
        this.main.updateCanvasDimensions();

        // Update grid
        renderer.updateGrid(this.main.params);
      });

    // Add center offset controls - important to keep!
    const offsetFolder = screenFolder.addFolder('Center Offset');

    // X offset control
    this.centerOffsetXController = offsetFolder
      .add(this.main.params, "centerOffsetX", -60, 60, 1)
      .name("X Offset")
      .onChange(() => renderer.updateGrid(this.main.params));

    // Y offset control
    this.centerOffsetYController = offsetFolder
      .add(this.main.params, "centerOffsetY", -60, 60, 1)
      .name("Y Offset")
      .onChange(() => renderer.updateGrid(this.main.params));

    // --- GRID PARAMETERS ---

    // Get current params from renderer
    const params = this.main.params;

    // Remove preset controls from here since they're now at the root level
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
      .add(params, "scale", 0.8, 1, 0.001)
      .name("Grid Scale")
      .onChange(() => {
        renderer.boundary.setScale(params.scale);
        renderer.updateGrid(params);
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

    // --- DISPLAY OPTIONS ---

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
      .name("Show Cell Info")
      .onChange(() => renderer.updateGrid(params));

    // Color controls
    const colorFolder = displayFolder.addFolder("Colors");

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

    // --- STATISTICS ---

    this.colsController = statsFolder.add(params, "cols").name("Columns").listen();
    this.rowsController = statsFolder.add(params, "rows").name("Rows").listen();

    // These should show the PHYSICAL dimensions
    if (params.physicalWidth) {
      this.widthController = statsFolder.add(params, "physicalWidth").name("Cell Width (px)").listen();
    } else {
      this.widthController = statsFolder.add(params, "width").name("Cell Width (px)").listen();
    }

    if (params.physicalHeight) {
      this.heightController = statsFolder.add(params, "physicalHeight").name("Cell Height (px)").listen();
    } else {
      this.heightController = statsFolder.add(params, "height").name("Cell Height (px)").listen();
    }

    // Add cell counts
    this.totalCellsController = statsFolder.add(params.cellCount, "total").name("Total Cells").listen();
    this.insideCellsController = statsFolder.add(params.cellCount, "inside").name("Inside Cells").listen();
    this.boundaryCellsController = statsFolder.add(params.cellCount, "boundary").name("Boundary Cells").listen();
  }

  getControlTargets() {
    const targets = {};

    // Screen configuration controls
    if (this.physicalWidthController)
      targets["Screen Width"] = this.physicalWidthController;
    if (this.physicalHeightController)
      targets["Screen Height"] = this.physicalHeightController;
    if (this.boundaryTypeController)
      targets["Screen Shape"] = this.boundaryTypeController;
    if (this.centerOffsetXController)
      targets["Center X Offset"] = this.centerOffsetXController;
    if (this.centerOffsetYController)
      targets["Center Y Offset"] = this.centerOffsetYController;

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
    if (this.displayModeController)
      targets["Display Mode"] = this.displayModeController;

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

    // Update screen configuration controllers
    safeUpdateDisplay(this.physicalWidthController);
    safeUpdateDisplay(this.physicalHeightController);
    safeUpdateDisplay(this.boundaryTypeController);
    safeUpdateDisplay(this.centerOffsetXController);
    safeUpdateDisplay(this.centerOffsetYController);

    // Update grid controllers
    safeUpdateDisplay(this.gridTargetCellsController);
    safeUpdateDisplay(this.gridGapController);
    safeUpdateDisplay(this.gridAspectRatioController);
    safeUpdateDisplay(this.gridScaleController);
    safeUpdateDisplay(this.gridAllowCutController);
    safeUpdateDisplay(this.gridShowCellCentersController);
    safeUpdateDisplay(this.gridShowIndicesController);
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
