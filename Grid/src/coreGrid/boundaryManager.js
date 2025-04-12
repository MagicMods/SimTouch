import { CircularBoundaryShape } from "./boundary/circularBoundaryShape.js";
import { RectangularBoundaryShape } from "./boundary/rectangularBoundaryShape.js";
import { CircularBoundaryPs } from "../simulation/boundary/circularBoundaryPs.js";
import { RectangularBoundaryPs } from "../simulation/boundary/rectangularBoundaryPs.js";
import { eventBus } from '../util/eventManager.js';

export class BoundaryManager {
  constructor(initialgridParams, initialgridDimensions) {
    if (!initialgridParams || !initialgridDimensions) {
      throw new Error(
        "BoundaryManager requires initialgridParams and initialgridDimensions."
      );
    }
    this.params = { ...initialgridParams }; // Shallow copy initial params
    this.shapeBoundary = null;
    this.physicsBoundary = null;

    this._createBoundaries(this.params, initialgridDimensions);

    // Subscribe to grid parameter updates
    eventBus.on('gridParamsUpdated', ({ gridParams, dimensions }) => {
      console.debug("BoundaryManager received gridParamsUpdated event.");
      this.update(gridParams, dimensions);
    });
  }

  _createBoundaries(params, dimensions) {
    const shape = params?.screen?.shape;
    if (!shape) {
      console.error(
        "BoundaryManager: Cannot create boundaries, params.screen.shape is missing."
      );
      return;
    }
    if (!dimensions) {
      console.error(
        "BoundaryManager._createBoundaries: dimensions object is missing."
      );
      return;
    }

    console.debug(`BoundaryManager: Creating boundaries for shape: ${shape}`);

    // Create Shape Boundary (coreGrid)
    if (shape === "circular") {
      this.shapeBoundary = new CircularBoundaryShape(0, 0, 1); // Placeholder values, updated in _updateBoundaries
    } else if (shape === "rectangular") {
      this.shapeBoundary = new RectangularBoundaryShape(0, 0, 1, 1); // Placeholder values
    } else {
      console.error(
        `BoundaryManager: Unknown shape type for Shape Boundary: ${shape}`
      );
      this.shapeBoundary = null;
    }

    // Create Physics Boundary (simulation)
    // Using default constructor values for now (normalized 0-1 space)
    if (shape === "circular") {
      this.physicsBoundary = new CircularBoundaryPs({});
    } else if (shape === "rectangular") {
      this.physicsBoundary = new RectangularBoundaryPs({});
    } else {
      console.error(
        `BoundaryManager: Unknown shape type for Physics Boundary: ${shape}`
      );
      this.physicsBoundary = null;
    }

    if (this.shapeBoundary && this.physicsBoundary) {
      console.info(
        `BoundaryManager: Successfully created ${shape} Shape and Physics boundaries.`
      );
      this._updateBoundaries(dimensions); // Perform initial update
    } else {
      console.error(
        `BoundaryManager: Failed to create one or both boundaries for shape ${shape}.`
      );
    }
  }

  update(params, dimensions) {
    const oldShape = this.params?.screen?.shape;
    const newShape = params?.screen?.shape;

    // Store the new params regardless of shape change
    this.params = { ...params };

    if (!newShape) {
      console.error("BoundaryManager.update: params.screen.shape is missing.");
      return;
    }
    if (!dimensions) {
      console.error("BoundaryManager.update: dimensions object is missing.");
      return;
    }

    if (oldShape !== newShape) {
      console.info(
        `BoundaryManager: Shape changed from ${oldShape} to ${newShape}. Recreating boundaries.`
      );
      this._createBoundaries(this.params, dimensions);
    } else {
      console.debug(
        "BoundaryManager: Shape unchanged, updating existing boundaries."
      );
      this._updateBoundaries(dimensions);
    }
  }

  _updateBoundaries(dimensions) {
    if (!this.shapeBoundary || !this.physicsBoundary) {
      console.warn(
        "BoundaryManager._updateBoundaries: Boundaries not initialized, cannot update."
      );
      return;
    }
    if (!dimensions) {
      console.error(
        "BoundaryManager._updateBoundaries: dimensions object is missing."
      );
      return;
    }

    // --- Update Shape Boundary (Render Coordinates) ---
    const renderCenterX = dimensions.renderCenterX;
    const renderCenterY = dimensions.renderCenterY;
    const shapeScale = 1.0; // Shape boundary scale is fixed

    this.shapeBoundary.centerX = renderCenterX;
    this.shapeBoundary.centerY = renderCenterY;
    this.shapeBoundary.scale = shapeScale; // Apply fixed scale

    if (this.shapeBoundary instanceof CircularBoundaryShape) {
      const baseRadius =
        Math.min(dimensions.renderWidth, dimensions.renderHeight) / 2;
      this.shapeBoundary.setRadius(baseRadius); // Let scale handle the final size
      console.debug(
        `BoundaryManager: Updated Circular Shape Boundary - Center: (${this.shapeBoundary.centerX}, ${this.shapeBoundary.centerY}), Radius: ${this.shapeBoundary.radius}, Scale: ${this.shapeBoundary.scale}`
      );
    } else if (this.shapeBoundary instanceof RectangularBoundaryShape) {
      this.shapeBoundary.width = dimensions.renderWidth;
      this.shapeBoundary.height = dimensions.renderHeight;
      console.debug(
        `BoundaryManager: Updated Rectangular Shape Boundary - Center: (${this.shapeBoundary.centerX}, ${this.shapeBoundary.centerY}), W: ${this.shapeBoundary.width}, H: ${this.shapeBoundary.height}, Scale: ${this.shapeBoundary.scale}`
      );
    }

    // --- Update Physics Boundary (Normalized Coordinates - Initial Simple Update) ---
    const physicsBoundaryScale = 1.1; // TODO: Replace with dedicated boundary scale parameter (e.g., params.boundary.scale)

    // Apply scale to dimensions
    if (this.physicsBoundary instanceof CircularBoundaryPs) {
      this.physicsBoundary.radius = 0.5 * physicsBoundaryScale; // Base radius 0.5 scaled - Direct property access
    } else if (this.physicsBoundary instanceof RectangularBoundaryPs) {
      // Determine aspect ratio to find the longer side before scaling
      const aspectRatio = dimensions.physicalWidth / dimensions.physicalHeight;

      // Calculate initial scaled dimensions (base size * scale)
      let baseWidth = 1.0 * physicsBoundaryScale;
      let baseHeight = 1.0 * physicsBoundaryScale;

      // --- Linear Aspect Ratio Adjustment ---
      const targetMultiplier = 0.88; // Target squish factor for the longer side
      const maxScaleDeviation = 0.4; // Deviation from 1.0 where targetMultiplier is fully applied (e.g., at 1.4 or 0.6)
      const currentDeviation = Math.abs(physicsBoundaryScale - 1.0);
      const interpolationFactor = Math.min(
        currentDeviation / maxScaleDeviation,
        1.0
      );
      const dynamicMultiplier =
        1.0 + interpolationFactor * (targetMultiplier - 1.0);

      let finalWidth = baseWidth;
      let finalHeight = baseHeight;

      // Apply the dynamic multiplier based on the physical aspect ratio
      if (aspectRatio > 1) {
        // Width is longer than height physically
        finalWidth *= dynamicMultiplier; // Adjust the longer side (width)
      } else if (aspectRatio < 1) {
        // Height is longer than width physically
        finalHeight *= dynamicMultiplier; // Adjust the longer side (height)
      }
      // If aspectRatio is 1 (square), or scale is 1.0, no multiplier applied implicitly

      this.physicsBoundary.width = finalWidth;
      this.physicsBoundary.height = finalHeight;
    }

    // For now, just ensure its parameters reflect the intended normalized shape
    // Defaults are likely okay (center 0.5, 0.5, radius 0.5 or width/height 0.8-1.0)
    this.physicsBoundary.cBoundaryRestitution =
      this.params.boundaryParams?.cBoundaryRestitution ??
      this.physicsBoundary.cBoundaryRestitution;
    this.physicsBoundary.damping =
      this.params.boundaryParams?.damping ?? this.physicsBoundary.damping;
    this.physicsBoundary.boundaryRepulsion =
      this.params.boundaryParams?.boundaryRepulsion ??
      this.physicsBoundary.boundaryRepulsion;
    this.physicsBoundary.mode =
      this.params.boundaryParams?.mode ?? this.physicsBoundary.mode;

    console.debug(
      `BoundaryManager: Updated Physics Boundary type: ${this.physicsBoundary.getBoundaryType()}. Applied scale: ${physicsBoundaryScale}`
    );
  }

  getShapeBoundary() {
    return this.shapeBoundary;
  }

  getPhysicsBoundary() {
    return this.physicsBoundary;
  }
}
