import { BaseRenderer } from "./baseRenderer.js";
import * as mat4 from "gl-matrix/mat4.js";
import { GridGeometry } from "../coreGrid/gridGeometry.js";
import { OverlayManager } from "./overlayRenderer.js";

export class GridGenRenderer extends BaseRenderer {
  constructor(gl, shaderManager, gridConfig, shapeBoundary, physicsBoundary) {
    super(gl, shaderManager);

    this.gl = gl;
    this.shaderManager = shaderManager;

    // Initialize this.grid with the initial config object reference
    this.grid = gridConfig || {}; // Use passed config or default to empty object

    // Store initial boundary references (can be null initially)
    this.shapeBoundary = shapeBoundary;
    this.physicsBoundary = physicsBoundary;

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
    this.overlayManager = new OverlayManager(gl.canvas); // Instantiate OverlayManager
    this.gridGeometry = new GridGeometry(); // Instantiate GridGeometry
    this.initBuffers();
    this.currentDimensions = { renderWidth: 0, renderHeight: 0 }; // Initialize dimensions

    // Bind methods
    this.setGrid = this.setGrid.bind(this);
    this.updateGridGeometryAndRender = this.updateGridGeometryAndRender.bind(this);
    this.updateRenderables = this.updateRenderables.bind(this);
    this.prepareInstanceData = this.prepareInstanceData.bind(this);
    this.setupInstancedDrawing = this.setupInstancedDrawing.bind(this);
    this.renderCellsInstanced = this.renderCellsInstanced.bind(this);

    console.debug("GridGenRenderer constructor completed.");

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

    // Boundaries are now managed externally and passed via setGrid
    this.projectionMatrix = mat4.create();
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
    // console.log("Renderer setGrid: Received gridConfig.shadow:", JSON.stringify(newGridConfig?.shadow));
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
    // console.debug("updateGridGeometryAndRender called with screen:", this.grid.screen);

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

    // Trigger the rendering pipeline with the generated rectangles
    this.updateRenderables(generatedRectangles, dimensions);
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
    const finalCellColor = [...cellColor, 1.0]; // Add alpha
    this.prepareInstanceData(rectangles, finalCellColor);
    this.renderCellsInstanced();

    // --- Calculate Projection Matrix ---
    const projectionMatrix = mat4.create();

    const renderWidth = dimensions.renderWidth;
    const renderHeight = dimensions.renderHeight;
    mat4.ortho(projectionMatrix, 0, renderWidth, 0, renderHeight, -1, 1);

    // Draw physics boundary (if enabled)
    if (this.grid.flags.showBoundary && this.physicsBoundary) {
      // console.log('Drawing physics boundary');
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

    if (instanceCount === 0) return; // Nothing to draw
    if (!this.grid.flags.showGridCells) return; // Updated path: Skip drawing if grid is hidden

    const shaderInfo = this.shaderManager.use("gridCell");
    if (!shaderInfo) {
      console.error("Failed to activate 'gridCell' shader in renderCellsInstanced");
      return;
    }

    // --- Simplified Path (Removed diagnostic depth disable/enable) ---
    this.setupInstancedDrawing();

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
  }

  // New method to prepare instance data arrays and upload to GPU buffers
  prepareInstanceData(rectangles, finalCellColor) {
    const gl = this.gl;
    const visibleRects = rectangles; // Use all rectangles passed from GridGeometry

    const numInstances = visibleRects.length;
    this.instanceData.count = numInstances;

    if (numInstances === 0) {
      // Ensure buffers are cleared or handled if count is zero
      this.instanceData.matrices = null;
      this.instanceData.colors = null;
      this.instanceData.shadowParams = null;
      return; // Nothing to prepare
    }

    // Allocate typed arrays only if needed (size changed or first time)
    // Check existing array length vs required length
    const requiredMatrixSize = numInstances * 16;
    if (!this.instanceData.matrices || this.instanceData.matrices.length !== requiredMatrixSize) {
      this.instanceData.matrices = new Float32Array(requiredMatrixSize);
    }

    const requiredColorSize = numInstances * 4;
    if (!this.instanceData.colors || this.instanceData.colors.length !== requiredColorSize) {
      this.instanceData.colors = new Float32Array(requiredColorSize);
    }

    const requiredShadowSize = numInstances * 3;
    if (!this.instanceData.shadowParams || this.instanceData.shadowParams.length !== requiredShadowSize) {
      this.instanceData.shadowParams = new Float32Array(requiredShadowSize);
    }

    // Default shadow parameters from grid config (NOW NESTED) or defaults
    const shadowIntensity = this.grid.shadow?.shadowIntensity ?? 0.5; // Updated path
    const blurAmount = this.grid.shadow?.blurAmount ?? 0.0; // Updated path
    const shadowThreshold = this.grid.shadow?.shadowThreshold ?? 0.5; // Updated path

    // Populate instance data arrays
    // Get render dimensions for clip space conversion
    const renderWidth = this.currentDimensions.renderWidth;
    const renderHeight = this.currentDimensions.renderHeight;

    for (let i = 0; i < numInstances; i++) {
      const rect = visibleRects[i];
      const matrixOffset = i * 16;
      const colorOffset = i * 4;
      const shadowOffset = i * 3;

      // 1. Calculate Transformation Matrix
      const matrix = mat4.create(); // Create identity matrix
      // Translate to center position (rect coords are render space)
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      // Convert render coords to clip space (-1 to +1)
      const clipX = (centerX / renderWidth) * 2.0 - 1.0;
      const clipY = -((centerY / renderHeight) * 2.0 - 1.0); // Y is inverted
      mat4.translate(matrix, matrix, [clipX, clipY, 0]);

      // Scale based on render dimensions
      const scaleX = rect.width / renderWidth; // Use render width/height
      const scaleY = rect.height / renderHeight;
      mat4.scale(matrix, matrix, [scaleX, scaleY, 1]);

      // Copy matrix data into the flat array using set
      this.instanceData.matrices.set(matrix, matrixOffset);

      // 2. Determine Color - Use the passed-in finalCellColor for all instances
      this.instanceData.colors.set(finalCellColor, colorOffset);

      // 3. Set Shadow Parameters
      this.instanceData.shadowParams[shadowOffset] = shadowIntensity;
      this.instanceData.shadowParams[shadowOffset + 1] = blurAmount;
      this.instanceData.shadowParams[shadowOffset + 2] = shadowThreshold;
    }

    // Upload data to GPU buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceMatrixBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.matrices, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.colors, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceShadowBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.shadowParams, gl.DYNAMIC_DRAW);

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

  // --- Add Particle Data Update Method ---
  // REMOVE THE ENTIRE _updateParticleData METHOD
  // _updateParticleData() { ... }
  // --- End Add Particle Data Update Method ---
}
