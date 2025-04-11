export class BaseBoundaryShape {
  constructor(centerX, centerY, scale = 1.0) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.scale = scale;
  }

  // Abstract method to check if a point is inside the boundary
  isPointInside(x, y) {
    throw new Error("isPointInside must be implemented by derived classes");
  }

  // Optional: Abstract method for a characteristic dimension (e.g., radius or max extent)
  getRadius() {
    // Implementation varies: Circle returns radius, Rect might return diagonal/half-width/height
    // Let derived classes implement this if needed for specific calculations.
    // Returning 0 or throwing error are options.
    // For now, let's keep it but acknowledge it might not be universally applicable.
    return 0; // Default or throw error
  }

  // Common utility methods
  getCenter() {
    return { x: this.centerX, y: this.centerY };
  }

  getScale() {
    return this.scale;
  }

  setScale(scale) {
    this.scale = scale;
    // Note: Derived classes might need to override this if scale affects internal calcs
  }
}
