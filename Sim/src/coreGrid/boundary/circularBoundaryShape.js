import { BaseBoundaryShape } from "./baseBoundaryShape.js";

export class CircularBoundaryShape extends BaseBoundaryShape {
  constructor(centerX, centerY, radius, scale = 1.0) {
    super(centerX, centerY, scale);
    this.radius = radius;
  }

  isPointInside(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return Math.hypot(dx, dy) <= this.radius * this.scale;
  }

  getRadius() {
    return this.radius * this.scale;
  }

  setRadius(newRadius) {
    if (typeof newRadius !== "number" || newRadius <= 0) {
      console.warn(
        `CircularBoundaryShape: Attempted to set invalid radius: ${newRadius}. Using previous radius: ${this.radius}`
      );
      return;
    }
    if (this.radius !== newRadius) {
      console.debug(
        `CircularBoundaryShape: Updating base radius from ${this.radius} to ${newRadius}`
      );
      this.radius = newRadius;
    }
  }

  // Method to update scale (inherited from BaseBoundaryShape)
  // No override needed unless scale affects other internal state
}
