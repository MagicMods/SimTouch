import { BaseRenderer } from "./baseRenderer.js";
import { GridRenderModes } from "./gridRenderModes.js";
import { Gradient } from "../shaders/gradients.js";
import { socketManager } from "../network/socketManager.js";

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
      scale: 0.98,      // Scale controls the classification radius (120 * scale)
      width: 10,
      height: 10,
      cols: 23,
      rows: 23,
      allowCut: 3,      // Controls how many corners can be outside the circle (0-3)
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
    const program = this.shaderManager.use("basic");
    if (!program || !particleSystem) return;

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

    // Set up variables for circle mask
    const center = 120;

    // Use the fixed mask radius constant (always 120)
    const maskRadius = this.FIXED_MASK_RADIUS;

    // Clear both color and stencil buffers
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // ---- Stencil buffer setup matching GridGenRenderer.js exactly ----
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.stencilMask(0xFF);

    // First pass: Draw the circle into the stencil buffer (but don't show it)
    gl.colorMask(false, false, false, false); // Don't draw to color buffer
    this.drawCircle(center, center, maskRadius, [1, 1, 1, 1]);

    // Second pass: Only draw where the stencil is 1 (inside circle)
    gl.colorMask(true, true, true, true); // Re-enable drawing to color buffer
    gl.stencilFunc(gl.EQUAL, 1, 0xFF);    // Draw only where stencil is 1
    gl.stencilMask(0x00);                 // Don't modify stencil buffer

    // Draw each rectangle, applying the stencil mask
    // We can draw all rectangles now since they're all inside or boundary cells
    rectangles.forEach(rect => {
      this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
    });

    // Disable stencil test when done
    gl.disable(gl.STENCIL_TEST);

    // Draw cell centers if enabled
    if (this.gridParams.showCellCenters) {
      this.drawCellCenters();
    }

    // Draw cell indices if enabled
    if (this.gridParams.showIndices) {
      this.drawCellIndices();
    }
  }

  ///////////////////////////////////////////////////

  drawCircle(x, y, radius, color) {
    const program = this.shaderManager.use("basic");
    if (!program) return;

    // Convert center and radius from normalized (0-1) to clip space (-1 to 1)
    const center = this.pixelToClipSpace(x, y);
    const radiusClip = (radius / this.TARGET_WIDTH) * 2;

    // Generate circle vertices
    const numSegments = 32; // Adjust for quality/performance
    const vertices = [];

    // Center vertex
    vertices.push(center.x, center.y);

    // Circumference vertices
    for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      vertices.push(
        center.x + radiusClip * Math.cos(angle),
        center.y + radiusClip * Math.sin(angle)
      );
    }

    // Create and bind temporary buffer
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

    // Enable blending for transparency
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Draw using TRIANGLE_FAN
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);

    // Cleanup
    this.gl.disable(this.gl.BLEND);
    this.gl.deleteBuffer(buffer);
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
    const program = this.shaderManager.use("gridCell");
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

  drawDebugIndexes() {
    const program = this.shaderManager.use("basic");
    if (!program) return;

    // Use existing grid geometry
    const rectangles = this.gridGeometry;

    // Fill each cell with a color based on its index
    rectangles.forEach((rect, index) => {
      // Rainbow color based on index
      const hue = (index / this.gridParams.target) * 360;
      const color = this.hueToRgb(hue);

      // Draw rectangle with index color
      this.drawRectangle(rect.x, rect.y, rect.width, rect.height, color);

      // For additional clarity, add index numbers
    });

    // Save a reference image to compare with the microcontroller output
    console.log("Debug index visualization complete");
  }

  // Debug method to visualize boundary cells and their corner counts
  drawDebugBoundary() {
    const program = this.shaderManager.use("basic");
    if (!program) return;

    // Use existing grid geometry - there should no longer be any 'outside' cells
    const rectangles = this.gridGeometry;

    // Clear canvas - consistent with how we clear in the main draw method
    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

    // Draw reference circles
    const center = 120;

    // Use the fixed mask radius constant (always 120)
    const fixedRadius = this.FIXED_MASK_RADIUS;

    // Draw the fixed boundary circle (white outline)
    this.drawCircle(center, center, fixedRadius, [0.4, 0.4, 0.4, 1.0]);

    // Draw the scaled circle used for cell classification if different from fixed
    const scaledRadius = 120 * this.gridParams.scale;
    if (Math.abs(scaledRadius - fixedRadius) > 0.01) {
      // Only draw if different from fixed radius (yellow outline)
      this.drawCircle(center, center, scaledRadius, [0.6, 0.6, 0.2, 0.6]);
    }

    // Count cells by classification and corner status
    let insideTotal = 0;
    let boundaryTotal = 0;
    let outsideTotal = 0;
    const boundaryCounts = [0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4 corners outside

    console.log("DETAILED DEBUG - Grid cells analysis:");
    console.log(`Grid has ${rectangles.length} cells in total, allowCut = ${this.gridParams.allowCut}`);
    console.log(`Classification radius: ${scaledRadius}px, Display mask radius: ${fixedRadius}px`);

    // Check each cell and log statistics
    const cellTypesCount = {
      inside: rectangles.filter(r => r.cellType === 'inside').length,
      boundary: rectangles.filter(r => r.cellType === 'boundary').length,
      outside: rectangles.filter(r => r.cellType === 'outside').length,
      unknown: rectangles.filter(r => r.cellType === 'unknown').length
    };

    console.log("Cell types distribution:", cellTypesCount);

    // Log any outside cells (shouldn't exist if our filtering is working)
    const outsideCells = rectangles.filter(r => r.cellType === 'outside');
    if (outsideCells.length > 0) {
      console.warn("ERROR: Found 'outside' cells that should have been filtered!");
      console.warn("First 5 outside cells:", outsideCells.slice(0, 5));
    }

    // Color cells based on their type and corner count
    rectangles.forEach((rect) => {
      let color;

      // Debug - log detailed info about each cell
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const centerDist = Math.hypot(centerX - center, centerY - center);
      const insideFixedCircle = centerDist <= fixedRadius;
      const insideScaledCircle = centerDist <= scaledRadius;

      if (rect.cellType === 'inside') {
        // Inside cells: green
        color = [0.2, 0.6, 0.2, 1.0];
        insideTotal++;
      } else if (rect.cellType === 'boundary') {
        // Boundary cells: color based on corners outside (red gradient)
        const cornersOutside = rect.cornersOutside || 0;
        boundaryTotal++;
        boundaryCounts[cornersOutside]++;

        switch (cornersOutside) {
          case 1:
            color = [0.5, 0.2, 0.2, 1.0]; // Light red
            break;
          case 2:
            color = [0.7, 0.2, 0.2, 1.0]; // Medium red
            break;
          case 3:
            color = [0.9, 0.2, 0.2, 1.0]; // Bright red
            break;
          case 4:
            color = [1.0, 0.0, 0.0, 1.0]; // Full red (edge case)
            break;
          default:
            color = [0.3, 0.3, 0.6, 1.0]; // Blue for unusual cases
        }
      } else if (rect.cellType === 'outside') {
        // Outside cells: magenta with transparency - this should never happen now
        // that we filter at generation time
        color = [1.0, 0.0, 1.0, 0.7]; // Make it highly visible as an error state
        outsideTotal++;

        // Log detailed diagnostic info about any outside cells found
        console.error("ERROR - Found outside cell:", {
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          center: { x: centerX, y: centerY, dist: centerDist },
          circle: { radius: scaledRadius, insideScaled: insideScaledCircle, insideFixed: insideFixedCircle },
          corners: { inside: rect.cornersInside, outside: rect.cornersOutside }
        });
      } else {
        // Unknown classification (should never happen)
        color = [0.0, 1.0, 1.0, 0.9]; // Cyan for errors - make it highly visible
        console.error("ERROR - Found cell with unknown type:", rect);
      }

      // Draw the cell - all as normal rectangles
      this.drawRectangle(rect.x, rect.y, rect.width, rect.height, color);
    });

    console.log("Debug boundary visualization summary:");
    console.log(`Inside cells: ${insideTotal}, Boundary cells: ${boundaryTotal}, Outside cells: ${outsideTotal}`);
    console.log(`Boundary corners outside: 0=${boundaryCounts[0]}, 1=${boundaryCounts[1]}, 2=${boundaryCounts[2]}, 3=${boundaryCounts[3]}, 4=${boundaryCounts[4]}`);

    if (outsideTotal > 0) {
      console.error(`CRITICAL ERROR: ${outsideTotal} cells are classified as 'outside' but still present in the grid! The filtering in generateRectangles() is not working correctly.`);
    } else {
      console.log("SUCCESS: No outside cells found - grid filtering is working correctly!");
    }

    // Check if cells match the target count
    if (this.gridGeometry.length < this.gridParams.target) {
      console.warn(`NOTE: Only ${this.gridGeometry.length} cells present (target: ${this.gridParams.target}). Not enough cells may be available after filtering.`);
    }
  }

  // Helper function to convert hue to RGB
  hueToRgb(hue) {
    const h = hue / 60;
    const c = 1;
    const x = c * (1 - Math.abs((h % 2) - 1));

    let r, g, b;
    if (h >= 0 && h < 1) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 1 && h < 2) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 2 && h < 3) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 3 && h < 4) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 4 && h < 5) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    return [r, g, b, 1.0];
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
