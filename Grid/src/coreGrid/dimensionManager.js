export class DimensionManager {
  #physicalWidth;
  #physicalHeight;
  #maxRenderWidth;
  #maxRenderHeight;
  #renderWidth;
  #renderHeight;
  #renderCenterX;
  #renderCenterY;
  #renderScale;
  #aspectRatio;

  constructor(physicalWidth, physicalHeight, maxRenderWidth, maxRenderHeight) {
    if (!this._validateInputs(physicalWidth, physicalHeight, maxRenderWidth, maxRenderHeight)) {
      // Use defaults if validation fails during construction
      physicalWidth = 240;
      physicalHeight = 240;
      maxRenderWidth = 960;
      maxRenderHeight = 960;
      console.warn("DimensionManager: Invalid initial dimensions, using defaults (240x240, max 960x960)");
    }
    this.#physicalWidth = physicalWidth;
    this.#physicalHeight = physicalHeight;
    this.#maxRenderWidth = maxRenderWidth;
    this.#maxRenderHeight = maxRenderHeight;
    this._calculateRenderDimensions();
  }

  updateDimensions(physicalWidth, physicalHeight, maxRenderWidth, maxRenderHeight) {
    if (!this._validateInputs(physicalWidth, physicalHeight, maxRenderWidth, maxRenderHeight)) {
      console.error("DimensionManager: Invalid dimensions provided to updateDimensions. Update aborted.", {
        physicalWidth,
        physicalHeight,
        maxRenderWidth,
        maxRenderHeight,
      });
      return false; // Indicate failure
    }

    const changed =
      this.#physicalWidth !== physicalWidth ||
      this.#physicalHeight !== physicalHeight ||
      this.#maxRenderWidth !== maxRenderWidth ||
      this.#maxRenderHeight !== maxRenderHeight;

    if (changed) {
      this.#physicalWidth = physicalWidth;
      this.#physicalHeight = physicalHeight;
      this.#maxRenderWidth = maxRenderWidth;
      this.#maxRenderHeight = maxRenderHeight;
      this._calculateRenderDimensions();
      console.debug("DimensionManager: Dimensions updated and recalculated.", this.getDimensions());
      return true; // Indicate success
    }
    return false; // Indicate no change
  }

  _validateInputs(physicalWidth, physicalHeight, maxRenderWidth, maxRenderHeight) {
    let isValid = true;
    const MIN_PHYSICAL_DIM = 170;
    if (!physicalWidth || physicalWidth < 1) {
      console.warn("DimensionManager Validation: Invalid physicalWidth", physicalWidth);
      isValid = false;
    } else if (physicalWidth < MIN_PHYSICAL_DIM) {
      console.warn(`DimensionManager Validation: physicalWidth (${physicalWidth}) is below target minimum (${MIN_PHYSICAL_DIM}).`);
      // Continue, but warn
    }

    if (!physicalHeight || physicalHeight < 1) {
      console.warn("DimensionManager Validation: Invalid physicalHeight", physicalHeight);
      isValid = false;
    } else if (physicalHeight < MIN_PHYSICAL_DIM) {
      console.warn(`DimensionManager Validation: physicalHeight (${physicalHeight}) is below target minimum (${MIN_PHYSICAL_DIM}).`);
      // Continue, but warn
    }

    if (!maxRenderWidth || maxRenderWidth < 1) {
      console.warn("DimensionManager Validation: Invalid maxRenderWidth", maxRenderWidth);
      isValid = false;
    }

    if (!maxRenderHeight || maxRenderHeight < 1) {
      console.warn("DimensionManager Validation: Invalid maxRenderHeight", maxRenderHeight);
      isValid = false;
    }

    return isValid;
  }

  _calculateRenderDimensions() {
    // Use internal validated properties
    const physW = this.#physicalWidth;
    const physH = this.#physicalHeight;
    const maxW = this.#maxRenderWidth;
    const maxH = this.#maxRenderHeight;

    // Prevent division by zero
    if (physH === 0 || physW === 0) {
      console.error("DimensionManager: Physical width or height is zero, cannot calculate dimensions.");
      this.#renderWidth = 0;
      this.#renderHeight = 0;
      this.#renderCenterX = 0;
      this.#renderCenterY = 0;
      this.#renderScale = 1;
      this.#aspectRatio = 1;
      return;
    }

    this.#aspectRatio = physW / physH;

    // Start by assuming we scale to fit maxW
    let calcRenderWidth = maxW;
    let calcRenderHeight = maxW / this.#aspectRatio;

    // Check if scaling to maxW made the height exceed maxH
    if (calcRenderHeight > maxH) {
      // If so, we are constrained by maxH, recalculate based on height
      calcRenderHeight = maxH;
      calcRenderWidth = maxH * this.#aspectRatio;
    }

    // Now calcRenderWidth and calcRenderHeight hold the largest dimensions
    // within maxW and maxH that maintain the aspect ratio.

    // Enforce minimum dimensions to prevent canvas collapse
    const minRenderDim = 100;
    this.#renderWidth = Math.max(calcRenderWidth, minRenderDim);
    this.#renderHeight = Math.max(calcRenderHeight, minRenderDim);

    // If one dimension was clamped, recalculate the other to maintain aspect ratio
    if (this.#renderWidth === minRenderDim && calcRenderWidth < minRenderDim) {
      this.#renderHeight = minRenderDim / this.#aspectRatio;
      // Re-check height against minimum after adjusting width
      this.#renderHeight = Math.max(this.#renderHeight, minRenderDim);
    } else if (this.#renderHeight === minRenderDim && calcRenderHeight < minRenderDim) {
      this.#renderWidth = minRenderDim * this.#aspectRatio;
      // Re-check width against minimum after adjusting height
      this.#renderWidth = Math.max(this.#renderWidth, minRenderDim);
    }

    // Round final values
    this.#renderWidth = Math.round(this.#renderWidth);
    this.#renderHeight = Math.round(this.#renderHeight);
    this.#renderCenterX = Math.round(this.#renderWidth / 2);
    this.#renderCenterY = Math.round(this.#renderHeight / 2);

    // Calculate scale based on the final render width and original physical width
    if (this.#physicalWidth === 0) {
      console.warn("DimensionManager: Physical width is zero, cannot calculate scale accurately.");
      this.#renderScale = 1;
    } else {
      this.#renderScale = this.#renderWidth / this.#physicalWidth;
    }

    console.debug("DimensionManager: Recalculated dimensions:", {
      physicalWidth: this.#physicalWidth,
      physicalHeight: this.#physicalHeight,
      maxRenderWidth: this.#maxRenderWidth,
      maxRenderHeight: this.#maxRenderHeight,
      renderWidth: this.#renderWidth,
      renderHeight: this.#renderHeight,
      renderScale: this.#renderScale,
      aspectRatio: this.#aspectRatio,
    });
  }

  // --- Getters ---
  get physicalWidth() {
    return this.#physicalWidth;
  }
  get physicalHeight() {
    return this.#physicalHeight;
  }
  get maxRenderWidth() {
    return this.#maxRenderWidth;
  }
  get maxRenderHeight() {
    return this.#maxRenderHeight;
  }
  get renderWidth() {
    return this.#renderWidth;
  }
  get renderHeight() {
    return this.#renderHeight;
  }
  get renderCenterX() {
    return this.#renderCenterX;
  }
  get renderCenterY() {
    return this.#renderCenterY;
  }
  get renderScale() {
    return this.#renderScale;
  }
  get aspectRatio() {
    return this.#aspectRatio;
  }

  // --- Canvas Application Methods ---

  applyToCanvas(canvasElement) {
    if (!canvasElement) {
      console.error("DimensionManager: applyToCanvas called with null canvas element.");
      return;
    }
    canvasElement.width = this.#renderWidth;
    canvasElement.height = this.#renderHeight;
    console.debug(`DimensionManager: Applied dimensions ${this.#renderWidth}x${this.#renderHeight} to canvas.`);
  }

  applyCanvasStyle(canvasElement, shape) {
    if (!canvasElement) {
      console.error("DimensionManager: applyCanvasStyle called with null canvas element.");
      return;
    }
    if (shape === "circular") {
      canvasElement.style.borderRadius = "50%";
      console.debug("DimensionManager: Applied circular style to canvas.");
    } else {
      // Default to slightly rounded corners for rectangular or unspecified shapes
      canvasElement.style.borderRadius = "5px"; // Consistent with previous main.js logic
      console.debug("DimensionManager: Applied rectangular style (5px radius) to canvas.");
    }
  }

  applyViewport(glContext) {
    if (!glContext) {
      console.error("DimensionManager: applyViewport called with null GL context.");
      return;
    }
    glContext.viewport(0, 0, this.#renderWidth, this.#renderHeight);
    console.debug(`DimensionManager: Applied viewport ${this.#renderWidth}x${this.#renderHeight}.`);
  }

  // Helper to return all dimension values
  getDimensions() {
    return {
      physicalWidth: this.#physicalWidth,
      physicalHeight: this.#physicalHeight,
      maxRenderWidth: this.#maxRenderWidth,
      maxRenderHeight: this.#maxRenderHeight,
      renderWidth: this.#renderWidth,
      renderHeight: this.#renderHeight,
      renderCenterX: this.#renderCenterX,
      renderCenterY: this.#renderCenterY,
      renderScale: this.#renderScale,
      aspectRatio: this.#aspectRatio,
    };
  }
}
