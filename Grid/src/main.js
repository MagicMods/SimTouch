import { GridGenRenderer } from "./renderer/gridGenRenderer.js";
import { UiManager } from "./ui/uiManager.js";
import { ShaderManager } from "./shader/shaderManager.js";
import { DimensionManager } from "./coreGrid/dimensionManager.js";
import { BoundaryManager } from "./coreGrid/boundaryManager.js";
import { BoundaryRenderer } from "./renderer/boundaryRenderer.js";
import { eventBus } from './util/eventManager.js';

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    this.gl = this.canvas.getContext("webgl2", { stencil: true, antialias: true });

    if (!this.gl) {
      console.error("WebGL2 not supported");
      return;
    }

    // Instantiate the DOM visualizer, attaching it to the body
    this.boundaryRenderer = new BoundaryRenderer(document.body);
    this.shaderManager = new ShaderManager(this.gl);

    // Initialize parameters with default 240x240 circular grid (the "sweet spot" configuration)
    this.gridParams = {
      // Use screen object as the source of truth for dimensions/shape
      screen: {
        width: 240,
        height: 240,
        shape: "circular",
      },
      gridSpecs: {
        targetCellCount: 341,
        gap: 1,
        aspectRatio: 1.0,
        scale: 1.0,
        allowCut: 3,
        centerOffsetX: 0,
        centerOffsetY: 0,
      },
      shadow: {
        shadowIntensity: 0.17,
        shadowThreshold: 0,
        blurAmount: 0.23,
      },
      colors: {
        gridBackgroundColor: [0.0, 0.0, 0.0], //rgb(0, 0, 0)
        cellColor: [0.5, 0.5, 0.5], // Default gray #808080
      },
      flags: {
        showGridCells: true,
        showIndices: false,
        showCellCenters: false,
        showBoundary: false,
      },
      renderSize: {
        maxRenderWidth: 960,
        maxRenderHeight: 960,
      },
    };

    this.dimensionManager = new DimensionManager(this.gridParams.screen.width, this.gridParams.screen.height, this.gridParams.renderSize.maxRenderWidth, this.gridParams.renderSize.maxRenderHeight);

    // Step 3.1: Pass initial dimension VALUES to BoundaryManager
    const initialDimensions = this.dimensionManager.getDimensions();
    this.boundaryManager = new BoundaryManager(
      this.gridParams,
      initialDimensions // NEW: Pass initial values
    );
  }

  async init() {
    try {
      await this.shaderManager.init();

      // Instantiate GridGenRenderer
      this.gridRender = new GridGenRenderer(
        this.gl,
        this.shaderManager,
        this.gridParams // Pass initial gridParams
        // Boundaries will be set via setGrid later
      );

      // Set initial canvas size, style, and viewport
      this._applyCurrentDimensionsAndBoundary();
      // // Explicitly set boundaries and trigger first grid generation
      this.setGridParams(this.gridParams); // Trigger initial update flow

      this.ui = new UiManager(this);
      await this.ui.initPanels(); // Wait for panels to be created

      // Now register the callback
      if (this.ui.newGridUi && typeof this.ui.newGridUi.setOnChangeCallback === 'function') {
        this.ui.newGridUi.setOnChangeCallback(this.handleGridUIChange.bind(this));
        console.log("Grid UI change callback registered successfully (post-init).");
      } else {
        console.error("Failed to register Grid UI change callback even after initPanels.");
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  // Private helper to apply current dimensions/styles/viewport
  _applyCurrentDimensionsAndBoundary() {
    if (!this.canvas || !this.gl) {
      console.warn("_applyCurrentDimensionsAndBoundary called before canvas or GL context was ready.");
      return;
    }
    this.dimensionManager.applyToCanvas(this.canvas);
    this.dimensionManager.applyCanvasStyle(this.canvas, this.gridParams.screen.shape);
    this.dimensionManager.applyViewport(this.gl);
    console.info(`Applied canvas dimensions/settings: ${this.dimensionManager.renderWidth}x${this.dimensionManager.renderHeight}, Physical: ${this.gridParams.screen.width}x${this.gridParams.screen.height}`);
  }

  // Update canvas dimensions based on physical dimensions using DimensionManager
  checkAndApplyDimensionChanges() {
    if (!this.canvas) {
      console.warn("updateCanvasDimensions called before canvas was ready.");
      return;
    }

    const dimensionsChanged = this.dimensionManager.updateDimensions(this.gridParams.screen.width, this.gridParams.screen.height, this.gridParams.renderSize.maxRenderWidth, this.gridParams.renderSize.maxRenderHeight);
    if (dimensionsChanged) {
      console.debug("DimensionManager reported changes, applying updates...");
      this._applyCurrentDimensionsAndBoundary(); // Call the helper
    } else {
      console.debug("updateCanvasDimensions called, but no dimension change detected.");
    }
  }

  // Method to update parameters and propagate changes
  setGridParams(newGridParams) {
    // console.debug("Main.setGridParams called with:", newGridParams);
    this.gridParams = newGridParams;
    // console.debug("Updated gridParams:", this.gridParams);

    // Update dimensions FIRST based on new gridParams
    // Note: checkAndApplyDimensionChanges also updates the internal state of dimensionManager
    this.checkAndApplyDimensionChanges();
    // Get the latest dimension values AFTER potential update
    const currentDimensions = this.dimensionManager.getDimensions();

    // Update the Boundary Manager with the new parameters AND current dimensions
    if (this.boundaryManager) {
      // Step 3.3: Pass current dimension VALUES to boundaryManager.update
      this.boundaryManager.update(this.gridParams, currentDimensions);
      this.boundaryRenderer.update(this.boundaryManager.physicsBoundary, this.canvas, this.gridParams.flags.showBoundary);
    } else {
      console.warn("Main.setGridParams: BoundaryManager not initialized.");
    }

    if (this.gridRender) {
      // Pass updated boundaries to gridRender
      // Step 3.4 (deferred to Step 4): Need to pass currentDimensions here too
      this.gridRender.setGrid(this.gridParams, this.boundaryManager?.getShapeBoundary(), this.boundaryManager?.getPhysicsBoundary(), currentDimensions);
    } else {
      console.warn("Main.setGridParams: gridRender not initialized, cannot update.");
    }

    // Removed direct UI update call
    // Emit event instead
    eventBus.emit('gridParamsUpdated', this.gridParams);
  }

  // Add this new method to handle UI changes
  handleGridUIChange(paramPath, value) {
    // console.log(`Main Handler: Received update for '${paramPath}' with value:`, value);
    // console.debug(`Grid UI Change: ${paramPath} = ${value}`);
    try {
      const parts = paramPath.split('.');
      let current = this.gridParams;

      // Traverse the path, except for the last part
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
          console.error(`Invalid path segment ${parts[i]} in ${paramPath}`);
          return; // Path doesn't exist
        }
        current = current[parts[i]];
      }

      const finalKey = parts[parts.length - 1];

      // Special handling for 'screen' updates from dropdown
      if (paramPath === 'screen') {
        // Assuming value is the full screen spec object from SCREEN_TYPES
        this.gridParams.screen = { ...value };
      } else {
        // Update the final property
        if (current[finalKey] !== undefined) {
          current[finalKey] = value;
          if (parts[0] === 'shadow') {
            // console.log("Main Handler: Updated this.gridParams.shadow:", JSON.stringify(this.gridParams.shadow));
          }
        } else {
          console.error(`Invalid final key ${finalKey} in ${paramPath}`);
          return; // Key doesn't exist
        }
      }

      // After updating the internal gridParams, trigger the update flow
      this.setGridParams(this.gridParams);

    } catch (error) {
      console.error(`Error handling grid UI change (${paramPath}=${value}):`, error);
    }
  }
}

// Initialize application when DOM is loaded
window.addEventListener("DOMContentLoaded", async () => {
  const app = new Main();
  try {
    await app.init();
  } catch (error) {
    console.error("Failed to initialize application:", error);
  }
});
