import { BaseRenderer } from "./baseRenderer.js";
import { GridRenderModes } from "./gridRenderModes.js";
import { Gradient } from "../shaders/gradients.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);
    this.vertexBuffer = gl.createBuffer();

    // Fixed target resolution
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;

    // Actual canvas size
    this.width = gl.canvas.width;
    this.height = gl.canvas.height;

    // Scale factors
    this.scaleX = this.width / this.TARGET_WIDTH;
    this.scaleY = this.height / this.TARGET_HEIGHT;

    // Grid layout parameters
    this.rowCounts = [13, 19, 23, 25, 27, 29, 29, 29, 29, 27, 25, 23, 19, 13];
    this.numX = Math.max(...this.rowCounts);
    this.numY = this.rowCounts.length;

    // Base scale on 240x240 grid
    const scale = Math.min(gl.canvas.width, gl.canvas.height) / 240;

    // Cell dimensions
    this.rectWidth = 6 * scale;
    this.rectHeight = 15 * scale;
    this.stepX = 8 * scale;
    this.stepY = 17 * scale;

    // Create grid geometry
    this.createGridGeometry();

    //////////////

    this.gridParams = {
      target: 341,
      gap: 1,
      aspectRatio: 1,
      scale: 0.95,
      cols: 0,
      rows: 0,
      width: 0,
      height: 0,
    };

    /////////////////

    // Add density field parameters with defaults
    this.density = new Float32Array(this.getTotalCells());
    this.minDensity = 0.0;
    this.maxDensity = 7.0;

    // Replace gradient initialization with new class
    this.gradient = new Gradient();

    this.renderModes = new GridRenderModes({
      rowCounts: this.rowCounts,
      numX: this.numX,
      numY: this.numY,
      stepX: this.stepX,
      stepY: this.stepY,
      canvas: this.gl.canvas,
    });

    console.log("GridRenderer initialized with scale:", scale);
  }

  getTotalCells() {
    return this.rowCounts.reduce((sum, count) => sum + count, 0);
  }

  createGridGeometry() {
    const vertices = [];
    const margin = 0.9; // Scale down grid positions to reserve a margin around the grid
    // Center vertically
    const totalHeight = this.numY * this.stepY;
    const yStart = totalHeight / 2;

    for (let y = 0; y < this.numY; y++) {
      const rowCount = this.rowCounts[y];
      const rowWidth = rowCount * this.stepX;
      const xStart = -rowWidth / 2; // Center horizontally
      const yPos = yStart - y * this.stepY;

      for (let x = 0; x < rowCount; x++) {
        const xPos = xStart + x * this.stepX;

        // Convert to clip space coordinates (-1 to 1) and apply margin factor
        const x1 = (xPos / (this.gl.canvas.width / 2)) * margin;
        const x2 =
          ((xPos + this.rectWidth) / (this.gl.canvas.width / 2)) * margin;
        const y1 = (yPos / (this.gl.canvas.height / 2)) * margin;
        const y2 =
          ((yPos - this.rectHeight) / (this.gl.canvas.height / 2)) * margin;

        // Add two triangles for the rectangle
        vertices.push(
          x1,
          y1,
          x2,
          y1,
          x1,
          y2, // First triangle
          x2,
          y1,
          x2,
          y2,
          x1,
          y2 // Second triangle
        );
      }
    }

    this.gridVertices = new Float32Array(vertices);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.gridVertices,
      this.gl.STATIC_DRAW
    );

    console.log(
      "Grid geometry created:",
      this.gridVertices.length / 2,
      "vertices"
    );
  }

  draw(particleSystem) {
    const program = this.shaderManager.use("basic");
    if (!program || !particleSystem) return;

    // Update density field based on particle positions
    this.density = this.renderModes.getValues(particleSystem);

    // Generate rectangles for the grid
    const rectangles = this.generateRectangles();

    // Calculate density values for each rectangle
    const totalCells = rectangles.length;
    const densityValues = new Float32Array(totalCells);

    // Map particle densities to grid cells
    rectangles.forEach((rect, index) => {
      // Get center of rectangle
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      // Calculate density for this cell
      const value = this.density[index];
      const normalizedValue = Math.max(
        0,
        Math.min(
          1,
          (value - this.minDensity) / (this.maxDensity - this.minDensity)
        )
      );

      const gradientIdx = Math.floor(normalizedValue * 255);
      const gradientValues = this.gradient.getValues();
      const color = gradientValues[gradientIdx] || { r: 0, g: 0, b: 0 };

      // Ensure color components exist
      rect.color = [color.r, color.g, color.b, 1.0];
    });

    // Draw all rectangles
    rectangles.forEach((rect) => {
      this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
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

  drawRectangle(x, y, width, height, color) {
    const program = this.shaderManager.use("basic");
    if (!program) return;

    // Convert positions from pixel to clip space
    const pos = this.pixelToClipSpace(x, y);
    const size = {
      width: (width / this.TARGET_WIDTH) * 2,
      height: (height / this.TARGET_HEIGHT) * 2, // Height will be inverted by pixelToClipSpace
    };

    // Calculate rectangle corners in clip space
    const x1 = pos.x;
    const y1 = pos.y;
    const x2 = pos.x + size.width;
    const y2 = pos.y - size.height; // Subtract height since Y is flipped

    const vertices = [
      x1,
      y1, // Top-left
      x2,
      y1, // Top-right
      x1,
      y2, // Bottom-left
      x1,
      y2, // Bottom-left
      x2,
      y1, // Top-right
      x2,
      y2, // Bottom-right
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

      const cols = maxCols * 2 + 1;
      const rows = maxRows * 2 + 1;
      const total = cols * rows;

      if (total < this.gridParams.target) continue;

      const rectangles = [];
      for (let c = -maxCols; c <= maxCols; c++) {
        for (let r = -maxRows; r <= maxRows; r++) {
          const dx = c * stepX;
          const dy = r * stepY;
          if (Math.hypot(dx, dy) > radius) continue;

          rectangles.push({
            x: Math.round(center + dx - scaledW / 2),
            y: Math.round(center + dy - scaledH / 2),
            width: scaledW,
            height: scaledH,
            color: [1, 1, 1, 1],
          });
        }
      }

      if (rectangles.length >= this.gridParams.target) {
        this.gridParams.cols = cols;
        this.gridParams.rows = rows;
        this.gridParams.width = scaledW; // Update width
        this.gridParams.height = scaledH; // Update height
        return rectangles.slice(0, this.gridParams.target);
      }

      if (rectangles.length > bestRects.length) {
        bestRects = rectangles;
        this.gridParams.cols = cols;
        this.gridParams.rows = rows;
        this.gridParams.width = scaledW; // Update best width
        this.gridParams.height = scaledH; // Update best height
      }
    }
    return bestRects.slice(0, this.gridParams.target);
  }

  drawGridTest() {
    const rectangles = this.generateRectangles();
    rectangles.forEach((rect) => {
      // console.log(
      //   `Rectangle at x: ${rect.x}, y: ${rect.y}, width: ${rect.width}, height: ${rect.height}`
      // );
      this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
    });
  }
}

export { GridRenderer };
