import { BaseRenderer } from "./baseRenderer.js";
import * as mat4 from "gl-matrix/mat4.js";
import { GridGeometry } from "../coreGrid/gridGeometry.js";
import { OverlayManager } from "./overlayRenderer.js";
import { eventBus } from '../util/eventManager.js';
import { Gradients } from "../shaders/gradients.js";
import { GridRenderModes, GridField } from "./gridRenderModes.js";

export class GridGenRenderer extends BaseRenderer {
  constructor(gl, shaderManager, gridConfig, dimensionManager, boundaryManager, particleSystem, gridRenderModes, debugFlags) {
    super(gl, shaderManager);

    this.gl = gl;
    this.shaderManager = shaderManager;
    this.debug = debugFlags;
    this.gradient = new Gradients(debugFlags, "c0"); // Initialize gradient in constructor
    this.dimensionManager = dimensionManager;
    this.boundaryManager = boundaryManager;
    this.particleSystem = particleSystem;

    // Initialize this.grid with the initial config object reference
    this.grid = gridConfig || {}; // Use passed config or default to empty object

    // Initialize buffer objects
    this.baseQuadBuffer = null;
    this.instanceMatrixBuffer = null;
    this.instanceColorBuffer = null;
    this.instanceShadowBuffer = null;

    // Object to hold instance data arrays
    this.instanceData = {
      matrices: null,
      colors: null,
      shadowParams: null,
      count: 0,
    };

    // Initialize core components and buffers
    this.overlayManager = new OverlayManager(gl.canvas, this.debug); // Instantiate OverlayManager
    this.gridGeometry = new GridGeometry(this.debug); // Instantiate GridGeometry + Pass debugFlags

    // Generate an initial empty gridMap to pass to GridRenderModes
    this.gridMap = []; // Initialize gridMap as empty array

    // Instantiate GridRenderModes
    this.renderModes = new GridRenderModes({
      gridParams: this.grid, // Use the internally stored gridConfig alias
      gridGeometry: this.gridGeometry,
      gridMap: this.gridMap, // Pass the initial empty map
      canvas: this.gl.canvas,
      coordTransforms: {}, // Pass empty object for now, implement if needed later
      // Function providing maxDensity - uses optional chaining and nullish coalescing
      maxDensityRef: () => this.maxDensity
    });

    this.initBuffers();
    this.currentDimensions = { renderWidth: 0, renderHeight: 0 }; // Initialize dimensions

    // Bind methods
    this.setGrid = this.setGrid.bind(this);
    this.updateGridGeometryAndRender = this.updateGridGeometryAndRender.bind(this);
    this.updateRenderables = this.updateRenderables.bind(this);
    this.prepareInstanceData = this.prepareInstanceData.bind(this);
    this.setupInstancedDrawing = this.setupInstancedDrawing.bind(this);
    this.renderCellsInstanced = this.renderCellsInstanced.bind(this);
    this.handleParamsUpdate = this.handleParamsUpdate.bind(this);

    // Validate initial gridConfig.screen
    if (
      !gridConfig ||
      !gridConfig.screen ||
      typeof gridConfig.screen.width !== "number" ||
      typeof gridConfig.screen.height !== "number" ||
      !gridConfig.screen.shape
    ) {
      console.error("GridGenRenderer: Invalid initial gridConfig.screen object.", gridConfig.screen);
      // Set default screen parameters if invalid
      gridConfig.screen = { width: 240, height: 240, shape: "circular" };
      console.warn("GridGenRenderer: Using default screen parameters.");
    }

    this.boundaryType = gridConfig.screen.shape;

    if (!gl.getContextAttributes().stencil) {
      console.warn("Stencil buffer not available, masking will not work correctly");
    }

    // Boundaries are now managed externally and passed via setGrid (fetched via manager)
    this.projectionMatrix = mat4.create();

    // Subscribe to grid parameter updates
    eventBus.on('gridParamsUpdated', ({ gridParams, dimensions }) => {
      const shapeBoundary = this.boundaryManager?.getShapeBoundary();
      const physicsBoundary = this.boundaryManager?.getPhysicsBoundary();
      // Call setGrid, passing dimensions from the event payload
      this.setGrid(gridParams, shapeBoundary, physicsBoundary, dimensions);
    });

    // Subscribe to simulation parameter updates (for maxDensity, gridMode)
    eventBus.on('simParamsUpdated', this.handleParamsUpdate);

    // Initialize render modes and max density state
    this.renderModes = null;
    this.maxDensity = 4.0; // Default max density
  }

  initBuffers() {
    const gl = this.gl;
    // Create position buffer (used by multiple shapes now)
    // this.positionBuffer = gl.createBuffer();

    // --- Instancing Buffers ---
    // Base geometry (unit quad centered at origin)
    this.baseQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuffer);
    const quadVertices = [
      // x,  y
      -0.5,
      -0.5, // Bottom-left
      0.5,
      -0.5, // Bottom-right
      -0.5,
      0.5, // Top-left
      0.5,
      0.5, // Top-right
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);

    // Instance data buffers
    this.instanceMatrixBuffer = gl.createBuffer();
    this.instanceColorBuffer = gl.createBuffer();
    this.instanceShadowBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind

    // --- Add Particle Buffers ---
    // this.particlePositionBuffer = gl.createBuffer(); // REMOVE
    // this.particleSizeBuffer = gl.createBuffer(); // REMOVE
    // --- End Add Particle Buffers ---
  }

  // Update grid config, shape boundary, and physics boundary
  setGrid(newGridConfig, shapeBoundary, physicsBoundary, dimensions) {
    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log("Renderer setGrid: Received gridConfig.shadow:", JSON.stringify(newGridConfig?.shadow));
    // --- START REFACTOR ---
    // // Remove this line: this.grid = newGridConfig;

    // Perform a deep update instead of replacing the object reference
    // This ensures UI listeners bound via .listen() remain attached
    // to the original object instance.
    if (newGridConfig) {
      // Update nested objects carefully
      if (newGridConfig.screen) Object.assign(this.grid.screen, newGridConfig.screen);
      if (newGridConfig.gridSpecs) Object.assign(this.grid.gridSpecs, newGridConfig.gridSpecs);
      if (newGridConfig.shadow) Object.assign(this.grid.shadow, newGridConfig.shadow);
      if (newGridConfig.colors) Object.assign(this.grid.colors, newGridConfig.colors);
      if (newGridConfig.flags) Object.assign(this.grid.flags, newGridConfig.flags);
      if (newGridConfig.renderSize) Object.assign(this.grid.renderSize, newGridConfig.renderSize);
      // Note: Calculated properties like cellCount, cols, rows etc.
      // will be updated later in updateGridGeometryAndRender
      // directly on this same this.grid object instance.
    }
    // --- END REFACTOR ---

    // Store other references (these can be replaced)
    this.shapeBoundary = shapeBoundary;
    this.physicsBoundary = physicsBoundary;
    this.currentDimensions = dimensions;

    // Initialize or update gradient based on grid config
    // Ensure gradient is created using the non-legacy Gradients class
    const colorsConfig = this.grid?.colors;
    const newPresetName = colorsConfig?.gradientPreset;
    const newColorStops = colorsConfig?.colorStops;

    // Check if the preset has changed OR if it's custom and stops might have changed
    const currentPreset = this.gradient.getCurrentPreset();
    let themeUpdated = false;

    if (newPresetName && newPresetName !== 'custom' && newPresetName !== currentPreset) {
      console.log(`GridGenRenderer: Applying new preset: ${newPresetName}`);
      this.gradient.applyPreset(newPresetName);
      themeUpdated = true;
    } else if (newPresetName === 'custom') {
      // If preset is 'custom', try applying colorStops
      if (Array.isArray(newColorStops) && newColorStops.length >= 2) {
        console.log("GridGenRenderer: Applying custom color stops.");
        const success = this.gradient.setColorStops(newColorStops);
        if (!success) {
          console.warn("GridGenRenderer: Setting custom color stops failed, falling back to default preset 'c0'.");
          this.gradient.applyPreset('c0');
        }
        themeUpdated = true;
      } else {
        console.warn("GridGenRenderer: Preset set to 'custom' but invalid/missing colorStops. Falling back to 'c0'.");
        this.gradient.applyPreset('c0'); // Fallback if custom stops are bad
        themeUpdated = true;
      }
    } else if (!newPresetName && currentPreset === null) {
      // Catch case where gradient exists but preset wasn't set initially
      console.warn("GridGenRenderer: No gradient preset defined, applying default 'c0'.");
      this.gradient.applyPreset('c0');
      themeUpdated = true;
    }
    // If no relevant theme change was detected, the gradient remains as is.

    // Validate incoming gridConfig.screen (essential check)
    if (!this.grid || !this.grid.screen || typeof this.grid.screen.width !== 'number' || typeof this.grid.screen.height !== 'number' || !this.grid.screen.shape) {
      console.error("GridGenRenderer.setGrid: Invalid internal gridConfig.screen after update. Aborting.", this.grid?.screen);
      return; // Abort if essential screen info is missing or became invalid
    }

    if (!this.shapeBoundary) {
      console.warn("GridGenRenderer.setGrid: Received null or undefined shapeBoundary.");
    }
    if (!this.physicsBoundary) {
      console.warn("GridGenRenderer.setGrid: Received null or undefined physicsBoundary.");
    }

    // Update viewport and canvas size based on PASSED dimensions
    const renderWidth = dimensions.renderWidth;
    const renderHeight = dimensions.renderHeight;
    this.gl.viewport(0, 0, renderWidth, renderHeight);

    // Update overlay dimensions AFTER canvas dimensions are set
    if (this.overlayManager) {
      this.overlayManager.updateDimensions(dimensions);
    }

    // Trigger a full grid geometry update and render.
    this.updateGridGeometryAndRender(dimensions);
  }

  // Renamed from updateGrid to clarify its purpose
  updateGridGeometryAndRender(dimensions) {
    // console.log("updateGridGeometryAndRender called with screen:", this.grid.screen);

    // Use the externally provided shapeBoundary
    if (!this.shapeBoundary) {
      console.error("updateGridGeometryAndRender: shapeBoundary is not set. Cannot generate grid.");
      return;
    }

    // Generate grid geometry using the shape boundary and dimensions
    this.gridGeometry.generate(this.grid, this.shapeBoundary, dimensions);

    // Get calculated geometry and parameters
    const geometryResult = this.gridGeometry.getGeometry();
    const calculatedGridParams = geometryResult.gridParams;
    const generatedRectangles = geometryResult.rectangles; // Use rectangles from the result
    // Store calculated dimensions (potentially needed for reference)
    this.grid.cellCount = generatedRectangles.length;
    this.grid.cols = calculatedGridParams?.cols || this.grid.cols;
    this.grid.rows = calculatedGridParams?.rows || this.grid.rows;
    this.grid.calculatedCellWidth = calculatedGridParams?.physicalWidth;
    this.grid.calculatedCellHeight = calculatedGridParams?.physicalHeight;

    // Update gridMap and notify GridRenderModes
    this.gridMap = this.createGridMap(generatedRectangles);
    if (!this.renderModes) {
      this.renderModes = new GridRenderModes({
        gridParams: this.grid,        // Use updated internal grid
        gridGeometry: this.gridGeometry, // Use updated internal geometry
        gridMap: this.gridMap,          // Use newly created gridMap
        canvas: this.gl.canvas,         // Pass canvas
        coordTransforms: {},            // Empty for now
        maxDensityRef: () => this.maxDensity, // CORRECTED: Pass internal maxDensity getter
        dimensions: this.currentDimensions // Pass current dimensions
      });
    } else {
      this.renderModes.updateGrid({
        gridParams: this.grid,
        gridGeometry: this.gridGeometry,
        gridMap: this.gridMap,
        dimensions: dimensions // Pass updated dimensions
      });
    }

    // <<< Call prepareInstanceData AFTER renderModes is ready >>>
    this.prepareInstanceData(generatedRectangles); // Ensure this call remains
  }

  // Renamed from setGridParams
  setGridParams(newGridConfig, shapeBoundary, physicsBoundary, dimensions) {
    this.setGrid(newGridConfig, shapeBoundary, physicsBoundary, dimensions);
  }

  updateRenderables(rectangles, dimensions) {
    const gl = this.gl;
    const gridConfig = this.grid;

    // Extract colors for clarity
    const backgroundColor = gridConfig.colors.gridBackgroundColor || [0, 0, 0];
    const cellColor = gridConfig.colors.cellColor || [0.5, 0.5, 0.5];

    // --- Clear Canvas ---
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);

    // --- Prepare and Draw Grid Cells ---
    this.renderCellsInstanced();

    // --- Calculate Projection Matrix ---
    const projectionMatrix = mat4.create();

    const renderWidth = dimensions.renderWidth;
    const renderHeight = dimensions.renderHeight;
    mat4.ortho(projectionMatrix, 0, renderWidth, 0, renderHeight, -1, 1);

    // Draw physics boundary (if enabled)
    if (this.grid.flags.showBoundary && this.physicsBoundary) {
      // >>> MODIFIED: Uncomment and wrap log
      if (this.debug.gridGenRenderer) console.log('Drawing physics boundary');
      // <<< END MODIFIED
      // this.physicsBoundary.drawBoundary(
      //   this.gl,
      //   projectionMatrix,
      //   this.dimensionManager,
      //   this.shaderManager
      // );
    }

    // --- Update Overlays ---
    if (this.grid.flags.showIndices) {
      this.overlayManager.updateCellIndices(rectangles, this.grid, dimensions);
    } else {
      this.overlayManager.clearCellIndices();
    }

    if (this.grid.flags.showCellCenters) {
      this.overlayManager.updateCellCenters(rectangles, this.grid, dimensions);
    } else {
      this.overlayManager.clearCellCenters();
    }

    // --- Add Particle Drawing Logic ---
    // REMOVE THIS ENTIRE BLOCK
    // this._updateParticleData();
    // const particleProg = this.shaderManager.use('particles');
    // if (particleProg) { ... }
    // --- End Add Particle Drawing Logic ---

    // Draw Physics Boundary (If enabled)
    // ... (existing physics boundary draw logic) ...

    // Update Overlays
    // ... (existing overlay update logic) ...
  }

  renderCellsInstanced() {
    const gl = this.gl;
    const instanceCount = this.instanceData.count;

    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log(`GridGenRenderer.renderCellsInstanced() called. Count: ${instanceCount}, showGridCells: ${this.grid?.flags?.showGridCells}`); // Add log
    // <<< END MODIFIED

    if (instanceCount === 0) return; // Nothing to draw
    // REMOVED: if (!this.grid.flags.showGridCells) return; // Updated path: Skip drawing if grid is hidden

    const shaderInfo = this.shaderManager.use("gridCell");
    if (!shaderInfo) {
      console.error("Failed to activate 'gridCell' shader in renderCellsInstanced");
      return;
    }

    // --- Simplified Path (Removed diagnostic depth disable/enable) ---
    this.setupInstancedDrawing();

    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log(`GridGenRenderer.renderCellsInstanced(): About to call drawArraysInstanced. Count: ${instanceCount}`); // Add log
    // <<< END MODIFIED
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);

    // --- Cleanup GL State --- 
    if (shaderInfo) {
      // Disable instance attributes
      if (shaderInfo.attributes.instanceMatrix !== null && shaderInfo.attributes.instanceMatrix !== -1) {
        for (let i = 0; i < 4; ++i) gl.disableVertexAttribArray(shaderInfo.attributes.instanceMatrix + i);
      }
      if (shaderInfo.attributes.instanceColor !== null && shaderInfo.attributes.instanceColor !== -1) gl.disableVertexAttribArray(shaderInfo.attributes.instanceColor);
      if (shaderInfo.attributes.instanceShadowParams !== null && shaderInfo.attributes.instanceShadowParams !== -1) gl.disableVertexAttribArray(shaderInfo.attributes.instanceShadowParams);
      // Optionally disable position attribute too if GridRenderer always re-enables it (Let's disable it for safety)
      if (shaderInfo.attributes.position !== null && shaderInfo.attributes.position !== -1) gl.disableVertexAttribArray(shaderInfo.attributes.position);
    }
    // Unbind ARRAY_BUFFER as good practice
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // New method to prepare instance data arrays (Matrices, Shadows) - Called when geometry changes
  prepareInstanceData(rectangles) {
    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log(`prepareInstanceData Start: this.maxDensity = ${this.maxDensity}`); // Add log at method entry
    // <<< END MODIFIED
    const gl = this.gl;
    const visibleRects = rectangles; // Use all rectangles passed from GridGeometry

    // Ensure renderModes is available - STILL needed here for buffer sizing check?
    // No, buffer size depends on visibleRects.length (numInstances)
    // if (!this.renderModes) {
    //   console.error("prepareInstanceData: this.renderModes is not initialized.");
    //   this.instanceData.count = 0;
    //   return;
    // }
    // Ensure particleSystem is available - Not needed here anymore
    // if (!this.particleSystem) {
    //   console.error("prepareInstanceData: this.particleSystem is not initialized.");
    //   this.instanceData.count = 0;
    //   return;
    // }

    // REMOVE // Get data values first - Moved to updateInstanceColors
    // REMOVE const dataValues = this.renderModes ? this.renderModes.getValues(this.particleSystem) : null;
    // REMOVE if (!dataValues) {
    // REMOVE   console.warn("prepareInstanceData: dataValues not available from renderModes.");
    // REMOVE }

    const numInstances = visibleRects.length;
    this.instanceData.count = numInstances;

    if (numInstances === 0) {
      // Ensure buffers are cleared or handled if count is zero
      this.instanceData.matrices = null;
      this.instanceData.colors = null; // Still need to manage color array size
      this.instanceData.shadowParams = null;
      return; // Nothing to prepare
    }

    // Allocate typed arrays only if needed (size changed or first time)
    const requiredMatrixSize = numInstances * 16;
    if (!this.instanceData.matrices || this.instanceData.matrices.length !== requiredMatrixSize) {
      this.instanceData.matrices = new Float32Array(requiredMatrixSize);
    }

    const requiredColorSize = numInstances * 4;
    if (!this.instanceData.colors || this.instanceData.colors.length !== requiredColorSize) {
      // Allocate color buffer here, it will be populated per-frame
      this.instanceData.colors = new Float32Array(requiredColorSize);
    }

    const requiredShadowSize = numInstances * 3;
    if (!this.instanceData.shadowParams || this.instanceData.shadowParams.length !== requiredShadowSize) {
      this.instanceData.shadowParams = new Float32Array(requiredShadowSize);
    }

    // Default shadow parameters from grid config
    const shadowIntensity = this.grid.shadow?.shadowIntensity ?? 0.5;
    const blurAmount = this.grid.shadow?.blurAmount ?? 0.0;
    const shadowThreshold = this.grid.shadow?.shadowThreshold ?? 0.5;

    // Populate instance data arrays (Matrices and Shadows ONLY)
    const renderWidth = this.currentDimensions.renderWidth;
    const renderHeight = this.currentDimensions.renderHeight;

    // REMOVE Gradient checks - Moved to updateInstanceColors
    // REMOVE if (!this.gradient) { ... }
    // REMOVE const gradientValues = this.gradient?.getValues();
    // REMOVE if (!gradientValues) { ... }

    for (let i = 0; i < numInstances; i++) {
      const rect = visibleRects[i];
      const matrixOffset = i * 16;
      // REMOVE const colorOffset = i * 4; // Color handled separately
      const shadowOffset = i * 3;

      // 1. Calculate Transformation Matrix (Keep this)
      const matrix = mat4.create();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const clipX = (centerX / renderWidth) * 2.0 - 1.0;
      const clipY = -((centerY / renderHeight) * 2.0 - 1.0);
      mat4.translate(matrix, matrix, [clipX, clipY, 0]);
      const scaleX = rect.width / renderWidth;
      const scaleY = rect.height / renderHeight;
      mat4.scale(matrix, matrix, [scaleX, scaleY, 1]);
      this.instanceData.matrices.set(matrix, matrixOffset);

      // 2. REMOVE Color Calculation Logic - Moved to updateInstanceColors
      // REMOVE let finalColor = ...
      // REMOVE if (dataValues && gradientValues && ...) { ... }
      // REMOVE this.instanceData.colors.set(finalColor, colorOffset);

      // 3. Set Shadow Parameters (Keep this)
      this.instanceData.shadowParams[shadowOffset] = shadowIntensity;
      this.instanceData.shadowParams[shadowOffset + 1] = blurAmount;
      this.instanceData.shadowParams[shadowOffset + 2] = shadowThreshold;
    }

    // Upload data to GPU buffers (Matrices and Shadows ONLY)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceMatrixBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.matrices, gl.DYNAMIC_DRAW);

    // REMOVE gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
    // REMOVE gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.colors, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceShadowBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.shadowParams, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind
  }

  // New method to update instance colors per frame
  updateInstanceColors() {
    const gl = this.gl;
    const numInstances = this.instanceData.count;
    const useDataColors = this.grid.flags.showGridCells; // Determine mode based on flag

    // Ensure needed components are ready
    if (numInstances === 0 || !this.renderModes || !this.gradient || !this.instanceData.colors) {
      // console.warn("updateInstanceColors: Missing data, skipping color update.");
      return; // Skip update if data not ready
    }

    // Get latest data values and gradient lookup
    // Fetch dataValues only if needed
    const dataValues = useDataColors ? this.renderModes.getValues(this.particleSystem) : null;
    const gradientValues = this.gradient.getValues();
    const visibleRects = this.gridGeometry?.getGeometry()?.rectangles; // Need rectangles for index

    // Updated validation: dataValues only required if useDataColors is true
    if ((useDataColors && !dataValues) || !gradientValues || !visibleRects || visibleRects.length !== numInstances) {
      console.warn("updateInstanceColors: Data mismatch or missing, skipping color update.", { useDataColors, hasDataValues: !!dataValues, hasGradient: !!gradientValues, rectCount: visibleRects?.length, numInstances });
      return;
    }

    // Recalculate colors and populate the buffer array
    for (let i = 0; i < numInstances; i++) {
      const rect = visibleRects[i];
      const colorOffset = i * 4;
      let finalColor = [0.1, 0.1, 0.1, 1.0]; // Default fallback color

      if (useDataColors) {
        // --- Dynamic Color Logic (based on simulation data) ---
        if (rect.index !== undefined && dataValues && rect.index < dataValues.length) {
          const cellValue = dataValues[rect.index];
          const normalizationFactor = this.maxDensity || 1.0;
          const normalizedValue = Math.max(0, Math.min(1, cellValue / normalizationFactor));
          const gradientIdx = Math.min(255, Math.floor(normalizedValue * 256));
          const color = gradientValues[gradientIdx];
          if (color) {
            finalColor = [color.r, color.g, color.b, 1.0];
          }
        } else {
          // Fallback if index is bad or dataValues missing (shouldn't happen with check above, but safe)
          const fallbackIndex = rect.index !== undefined ? rect.index : i;
          const normalizedValue = numInstances > 1 ? fallbackIndex / (numInstances - 1) : 0;
          const gradientIdx = Math.min(255, Math.floor(normalizedValue * 256));
          const color = gradientValues[gradientIdx];
          if (color) {
            finalColor = [color.r, color.g, color.b, 1.0];
          }
        }
      } else {
        // --- Static Color Logic (based on index/position) ---
        const staticIndex = rect.index !== undefined ? rect.index : i;
        const normalizedValue = numInstances > 1 ? staticIndex / (numInstances - 1) : 0;
        const gradientIdx = Math.min(255, Math.floor(normalizedValue * 256));
        const color = gradientValues[gradientIdx];
        if (color) {
          finalColor = [color.r, color.g, color.b, 1.0];
        }
      }
      this.instanceData.colors.set(finalColor, colorOffset);
    }

    // Upload ONLY the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.colors, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind
  }

  // New method to set up attributes for instanced drawing
  setupInstancedDrawing() {
    const gl = this.gl;
    const programInfo = this.shaderManager.use("gridCell"); // Ensure shader is active
    if (!programInfo) {
      console.error("Failed to activate 'gridCell' shader in setupInstancedDrawing");
      return;
    }

    const positionLoc = programInfo.attributes.position;
    const matrixLoc = programInfo.attributes.instanceMatrix;
    const colorLoc = programInfo.attributes.instanceColor;
    const shadowParamsLoc = programInfo.attributes.instanceShadowParams;

    // Check if attribute locations are valid
    if (positionLoc === null || matrixLoc === null || colorLoc === null || shadowParamsLoc === null) {
      console.error("One or more attribute locations are null in setupInstancedDrawing", { positionLoc, matrixLoc, colorLoc, shadowParamsLoc });
      return;
    }

    // --- Setup Base Geometry Attribute (position) ---
    gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(
      positionLoc, // location
      2, // size (num components x, y)
      gl.FLOAT, // type
      false, // normalize
      0, // stride (0 = auto)
      0 // offset
    );
    gl.vertexAttribDivisor(positionLoc, 0); // Stays per vertex

    // --- Setup Instance Matrix Attribute (mat4) ---
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceMatrixBuffer);
    const bytesPerMatrix = 16 * Float32Array.BYTES_PER_ELEMENT;
    for (let i = 0; i < 4; ++i) {
      const loc = matrixLoc + i; // Locations are sequential for mat4
      const offset = i * 4 * Float32Array.BYTES_PER_ELEMENT; // Offset for vec4 column
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(
        loc, // location
        4, // size (num components vec4)
        gl.FLOAT, // type
        false, // normalize
        bytesPerMatrix, // stride (bytes per matrix)
        offset // offset (bytes to column i)
      );
      // This attribute should advance once per instance
      gl.vertexAttribDivisor(loc, 1);
    }

    // --- Setup Instance Color Attribute (vec4) ---
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(
      colorLoc, // location
      4, // size (num components r,g,b,a)
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0 // offset
    );
    gl.vertexAttribDivisor(colorLoc, 1); // Advance per instance

    // --- Setup Instance Shadow Params Attribute (vec3) ---
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceShadowBuffer);
    gl.enableVertexAttribArray(shadowParamsLoc);
    gl.vertexAttribPointer(
      shadowParamsLoc, // location
      3, // size (num components intensity, blur, threshold)
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0 // offset
    );
    gl.vertexAttribDivisor(shadowParamsLoc, 1); // Advance per instance

    // Unbind buffer (good practice)
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // --- Add createGridMap helper method ---
  createGridMap(rectangles) {
    // Guard against null or undefined rectangles
    if (!rectangles) {
      console.warn("createGridMap received null or undefined rectangles.");
      return [];
    }
    return rectangles.map((rect, index) => ({
      index,
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      // Ensure cellType exists, provide a default if not
      cellType: rect.cellType ?? 'unknown',
      contains: function (px, py) {
        // Quick check if point is inside rectangle bounds
        if (!this.bounds) return false; // Safety check
        if (
          px >= this.bounds.x &&
          px < this.bounds.x + this.bounds.width &&
          py >= this.bounds.y &&
          py < this.bounds.y + this.bounds.height
        ) {
          return true;
        }
        return false;
      }
    }));
  }
  // --- End createGridMap helper method ---

  // --- Add draw method for per-frame updates ---
  draw() {
    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log(`GridGenRenderer.draw() called. showGridCells: ${this.grid?.flags?.showGridCells}`); // Keep log
    // <<< END MODIFIED
    // REMOVED: if (!this.grid?.flags?.showGridCells) return; // Skip if grid hidden (check flags exist)

    // Ensure instance data is ready (check count)
    const numInstances = this.instanceData.count;
    if (numInstances === 0) return; // Nothing to draw

    // Update colors based on latest data (runs every frame)
    this.updateInstanceColors();

    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log(`GridGenRenderer.draw(): Calling renderCellsInstanced. Count: ${numInstances}`); // Keep log
    // <<< END MODIFIED

    // Draw the instanced cells using pre-prepared data (including colors from prepareInstanceData)
    this.renderCellsInstanced();

    // --- Update Overlays --- 
    const rectangles = this.gridGeometry?.getGeometry()?.rectangles;
    const dimensions = this.currentDimensions;

    if (this.grid?.flags?.showIndices && rectangles && dimensions && this.overlayManager) {
      this.overlayManager.updateCellIndices(rectangles, this.grid, dimensions);
    } else if (this.overlayManager) {
      this.overlayManager.clearCellIndices();
    }

    if (this.grid?.flags?.showCellCenters && rectangles && dimensions && this.overlayManager) {
      this.overlayManager.updateCellCenters(rectangles, this.grid, dimensions);
    } else if (this.overlayManager) {
      this.overlayManager.clearCellCenters();
    }
    // --- End Update Overlays ---
  }
  // --- End draw method ---

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    // >>> MODIFIED: Uncomment and wrap log
    if (this.debug.gridGenRenderer) console.log('GridGenRenderer.handleParamsUpdate called'); // Log entry
    // <<< END MODIFIED
    if (!simParams) return; // Guard clause

    if (simParams.rendering) {
      this.maxDensity = simParams.rendering.maxDensity ?? this.maxDensity;
      // >>> MODIFIED: Uncomment and wrap log
      if (this.debug.gridGenRenderer) console.log(`  Updated this.maxDensity to: ${this.maxDensity}`); // Log updated value
      // <<< END MODIFIED
      // Update render mode if needed
      if (this.renderModes && simParams.rendering.gridMode) {
        // Ensure the mode exists before assigning
        const isValidMode = Object.values(this.renderModes.modes).includes(simParams.rendering.gridMode);
        if (isValidMode) {
          this.renderModes.currentMode = simParams.rendering.gridMode;
          if (this.debug.gridGenRenderer) console.log(`GridGenRenderer: Set render mode to ${this.renderModes.currentMode}`);
        } else {
          console.warn(`GridGenRenderer: Invalid gridMode received: ${simParams.rendering.gridMode}`);
        }
      }
    }
    // Also update smoothing if renderModes exists
    if (simParams?.smoothing && this.renderModes?.smoothing) {
      this.renderModes.smoothing.rateIn = simParams.smoothing.rateIn ?? this.renderModes.smoothing.rateIn;
      this.renderModes.smoothing.rateOut = simParams.smoothing.rateOut ?? this.renderModes.smoothing.rateOut;
    }
  }
}
