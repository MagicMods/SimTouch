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
    const screenFolder = this.gui.addFolder("Screen Configuration");
    const gridParamFolder = this.gui.addFolder("Grid Parameters");
    const displayFolder = this.gui.addFolder("Display Options");

    // Add stats folder at the end
    const statsFolder = this.gui.addFolder("4. Grid Statistics");

    // --- SCREEN CONFIGURATION ---

    // Add physical dimension controls
    const physicalDimensionsFolder = screenFolder.addFolder("Physical Dimensions");

    // Add boundary type selector to physical dimensions
    this.boundaryTypeController = physicalDimensionsFolder
      .add(this.main.params, "boundaryType", { Round: 'circular', Rectangular: 'rectangular' })
      .name("Screen Shape")
      .onChange((value) => {
        // Store current physical dimensions before changing anything
        // This ensures we don't lose the values during transition
        const currentWidth = this.main.params.physicalWidth;
        const currentHeight = this.main.params.physicalHeight;

        // Log original values for debugging
        console.log("Shape change - Original dimensions:", { width: currentWidth, height: currentHeight });

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

          // Ensure we use the current width as the diameter (or use a sensible default)
          const diameter = Math.max(currentWidth, 120);

          // Make sure both dimensions are set to the diameter value
          this.main.params.physicalWidth = diameter;
          this.main.params.physicalHeight = diameter;

          // Set the diameter value on the controller
          this.diameterController.setValue(diameter);

          // Create circular boundary
          const radius = Math.min(canvasDims.width, canvasDims.height) / 2;
          const scaledRadius = centerX; // Center point for visual representation
          renderer.boundary = new this.main.CircularBoundary(centerX, centerY, scaledRadius, this.main.params.scale);

          // Show diameter slider and hide width/height sliders
          this.diameterController.show();
          this.physicalWidthController.hide();
          this.physicalHeightController.hide();

          console.log("Changed to Round - New dimensions:", { diameter: diameter });
        } else {
          // Set rectangular visual style
          canvas.style.borderRadius = '1%';

          // Get canvas dimensions
          const canvasDims = this.main.getCanvasDimensions();
          const centerX = canvasDims.centerX;
          const centerY = canvasDims.centerY;

          // When switching to rectangular, use the original values or defaults
          // If coming from circular, use the diameter for both or use defaults
          const width = Math.max(currentWidth, 120);
          const height = Math.max(currentHeight, 120);

          // Set physical dimensions
          this.main.params.physicalWidth = width;
          this.main.params.physicalHeight = height;

          // Update UI controllers to match
          this.physicalWidthController.setValue(width);
          this.physicalHeightController.setValue(height);

          // Create rectangular boundary with the proper dimensions
          renderer.boundary = new this.main.RectangularBoundary(
            centerX,
            centerY,
            this.main.params.physicalWidth,
            this.main.params.physicalHeight,
            this.main.params.scale
          );

          // Hide diameter slider and show width/height sliders
          this.diameterController.hide();
          this.physicalWidthController.show();
          this.physicalHeightController.show();

          console.log("Changed to Rectangular - New dimensions:", { width: width, height: height });
        }

        // Update canvas dimensions based on the new boundary type
        this.main.updateCanvasDimensions();

        // Update the grid with the new boundary
        renderer.updateGrid(this.main.params);
      });

    // Add diameter controller for round screens
    this.diameterController = physicalDimensionsFolder
      .add(this.main.params, "physicalWidth", 120, 1000, 1)
      .name("Diameter (px)")
      .onChange((value) => {
        // Ensure value is a reasonable number to prevent reset issues
        value = Math.max(120, Math.min(1000, value));

        // Update both width and height to the same value
        this.main.params.physicalWidth = value;
        this.main.params.physicalHeight = value;

        // Update canvas dimensions
        this.main.updateCanvasDimensions();

        // Update grid
        renderer.updateGrid(this.main.params);
      });

    // Add a listener for manual input to prevent reset issues
    const diameterDomElement = this.diameterController.domElement.querySelector('input');
    if (diameterDomElement) {
      diameterDomElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const value = parseInt(diameterDomElement.value, 10);
          if (!isNaN(value)) {
            // Apply the value properly when Enter is pressed
            const clampedValue = Math.max(120, Math.min(1000, value));

            // Direct update of params to ensure values are properly set
            this.main.params.physicalWidth = clampedValue;
            this.main.params.physicalHeight = clampedValue;

            // Update the controller value (will trigger the onChange event)
            this.diameterController.setValue(clampedValue);

            // Prevent the default dat.gui behavior that might reset the value
            e.preventDefault();
            e.stopPropagation();
          }
        }
      });
    }

    // Add physical width controller for rectangular screens
    this.physicalWidthController = physicalDimensionsFolder
      .add(this.main.params, "physicalWidth", 120, 1000, 1)
      .name("Width (px)")
      .onChange((value) => {
        // Ensure value is a reasonable number
        value = Math.max(120, Math.min(1000, value));

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

    // Add manual input handler for width
    const widthDomElement = this.physicalWidthController.domElement.querySelector('input');
    if (widthDomElement) {
      widthDomElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const value = parseInt(widthDomElement.value, 10);
          if (!isNaN(value)) {
            const clampedValue = Math.max(120, Math.min(1000, value));
            this.main.params.physicalWidth = clampedValue;
            this.physicalWidthController.setValue(clampedValue);
            e.preventDefault();
            e.stopPropagation();
          }
        }
      });
    }

    // Add physical height controller for rectangular screens
    this.physicalHeightController = physicalDimensionsFolder
      .add(this.main.params, "physicalHeight", 120, 1000, 1)
      .name("Height (px)")
      .onChange((value) => {
        // Ensure value is a reasonable number
        value = Math.max(120, Math.min(1000, value));

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

    // Add manual input handler for height
    const heightDomElement = this.physicalHeightController.domElement.querySelector('input');
    if (heightDomElement) {
      heightDomElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const value = parseInt(heightDomElement.value, 10);
          if (!isNaN(value)) {
            const clampedValue = Math.max(120, Math.min(1000, value));
            this.main.params.physicalHeight = clampedValue;
            this.physicalHeightController.setValue(clampedValue);
            e.preventDefault();
            e.stopPropagation();
          }
        }
      });
    }

    // Initially show/hide the appropriate controllers based on the current shape
    if (this.main.params.boundaryType === 'circular') {
      // Make sure diameter is properly set to match current dimensions
      this.diameterController.setValue(this.main.params.physicalWidth);
      this.diameterController.show();
      this.physicalWidthController.hide();
      this.physicalHeightController.hide();
    } else {
      this.diameterController.hide();
      this.physicalWidthController.show();
      this.physicalHeightController.show();
    }

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

    // Fix the stats display to show consistent physical cell dimensions
    // Create new properties for cell dimensions if needed
    if (!params.calculatedCellWidth) params.calculatedCellWidth = params.physicalWidth || 0;
    if (!params.calculatedCellHeight) params.calculatedCellHeight = params.physicalHeight || 0;

    // Use dedicated properties for cell dimensions
    this.cellWidthController = statsFolder
      .add(params, "calculatedCellWidth")
      .name("Cell Width (px)")
      .listen();

    this.cellHeightController = statsFolder
      .add(params, "calculatedCellHeight")
      .name("Cell Height (px)")
      .listen();

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
    if (this.diameterController)
      targets["Screen Diameter"] = this.diameterController;
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
    safeUpdateDisplay(this.diameterController);
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
    safeUpdateDisplay(this.cellWidthController);
    safeUpdateDisplay(this.cellHeightController);
    safeUpdateDisplay(this.totalCellsController);
    safeUpdateDisplay(this.insideCellsController);
    safeUpdateDisplay(this.boundaryCellsController);
  }
}
