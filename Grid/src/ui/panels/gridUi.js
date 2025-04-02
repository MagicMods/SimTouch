import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    try {
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
          { insertFirst: true }
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
    } catch (error) {
      console.error("Error initializing GridUi:", error);
      // Create a simplified UI if initialization fails
      this.gui.title("Grid (Error Mode)");
      this.gui.add({ reload: () => window.location.reload() }, "reload").name("Reload App");
    }
  }

  // Add preset interface methods
  getData() {
    const controllers = this.getControllers();
    const values = {};

    Object.entries(controllers).forEach(([name, controller]) => {
      values[name] = controller.getValue();
    });

    return {
      controllers: values
    };
  }

  setData(data) {
    console.log("GridUi.setData called with data:", data);
    if (!data || !data.controllers) return false;

    try {
      const renderer = this.main.renderer;
      if (!renderer) {
        console.error("Renderer not found when loading preset");
        return false;
      }

      // Store values before applying
      const controllerValues = { ...data.controllers };

      // First, get the current screen shape and the preset's screen shape
      const currentShape = this.main.params.boundaryType;
      const presetShape = controllerValues["Screen Shape"];

      console.log("Preset loading - shapes:", {
        currentShape: currentShape,
        presetShape: presetShape
      });

      // Store the current dimensions for debug purposes
      const originalDims = {
        width: this.main.params.physicalWidth,
        height: this.main.params.physicalHeight,
        shape: this.main.params.boundaryType
      };
      console.log("Original dimensions:", originalDims);

      // Extract preset dimensions based on shape
      const presetDims = {
        width: controllerValues["Width"] || this.main.params.physicalWidth,
        height: controllerValues["Height"] || this.main.params.physicalHeight,
        diameter: controllerValues["Diameter"] || this.main.params.physicalWidth
      };
      console.log("Preset dimensions:", presetDims);

      // Step 1: Handle shape change first if needed
      if (presetShape && presetShape !== currentShape) {
        console.log(`Changing screen shape from ${currentShape} to ${presetShape}`);

        // Set the boundary type parameters directly
        this.main.params.boundaryType = presetShape;
        this.main.params.shape = presetShape;

        // Update canvas border-radius based on boundary type
        const canvas = document.getElementById("glCanvas");
        if (presetShape === 'circular') {
          canvas.style.borderRadius = '50%';

          // For circular, make sure to use diameter
          const diameter = presetDims.diameter;
          this.savedDiameter = diameter;
          this.main.params.physicalWidth = diameter;
          this.main.params.physicalHeight = diameter;

          console.log(`Set circular dimensions: diameter=${diameter}`);
        } else {
          canvas.style.borderRadius = '1%';

          // For rectangular, use width and height
          this.savedWidth = presetDims.width;
          this.savedHeight = presetDims.height;
          this.main.params.physicalWidth = presetDims.width;
          this.main.params.physicalHeight = presetDims.height;

          console.log(`Set rectangular dimensions: width=${presetDims.width}, height=${presetDims.height}`);
        }

        // Update boundary params
        if (!this.main.params.boundaryParams) {
          this.main.params.boundaryParams = {};
        }
        this.main.params.boundaryParams.width = this.main.params.physicalWidth;
        this.main.params.boundaryParams.height = this.main.params.physicalHeight;

        // Make sure the controller visibility matches the new shape
        this.updateControllerVisibility(presetShape);

        // Update the boundary type controller display
        if (this.boundaryTypeController) {
          this.boundaryTypeController.setValue(presetShape);
        }

        // Clear any cached grid data to force recalculation
        if (renderer._cachedRectangles) {
          renderer._cachedRectangles = null;
          console.log("Cleared cached grid due to shape change");
        }
      }

      // Step 2: Now apply all other controller values
      const targets = this.getControllers();
      if (!targets || Object.keys(targets).length === 0) {
        console.warn("No valid controllers found in getControllers()");
      }

      // Get the controller values that were modified directly in step 1
      const processedControllers = ['Screen Shape'];
      if (presetShape === 'circular') {
        processedControllers.push('Diameter');
      } else {
        processedControllers.push('Width', 'Height');
      }

      console.log("Applying remaining controller values...");

      Object.entries(controllerValues).forEach(([name, value]) => {
        if (!processedControllers.includes(name)) {
          const controller = targets[name];
          if (controller && typeof controller.setValue === 'function') {
            try {
              console.log(`Setting ${name} = ${value}`);
              controller.setValue(value);
            } catch (err) {
              console.warn(`Error setting ${name} to ${value}:`, err);
            }
          } else {
            console.warn(`Controller not found for preset parameter: ${name}`);
          }
        }
      });

      // Re-verify that our saved values are correct
      if (this.main.params.boundaryType === 'circular') {
        this.savedDiameter = this.main.params.physicalWidth;
        console.log("Verified saved diameter:", this.savedDiameter);
      } else {
        this.savedWidth = this.main.params.physicalWidth;
        this.savedHeight = this.main.params.physicalHeight;
        console.log("Verified saved width/height:", this.savedWidth, this.savedHeight);
      }

      // Update controller displays
      this.updateControllerDisplays();

      // Final step: Update the grid to reflect all changes
      console.log("Updating grid with final dimensions:", {
        width: this.main.params.physicalWidth,
        height: this.main.params.physicalHeight,
        shape: this.main.params.boundaryType
      });

      renderer.updateGrid(this.main.params);

      console.log("Preset successfully loaded");
      return true;
    } catch (error) {
      console.error("Error applying preset:", error);
      return false;
    }
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
    const statsFolder = this.gui.addFolder("Grid Statistics");

    // --- SCREEN CONFIGURATION ---

    // Add physical dimension controls
    const physicalDimensionsFolder = screenFolder.addFolder("Physical Dimensions");

    // Add boundary type selector
    this.boundaryTypeController = physicalDimensionsFolder
      .add(this.main.params, "boundaryType", { Round: 'circular', Rectangular: 'rectangular' })
      .name("Screen Shape")
      .onChange((value) => {
        // Store original dimensions and offsets for debugging
        const originalState = {
          width: this.main.params.physicalWidth,
          height: this.main.params.physicalHeight,
          centerOffsetX: this.main.params.centerOffsetX || 0,
          centerOffsetY: this.main.params.centerOffsetY || 0,
          boundaryType: this.main.params.boundaryType
        };

        console.log(`Screen shape changed from ${originalState.boundaryType} to ${value}`);

        // Store current dimensions to restore when changing types
        if (value === 'circular') {
          // Changing to circular - adopt the width value as diameter
          if (this.savedDiameter) {
            // Use saved diameter if we have one
            this.main.params.physicalWidth = this.savedDiameter;
            this.main.params.physicalHeight = this.savedDiameter;
          } else {
            // Otherwise use current width as the diameter
            const diameter = this.main.params.physicalWidth;
            this.main.params.physicalWidth = diameter;
            this.main.params.physicalHeight = diameter;
            this.savedDiameter = diameter;
          }
        } else {
          // Changing to rectangular - restore saved width/height if available
          if (this.savedWidth && this.savedHeight) {
            this.main.params.physicalWidth = this.savedWidth;
            this.main.params.physicalHeight = this.savedHeight;
          }
        }

        // Update boundary params
        if (!this.main.params.boundaryParams) {
          this.main.params.boundaryParams = {};
        }
        this.main.params.boundaryParams.width = this.main.params.physicalWidth;
        this.main.params.boundaryParams.height = this.main.params.physicalHeight;

        // Update controller visibility
        this.updateControllerVisibility(value);

        // IMPORTANT: Preserve center offsets when changing shape
        const centerOffsetX = originalState.centerOffsetX;
        const centerOffsetY = originalState.centerOffsetY;
        this.main.params.centerOffsetX = centerOffsetX;
        this.main.params.centerOffsetY = centerOffsetY;

        // Get canvas dimensions for center calculation
        const canvasDims = this.main.getCanvasDimensions();

        // Update canvas dimensions first so boundary is created with correct size
        this.main.updateCanvasDimensions();

        // Then update the grid - maintain offsets
        renderer.updateGrid(this.main.params);

        console.log("Shape change completed:", {
          from: originalState,
          to: {
            width: this.main.params.physicalWidth,
            height: this.main.params.physicalHeight,
            centerOffsetX: this.main.params.centerOffsetX,
            centerOffsetY: this.main.params.centerOffsetY,
            type: value
          }
        });
      });

    // Dedicated method to update controller visibility based on shape
    this.updateControllerVisibility = (boundaryType) => {
      if (boundaryType === 'circular') {
        // Show diameter, hide width and height
        if (this.diameterController) this.diameterController.show();
        if (this.physicalWidthController) this.physicalWidthController.hide();
        if (this.physicalHeightController) this.physicalHeightController.hide();
      } else {
        // Show width and height, hide diameter
        if (this.diameterController) this.diameterController.hide();
        if (this.physicalWidthController) this.physicalWidthController.show();
        if (this.physicalHeightController) this.physicalHeightController.show();
      }
    };

    // Initially set controller visibility based on the current shape
    this.updateControllerVisibility(this.main.params.boundaryType);

    // Add diameter controller for round screens
    this.diameterController = physicalDimensionsFolder
      .add(this.main.params, "physicalWidth", 120, 1000, 1)
      .name("Diameter")
      .onFinishChange((value) => { this.savedDiameter = value; })
      .onChange((value) => {
        // Ensure value is within valid range
        value = Math.max(120, Math.min(1000, value));

        // Update both width and height to the same value
        this.main.params.physicalWidth = value;
        this.main.params.physicalHeight = value;
        this.savedDiameter = value;

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

    // Add width controller for rectangular screens
    this.physicalWidthController = physicalDimensionsFolder
      .add(this.main.params, "physicalWidth", 120, 1000, 1)
      .name("Width")
      .onFinishChange((value) => { this.savedWidth = value; })
      .onChange((value) => {
        // Ensure we have a valid value
        value = Math.max(120, Math.min(1000, value));

        // Keep track of the original values for debugging
        const original = {
          width: this.main.params.physicalWidth,
          height: this.main.params.physicalHeight
        };

        // Update params and saved value
        this.main.params.physicalWidth = value;
        this.savedWidth = value;

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

    // Add height controller for rectangular screens
    this.physicalHeightController = physicalDimensionsFolder
      .add(this.main.params, "physicalHeight", 120, 1000, 1)
      .name("Height")
      .onFinishChange((value) => { this.savedHeight = value; })
      .onChange((value) => {
        // Ensure we have a valid value
        value = Math.max(120, Math.min(1000, value));

        // Keep track of the original values for debugging
        const original = {
          width: this.main.params.physicalWidth,
          height: this.main.params.physicalHeight
        };

        // Update params and saved value
        this.main.params.physicalHeight = value;
        this.savedHeight = value;

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
    this.targetCellsController = gridParamFolder
      .add(params, "target", 1, 800, 1)
      .name("Target Cells")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    this.gapController = gridParamFolder
      .add(params, "gap", 0, 20, 1)
      .name("Grid Gap")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    this.aspectRatioController = gridParamFolder
      .add(params, "aspectRatio", 0.5, 4, 0.01)
      .name("Cell Ratio")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    this.scaleController = gridParamFolder
      .add(params, "scale", 0.8, 1, 0.001)
      .name("Grid Scale")
      .onChange(() => {
        renderer.boundary.setScale(params.scale);
        renderer.updateGrid(params); // Full grid recalculation needed
      });

    // Add allowCut parameter
    this.allowCutController = gridParamFolder
      .add(params, "allowCut", 0, 3, 1)
      .name("Allow Cut")
      .onChange(() => renderer.updateGrid(params)); // Full grid recalculation needed

    // Add tooltip for Allow Cut parameter
    this.allowCutController.domElement.parentElement.setAttribute('title',
      'Controls how many corners of a cell can be outside the boundary. ' +
      '0 = strict (only cells with center inside), ' +
      '1-3 = progressively more cells at the boundary.');

    // --- DISPLAY OPTIONS ---

    // Display Mode
    this.displayModeController = displayFolder
      .add(params, "displayMode", ['all', 'inside', 'boundary', 'masked'])
      .name("Display Mode")
      .onChange((value) => {
        console.log("Display mode changed:", value);
        // Use updateUIState for UI toggles rather than full grid recalculation
        if (renderer.updateUIState) {
          renderer.updateUIState(this.main.params);
        } else {
          // Fallback to updateGrid if updateUIState not available
          renderer.updateGrid(this.main.params);
        }
      });

    // Show cell centers - use updateUIState to prevent dimension problems
    this.showCentersController = displayFolder
      .add(params, "showCellCenters")
      .name("Show Centers")
      .onChange((value) => {
        console.log("Show centers toggled:", value);
        // Use updateUIState for UI toggles rather than full grid recalculation
        if (renderer.updateUIState) {
          renderer.updateUIState(this.main.params);
        } else {
          // Fallback to updateGrid if updateUIState not available
          renderer.updateGrid(this.main.params);
        }
      });

    // Show cell indices - use updateUIState to prevent dimension problems
    this.showIndicesController = displayFolder
      .add(params, "showIndices")
      .name("Show Indices")
      .onChange((value) => {
        console.log("Show indices toggled:", value);
        // Use updateUIState for UI toggles rather than full grid recalculation
        if (renderer.updateUIState) {
          renderer.updateUIState(this.main.params);
        } else {
          // Fallback to updateGrid if updateUIState not available
          renderer.updateGrid(this.main.params);
        }
      });

    // Show cell counts - use updateUIState to prevent dimension problems
    this.showCellCountsController = displayFolder
      .add(params, "showCellCounts")
      .name("Show Cell Info")
      .onChange((value) => {
        console.log("Show cell counts toggled:", value);
        // Use updateUIState for UI toggles rather than full grid recalculation
        if (renderer.updateUIState) {
          renderer.updateUIState(this.main.params);
        } else {
          // Fallback to updateGrid if updateUIState not available
          renderer.updateGrid(this.main.params);
        }
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

  getControllers() {
    // Create a map of controller display names to controller objects
    const targets = {};

    // Screen configuration controls
    if (this.boundaryTypeController)
      targets["Screen Shape"] = this.boundaryTypeController;
    if (this.physicalWidthController)
      targets["Width"] = this.physicalWidthController;
    if (this.physicalHeightController)
      targets["Height"] = this.physicalHeightController;
    if (this.diameterController)
      targets["Diameter"] = this.diameterController;
    if (this.centerOffsetXController)
      targets["Center X Offset"] = this.centerOffsetXController;
    if (this.centerOffsetYController)
      targets["Center Y Offset"] = this.centerOffsetYController;

    // Grid controllers
    if (this.targetCellsController)
      targets["Target Cells"] = this.targetCellsController;
    if (this.gapController)
      targets["Grid Gap"] = this.gapController;
    if (this.aspectRatioController)
      targets["Cell Ratio"] = this.aspectRatioController;
    if (this.scaleController)
      targets["Grid Scale"] = this.scaleController;
    if (this.allowCutController)
      targets["Allow Cut"] = this.allowCutController;

    // Display options
    if (this.showCentersController)
      targets["Show Centers"] = this.showCentersController;
    if (this.showIndicesController)
      targets["Show Indices"] = this.showIndicesController;
    if (this.displayModeController)
      targets["Display Mode"] = this.displayModeController;
    if (this.showCellCountsController)
      targets["Show Cell Info"] = this.showCellCountsController;

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
    safeUpdateDisplay(this.targetCellsController);
    safeUpdateDisplay(this.gapController);
    safeUpdateDisplay(this.aspectRatioController);
    safeUpdateDisplay(this.scaleController);
    safeUpdateDisplay(this.allowCutController);
    safeUpdateDisplay(this.showCentersController);
    safeUpdateDisplay(this.showIndicesController);
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
