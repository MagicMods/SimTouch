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
      scale: 0.95,
      width: 10,
      height: 10,
      cols: 23,
      rows: 23,
    };

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
      clipPath: rect.clipPath,
      contains: function (px, py) {
        // For boundary cells, check if point is inside both the rectangle and the circle
        if (this.isBoundary && this.clipPath) {
          // First quickly check if point is inside the rectangle bounds
          if (
            px >= this.bounds.x &&
            px < this.bounds.x + this.bounds.width &&
            py >= this.bounds.y &&
            py < this.bounds.y + this.bounds.height
          ) {
            // For boundary cells, also check if point is inside the polygon
            return this.pointInPolygon(px, py, this.clipPath);
          }
          return false;
        }

        // For regular cells, just check rectangle bounds
        return (
          px >= this.bounds.x &&
          px < this.bounds.x + this.bounds.width &&
          py >= this.bounds.y &&
          py < this.bounds.y + this.bounds.height
        );
      },
      // Helper method to check if a point is inside a polygon
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

    // Use existing grid geometry
    const rectangles = this.gridGeometry;

    // Get density values
    this.density = this.renderModes.getValues(particleSystem);

    // // Debug current mode and values
    // console.log("Current render mode:", this.renderModes.currentMode);
    // console.log("Density value range:", {
    //   min: Math.min(...this.density),
    //   max: Math.max(...this.density)
    // });

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

      // // Debug first few cells
      // if (index < 5) {
      //   console.log(`Cell ${index} color:`, {
      //     value,
      //     normalizedValue,
      //     gradientIdx,
      //     color
      //   });
      // }

      rect.color = color
        ? [color.r, color.g, color.b, 1.0]
        : [0.2, 0.2, 0.2, 1.0]; // Dark grey for debugging
    });

    // Draw rectangles
    rectangles.forEach((rect) => {
      if (rect.isBoundary && rect.clipPath) {
        // For boundary cells, use the clipped drawing method
        this.drawClippedCell(rect.clipPath, rect.color);
      } else {
        // For regular cells, use the standard rectangle drawing
        this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
      }
    });
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

  // Method to draw cells with clip paths
  drawClippedCell(clipPath, color) {
    const program = this.shaderManager.use("basic");
    if (!program) return;

    // Convert points to clip space
    const clipVertices = [];
    clipPath.forEach(point => {
      const clipPoint = this.pixelToClipSpace(point.x, point.y);
      clipVertices.push(clipPoint.x, clipPoint.y);
    });

    // Triangulate the polygon (fan triangulation from first point)
    const vertices = [];
    for (let i = 1; i < clipPath.length - 1; i++) {
      // First point
      vertices.push(clipVertices[0], clipVertices[1]);
      // Second point
      vertices.push(clipVertices[i * 2], clipVertices[i * 2 + 1]);
      // Third point
      vertices.push(clipVertices[(i + 1) * 2], clipVertices[(i + 1) * 2 + 1]);
    }

    // Use temporary buffer
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
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length / 2);
    this.gl.deleteBuffer(buffer);
  }

  generateRectangles() {
    let bestRects = [];
    const center = 120;
    const radius = 120 * this.gridParams.scale;

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

      // Add one more in each direction to include partial cells
      maxCols += 1;
      maxRows += 1;

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

          // Determine if cell is completely outside the circle
          const cornerDistances = [
            Math.hypot(cellLeft - center, cellTop - center),
            Math.hypot(cellRight - center, cellTop - center),
            Math.hypot(cellLeft - center, cellBottom - center),
            Math.hypot(cellRight - center, cellBottom - center)
          ];

          // Cell center distance from circle center
          const centerDist = Math.hypot(dx, dy);

          // Include the cell if:
          // 1. Cell center is within radius (original condition)
          // 2. OR at least one corner is inside the circle (new condition for partial cells)
          if (centerDist <= radius || cornerDistances.some(dist => dist <= radius)) {
            const rect = {
              x: Math.round(cellLeft),
              y: Math.round(cellTop),
              width: scaledW,
              height: scaledH,
              color: [1, 1, 1, 1],
              isBoundary: centerDist > radius, // Flag boundary cells
              centerDist: centerDist        // Store for clipping calculation
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

        // Update boundary cells with clip path data
        rectangles.forEach(rect => {
          if (rect.isBoundary) {
            rect.clipPath = this.clipCellToCircle(rect, { x: center, y: center }, radius);
          }
        });

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

    // Update boundary cells with clip path data for best result
    bestRects.forEach(rect => {
      if (rect.isBoundary) {
        rect.clipPath = this.clipCellToCircle(rect, { x: 120, y: 120 }, 120 * this.gridParams.scale);
      }
    });

    return bestRects.slice(0, this.gridParams.target);
  }

  // Helper method to calculate clip path for boundary cells
  clipCellToCircle(rect, center, radius) {
    // Calculate the intersection of the rectangle with the circle
    const clipSegments = 16; // Number of segments to approximate arc
    const points = [];

    // Rectangle corners
    const corners = [
      { x: rect.x, y: rect.y },  // Top-left
      { x: rect.x + rect.width, y: rect.y },  // Top-right
      { x: rect.x + rect.width, y: rect.y + rect.height },  // Bottom-right
      { x: rect.x, y: rect.y + rect.height }  // Bottom-left
    ];

    // Find corners inside circle
    const insideCorners = corners.filter(corner =>
      Math.hypot(corner.x - center.x, corner.y - center.y) <= radius
    );

    // Add all inside corners to clip path
    insideCorners.forEach(corner => points.push(corner));

    // Find intersection points of rectangle edges with circle
    const edges = [
      // Top edge: x varies, y fixed at rect.y
      { start: corners[0], end: corners[1], isHorizontal: true },
      // Right edge: x fixed at rect.x + rect.width, y varies
      { start: corners[1], end: corners[2], isHorizontal: false },
      // Bottom edge: x varies, y fixed at rect.y + rect.height
      { start: corners[2], end: corners[3], isHorizontal: true },
      // Left edge: x fixed at rect.x, y varies
      { start: corners[3], end: corners[0], isHorizontal: false }
    ];

    edges.forEach(edge => {
      const intersections = this.findLineCircleIntersections(
        edge.start, edge.end, center, radius
      );

      intersections.forEach(point => points.push(point));
    });

    // If we have fewer than 3 points, can't form polygon - return null
    if (points.length < 3) return null;

    // Add arc points between intersection points if needed
    // This requires sorting the points by angle from center
    const sortedPoints = this.sortPointsByAngle(points, center);

    return sortedPoints;
  }

  // Find intersections between line segment and circle
  findLineCircleIntersections(start, end, center, radius) {
    const intersections = [];

    // Line parameterization: P = start + t * (end - start), t ∈ [0, 1]
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Translate to origin
    const cx = center.x;
    const cy = center.y;

    // Quadratic equation coefficients
    const a = dx * dx + dy * dy;
    const b = 2 * (dx * (start.x - cx) + dy * (start.y - cy));
    const c = (start.x - cx) * (start.x - cx) + (start.y - cy) * (start.y - cy) - radius * radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      // No intersections
      return intersections;
    }

    // Find t values for intersections
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    // Check if t values are in [0, 1] range (on the line segment)
    if (t1 >= 0 && t1 <= 1) {
      intersections.push({
        x: start.x + t1 * dx,
        y: start.y + t1 * dy
      });
    }

    if (t2 >= 0 && t2 <= 1) {
      intersections.push({
        x: start.x + t2 * dx,
        y: start.y + t2 * dy
      });
    }

    return intersections;
  }

  // Sort points by angle around center
  sortPointsByAngle(points, center) {
    return [...points].sort((a, b) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x);
      const angleB = Math.atan2(b.y - center.y, b.x - center.x);
      return angleA - angleB;
    });
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
