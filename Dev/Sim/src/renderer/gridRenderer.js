import { BaseRenderer } from "./baseRenderer.js";
import { GridRenderModes } from "./gridRenderModes.js";
import { Gradient } from "../shaders/gradients.js";

class GridRenderer extends BaseRenderer {
  constructor(gl, shaderManager) {
    super(gl, shaderManager);

    // Fixed target resolution
    this.TARGET_WIDTH = 240;
    this.TARGET_HEIGHT = 240;

    // Grid parameters (all in pixels)
    this.gridParams = {
      target: 341, // Total cells
      gap: 1, // Gap between cells
      aspectRatio: 1, // Important for circular layout
      scale: 0.95, // Circle coverage
      width: 10, // Cell width in pixels
      height: 10, // Cell height in pixels
      cols: 23, // Fixed grid dimensions
      rows: 23, // Fixed grid dimensions
    };

    // Density parameters
    this.minDensity = 0.0;
    this.maxDensity = 7.0;

    // Initialize systems
    this.gradient = new Gradient();
    this.renderModes = new GridRenderModes({
      gridParams: this.gridParams,
      canvas: this.gl.canvas,
    });

    // Debug output
    console.log("GridRenderer initialized:", {
      resolution: `${this.TARGET_WIDTH}x${this.TARGET_HEIGHT}`,
      cellSize: `${this.gridParams.width}x${this.gridParams.height}`,
      totalCells: this.gridParams.target,
    });
  }

  draw(particleSystem) {
    const program = this.shaderManager.use("basic");
    if (!program || !particleSystem) return;

    // Generate grid rectangles
    const rectangles = this.generateRectangles();

    // Debug first few rectangles
    console.log(
      "Grid Layout:",
      rectangles.slice(0, 5).map((rect) => ({
        pos: `${rect.x},${rect.y}`,
        size: `${rect.width}x${rect.height}`,
      }))
    );

    // Get density values from particles
    this.density = new Float32Array(this.gridParams.target).fill(0);
    const particles = particleSystem.getParticles();

    // Count particles per cell
    particles.forEach((particle) => {
      // Convert normalized coordinates to pixel space
      const px = particle.x * this.TARGET_WIDTH;
      const py = (1 - particle.y) * this.TARGET_HEIGHT; // Fix: Invert Y coordinate

      // Find corresponding rectangle
      rectangles.forEach((rect, index) => {
        if (
          px >= rect.x &&
          px < rect.x + rect.width &&
          py >= rect.y &&
          py < rect.y + rect.height
        ) {
          this.density[index]++;
        }
      });
    });

    // Debug density values for troubleshooting
    console.log("Grid Mapping:", {
      particles: particles.slice(0, 3).map((p) => ({
        normalizedPos: `${p.x.toFixed(2)},${p.y.toFixed(2)}`,
        pixelPos: `${(p.x * this.TARGET_WIDTH).toFixed(0)},${(
          (1 - p.y) *
          this.TARGET_HEIGHT
        ).toFixed(0)}`,
      })),
      rectangles: rectangles.slice(0, 3).map((r) => ({
        pos: `${r.x},${r.y}`,
        size: `${r.width}x${r.height}`,
      })),
    });

    // Debug density distribution
    console.log("Density Stats:", {
      min: Math.min(...this.density),
      max: Math.max(...this.density),
      nonZero: this.density.filter((d) => d > 0).length,
    });

    // Map densities to colors
    rectangles.forEach((rect, index) => {
      const density = this.density[index];
      const normalizedValue = Math.max(
        0,
        Math.min(1, density / this.maxDensity)
      );

      // Get color from gradient
      const gradientIdx = Math.floor(normalizedValue * 255);
      const colorValues = this.gradient.getValues();
      const color = colorValues[gradientIdx];

      // Debug first few mappings
      if (index < 5) {
        console.log(`Cell ${index}:`, {
          density,
          normalized: normalizedValue,
          gradientIdx,
          color: color ? [color.r, color.g, color.b] : null,
        });
      }

      rect.color = color
        ? [color.r, color.g, color.b, 1.0]
        : [0.2, 0.2, 0.2, 1.0]; // Dark grey for debugging
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
