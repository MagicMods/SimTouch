export class OverlayManager {
  constructor(canvasElement /*, dimensionManager */) {
    if (!canvasElement) {
      throw new Error("OverlayManager requires a canvas element.");
    }
    this.canvas = canvasElement;

    this.textOverlay = null;
    this.centerOverlay = null;

    this.#initOverlays(240, 240); // Use placeholder initial size
  }

  #initOverlays(initialWidth, initialHeight) {
    this.textOverlay = document.createElement("div");
    this.textOverlay.classList.add("overlay-container");
    this.textOverlay.style.width = `${initialWidth}px`;
    this.textOverlay.style.height = `${initialHeight}px`;
    this.textOverlay.id = "grid-text-overlay";

    this.centerOverlay = document.createElement("div");
    this.centerOverlay.classList.add("overlay-container");
    this.centerOverlay.style.width = `${initialWidth}px`;
    this.centerOverlay.style.height = `${initialHeight}px`;
    this.centerOverlay.id = "grid-center-overlay";

    if (this.canvas.parentNode) {
      const canvasParentStyle = window.getComputedStyle(this.canvas.parentNode);
      if (canvasParentStyle.position === "static") {
        // Use class instead of inline style
        this.canvas.parentNode.classList.add("canvas-relative-container");
        // this.canvas.parentNode.style.position = "relative";
        console.debug("Set canvas parent position to relative for overlay positioning.");
      }

      this.canvas.parentNode.insertBefore(this.textOverlay, this.canvas.nextSibling);
      this.canvas.parentNode.insertBefore(this.centerOverlay, this.textOverlay); // Insert center before text
    } else {
      console.error("Canvas parent node not found, cannot insert overlays.");
    }
  }

  clearOverlays() {
    if (this.textOverlay) this.textOverlay.innerHTML = "";
    if (this.centerOverlay) this.centerOverlay.innerHTML = "";
  }

  updateDimensions(dimensions) {
    // Step 6.3: Check dimensions argument
    if (!dimensions) {
      console.warn("OverlayManager.updateDimensions: dimensions object missing.");
      return;
    }
    // Use actual canvas pixel dimensions for overlay container size
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Get canvas position relative to viewport
    const rect = this.canvas.getBoundingClientRect();
    // Calculate position including scroll offset
    const effectiveTop = rect.top + window.scrollY;
    const effectiveLeft = rect.left + window.scrollX;

    // Use BOUNDING RECT dimensions for overlay container size
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // Update overlay container sizes to match ACTUAL canvas dimensions
    if (this.textOverlay) {
      this.textOverlay.style.width = `${containerWidth}px`;
      this.textOverlay.style.height = `${containerHeight}px`;
      this.textOverlay.style.top = `${effectiveTop}px`;
      this.textOverlay.style.left = `${effectiveLeft}px`;
    }
    if (this.centerOverlay) {
      this.centerOverlay.style.width = `${containerWidth}px`;
      this.centerOverlay.style.height = `${containerHeight}px`;
      this.centerOverlay.style.top = `${effectiveTop}px`;
      this.centerOverlay.style.left = `${effectiveLeft}px`;
    }
  }

  updateCellIndices(rectangles, gridParams, dimensions) {
    if (!this.textOverlay) return;
    // Step 6.3: Check dimensions argument
    if (!dimensions) {
      console.warn("OverlayManager.updateCellIndices: dimensions object missing.");
      return;
    }
    console.debug("OverlayManager: Updating cell indices display");

    // Step 6.3: Use passed dimensions object
    const renderWidth = dimensions.renderWidth;
    const renderHeight = dimensions.renderHeight;

    const filteredRects = rectangles;

    this.textOverlay.innerHTML = ""; // Clear previous indices

    // Get actual canvas rendering dimensions
    const rect = this.canvas.getBoundingClientRect();
    const canvasActualWidth = rect.width;
    const canvasActualHeight = rect.height;

    // Calculate scaling based on actual dimensions vs logical render dimensions
    const scaleX = canvasActualWidth / renderWidth;
    const scaleY = canvasActualHeight / renderHeight;

    filteredRects.forEach((rect, index) => {
      const originalIndex = rectangles.indexOf(rect); // Get index from original array
      if (originalIndex === -1) return; // Should not happen

      const cellSize = Math.min(rect.width, rect.height); // rect dims are render coords
      const fontSize = Math.max(5.5, Math.min(12, cellSize / 3.5));

      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      // Scale position and size to actual canvas pixels
      const scaledX = centerX * scaleX;
      const scaledY = centerY * scaleY;
      const scaledWidth = rect.width * scaleX;
      const scaledHeight = rect.height * scaleY;

      const label = document.createElement("div");
      label.textContent = originalIndex.toString();
      label.classList.add("cell-index-text");
      label.style.left = `${scaledX}px`;
      label.style.top = `${scaledY}px`;
      label.style.fontSize = `${fontSize}px`;
      label.style.width = `${scaledWidth}px`;
      label.style.height = `${scaledHeight}px`;
      this.textOverlay.appendChild(label);
    });
  }

  updateCellCenters(rectangles, gridParams, dimensions) {
    if (!this.centerOverlay) return;
    // Step 6.3: Check dimensions argument
    if (!dimensions) {
      console.warn("OverlayManager.updateCellCenters: dimensions object missing.");
      return;
    }
    // console.debug("OverlayManager: Updating cell centers display");

    // Step 6.3: Use passed dimensions object
    const renderWidth = dimensions.renderWidth;
    const renderHeight = dimensions.renderHeight;

    const filteredRects = rectangles;

    this.centerOverlay.innerHTML = ""; // Clear previous centers

    // Get actual canvas rendering dimensions
    const rectBounds = this.canvas.getBoundingClientRect();
    const canvasActualWidth = rectBounds.width;
    const canvasActualHeight = rectBounds.height;

    // Calculate scaling based on actual dimensions vs logical render dimensions
    const scaleX = canvasActualWidth / renderWidth;
    const scaleY = canvasActualHeight / renderHeight;

    filteredRects.forEach((rect) => {
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      const scaledX = centerX * scaleX;
      const scaledY = centerY * scaleY;

      const dot = document.createElement("div");

      dot.style.left = `${scaledX}px`;
      dot.style.top = `${scaledY}px`;

      // Get cell size in render coordinates
      const cellSize = Math.min(rect.width, rect.height);
      // Calculate dot size based on cell size, removing the incorrect scaleX/Y factor
      const dotSize = Math.max(1.5, Math.min(4, cellSize / 15));
      const dotOffset = dotSize / 2;

      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;
      dot.style.marginLeft = `-${dotOffset}px`;
      dot.style.marginTop = `-${dotOffset}px`;
      dot.classList.add("cell-center");
      this.centerOverlay.appendChild(dot);
    });
  }

  clearCellIndices() {
    if (this.textOverlay) this.textOverlay.innerHTML = "";
  }

  clearCellCenters() {
    if (this.centerOverlay) this.centerOverlay.innerHTML = "";
  }
}
