import { CircularBoundaryPs } from "./circularBoundaryPs.js";
import { RectangularBoundaryPs } from "./rectangularBoundaryPs.js";

class BoundaryPsUtils {
  static circularToRectangular(circularBoundaryPs, options = {}) {
    const { preserveArea = false, aspectRatio = 1.0 } = options;

    // Get circle parameters
    const centerX = circularBoundaryPs.centerX;
    const centerY = circularBoundaryPs.centerY;
    const radius = circularBoundaryPs.radius;

    let width, height;

    if (preserveArea) {
      // Preserve area: πr² = w*h
      // Solve for width and height given aspect ratio
      const area = Math.PI * radius * radius;

      // width = aspectRatio * height
      // area = width * height = aspectRatio * height * height
      // height = sqrt(area / aspectRatio)
      height = Math.sqrt(area / aspectRatio);
      width = aspectRatio * height;
    } else {
      // Default: rectangle that inscribes the circle
      width = 2 * radius;
      height = 2 * radius;

      // Adjust for aspect ratio if specified
      if (aspectRatio !== 1.0) {
        if (aspectRatio > 1.0) {
          // Wider than tall
          width = 2 * radius;
          height = width / aspectRatio;
        } else {
          // Taller than wide
          height = 2 * radius;
          width = height * aspectRatio;
        }
      }
    }

    // Return parameters for creating a rectangular boundary
    return {
      centerX,
      centerY,
      width,
      height,
      // Preserve physics parameters
      cBoundaryRestitution: circularBoundaryPs.cBoundaryRestitution,
      damping: circularBoundaryPs.damping,
      boundaryRepulsion: circularBoundaryPs.boundaryRepulsion,
      mode: circularBoundaryPs.mode,
    };
  }

  static rectangularToCircular(rectangularBoundaryPs, options = {}) {
    const { preserveArea = false, inscribed = true } = options;

    // Get rectangle parameters
    const centerX = rectangularBoundaryPs.centerX;
    const centerY = rectangularBoundaryPs.centerY;
    const width = rectangularBoundaryPs.width;
    const height = rectangularBoundaryPs.height;

    let radius;

    if (preserveArea) {
      // Preserve area: πr² = w*h
      // Solve for radius
      radius = Math.sqrt((width * height) / Math.PI);
    } else if (inscribed) {
      // Default: circle inscribed in rectangle
      radius = Math.min(width, height) / 2;
    } else {
      // Circle that circumscribes the rectangle
      radius = Math.sqrt((width * width + height * height) / 4);
    }

    // Return parameters for creating a circular boundary
    return {
      centerX,
      centerY,
      radius,
      // Preserve physics parameters
      cBoundaryRestitution: rectangularBoundaryPs.cBoundaryRestitution,
      damping: rectangularBoundaryPs.damping,
      boundaryRepulsion: rectangularBoundaryPs.boundaryRepulsion,
      mode: rectangularBoundaryPs.mode,
    };
  }

  static createBoundary(type, params = {}) {
    // Import the boundary classes directly to avoid circular dependencies
    if (type === "CIRCULAR") {
      // Use direct import rather than require
      return new CircularBoundaryPs(params);
    } else if (type === "RECTANGULAR") {
      // Use direct import rather than require
      return new RectangularBoundaryPs(params);
    } else {
      throw new Error(`Unknown boundary type: ${type}`);
    }
  }

  static getArea(boundary) {
    const type = boundary.getBoundaryType();

    if (type === "CIRCULAR") {
      return Math.PI * boundary.radius * boundary.radius;
    } else if (type === "RECTANGULAR") {
      return boundary.width * boundary.height;
    } else {
      throw new Error(`Unknown boundary type: ${type}`);
    }
  }
}

export { BoundaryPsUtils };
