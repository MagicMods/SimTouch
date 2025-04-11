import { CircularBoundaryPs } from "../simulation/boundary/circularBoundaryPs.js";
import { RectangularBoundaryPs } from "../simulation/boundary/rectangularBoundaryPs.js";

export class BoundaryRenderer {
  #container;
  #boundaryDiv;
  #currentBoundaryType = null;

  constructor(containerElement) {
    console.log("BoundaryRenderer: Constructor - Creating div");
    if (!containerElement) {
      console.error("BoundaryRenderer: Container element is required.");
      return;
    }
    this.#container = containerElement;

    this.#boundaryDiv = document.createElement("div");
    this.#boundaryDiv.id = "physics-boundary-dom";
    this.#boundaryDiv.classList.add("grid-boundary-overlay");

    this.#container.appendChild(this.#boundaryDiv);
    console.log("BoundaryRenderer: Constructor - Appended div to container:", this.#container);
  }

  update(physicsBoundary, canvasElement, show) {
    console.log("BoundaryRenderer: Update called", {
      show,
      physicsBoundary,
      canvasElement,
    });
    if (!physicsBoundary || !canvasElement || !this.#boundaryDiv) {
      console.warn("BoundaryRenderer: Missing boundary, canvas, or div for update.");
      if (this.#boundaryDiv) this.#boundaryDiv.style.visibility = "hidden";
      return;
    }

    if (!show) {
      this.#boundaryDiv.style.visibility = "hidden";
      return;
    }

    const canvasRect = canvasElement.getBoundingClientRect();
    const boundaryType = physicsBoundary.constructor.name;

    // --- Basic Style Update ---
    const color = physicsBoundary.color || [1, 1, 1, 0.5]; // Default if missing
    const lineWidth = physicsBoundary.lineWidth || 1;
    // Convert normalized RGBA float color [0,1] to CSS rgba() string
    const cssColor = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3]})`;
    this.#boundaryDiv.style.border = `${lineWidth}px solid ${cssColor}`;

    // --- Handle Boundary Type Change ---
    if (boundaryType !== this.#currentBoundaryType) {
      // Reset potentially conflicting styles from the other type
      if (boundaryType === "CircularBoundaryPs") {
        this.#boundaryDiv.style.borderRadius = "50%";
      } else if (boundaryType === "RectangularBoundaryPs") {
        this.#boundaryDiv.style.borderRadius = "0";
      }
      this.#currentBoundaryType = boundaryType;
    }

    // --- Position and Size Calculation ---
    console.log("BoundaryRenderer: Checking instanceof:", {
      isCircular: physicsBoundary instanceof CircularBoundaryPs,
      isRectangular: physicsBoundary instanceof RectangularBoundaryPs,
      constructorName: physicsBoundary?.constructor?.name,
    });
    const scrollXOffset = window.scrollX;
    const scrollYOffset = window.scrollY;
    const scale = physicsBoundary.scale || 1.2; // Use stored scale, default to 1

    console.log("BoundaryRenderer: Calculation Inputs", {
      scale: scale,
      canvasRect: canvasRect,
      centerX: physicsBoundary.centerX,
      centerY: physicsBoundary.centerY,
    });

    if (physicsBoundary instanceof CircularBoundaryPs) {
      // Use the smaller canvas dimension as the base for normalized radius (0.5) scaling
      const minCanvasDim = Math.min(canvasRect.width, canvasRect.height);
      // Diameter uses the boundary's own radius property (already scaled in manager)
      const pixelDiameter = minCanvasDim * (physicsBoundary.radius * 2);
      const pixelRadius = pixelDiameter / 2;

      // Calculate center position relative to viewport + scroll offset
      // Center coords are normalized [0, 1] relative to canvasRect width/height
      const pixelCenterX = canvasRect.left + scrollXOffset + physicsBoundary.centerX * canvasRect.width;
      const pixelCenterY = canvasRect.top + scrollYOffset + physicsBoundary.centerY * canvasRect.height;

      console.log("BoundaryRenderer: Circular Calculation Results", {
        pixelDiameter,
        pixelRadius,
        pixelCenterX,
        pixelCenterY,
      });

      // Set size and position (top-left corner)
      this.#boundaryDiv.style.width = `${pixelDiameter}px`;
      this.#boundaryDiv.style.height = `${pixelDiameter}px`;
      this.#boundaryDiv.style.left = `${pixelCenterX - pixelRadius}px`;
      this.#boundaryDiv.style.top = `${pixelCenterY - pixelRadius}px`;
    } else if (physicsBoundary instanceof RectangularBoundaryPs) {
      console.log(`BoundaryRenderer: Received RectangularBoundaryPs - Width: ${physicsBoundary.width}, Height: ${physicsBoundary.height}`);
      const pixelWidth = canvasRect.width * physicsBoundary.width;
      const pixelHeight = canvasRect.height * physicsBoundary.height;
      const pixelCenterX = canvasRect.left + window.scrollX + canvasRect.width * physicsBoundary.centerX;
      const pixelCenterY = canvasRect.top + window.scrollY + canvasRect.height * physicsBoundary.centerY;
      const left = pixelCenterX - pixelWidth / 2;
      const top = pixelCenterY - pixelHeight / 2;

      console.log(`BoundaryRenderer: Calculated Rect Pixel Dimensions - W: ${pixelWidth}, H: ${pixelHeight}, Left: ${left}, Top: ${top}`);

      this.#boundaryDiv.style.width = `${pixelWidth}px`;
      this.#boundaryDiv.style.height = `${pixelHeight}px`;
      this.#boundaryDiv.style.left = `${left}px`;
      this.#boundaryDiv.style.top = `${top}px`;
      this.#boundaryDiv.style.borderRadius = "10px"; // Apply rounded corners
    } else {
      console.warn(`BoundaryRenderer: Unsupported boundary type: ${boundaryType}`);
      this.#boundaryDiv.style.visibility = "hidden";
      return; // Don't make it visible if type is unknown
    }

    // Make sure it's visible after updates
    console.log("BoundaryRenderer: Setting visibility to visible");
    this.#boundaryDiv.style.visibility = "visible";
  }

  destroy() {
    if (this.#boundaryDiv && this.#boundaryDiv.parentNode === this.#container) {
      this.#container.removeChild(this.#boundaryDiv);
    }
    this.#boundaryDiv = null;
    this.#container = null;
  }
}
