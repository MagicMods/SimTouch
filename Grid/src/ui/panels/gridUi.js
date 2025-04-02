import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Grid");

    // Simple dimension storage with direct properties
    this.savedDiameter = this.main.params.physicalWidth || 240;
    this.savedWidth = this.main.params.physicalWidth || 240;
    this.savedHeight = this.main.params.physicalHeight || 240;

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

    // Update saved values directly
    if (this.main.params.boundaryType === 'circular') {
      this.savedDiameter = this.main.params.physicalWidth;
      console.log("Updated saved diameter from preset:", this.savedDiameter);
    } else {
      this.savedWidth = this.main.params.physicalWidth;
      this.savedHeight = this.main.params.physicalHeight;
      console.log("Updated saved width/height from preset:",
        this.savedWidth, this.savedHeight);
    }

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
        // Store current dimensions before changing
        if (this.main.params.boundaryType === 'circular') {
          this.savedDiameter = this.main.params.physicalWidth;
          console.log("Saving diameter:", this.savedDiameter);
        } else {
          this.savedWidth = this.main.params.physicalWidth;
          this.savedHeight = this.main.params.physicalHeight;
          console.log("Saving width/height:", this.savedWidth, this.savedHeight);
        }

        // Clear cached rectangles in renderer to force full recalculation
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to shape change");
        }

        // Preserve current offsets
        const centerOffsetX = this.main.params.centerOffsetX || 0;
        const centerOffsetY = this.main.params.centerOffsetY || 0;

        // Ensure we have valid saved values to work with
        this.savedDiameter = Math.max(120, this.savedDiameter || 240);
        this.savedWidth = Math.max(120, this.savedWidth || 240);
        this.savedHeight = Math.max(120, this.savedHeight || 240);

        // Update shape parameter
        this.main.params.shape = value;
        this.main.params.boundaryType = value;

        // Update canvas border-radius based on boundary type
        const canvas = document.getElementById("glCanvas");

        // Make sure boundary params are initialized
        if (!this.main.params.boundaryParams) {
          this.main.params.boundaryParams = {
            width: this.savedWidth,
            height: this.savedHeight
          };
        }

        console.log("Switching shape from",
          this.main.params.boundaryType === 'circular' ? 'Round' : 'Rectangular',
          "to",
          value === 'circular' ? 'Round' : 'Rectangular',
          "with offsets:",
          { x: centerOffsetX, y: centerOffsetY }
        );

        if (value === 'circular') {
          // Set circular visual style
          canvas.style.borderRadius = '50%';

          // Get canvas dimensions
          const canvasDims = this.main.getCanvasDimensions();

          // Apply the current offsets to center
          const centerX = canvasDims.centerX + centerOffsetX;
          const centerY = canvasDims.centerY + centerOffsetY;

          // Set dimensions using saved diameter
          this.main.params.physicalWidth = this.savedDiameter;
          this.main.params.physicalHeight = this.savedDiameter;

          // Update boundary params to match
          this.main.params.boundaryParams.width = this.savedDiameter;
          this.main.params.boundaryParams.height = this.savedDiameter;

          // Update controller value
          this.diameterController.setValue(this.savedDiameter);

          // Create circular boundary with preserved offset
          const radius = Math.min(canvasDims.width, canvasDims.height) / 2;
          const scaledRadius = centerX - centerOffsetX; // Use base center for radius
          renderer.boundary = new this.main.CircularBoundary(centerX, centerY, scaledRadius, this.main.params.scale);

          // Show/hide appropriate controls
          this.diameterController.show();
          this.physicalWidthController.hide();
          this.physicalHeightController.hide();

          console.log("Changed to Round - Diameter:", this.savedDiameter, "Center:", { x: centerX, y: centerY });
        } else {
          // Set rectangular visual style
          canvas.style.borderRadius = '1%';

          // Get canvas dimensions
          const canvasDims = this.main.getCanvasDimensions();

          // Apply the current offsets to center
          const centerX = canvasDims.centerX + centerOffsetX;
          const centerY = canvasDims.centerY + centerOffsetY;

          // Set dimensions using saved width/height
          this.main.params.physicalWidth = this.savedWidth;
          this.main.params.physicalHeight = this.savedHeight;

          // Update boundary params to match
          this.main.params.boundaryParams.width = this.savedWidth;
          this.main.params.boundaryParams.height = this.savedHeight;

          // Update controller values
          this.physicalWidthController.setValue(this.savedWidth);
          this.physicalHeightController.setValue(this.savedHeight);

          // Create rectangular boundary with properly scaled dimensions and preserved offset
          const renderScale = this.main.getRenderScale();
          const visualWidth = this.savedWidth * renderScale;
          const visualHeight = this.savedHeight * renderScale;

          renderer.boundary = new this.main.RectangularBoundary(
            centerX,
            centerY,
            visualWidth,
            visualHeight,
            this.main.params.scale
          );

          // Show/hide appropriate controls
          this.diameterController.hide();
          this.physicalWidthController.show();
          this.physicalHeightController.show();

          console.log("Changed to Rectangular - Width/Height:", this.savedWidth, this.savedHeight, "Center:", { x: centerX, y: centerY });
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
      .onFinishChange((value) => { this.savedDiameter = value; })
      .onChange((value) => {
        // Update both width and height to the same value
        this.main.params.physicalWidth = value;
        this.main.params.physicalHeight = value;

        // Clear cached rectangles in renderer to force full recalculation
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to diameter change");
        }

        // Preserve current center offsets
        const centerOffsetX = this.main.params.centerOffsetX || 0;
        const centerOffsetY = this.main.params.centerOffsetY || 0;

        // Update boundary params if needed
        if (!this.main.params.boundaryParams) {
          this.main.params.boundaryParams = {};
        }
        this.main.params.boundaryParams.width = value;
        this.main.params.boundaryParams.height = value;

        // Get new canvas dimensions
        const canvasDims = this.main.getCanvasDimensions();

        // If boundary exists, update its center with preserved offsets
        if (renderer.boundary) {
          const centerX = canvasDims.centerX + centerOffsetX;
          const centerY = canvasDims.centerY + centerOffsetY;
          renderer.boundary.centerX = centerX;
          renderer.boundary.centerY = centerY;

          console.log("Updated boundary center after diameter change:", {
            canvasCenter: { x: canvasDims.centerX, y: canvasDims.centerY },
            offset: { x: centerOffsetX, y: centerOffsetY },
            newCenter: { x: centerX, y: centerY }
          });
        }

        // Update canvas dimensions AFTER updating the boundary
        this.main.updateCanvasDimensions();

        // Update grid with preserved offsets
        renderer.updateGrid(this.main.params);
      });

    // Fix manual entry for diameter
    const fixManualInput = (inputElement, controller, property, savedProperty) => {
      inputElement.addEventListener('change', (e) => {
        const value = parseInt(inputElement.value, 10);
        if (!isNaN(value) && value >= 120 && value <= 1000) {
          this.main.params[property] = value;
          this[savedProperty] = value;

          // For diameter, keep height in sync
          if (property === "physicalWidth" && this.main.params.boundaryType === 'circular') {
            this.main.params.physicalHeight = value;
          }

          // Update the grid
          this.main.updateCanvasDimensions();
          renderer.updateGrid(this.main.params);
        }
      });
    };

    // Add direct input handling for diameter
    const diameterInput = this.diameterController.domElement.querySelector('input');
    if (diameterInput) {
      fixManualInput(diameterInput, this.diameterController, "physicalWidth", "savedDiameter");
    }

    // Add width controller for rectangular screens
    this.physicalWidthController = physicalDimensionsFolder
      .add(this.main.params, "physicalWidth", 120, 1000, 1)
      .name("Width (px)")
      .onFinishChange((value) => { this.savedWidth = value; })
      .onChange((value) => {
        // Make sure we have a valid value
        if (value < 120) value = 120;
        if (value > 1000) value = 1000;

        // Keep track of the original values for debugging
        const original = {
          width: this.main.params.physicalWidth,
          height: this.main.params.physicalHeight
        };

        // Update params
        this.main.params.physicalWidth = value;

        // Clear cached rectangles in renderer to force full recalculation 
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to width change");
        }

        // Update boundary params if needed
        if (!this.main.params.boundaryParams) {
          this.main.params.boundaryParams = {};
        }
        this.main.params.boundaryParams.width = value;

        // Preserve current center offsets
        const centerOffsetX = this.main.params.centerOffsetX || 0;
        const centerOffsetY = this.main.params.centerOffsetY || 0;

        console.log("Width changed:", {
          from: original.width,
          to: value,
          physicalHeight: this.main.params.physicalHeight,
          centerOffsets: { x: centerOffsetX, y: centerOffsetY }
        });

        // Similar to how offset controls work, get canvas dimensions and update boundary
        if (this.main.params.boundaryType === 'rectangular' && renderer.boundary) {
          const canvasDims = this.main.getCanvasDimensions();
          const renderScale = this.main.getRenderScale();
          const visualWidth = value * renderScale;

          // Update boundary dimensions and center position
          renderer.boundary.width = visualWidth;

          // Make sure to update the center position with current offsets
          const centerX = canvasDims.centerX + centerOffsetX;
          const centerY = canvasDims.centerY + centerOffsetY;
          renderer.boundary.centerX = centerX;
          renderer.boundary.centerY = centerY;

          console.log("Direct boundary update (width):", {
            visualWidth: visualWidth,
            visualHeight: renderer.boundary.height,
            center: { x: centerX, y: centerY }
          });
        }

        // Update canvas dimensions AFTER updating the boundary
        this.main.updateCanvasDimensions();

        // Update grid with properly maintained dimensions
        renderer.updateGrid(this.main.params);
      });

    // Add direct input handling for width
    const widthInput = this.physicalWidthController.domElement.querySelector('input');
    if (widthInput) {
      fixManualInput(widthInput, this.physicalWidthController, "physicalWidth", "savedWidth");
    }

    // Add height controller for rectangular screens
    this.physicalHeightController = physicalDimensionsFolder
      .add(this.main.params, "physicalHeight", 120, 1000, 1)
      .name("Height (px)")
      .onFinishChange((value) => { this.savedHeight = value; })
      .onChange((value) => {
        // Make sure we have a valid value
        if (value < 120) value = 120;
        if (value > 1000) value = 1000;

        // Keep track of the original values for debugging
        const original = {
          width: this.main.params.physicalWidth,
          height: this.main.params.physicalHeight
        };

        // Update params
        this.main.params.physicalHeight = value;

        // Clear cached rectangles in renderer to force full recalculation
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to height change");
        }

        // Update boundary params if needed
        if (!this.main.params.boundaryParams) {
          this.main.params.boundaryParams = {};
        }
        this.main.params.boundaryParams.height = value;

        // Preserve current center offsets
        const centerOffsetX = this.main.params.centerOffsetX || 0;
        const centerOffsetY = this.main.params.centerOffsetY || 0;

        console.log("Height changed:", {
          from: original.height,
          to: value,
          physicalWidth: this.main.params.physicalWidth,
          centerOffsets: { x: centerOffsetX, y: centerOffsetY }
        });

        // Similar to how offset controls work, get canvas dimensions and update boundary
        if (this.main.params.boundaryType === 'rectangular' && renderer.boundary) {
          const canvasDims = this.main.getCanvasDimensions();
          const renderScale = this.main.getRenderScale();
          const visualHeight = value * renderScale;

          // Update boundary dimensions and center
          renderer.boundary.height = visualHeight;

          // Make sure to update the center position with current offsets
          const centerX = canvasDims.centerX + centerOffsetX;
          const centerY = canvasDims.centerY + centerOffsetY;
          renderer.boundary.centerX = centerX;
          renderer.boundary.centerY = centerY;

          console.log("Direct boundary update (height):", {
            visualWidth: renderer.boundary.width,
            visualHeight: visualHeight,
            center: { x: centerX, y: centerY }
          });
        }

        // Update canvas dimensions AFTER updating the boundary
        this.main.updateCanvasDimensions();

        // Update grid with properly maintained dimensions
        renderer.updateGrid(this.main.params);
      });

    // Add direct input handling for height
    const heightInput = this.physicalHeightController.domElement.querySelector('input');
    if (heightInput) {
      fixManualInput(heightInput, this.physicalHeightController, "physicalHeight", "savedHeight");
    }

    // Initially show/hide the appropriate controllers based on the current shape
    if (this.main.params.boundaryType === 'circular') {
      // Make sure diameter is properly set and cached
      const diameter = this.main.params.physicalWidth;
      this.savedDiameter = diameter;
      this.main.params.physicalHeight = diameter; // Ensure height=width for circular

      // Update the controller
      this.diameterController.setValue(diameter);

      // Show/hide controllers
      this.diameterController.show();
      this.physicalWidthController.hide();
      this.physicalHeightController.hide();

      console.log("Initialized with circular shape:", { diameter });
    } else {
      // Make sure rectangular dimensions are properly cached
      const width = this.main.params.physicalWidth;
      const height = this.main.params.physicalHeight;

      this.savedWidth = width;
      this.savedHeight = height;

      // Update controllers
      this.physicalWidthController.setValue(width);
      this.physicalHeightController.setValue(height);

      // Show/hide controllers
      this.diameterController.hide();
      this.physicalWidthController.show();
      this.physicalHeightController.show();

      console.log("Initialized with rectangular shape:", { width, height });
    }

    // Add center offset controls - important to keep!
    const offsetFolder = screenFolder.addFolder('Center Offset');

    // X offset control
    this.centerOffsetXController = offsetFolder
      .add(this.main.params, "centerOffsetX", -60, 60, 1)
      .name("X Offset")
      .onChange(() => {
        // Clear cached rectangles to force grid recalculation with new offset
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to X offset change");
        }

        // Update grid with new offset (this will shift cells but not boundary)
        renderer.updateGrid(this.main.params);
      });

    // Y offset control
    this.centerOffsetYController = offsetFolder
      .add(this.main.params, "centerOffsetY", -60, 60, 1)
      .name("Y Offset")
      .onChange(() => {
        // Clear cached rectangles to force grid recalculation with new offset
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to Y offset change");
        }

        // Update grid with new offset (this will shift cells but not boundary)
        renderer.updateGrid(this.main.params);
      });

    // --- GRID PARAMETERS ---

    // Get current params from renderer
    const params = this.main.params;

    // Remove preset controls from here since they're now at the root level
    this.gridTargetCellsController = gridParamFolder
      .add(params, "target", 1, 800, 1)
      .name("Target Cells")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    this.gridGapController = gridParamFolder
      .add(params, "gap", 0, 20, 1)
      .name("Gap (px)")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    this.gridAspectRatioController = gridParamFolder
      .add(params, "aspectRatio", 0.5, 4, 0.01)
      .name("Cell Ratio")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    this.gridScaleController = gridParamFolder
      .add(params, "scale", 0.8, 1, 0.001)
      .name("Grid Scale")
      .onChange(() => {
        renderer.boundary.setScale(params.scale);
        renderer.updateGrid(params); // Full grid recalculation needed
      });

    // Add allowCut parameter
    this.gridAllowCutController = gridParamFolder
      .add(params, "allowCut", 0, 3, 1)
      .name("Allow Cut")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

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
      .onChange(() => {
        // Use updateUIState for display changes
        renderer.updateUIState(params);
      });

    // Show cell centers
    this.gridShowCellCentersController = displayFolder
      .add(params, "showCellCenters")
      .name("Show Centers")
      .onChange(() => {
        // Use updateUIState for display changes
        renderer.updateUIState(params);
      });

    // Show cell indices
    this.gridShowIndicesController = displayFolder
      .add(params, "showIndices")
      .name("Show Indices")
      .onChange(() => {
        // Use updateUIState for display changes
        renderer.updateUIState(params);
      });

    // Show cell counts
    this.showCellCountsController = displayFolder
      .add(params, "showCellCounts")
      .name("Show Cell Info")
      .onChange(() => {
        // Use updateUIState for display changes
        renderer.updateUIState(params);
      });

    // Color controls
    const colorFolder = displayFolder.addFolder("Colors");

    colorFolder
      .addColor(params.colors, "background")
      .name("Background")
      .onChange(() => {
        // Use updateUIState for color changes
        renderer.updateUIState(params);
      });

    colorFolder
      .addColor(params.colors, "insideCells")
      .name("Inside Cells")
      .onChange(() => {
        // Use updateUIState for color changes
        renderer.updateUIState(params);
      });

    colorFolder
      .addColor(params.colors, "boundaryCells")
      .name("Boundary Cells")
      .onChange(() => {
        // Use updateUIState for color changes
        renderer.updateUIState(params);
      });

    colorFolder
      .addColor(params.colors, "outsideCells")
      .name("Outside Cells")
      .onChange(() => {
        // Use updateUIState for color changes
        renderer.updateUIState(params);
      });

    colorFolder
      .addColor(params.colors, "indexText")
      .name("Index Text")
      .onChange(() => {
        // Use updateUIState for color changes
        renderer.updateUIState(params);
      });

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
