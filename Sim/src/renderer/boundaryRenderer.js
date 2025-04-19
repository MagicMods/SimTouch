import { CircularBoundary } from "../simulation/boundary/circularBoundary.js";
import { RectangularBoundary } from "../simulation/boundary/rectangularBoundary.js";
import { eventBus } from '../util/eventManager.js';

export class BoundaryRenderer {
  container;
  #boundaryDiv;
  #currentBoundaryType = null;
  boundaryManager = null;
  canvas = null;
  #previousScale = null; // Track previous scale
  #previousShowBoundary = null; // Track previous visibility flag

  constructor(containerElement, boundaryManager, canvasElement, debugFlags) {
    // if (!containerElement || !boundaryManager || !canvasElement || !debugFlag) {
    //   console.error("BoundaryRenderer: Container, BoundaryManager, Canvas element, and debugFlags are required.");
    //   return;
    // }
    this.container = containerElement;
    this.boundaryManager = boundaryManager;
    this.canvas = canvasElement;
    this.db = debugFlags;
    this.showBoundary = false;

    if (this.db.boundary) console.log("BoundaryRenderer: Constructor - Creating div");

    this.boundaryDiv = document.createElement("div");
    this.boundaryDiv.id = "physics-boundary-dom";
    this.boundaryDiv.classList.add("grid-boundary-overlay");

    this.container.appendChild(this.boundaryDiv);
    if (this.db.boundary) console.log("BoundaryRenderer: Constructor - Appended div to container:", this.container);

    eventBus.on('simParamsUpdated', ({ simParams }) => {
      if (this.db.boundary) console.log("BoundaryRenderer received simParamsUpdated event.");
      const physicsBoundary = this.boundaryManager.getPhysicsBoundary();
      const newScale = simParams.boundary.scale;
      const scaleChanged = newScale !== this.previousScale;

      if (scaleChanged || this.previousScale === null) {
        if (this.db.boundary) console.log(`BoundaryRenderer: Updating - ScaleChanged: ${scaleChanged}, ShowChanged: ${showChanged}, Initial: ${this.previousScale === null}`);
        this.update(physicsBoundary, this.canvas, this.showBoundary);
        this.previousScale = newScale;
      } else {
        if (this.db.boundary) console.log("BoundaryRenderer: No visual change detected (scale/showBoundary). Skipping DOM update.");
      }
    });

    eventBus.on('gridParamsUpdated', ({ gridParams }) => {
      if (this.db.boundary) console.log("BoundaryRenderer received gridParamsUpdated event.");
      const physicsBoundary = this.boundaryManager.getPhysicsBoundary();
      this.showBoundary = gridParams.flags.showBoundary;
      this.update(physicsBoundary, this.canvas, this.showBoundary);
    });
  }

  update(physicsBoundary, canvasElement, show) {
    if (this.db.boundary) console.log("BoundaryRenderer: Update called", {
      show,
      physicsBoundary,
      canvasElement,
    });
    if (!physicsBoundary || !canvasElement || !this.boundaryDiv) {
      console.warn("BoundaryRenderer: Missing boundary, canvas, or div for update.");
      if (this.boundaryDiv) this.boundaryDiv.style.visibility = "hidden";
      return;
    }

    if (!show) {
      this.boundaryDiv.style.visibility = "hidden";
      return;
    }

    const canvasRect = canvasElement.getBoundingClientRect();
    const boundaryType = physicsBoundary.constructor.name;

    // --- Basic Style Update ---
    const color = physicsBoundary.color || [1, 1, 1, 0.5]; // Default if missing
    const lineWidth = physicsBoundary.lineWidth || 1;
    // Convert normalized RGBA float color [0,1] to CSS rgba() string
    const cssColor = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3]})`;
    this.boundaryDiv.style.border = `${lineWidth}px solid ${cssColor}`;

    // --- Handle Boundary Type Change ---
    if (boundaryType !== this.currentBoundaryType) {
      // Reset potentially conflicting styles from the other type
      if (boundaryType === "CircularBoundary") {
        this.boundaryDiv.style.borderRadius = "50%";
      } else if (boundaryType === "RectangularBoundary") {
        this.boundaryDiv.style.borderRadius = "0";
      }
      this.currentBoundaryType = boundaryType;
    }

    // --- Position and Size Calculation ---
    if (this.db.boundary) console.log("BoundaryRenderer: Checking instanceof:", {
      isCircular: physicsBoundary instanceof CircularBoundary,
      isRectangular: physicsBoundary instanceof RectangularBoundary,
      constructorName: physicsBoundary?.constructor?.name,
    });
    const scrollXOffset = window.scrollX;
    const scrollYOffset = window.scrollY;

    if (this.db.boundary) console.log("BoundaryRenderer: Calculation Inputs", {
      canvasRect: canvasRect,
      centerX: physicsBoundary.centerX,
      centerY: physicsBoundary.centerY,
    });

    if (physicsBoundary instanceof CircularBoundary) {
      // Use the smaller canvas dimension as the base for normalized radius (0.5) scaling
      const minCanvasDim = Math.min(canvasRect.width, canvasRect.height);
      // Diameter uses the boundary's own radius property (already scaled in manager)
      const pixelDiameter = minCanvasDim * (physicsBoundary.radius * 2);
      const pixelRadius = pixelDiameter / 2;

      // Calculate center position relative to viewport + scroll offset
      // Center coords are normalized [0, 1] relative to canvasRect width/height
      const pixelCenterX = canvasRect.left + scrollXOffset + physicsBoundary.centerX * canvasRect.width;
      const pixelCenterY = canvasRect.top + scrollYOffset + physicsBoundary.centerY * canvasRect.height;

      if (this.db.boundary) console.log("BoundaryRenderer: Circular Calculation Results", {
        pixelDiameter,
        pixelRadius,
        pixelCenterX,
        pixelCenterY,
      });

      // Set size and position (top-left corner)
      this.boundaryDiv.style.width = `${pixelDiameter}px`;
      this.boundaryDiv.style.height = `${pixelDiameter}px`;
      this.boundaryDiv.style.left = `${pixelCenterX - pixelRadius}px`;
      this.boundaryDiv.style.top = `${pixelCenterY - pixelRadius}px`;
    } else if (physicsBoundary instanceof RectangularBoundary) {
      if (this.db.boundary) console.log(`BoundaryRenderer: Received RectangularBoundary - Width: ${physicsBoundary.width}, Height: ${physicsBoundary.height}`);
      const pixelWidth = canvasRect.width * physicsBoundary.width;
      const pixelHeight = canvasRect.height * physicsBoundary.height;
      if (this.db.boundary) console.log(`[db] BoundaryRenderer - Rect Calc: physicsW=${physicsBoundary.width.toFixed(3)}, physicsH=${physicsBoundary.height.toFixed(3)}, canvasW=${canvasRect.width.toFixed(0)}, canvasH=${canvasRect.height.toFixed(0)}, pixelW=${pixelWidth.toFixed(1)}, pixelH=${pixelHeight.toFixed(1)}`);
      const pixelCenterX = canvasRect.left + window.scrollX + canvasRect.width * physicsBoundary.centerX;
      const pixelCenterY = canvasRect.top + window.scrollY + canvasRect.height * physicsBoundary.centerY;
      const left = pixelCenterX - pixelWidth / 2;
      const top = pixelCenterY - pixelHeight / 2;

      if (this.db.boundary) console.log(`BoundaryRenderer: Calculated Rect Pixel Dimensions - W: ${pixelWidth}, H: ${pixelHeight}, Left: ${left}, Top: ${top}`);

      this.boundaryDiv.style.width = `${pixelWidth}px`;
      this.boundaryDiv.style.height = `${pixelHeight}px`;
      this.boundaryDiv.style.left = `${left}px`;
      this.boundaryDiv.style.top = `${top}px`;
      this.boundaryDiv.style.borderRadius = "10px"; // Apply rounded corners
    } else {
      console.warn(`BoundaryRenderer: Unsupported boundary type: ${boundaryType}`);
      this.boundaryDiv.style.visibility = "hidden";
      return; // Don't make it visible if type is unknown
    }

    // Make sure it's visible after updates
    if (this.db.boundary) console.log("BoundaryRenderer: Setting visibility to visible");
    this.boundaryDiv.style.visibility = "visible";
  }

  destroy() {
    if (this.boundaryDiv && this.boundaryDiv.parentNode === this.container) {
      this.container.removeChild(this.boundaryDiv);
    }
    this.boundaryDiv = null;
    this.container = null;
  }

  show() {
    this.boundaryDiv.style.visibility = "visible";
    if (this.db.boundary) console.log("BoundaryRenderer: Setting visibility to visible");
  }
}
