import { BaseBoundaryShape } from "./baseBoundaryShape.js";

export class RectangularBoundaryShape extends BaseBoundaryShape {
  constructor(centerX, centerY, width, height, scale = 1.0, debugFlags) {
    super(centerX, centerY, scale, debugFlags);
    this.db = debugFlags;
    // Directly assign dimensions provided (validation/clamping done elsewhere if needed)
    this._width = width;
    this._height = height;
    if (this.db.boundary) console.log(
      `RectangularBoundaryPs created with W: ${this._width}, H: ${this._height}`
    );

    // REMOVED: Minimum dimension clamping and adjustment logging.
  }

  // Width getter/setter
  get width() {
    return this._width;
  }

  set width(value) {
    // Assume input value is valid and already processed/clamped if necessary upstream
    if (typeof value === "number" && this._width !== value) {
      if (this.db.boundary) console.log(
        `RectangularBoundaryPs width changing from ${this._width} to ${value}`
      );
      this._width = value;
    } else if (typeof value !== "number") {
      if (this.db.boundary) console.warn(
        `RectangularBoundaryPs received non-number for width: ${value}`
      );
    }
  }

  // Height getter/setter
  get height() {
    return this._height;
  }

  set height(value) {
    // Assume input value is valid and already processed/clamped if necessary upstream
    if (typeof value === "number" && this._height !== value) {
      if (this.db.boundary) console.log(
        `RectangularBoundaryPs height changing from ${this._height} to ${value}`
      );
      this._height = value;
      // REMOVED: MIN_DIMENSION check
      // REMOVED: this.updateVertices();
    } else if (typeof value !== "number") {
      if (this.db.boundary) console.warn(
        `RectangularBoundaryPs received non-number for height: ${value}`
      );
    }
  }

  // TODO: Implement rounded corner logic. Currently treats as sharp corners.
  isPointInside(x, y) {
    const halfWidth = (this._width * this.scale) / 2;
    const halfHeight = (this._height * this.scale) / 2;
    // Check absolute difference from center against half-dimensions
    return (
      Math.abs(x - this.centerX) <= halfWidth &&
      Math.abs(y - this.centerY) <= halfHeight
    );
  }

  getRadius() {
    // Return diagonal half-length for compatibility if needed?
    // Or just error? Let's return diagonal half-length for now.
    const halfWidth = (this._width * this.scale) / 2;
    const halfHeight = (this._height * this.scale) / 2;
    return Math.hypot(halfWidth, halfHeight);
  }

  // Keep basic getters from BaseBoundaryShape (getCenter, getScale, setScale)
  // and specific getters/setters for width/height
}
