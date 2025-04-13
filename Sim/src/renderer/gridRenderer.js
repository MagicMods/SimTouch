import { BaseRenderer } from "./baseRenderer.js";
import { GridRenderModes } from "./gridRenderModes_LEGACY.js";
import { Gradient } from "../shaders/gradients.js";
import { socketManager } from "../network/socketManager.js";
import { eventBus } from '../util/eventManager.js';

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);

    // Default target resolution
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;



    // Grid parameters (all in pixels)
    this.gridParams = {
      target: 341,
      gap: 1,
      aspectRatio: 1,
      scale: 0.974,      // Scale controls the classification radius (120 * scale)
      width: 10,
      height: 10,
      cols: 23,
      rows: 23,
      allowCut: 3,      // Controls how many corners can be outside the circle (0-3)
      showGrid: true,
      showCellCenters: false, // Whether to display cell centers
      showIndices: false,     // Whether to display cell indices
      shadowIntensity: 0.33,   // Shadow intensity (0-1)
      blurAmount: 0.4,        // Base blur amount (0-1)
      shadowThreshold: 0.0,   // Distance from edge where shadow starts (0-1)
      resolution: 240,        // Current resolution size
    };

    // Fixed masking radius - always 120 pixels regardless of scale
    this.FIXED_MASK_RADIUS = 120;

    // Density parameters
    this.minDensity = 0.0;
    this.maxDensity = 2.10;

    // Initialize systems
    this.gradient = new Gradient();

    // Create a div container for cell center indicators
    this.centerOverlay = document.createElement('div');
    this.centerOverlay.style.position = 'absolute';
    this.centerOverlay.style.top = '0';
    this.centerOverlay.style.left = '0';
    this.centerOverlay.style.width = `${this.TARGET_WIDTH}px`;
    this.centerOverlay.style.height = `${this.TARGET_HEIGHT}px`;
    this.centerOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.centerOverlay.style.overflow = 'hidden';
    this.centerOverlay.style.zIndex = '10'; // Make sure it's above the canvas

    // Create a div container for text indices
    this.textOverlay = document.createElement('div');
    this.textOverlay.style.position = 'absolute';
    this.textOverlay.style.top = '0';
    this.textOverlay.style.left = '0';
    this.textOverlay.style.width = `${this.TARGET_WIDTH}px`;
    this.textOverlay.style.height = `${this.TARGET_HEIGHT}px`;
    this.textOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.textOverlay.style.overflow = 'hidden';
    this.textOverlay.style.zIndex = '9'; // Below the cell centers

    // Insert the overlays after the canvas
    const canvas = gl.canvas;
    canvas.parentNode.insertBefore(this.centerOverlay, canvas.nextSibling);
    canvas.parentNode.insertBefore(this.textOverlay, canvas.nextSibling);

    // Generate initial grid - this will filter out 'outside' cells
    this.gridGeometry = this.generateRectangles();

    // Create grid map from already filtered cells
    this.gridMap = this.createGridMap(this.gridGeometry);

    // Initialize modes with grid data and maxDensity reference
    this.renderModes = new GridRenderModes({
      gridParams: this.gridParams,
      gridGeometry: this.gridGeometry,
      gridMap: this.gridMap,
      canvas: this.gl.canvas,
      coordTransforms: {
        pixelToClip: this.pixelToClipSpace.bind(this),
        clipToPixel: this.clipToPixelSpace.bind(this),
      },
      // Add this line to pass a reference to maxDensity
      maxDensityRef: () => this.maxDensity
    });

    this.socket = socketManager;
    this.socket.connect();

    // Debug output
    console.log("GridRenderer initialized:", {
      resolution: `${this.TARGET_WIDTH}x${this.TARGET_HEIGHT}`,
      cellSize: `${this.gridParams.width}x${this.gridParams.height}`,
      totalCells: this.gridGeometry.length,
      cellTypes: {
        inside: this.gridGeometry.filter(r => r.cellType === 'inside').length,
        boundary: this.gridGeometry.filter(r => r.cellType === 'boundary').length,
        outside: this.gridGeometry.filter(r => r.cellType === 'outside').length
      },
      maskRadius: this.FIXED_MASK_RADIUS,
      classificationRadius: 120 * this.gridParams.scale
    });

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
  }

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (!simParams) return; // Guard clause

    // Update rendering parameters
    if (simParams.rendering) {
      this.maxDensity = simParams.rendering.maxDensity ?? this.maxDensity;
      if (this.renderModes) {
        this.renderModes.currentMode = simParams.rendering.gridMode ?? this.renderModes.currentMode;
      }
    }

    // Update smoothing parameters
    if (simParams.smoothing && this.renderModes?.smoothing) {
      this.renderModes.smoothing.rateIn = simParams.smoothing.rateIn ?? this.renderModes.smoothing.rateIn;
      this.renderModes.smoothing.rateOut = simParams.smoothing.rateOut ?? this.renderModes.smoothing.rateOut;
    }
    // Optional: Log for verification
    // console.log("GridRenderer updated params via event:", this.maxDensity, this.renderModes?.currentMode, /*...*/);
  }

  sendGridData(byteArray) {
    if (this.socket.isConnected) {
      return this.socket.send(byteArray);
    }
    return false;
  }

  createGridMap(rectangles) {
    return rectangles.map((rect, index) => ({
      index,
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      cellType: rect.cellType,
      contains: function (px, py) {
        // Quick check if point is inside rectangle bounds
        if (
          px >= this.bounds.x &&
          px < this.bounds.x + this.bounds.width &&
          py >= this.bounds.y &&
          py < this.bounds.y + this.bounds.height
        ) {
          return true;
        }
        return false;
      },
      // Helper method to check if a point is inside a polygon - kept for compatibility
      pointInPolygon: function (px, py, polygon) {
        if (!polygon || polygon.length < 3) return false;

        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i].x, yi = polygon[i].y;
          const xj = polygon[j].x, yj = polygon[j].y;

          const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

          if (intersect) inside = !inside;
        }

        return inside;
      }
    }));
  }

  draw(particleSystem) {
    if (!particleSystem) return;

    // Make sure we're starting with a clean state
    const gl = this.gl;

    // Use existing grid geometry (which now contains only inside and boundary cells)
    const rectangles = this.gridGeometry;

    // Clear any existing overlays
    this.centerOverlay.innerHTML = '';
    this.textOverlay.innerHTML = '';

    // Get density values for all cells
    this.density = this.renderModes.getValues(particleSystem);

    if (this.socket.isConnected) {
      // Since we no longer have outside cells in gridGeometry, we can simplify this
      const byteArray = new Uint8Array(this.density.length + 1);

      // Set identifier byte (0) at the start
      byteArray[0] = 0;

      // Map values from [0,maxDensity] to [0,100], offset by 1 for identifier
      for (let i = 0; i < this.density.length; i++) {
        const normalizedValue = Math.max(
          0,
          Math.min(1, this.density[i] / this.maxDensity)
        );
        byteArray[i + 1] = Math.round(normalizedValue * 100);
      }
      this.sendGridData(byteArray);
    }

    // Map values to colors for all cells
    rectangles.forEach((rect, index) => {
      const value = this.density[index];

      // Use consistent normalization for all modes
      const normalizedValue = Math.max(0, Math.min(1, value / this.maxDensity));

      const gradientIdx = Math.floor(normalizedValue * 255);
      const colorValues = this.gradient.getValues();
      const color = colorValues[gradientIdx];

      rect.color = color
        ? [color.r, color.g, color.b, 1.0]
        : [0.2, 0.2, 0.2, 1.0]; // Dark grey for debugging
    });

    // Clear color buffer (stencil clear no longer needed)
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT); // Only clear color buffer

    // Conditionally draw the grid based on the showGrid flag
    if (this.gridParams.showGrid) {
      rectangles.forEach(rect => {
        this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
      });
    }

    // Draw cell centers if enabled
    if (this.gridParams.showCellCenters) {
      this.drawCellCenters();
    }

    // Draw cell indices if enabled
    if (this.gridParams.showIndices) {
      this.drawCellIndices();
    }
  }

  pixelToClipSpace(x, y) {
    return {
      x: (x / this.TARGET_WIDTH) * 2 - 1,
      y: -((y / this.TARGET_HEIGHT) * 2 - 1), // Flip Y coordinate
    };
  }

  clipToPixelSpace(x, y) {
    return {
      x: ((x + 1) / 2) * this.TARGET_WIDTH,
      y: ((-y + 1) / 2) * this.TARGET_HEIGHT,
    };
  }

  drawRectangle(x, y, width, height, color, clipPath) {
    const program = this.shaderManager.use("gridCell_LEGACY");
    if (!program) return;

    // If we have a clip path, draw as a clipped polygon
    if (clipPath && clipPath.length >= 3) {
      return this.drawClippedCell(clipPath, color);
    }

    // Convert positions from pixel to clip space
    const pos = this.pixelToClipSpace(x, y);
    const size = {
      width: (width / this.TARGET_WIDTH) * 2,
      height: (height / this.TARGET_HEIGHT) * 2,
    };

    // Calculate rectangle corners in clip space
    const x1 = pos.x;
    const y1 = pos.y;
    const x2 = pos.x + size.width;
    const y2 = pos.y - size.height; // Subtract height since Y is flipped

    // Create vertices in normalized space (0-1)
    const vertices = [
      0, 0,  // Top-left
      1, 0,  // Top-right
      0, 1,  // Bottom-left
      0, 1,  // Bottom-left
      1, 0,  // Top-right
      1, 1,  // Bottom-right
    ];

    // Create transformation matrix
    const transform = new Float32Array([
      size.width, 0, 0, 0,
      0, -size.height, 0, 0,
      0, 0, 1, 0,
      x1, y1, 0, 1
    ]);

    // Use temporary buffer for this single rectangle
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Set up attributes and uniforms
    this.gl.vertexAttribPointer(
      program.attributes.position,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.uniform4fv(program.uniforms.color, color);
    this.gl.uniformMatrix4fv(program.uniforms.uTransform, false, transform);
    this.gl.uniform1f(program.uniforms.shadowIntensity, this.gridParams.shadowIntensity);
    this.gl.uniform1f(program.uniforms.blurAmount, this.gridParams.blurAmount);
    this.gl.uniform1f(program.uniforms.shadowThreshold, this.gridParams.shadowThreshold);

    // Draw and cleanup
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.deleteBuffer(buffer);
  }


  generateRectangles() {
    let bestRects = [];
    const center = 120;

    // NOTE: For cell generation and classification, we use a scaled radius based on the scale parameter
    // The final visible boundary is always masked to exactly 120 pixels by the stencil buffer in draw()
    const radius = 120 * this.gridParams.scale;

    // allowCut: Controls how many corners of a cell can be outside the circle
    // 0: Only allows cells with center inside the circle (strict)
    // 1-3: Allows cells with 1-3 corners outside circle (more relaxed)
    const allowCut = this.gridParams.allowCut !== undefined ? this.gridParams.allowCut : 1;
    const boundaryMode = allowCut > 0 ? 'partial' : 'center';

    for (let cellH = 120; cellH >= 1; cellH--) {
      const scaledH = Math.max(1, Math.round(cellH * this.gridParams.scale));
      const scaledW = Math.max(
        1,
        Math.round(this.gridParams.aspectRatio * scaledH)
      );

      const stepX = scaledW + this.gridParams.gap;
      const stepY = scaledH + this.gridParams.gap;

      let maxCols = 0,
        maxRows = 0;
      while (Math.hypot(maxCols * stepX, 0) <= radius) maxCols++;
      while (Math.hypot(0, maxRows * stepY) <= radius) maxRows++;

      // Add extra columns and rows to catch partial cells at the boundary
      // Only if we're allowing cut cells (allowCut > 0)
      if (boundaryMode === 'partial') {
        maxCols += 1;
        maxRows += 1;
      }

      const cols = maxCols * 2 + 1;
      const rows = maxRows * 2 + 1;

      const rectangles = [];
      for (let c = -maxCols; c <= maxCols; c++) {
        for (let r = -maxRows; r <= maxRows; r++) {
          const dx = c * stepX;
          const dy = r * stepY;

          // Cell center position
          const cellCenterX = center + dx;
          const cellCenterY = center + dy;

          // Cell corners
          const cellLeft = cellCenterX - scaledW / 2;
          const cellRight = cellCenterX + scaledW / 2;
          const cellTop = cellCenterY - scaledH / 2;
          const cellBottom = cellCenterY + scaledH / 2;

          // Check if cell center is inside the circle
          const centerDist = Math.hypot(dx, dy);
          const centerInside = centerDist <= radius;

          // Determine corners and their positions relative to the circle
          let includeCell = centerInside;
          let cornersOutside = 0;

          if (boundaryMode === 'partial' && !centerInside) {
            const corners = [
              { x: cellLeft, y: cellTop },          // Top-left
              { x: cellRight, y: cellTop },         // Top-right
              { x: cellLeft, y: cellBottom },       // Bottom-left
              { x: cellRight, y: cellBottom }       // Bottom-right
            ];

            // Count corners outside the circle
            cornersOutside = corners.filter(corner =>
              Math.hypot(corner.x - center, corner.y - center) > radius
            ).length;

            // Check against the allowCut parameter (match exactly with gridGenRenderer.js)
            if (cornersOutside <= allowCut && cornersOutside < 4) {
              includeCell = true;
            }

            // Edge case: If all corners are outside but allowCut > 0, check if any edge 
            // actually intersects with the circle (could still be a valid boundary cell)
            if (!includeCell && cornersOutside === 4 && allowCut > 0) {
              const edges = [
                // Horizontal edges
                { x1: cellLeft, y1: cellTop, x2: cellRight, y2: cellTop }, // Top edge
                { x1: cellLeft, y1: cellBottom, x2: cellRight, y2: cellBottom }, // Bottom edge
                // Vertical edges
                { x1: cellLeft, y1: cellTop, x2: cellLeft, y2: cellBottom }, // Left edge
                { x1: cellRight, y1: cellTop, x2: cellRight, y2: cellBottom }  // Right edge
              ];

              // Check if any edge intersects the circle
              const edgeIntersects = edges.some(edge =>
                this.lineIntersectsCircle(
                  edge.x1, edge.y1, edge.x2, edge.y2,
                  center, center, radius
                )
              );

              includeCell = edgeIntersects;
            }
          }

          // Only add cells that pass the inclusion criteria
          if (includeCell) {
            rectangles.push({
              x: Math.round(cellLeft),
              y: Math.round(cellTop),
              width: scaledW,
              height: scaledH,
              color: [0.5, 0.5, 0.5, 1],
              cellType: 'unknown', // Will be classified later
              cornersOutside: cornersOutside,
              cornersInside: 4 - cornersOutside
            });
          }
        }
      }

      // Classify cells
      this.classifyCells(rectangles, allowCut);

      // Log pre-filter cell counts for debugging
      const preFilterTotal = rectangles.length;
      const preFilterInside = rectangles.filter(r => r.cellType === 'inside').length;
      const preFilterBoundary = rectangles.filter(r => r.cellType === 'boundary').length;
      const preFilterOutside = rectangles.filter(r => r.cellType === 'outside').length;

      // CRITICAL CHANGE: Filter out 'outside' cells immediately after classification
      const filteredRectangles = rectangles.filter(rect =>
        rect.cellType === 'inside' || rect.cellType === 'boundary'
      );

      // // Log post-filter cell counts for debugging
      // console.log("Grid cell filtering:", {
      //   preFilter: { total: preFilterTotal, inside: preFilterInside, boundary: preFilterBoundary, outside: preFilterOutside },
      //   postFilter: {
      //     total: filteredRectangles.length, inside: filteredRectangles.filter(r => r.cellType === 'inside').length,
      //     boundary: filteredRectangles.filter(r => r.cellType === 'boundary').length
      //   }
      // });

      if (filteredRectangles.length >= this.gridParams.target) {
        this.gridParams.cols = cols;
        this.gridParams.rows = rows;
        this.gridParams.width = scaledW;
        this.gridParams.height = scaledH;

        return filteredRectangles.slice(0, this.gridParams.target);
      }

      if (filteredRectangles.length > bestRects.length) {
        bestRects = filteredRectangles;
        this.gridParams.cols = cols;
        this.gridParams.rows = rows;
        this.gridParams.width = scaledW;
        this.gridParams.height = scaledH;
      }
    }

    return bestRects.slice(0, this.gridParams.target);
  }

  // Classify cells as inside, boundary, or outside - match logic exactly with gridGenRenderer.js
  classifyCells(rectangles, allowCut = 1) {
    const CENTER_X = 120;
    const CENTER_Y = 120;
    const RADIUS = 120 * this.gridParams.scale;

    rectangles.forEach(rect => {
      // Cell corners
      const corners = [
        { x: rect.x, y: rect.y }, // Top-left
        { x: rect.x + rect.width, y: rect.y }, // Top-right
        { x: rect.x, y: rect.y + rect.height }, // Bottom-left
        { x: rect.x + rect.width, y: rect.y + rect.height } // Bottom-right
      ];

      // Cell center
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const centerDist = Math.hypot(centerX - CENTER_X, centerY - CENTER_Y);

      // Count corners outside circle
      const cornersOutside = corners.filter(corner =>
        Math.hypot(corner.x - CENTER_X, corner.y - CENTER_Y) > RADIUS
      ).length;

      // Count corners inside circle
      const cornersInside = 4 - cornersOutside;

      // Check if any edge intersects the circle (for edge case with allowCut=0)
      let edgeIntersectsCircle = false;

      if (cornersInside === 0 && allowCut > 0) {
        const edges = [
          // Horizontal edges
          { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y },
          { x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height },
          // Vertical edges
          { x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height },
          { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }
        ];

        edgeIntersectsCircle = edges.some(edge =>
          this.lineIntersectsCircle(
            edge.x1, edge.y1, edge.x2, edge.y2,
            CENTER_X, CENTER_Y, RADIUS
          )
        );
      }

      // Classify the cell based on corners outside and allowCut
      if (cornersOutside === 0) {
        // Cell is fully inside the circle (all 4 corners inside)
        rect.cellType = 'inside';
      } else if (
        // Allow cell if it has center inside OR
        // if the number of corners outside is <= allowCut
        (centerDist <= RADIUS) ||
        (cornersOutside <= allowCut && allowCut > 0) ||
        (allowCut > 0 && edgeIntersectsCircle)
      ) {
        // Cell is on the boundary based on corner count criteria
        rect.cellType = 'boundary';
      } else {
        // Cell is outside or has too many corners outside
        rect.cellType = 'outside';
      }

      // Store the corner counts for debugging
      rect.cornersInside = cornersInside;
      rect.cornersOutside = cornersOutside;
    });
  }

  // Helper method to determine if a line segment intersects with a circle
  lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
    // Calculate the closest point on the line to the circle center
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction vector
    const nx = dx / len;
    const ny = dy / len;

    // Vector from line start to circle center
    const vx = cx - x1;
    const vy = cy - y1;

    // Project this vector onto the line direction
    const projection = vx * nx + vy * ny;

    // Clamp projection to line segment
    const projectionClamped = Math.max(0, Math.min(len, projection));

    // Calculate closest point on line
    const closestX = x1 + projectionClamped * nx;
    const closestY = y1 + projectionClamped * ny;

    // Check if closest point is within radius
    return Math.hypot(closestX - cx, closestY - cy) <= r;
  }

  updateGrid(newParams) {
    // Log the current parameters and what's changing
    console.log("Updating grid parameters:", {
      current: { ...this.gridParams },
      new: { ...newParams }
    });

    // Update grid parameters
    Object.assign(this.gridParams, newParams);

    // Regenerate grid - cells are already filtered to only inside and boundary
    this.gridGeometry = this.generateRectangles();

    // Create gridMap from the filtered geometry (no filtering needed again)
    this.gridMap = this.createGridMap(this.gridGeometry);

    // Update renderModes with new grid
    this.renderModes.updateGrid({
      gridParams: this.gridParams,
      gridGeometry: this.gridGeometry,
      gridMap: this.gridMap,
    });

    // Clear any existing overlays
    this.centerOverlay.innerHTML = '';
    this.textOverlay.innerHTML = '';

    // Log details about the new grid
    console.log("Grid updated - final counts:", {
      totalCells: this.gridGeometry.length,
      insideCells: this.gridGeometry.filter(r => r.cellType === 'inside').length,
      boundaryCells: this.gridGeometry.filter(r => r.cellType === 'boundary').length,
      outsideCells: this.gridGeometry.filter(r => r.cellType === 'outside').length // Should be 0
    });

    // If cell centers are enabled, update them right away
    if (this.gridParams.showCellCenters) {
      this.drawCellCenters();
    }

    // If cell indices are enabled, update them right away
    if (this.gridParams.showIndices) {
      this.drawCellIndices();
    }
  }

  // Method to draw cell centers
  drawCellCenters() {
    // Update overlay position to match canvas
    const canvas = this.gl.canvas;
    this.centerOverlay.style.top = `${canvas.offsetTop}px`;
    this.centerOverlay.style.left = `${canvas.offsetLeft}px`;
    this.centerOverlay.style.width = `${canvas.width}px`;
    this.centerOverlay.style.height = `${canvas.height}px`;

    // Calculate the scaling ratio between our fixed target size and actual canvas size
    const scaleX = canvas.width / this.TARGET_WIDTH;
    const scaleY = canvas.height / this.TARGET_HEIGHT;

    // Clear any existing content
    this.centerOverlay.innerHTML = '';

    // All cells in this.gridGeometry are now guaranteed to be inside or boundary cells
    // No need to filter again
    const visibleCells = this.gridGeometry;

    // Create center indicators for each cell
    visibleCells.forEach(rect => {
      // Calculate center position in target coordinates (240x240)
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      // Scale the position to match actual canvas size
      const scaledX = centerX * scaleX;
      const scaledY = centerY * scaleY;

      // Create the center dot
      const dot = document.createElement('div');
      dot.style.position = 'absolute';
      dot.style.left = `${scaledX}px`;
      dot.style.top = `${scaledY}px`;
      dot.style.width = '3px';
      dot.style.height = '3px';
      dot.style.backgroundColor = rect.cellType === 'inside' ? 'lime' : 'red';
      dot.style.borderRadius = '50%';
      dot.style.transform = 'translate(-50%, -50%)';
      dot.style.pointerEvents = 'none';
      dot.style.boxShadow = '0 0 2px rgba(0,0,0,0.8)';

      // Add a class based on the cell type for styling
      dot.classList.add(`cell-center-${rect.cellType}`);

      this.centerOverlay.appendChild(dot);
    });
  }

  drawCellIndices() {
    // Update overlay position to match canvas
    const canvas = this.gl.canvas;
    this.textOverlay.style.top = `${canvas.offsetTop}px`;
    this.textOverlay.style.left = `${canvas.offsetLeft}px`;
    this.textOverlay.style.width = `${canvas.width}px`;
    this.textOverlay.style.height = `${canvas.height}px`;

    // Calculate the scaling ratio between our fixed target size and actual canvas size
    const scaleX = canvas.width / this.TARGET_WIDTH;
    const scaleY = canvas.height / this.TARGET_HEIGHT;

    // Clear any existing content
    this.textOverlay.innerHTML = '';

    // All cells in this.gridGeometry are now guaranteed to be inside or boundary cells
    // No need to filter again
    const visibleCells = this.gridGeometry;

    // Create index labels for each cell
    visibleCells.forEach((rect, index) => {
      // Calculate center position in target coordinates (240x240)
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      // Scale the position to match actual canvas size
      const scaledX = centerX * scaleX;
      const scaledY = centerY * scaleY;

      // Calculate font size based on cell dimensions and scaling
      const cellSize = Math.min(rect.width, rect.height);
      const fontSize = Math.max(5.5, Math.min(12, cellSize / 3.5)) * Math.min(scaleX, scaleY);

      // Scale the width and height to match actual canvas size
      const scaledWidth = rect.width * scaleX;
      const scaledHeight = rect.height * scaleY;

      // Create the index label
      const label = document.createElement('div');
      label.textContent = index.toString(); // Use current index in the filtered array
      label.style.position = 'absolute';
      label.style.left = `${scaledX}px`;
      label.style.top = `${scaledY}px`;
      label.style.transform = 'translate(-50%, -50%)';
      label.style.color = 'yellow'; // Default to yellow for indices
      label.style.fontSize = `${fontSize}px`;
      label.style.fontFamily = 'Arial, sans-serif';
      label.style.textAlign = 'center';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'center';
      label.style.width = `${scaledWidth}px`;
      label.style.height = `${scaledHeight}px`;
      label.style.userSelect = 'none';
      label.style.pointerEvents = 'none';
      label.style.margin = '0';
      label.style.padding = '0';

      // Add outline effect to make text more readable on any background
      label.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7), -1px -1px 1px rgba(0,0,0,0.7), 1px -1px 1px rgba(0,0,0,0.7), -1px 1px 1px rgba(0,0,0,0.7)';

      this.textOverlay.appendChild(label);
    });
  }
}

export { GridRenderer };
