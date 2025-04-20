import { CircularBoundaryShape } from "./boundary/circularBoundaryShape.js";
import { RectangularBoundaryShape } from "./boundary/rectangularBoundaryShape.js";
import { CircularBoundary } from "../simulation/boundary/circularBoundary.js";
import { RectangularBoundary } from "../simulation/boundary/rectangularBoundary.js";
import { eventBus } from '../util/eventManager.js';

export class BoundaryManager {
  constructor(initialgridParams, initialgridDimensions, dimensionManager, debugFlags) {
    if (!initialgridParams || !initialgridDimensions || !dimensionManager) {
      throw new Error(
        "BoundaryManager requires initialgridParams, initialgridDimensions, and dimensionManager."
      );
    }
    this.db = debugFlags;
    this.dimensionManager = dimensionManager;
    this.simParams = null;
    this.previousScale = null;


    this.params = {
      screen: { ...(initialgridParams.screen || {}) },
      boundaryParams: { ...(initialgridParams.boundaryParams || {}) }
    };

    this.shapeBoundary = null;
    this.physicsBoundary = null;

    this.createBoundaries(this.params, initialgridDimensions);

    // Subscribe to SIM parameter updates, not grid updates
    eventBus.on('simParamsUpdated', ({ simParams }) => {
      if (this.db.dimensions) console.log("BoundaryManager received simParamsUpdated event.");
      const dimensions = this.dimensionManager?.getDimensions();
      if (!dimensions) {
        console.error("BoundaryManager: Could not get dimensions to process simParams update.");
        return;
      }
      this.updateSimParams(simParams, dimensions); // Pass full simParams
    });

    eventBus.on('gridParamsUpdated', ({ gridParams, dimensions }) => {
      if (this.db.dimensions) console.log("BoundaryManager received gridParamsUpdated event."); // Keep verbose logs off by default
      if (!gridParams || !dimensions) {
        console.error("BoundaryManager: gridParamsUpdated event missing gridParams or dimensions.");
        return;
      }
      // Call the method that handles shape changes and updates internal grid params
      this.update(gridParams, dimensions);
    });
  }

  createBoundaries(params, dimensions) {
    const shape = params?.screen?.shape;
    if (this.db.dimensions) console.log('BoundaryManager.createBoundaries received shape:', shape);
    if (!shape) {
      console.error(
        "BoundaryManager: Cannot create boundaries, params.screen.shape is missing."
      );
      return;
    }
    if (!dimensions) {
      console.error(
        "BoundaryManager.createBoundaries: dimensions object is missing."
      );
      return;
    }

    if (this.db.dimensions) console.log(`BoundaryManager: Creating boundaries for shape: ${shape}`);

    // Create Shape Boundary (coreGrid)
    if (shape === "circular") {
      this.shapeBoundary = new CircularBoundaryShape(0, 0, 1, 1.0, this.db); // TODO: SCALE
      this.physicsBoundary = new CircularBoundary({}, this.db);
    } else if (shape === "rectangular") {
      this.shapeBoundary = new RectangularBoundaryShape(0, 0, 1, 1, 1.0, this.db);
      this.physicsBoundary = new RectangularBoundary({}, this.db);
    } else {
      console.error(
        `BoundaryManager: Unknown shape type for Shape Boundary: ${shape}`
      );
      this.shapeBoundary = null;
      this.physicsBoundary = null;
    }


    if (this.shapeBoundary && this.physicsBoundary) {
      if (this.db.dimensions) console.log('BoundaryManager.createBoundaries created boundary of type:', this.physicsBoundary?.constructor?.name);
      if (this.db.dimensions) console.log('BoundaryManager: Successfully created ${shape} Shape and Physics boundaries.');
      this._updateBoundaries(dimensions);
      eventBus.emit('physicsBoundaryRecreated', { physicsBoundary: this.physicsBoundary });
    } else {
      console.error(
        `BoundaryManager: Failed to create one or both boundaries for shape ${shape}.`
      );
    }
  }

  update(params, dimensions) {
    const oldShape = this.params?.screen?.shape;
    const newShape = params?.screen?.shape;

    if (this.db.dimensions) console.log(`BoundaryManager.update: Comparing shapes - Old: '${oldShape}', New: '${newShape}'`);
    if (this.db.dimensions) console.log('[db] BoundaryManager.update received newShape:', newShape);

    if (!newShape) {
      console.error("BoundaryManager.update: params.screen.shape is missing.");
      return;
    }
    if (!dimensions) {
      console.error("BoundaryManager.update: dimensions object is missing.");
      return;
    }

    if (oldShape !== newShape) {
      if (this.db.dimensions) console.info(
        `BoundaryManager: Shape changed from ${oldShape} to ${newShape}. Recreating boundaries.`
      );
      if (this.db.dimensions) console.log('[db] BoundaryManager.update entering createBoundaries due to shape change.');
      this.createBoundaries(params, dimensions);
    } else {
      if (this.db.dimensions) console.log(
        "BoundaryManager: Shape unchanged, updating existing boundaries."
      );
      this._updateBoundaries(dimensions);
    }

    // --- BEGIN STEP 2: Update internal state with copy ---
    // this.params = { ...params }; // Old shallow copy / reassignment
    // Selectively update internal state with copies from the event payload
    this.params.screen = { ...(params.screen || {}) };
    this.params.boundaryParams = { ...(params.boundaryParams || {}) };
    // --- END STEP 2 ---
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
      if (this.db.dimensions) console.log(
        `BoundaryManager: Updated Circular Shape Boundary - Center: (${this.shapeBoundary.centerX}, ${this.shapeBoundary.centerY}), Radius: ${this.shapeBoundary.radius}, Scale: ${this.shapeBoundary.scale}`
      );
    } else if (this.shapeBoundary instanceof RectangularBoundaryShape) {
      this.shapeBoundary.width = dimensions.renderWidth;
      this.shapeBoundary.height = dimensions.renderHeight;
      if (this.db.dimensions) console.log(
        `BoundaryManager: Updated Rectangular Shape Boundary - Center: (${this.shapeBoundary.centerX}, ${this.shapeBoundary.centerY}), W: ${this.shapeBoundary.width}, H: ${this.shapeBoundary.height}, Scale: ${this.shapeBoundary.scale}`
      );
    }

    // --- Update Physics Boundary (Normalized Coordinates - Initial Simple Update) ---
    // Read scale from internal simParams copy
    const physicsBoundaryScale = this.simParams?.boundary?.scale ?? 1.1; // Use dynamic scale, default 1.1

    // Apply scale to dimensions
    if (this.physicsBoundary instanceof CircularBoundary) {
      this.physicsBoundary.radius = 0.5 * physicsBoundaryScale; // Base radius 0.5 scaled - Direct property access
    } else if (this.physicsBoundary instanceof RectangularBoundary) {
      const aspectRatio = dimensions.physicalWidth / dimensions.physicalHeight;

      // Calculate initial scaled dimensions (base size * scale)
      let baseWidth = 1.0 * physicsBoundaryScale;
      let baseHeight = 1.0 * physicsBoundaryScale;

      // --- Linear Aspect Ratio Adjustment ---
      const targetMultiplier = 0.88; // Target squish factor for the longer side
      const maxScaleDeviation = 0.4; // Deviation from 1.0 where targetMultiplier is fully applied (e.g., at 1.4 or 0.6)
      const currentDeviation = Math.abs(physicsBoundaryScale - 1.0);
      const interpolationFactor = Math.min(currentDeviation / maxScaleDeviation, 1.0);
      const dynamicMultiplier = 1.0 + interpolationFactor * (targetMultiplier - 1.0);

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

      // Update dependent properties in the boundary instance
      this.physicsBoundary.halfWidth = finalWidth / 2;
      this.physicsBoundary.halfHeight = finalWidth / 2;
      this.physicsBoundary.minX = this.physicsBoundary.centerX - this.physicsBoundary.halfWidth;
      this.physicsBoundary.maxX = this.physicsBoundary.centerX + this.physicsBoundary.halfWidth;
      this.physicsBoundary.minY = this.physicsBoundary.centerY - this.physicsBoundary.halfHeight;
      this.physicsBoundary.maxY = this.physicsBoundary.centerY + this.physicsBoundary.halfHeight;
      if (this.db.dimensions) console.log(`BoundaryManager - Rect Set: w=${this.physicsBoundary.width.toFixed(3)}, h=${this.physicsBoundary.height.toFixed(3)}, minX=${this.physicsBoundary.minX.toFixed(3)}, maxX=${this.physicsBoundary.maxX.toFixed(3)}, minY=${this.physicsBoundary.minY.toFixed(3)}, maxY=${this.physicsBoundary.maxY.toFixed(3)}`);
    }

    if (this.db.dimensions) console.log(
      `BoundaryManager: Updated Physics Boundary type: ${this.physicsBoundary.getBoundaryType()}. Applied scale: ${physicsBoundaryScale}`
    );
  }

  getShapeBoundary() {
    return this.shapeBoundary;
  }

  getPhysicsBoundary() {
    return this.physicsBoundary;
  }

  // ---> ADDED New method to apply physics properties <---
  _updatePhysicsProperties() {
    if (!this.physicsBoundary || !this.simParams?.boundary) {
      console.warn("BoundaryManager._updatePhysicsProperties: Missing physicsBoundary or simParams.boundary.");
      return;
    }

    this.physicsBoundary.cBoundaryRestitution =
      this.simParams.boundary.restitution ?? this.physicsBoundary.cBoundaryRestitution;
    this.physicsBoundary.damping =
      this.simParams.boundary.damping ?? this.physicsBoundary.damping;
    this.physicsBoundary.boundaryRepulsion =
      this.simParams.boundary.repulsion ?? this.physicsBoundary.boundaryRepulsion;
    this.physicsBoundary.mode =
      this.simParams.boundary.mode ?? this.physicsBoundary.mode;

    // if (this.db.dimensions ) console.log( // Keep verbose logs off by default
    //     `BoundaryManager: Applied physics properties: Repulsion=${this.physicsBoundary.boundaryRepulsion?.toFixed(2)}, Damping=${this.physicsBoundary.damping?.toFixed(2)}, Restitution=${this.physicsBoundary.cBoundaryRestitution?.toFixed(2)}, Mode=${this.physicsBoundary.mode}`
    // );
  }

  // New method to handle simParam updates specifically affecting the boundary
  updateSimParams(simParams, dimensions) {
    if (this.db.dimensions) {
      console.log("BoundaryManager: Received simParams update:", simParams);
      console.log("BoundaryManager: Current dimensions for update:", dimensions);
    }
    if (!simParams || !simParams.boundary) {
      console.error("BoundaryManager.updateSimParams: Missing simParams or simParams.boundary.");
      return;
    }
    if (!dimensions) {
      console.error("BoundaryManager.updateSimParams: dimensions object is missing.");
      return;
    }

    // Store the previous simParams boundary state for comparison
    const oldSimParamsBoundary = this.simParams?.boundary;
    // Update the internal simParams state (create copies to avoid mutation issues)
    this.simParams = { ...(this.simParams || {}), boundary: { ...(simParams.boundary || {}) } };
    const newScale = this.simParams.boundary.scale;

    // Check if scale changed
    const scaleChanged = newScale !== this.previousScale;

    if (scaleChanged || this.previousScale === null) {
      // if (this.db.dimensions ) console.log(`BoundaryManager: Scale changed (or initial update). Old: ${this.previousScale}, New: ${newScale}. Recalculating boundaries.`);
      this._updateBoundaries(dimensions); // Call geometry update logic ONLY if scale changed
      this.previousScale = newScale; // Update tracked scale
    }
    // Always apply physics properties after potential geometry update using the latest simParams
    this._updatePhysicsProperties();
  }
}
