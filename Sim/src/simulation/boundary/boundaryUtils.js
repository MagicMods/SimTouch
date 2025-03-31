import { CircularBoundary } from "./circularBoundary.js";
import { RectangularBoundary } from "./rectangularBoundary.js";

/**
 * BoundaryUtils provides helper methods for converting between boundary types
 * and other boundary-related operations.
 */
class BoundaryUtils {
    /**
     * Converts a circular boundary to an equivalent rectangular boundary
     * @param {CircularBoundary} circularBoundary - The circular boundary to convert
     * @param {Object} options - Additional options for conversion
     * @param {boolean} options.preserveArea - Whether to preserve the area (default false)
     * @param {number} options.aspectRatio - Aspect ratio for the rectangle (width/height)
     * @returns {Object} Parameters for creating a rectangular boundary
     */
    static circularToRectangular(circularBoundary, options = {}) {
        const { preserveArea = false, aspectRatio = 1.0 } = options;

        // Get circle parameters
        const centerX = circularBoundary.centerX;
        const centerY = circularBoundary.centerY;
        const radius = circularBoundary.radius;

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
            cBoundaryRestitution: circularBoundary.cBoundaryRestitution,
            damping: circularBoundary.damping,
            boundaryRepulsion: circularBoundary.boundaryRepulsion,
            mode: circularBoundary.mode
        };
    }

    /**
     * Converts a rectangular boundary to an equivalent circular boundary
     * @param {RectangularBoundary} rectangularBoundary - The rectangular boundary to convert
     * @param {Object} options - Additional options for conversion
     * @param {boolean} options.preserveArea - Whether to preserve the area (default false)
     * @param {boolean} options.inscribed - Whether the circle should be inscribed in the rectangle (default true)
     * @returns {Object} Parameters for creating a circular boundary
     */
    static rectangularToCircular(rectangularBoundary, options = {}) {
        const { preserveArea = false, inscribed = true } = options;

        // Get rectangle parameters
        const centerX = rectangularBoundary.centerX;
        const centerY = rectangularBoundary.centerY;
        const width = rectangularBoundary.width;
        const height = rectangularBoundary.height;

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
            cBoundaryRestitution: rectangularBoundary.cBoundaryRestitution,
            damping: rectangularBoundary.damping,
            boundaryRepulsion: rectangularBoundary.boundaryRepulsion,
            mode: rectangularBoundary.mode
        };
    }

    /**
     * Creates a boundary of the specified type
     * @param {string} type - The boundary type ("CIRCULAR" or "RECTANGULAR")
     * @param {Object} params - Parameters for the boundary
     * @returns {BaseBoundary} A boundary instance of the specified type
     */
    static createBoundary(type, params = {}) {
        // Import the boundary classes directly to avoid circular dependencies
        if (type === "CIRCULAR") {
            // Use direct import rather than require
            return new CircularBoundary(params);
        } else if (type === "RECTANGULAR") {
            // Use direct import rather than require
            return new RectangularBoundary(params);
        } else {
            throw new Error(`Unknown boundary type: ${type}`);
        }
    }

    /**
     * Gets the area of any boundary
     * @param {BaseBoundary} boundary - The boundary to calculate area for
     * @returns {number} The area of the boundary
     */
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

export { BoundaryUtils }; 