import { BaseRenderer } from "./baseRenderer.js";
import { GridRenderModes } from "./gridRenderModes.js";
import { Gradient } from "../shaders/gradients.js";
import { socketManager } from "../network/socketManager.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);

    // Fixed target resolution
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;

    // Grid parameters (all in pixels)
    this.gridParams = {
      target: 341,
      gap: 1,
      aspectRatio: 1,
      scale: 0.95,      // Scale controls the classification radius (120 * scale)
      width: 10,
      height: 10,
      cols: 23,
      rows: 23,
      allowCut: 3,      // Controls how many corners can be outside the circle (0-3)
    };

    // Fixed masking radius - always 120 pixels regardless of scale
    this.FIXED_MASK_RADIUS = 120;

    // Density parameters
    this.minDensity = 0.0;
    this.maxDensity = 2.10;

    // Initialize systems
    this.gradient = new Gradient();

    // Generate initial grid
    this.gridGeometry = this.generateRectangles();
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
      totalCells: this.gridParams.target,
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
      isBoundary: rect.isBoundary,
      cellType: rect.cellType || (rect.isBoundary ? 'boundary' : 'inside'),
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

    // Use existing grid geometry
    const rectangles = this.gridGeometry;

    // Get density values
    this.density = this.renderModes.getValues(particleSystem);

    if (this.socket.isConnected) {
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

    // Map values to colors
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

    // Clear both color and stencil buffers - match GridGenRenderer approach
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // ---- Stencil buffer setup matching GridGenRenderer.js ----
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.stencilMask(0xFF);

    // First pass: Draw the circle into the stencil buffer (but don't show it)
    // Use fixed mask radius for stencil buffer
    gl.colorMask(false, false, false, false); // Don't draw to color buffer
    this.drawCircle(center, center, maskRadius, [1, 1, 1, 1]);

    // Second pass: Only draw where the stencil is 1 (inside circle)
    gl.colorMask(true, true, true, true); // Re-enable drawing to color buffer
    gl.stencilFunc(gl.EQUAL, 1, 0xFF);    // Draw only where stencil is 1
    gl.stencilMask(0x00);                 // Don't modify stencil buffer

    // Draw all rectangles - they will be masked to the circle
    rectangles.forEach((rect) => {
      // Draw only cells that should be visible (inside or boundary)
      if (rect.cellType !== 'outside') {
        this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
      }
    });

    // Cleanup - disable stencil test
    gl.disable(gl.STENCIL_TEST);
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
    const program = this.shaderManager.use("basic");
    if (!program) return;

    // If we have a clip path, draw as a clipped polygon
    if (clipPath && clipPath.length >= 3) {
      return this.drawClippedCell(clipPath, color);
    }

    // Regular rectangle drawing (existing code)
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

    const vertices = [
      x1, y1, // Top-left
      x2, y1, // Top-right
      x1, y2, // Bottom-left
      x1, y2, // Bottom-left
      x2, y1, // Top-right
      x2, y2, // Bottom-right
    ];

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

    // Draw and cleanup
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.gl.deleteBuffer(buffer);
  }

  // Method to draw cells with clip paths - Kept for compatibility
  drawClippedCell(clipPath, color) {
    // Simply log a deprecation warning - no fallback needed
    console.warn("drawClippedCell is deprecated. Using stencil buffer masking instead.");

    // Don't do anything if clipPath is invalid
    if (!clipPath || clipPath.length < 3) return;

    // Fallback: Draw an approximation by getting the bounding box of the clip path
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    clipPath.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;

    // Draw rectangle with provided color
    this.drawRectangle(minX, minY, width, height, color);
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
    const allowCut = this.gridParams.allowCut !== undefined ? this.gridParams.allowCut : 3;
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

          // Cell boundaries
          const cellLeft = cellCenterX - scaledW / 2;
          const cellRight = cellCenterX + scaledW / 2;
          const cellTop = cellCenterY - scaledH / 2;
          const cellBottom = cellCenterY + scaledH / 2;

          // Cell center distance from circle center
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

            // Check against the allowCut parameter
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

          if (includeCell) {
            const rect = {
              x: Math.round(cellLeft),
              y: Math.round(cellTop),
              width: scaledW,
              height: scaledH,
              color: [1, 1, 1, 1],
              cornersOutside: cornersOutside, // Store for debugging and classification
              cornersInside: 4 - cornersOutside
            };

            rectangles.push(rect);
          }
        }
      }

      if (rectangles.length >= this.gridParams.target) {
        this.gridParams.cols = cols;
        this.gridParams.rows = rows;
        this.gridParams.width = scaledW;
        this.gridParams.height = scaledH;

        // Classify cells (inside, boundary, outside)
        this.classifyCells(rectangles, allowCut);

        return rectangles.slice(0, this.gridParams.target);
      }

      if (rectangles.length > bestRects.length) {
        bestRects = rectangles;
        this.gridParams.cols = cols;
        this.gridParams.rows = rows;
        this.gridParams.width = scaledW;
        this.gridParams.height = scaledH;
      }
    }

    // Classify cells in best result
    this.classifyCells(bestRects, allowCut);

    return bestRects.slice(0, this.gridParams.target);
  }

  // Classify cells as inside, boundary, or outside
  classifyCells(rectangles, allowCut = 3) {
    const CENTER_X = 120;
    const CENTER_Y = 120;

    // NOTE: For cell classification, we use the scaled radius
    // This controls how the cells are classified, but the final visible boundary
    // is always masked to exactly 120 pixels by the stencil buffer
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
        rect.isBoundary = false;
      } else if (
        // Allow cell if it has center inside OR
        // if the number of corners outside is <= allowCut
        (centerDist <= RADIUS) ||
        (cornersOutside <= allowCut && allowCut > 0) ||
        (allowCut > 0 && edgeIntersectsCircle)
      ) {
        // Cell is on the boundary based on corner count criteria
        rect.cellType = 'boundary';
        rect.isBoundary = true;
      } else {
        // Cell is outside or has too many corners outside
        rect.cellType = 'outside';
        rect.isBoundary = true;
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
    // Update grid parameters
    Object.assign(this.gridParams, newParams);

    // Regenerate grid
    this.gridGeometry = this.generateRectangles();
    this.gridMap = this.createGridMap(this.gridGeometry);

    // Update renderModes with new grid
    this.renderModes.updateGrid({
      gridParams: this.gridParams,
      gridGeometry: this.gridGeometry,
      gridMap: this.gridMap,
    });
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

    // Use existing grid geometry
    const rectangles = this.gridGeometry;

    // Clear canvas - consistent with how we clear in the main draw method
    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

    // Draw reference circles
    const center = 120;

    // Use the fixed mask radius constant (always 120)
    const fixedRadius = this.FIXED_MASK_RADIUS;

    // Draw the fixed boundary circle
    this.drawCircle(center, center, fixedRadius, [0.2, 0.2, 0.2, 1.0]);

    // Draw the scaled circle used for cell classification if different from fixed
    const scaledRadius = 120 * this.gridParams.scale;
    if (Math.abs(scaledRadius - fixedRadius) > 0.01) {
      // Only draw if different from fixed radius
      this.drawCircle(center, center, scaledRadius, [0.3, 0.3, 0.3, 0.3]); // Translucent
    }

    // Color cells based on their boundary status and corners outside
    rectangles.forEach((rect) => {
      let color;

      if (rect.cellType === 'boundary') {
        // Boundary cells: color based on corners outside (red gradient)
        const cornersOutside = rect.cornersOutside || 0;
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
      } else if (rect.cellType === 'inside') {
        // Inside cells: green
        color = [0.2, 0.6, 0.2, 1.0];
      } else {
        // Outside cells (shouldn't be any): dark gray
        color = [0.1, 0.1, 0.1, 1.0];
      }

      // Draw the cell - all as normal rectangles
      this.drawRectangle(rect.x, rect.y, rect.width, rect.height, color);
    });

    console.log("Debug boundary visualization complete");
    console.log(`Grid has ${rectangles.length} cells, allowCut = ${this.gridParams.allowCut}`);
    console.log(`Fixed boundary radius: ${fixedRadius}, Classification radius: ${scaledRadius}`);

    // Count cells by corner status
    const boundaryCounts = [0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4 corners outside
    let boundaryTotal = 0;
    let insideTotal = 0;

    rectangles.forEach(rect => {
      if (rect.cellType === 'boundary') {
        boundaryTotal++;
        if (rect.cornersOutside !== undefined && rect.cornersOutside >= 0 && rect.cornersOutside <= 4) {
          boundaryCounts[rect.cornersOutside]++;
        }
      } else if (rect.cellType === 'inside') {
        insideTotal++;
      }
    });

    console.log(`Inside cells: ${insideTotal}, Boundary cells: ${boundaryTotal}`);
    console.log(`Boundary corners outside: 0=${boundaryCounts[0]}, 1=${boundaryCounts[1]}, 2=${boundaryCounts[2]}, 3=${boundaryCounts[3]}, 4=${boundaryCounts[4]}`);
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
}

export { GridRenderer };
