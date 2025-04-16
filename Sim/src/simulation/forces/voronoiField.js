import { eventBus } from '../../util/eventManager.js'; // Added import

export class VoronoiField {
  constructor({
    strength = 0,
    cellCount = 10,
    cellMovementSpeed = 0.2,
    edgeWidth = 0.3,
    attractionFactor = 1.0,
    boundary = null,
    timeOffset = Math.random() * 1000,
    decayRate = 0.99,
    pullMode = false,  // NEW: Pull particles to edges instead of pushing away
  } = {}, debugFlag) {
    this.debugFlag = debugFlag;
    if (!boundary) {
      console.warn("VoronoiField: No boundary provided, using default");
      boundary = {
        centerX: 0.5,
        centerY: 0.5,
        getRadius: () => 0.5,
      };
    }

    this.boundary = boundary;
    this.strength = strength;
    this.cellCount = cellCount;
    this.cellMovementSpeed = cellMovementSpeed;
    this.edgeWidth = edgeWidth;
    this.attractionFactor = attractionFactor;
    this.decayRate = decayRate;
    this.timeOffset = timeOffset;
    this.pullMode = pullMode;  // NEW: Store the pull mode

    this.time = 0;
    this.scaleStrength = 0;
    this.minScale = 0.2; // Very small at edges
    this.maxScale = 2.5; // Larger in centers

    // Initialize arrays - VERY IMPORTANT!
    // The error occurs because these are not properly initialized
    this.voronoiCenters = [];
    this.voronoiVelocities = [];

    // Generate initial cells (DO NOT use this.regenerateCells() here to avoid possible circular dependencies)
    this.initializeCells();

    this.velocityBlendFactor = 0.7; // How much the voronoi affects existing velocity
    this.forceSmoothingFactor = 0.3; // Lower = smoother transitions

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));

    // ---> ADDED EVENT LISTENER HERE <---
    eventBus.on('physicsBoundaryRecreated', ({ physicsBoundary }) => {
      if (physicsBoundary) {
        this.boundary = physicsBoundary;
        if (this.debugFlag) console.log("VoronoiField updated boundary reference.");
      } else {
        console.error("VoronoiField received null boundary on physicsBoundaryRecreated event.");
      }
    });
  }

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (simParams?.voronoi) {
      const voronoiParams = simParams.voronoi;
      const previousCellCount = this.cellCount; // Store cellCount for regeneration check

      this.strength = voronoiParams.strength ?? this.strength;
      this.cellCount = voronoiParams.cellCount ?? this.cellCount;
      this.cellMovementSpeed = voronoiParams.cellMovementSpeed ?? this.cellMovementSpeed;
      this.edgeWidth = voronoiParams.edgeWidth ?? this.edgeWidth;
      this.attractionFactor = voronoiParams.attractionFactor ?? this.attractionFactor;
      this.decayRate = voronoiParams.decayRate ?? this.decayRate;
      this.velocityBlendFactor = voronoiParams.velocityBlendFactor ?? this.velocityBlendFactor;
      this.pullMode = voronoiParams.pullMode ?? this.pullMode;
      // Update other parameters if added...

      // Check if cell count change requires cell regeneration
      if (this.cellCount !== previousCellCount && typeof this.regenerateCells === 'function') {
        if (this.debugFlag) console.log(`VoronoiField: Cell count changed from ${previousCellCount} to ${this.cellCount}. Regenerating cells.`);
        this.regenerateCells();
      }
    }
    // if(this.debugFlag) console.log (`VoronoiField updated params via event`);
  }

  initializeCells() {
    try {
      // Clear existing arrays first
      this.voronoiCenters = [];
      this.voronoiVelocities = [];

      // Safety checks for boundary
      const radius =
        this.boundary && typeof this.boundary.getRadius === "function"
          ? this.boundary.getRadius()
          : 0.5;
      const centerX =
        this.boundary && typeof this.boundary.centerX === "number"
          ? this.boundary.centerX
          : 0.5;
      const centerY =
        this.boundary && typeof this.boundary.centerY === "number"
          ? this.boundary.centerY
          : 0.5;

      // Generate at least 2 cells
      const actualCellCount = Math.max(2, this.cellCount);

      // if(this.debugFlag) console.log (`Regenerating ${actualCellCount} Voronoi cells`);

      // Generate cells explicitly
      for (let i = 0; i < actualCellCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius * 0.9;

        const cellX = centerX + Math.cos(angle) * dist;
        const cellY = centerY + Math.sin(angle) * dist;

        this.voronoiCenters.push([cellX, cellY]);

        const vAngle = Math.random() * Math.PI * 2;
        const vMag = Math.random() * this.cellMovementSpeed;

        this.voronoiVelocities.push([
          Math.cos(vAngle) * vMag,
          Math.sin(vAngle) * vMag,
        ]);
      }

      // if(this.debugFlag) console.log (`Generated ${this.voronoiCenters.length} voronoi cells`);
    } catch (error) {
      console.error("Error initializing Voronoi cells:", error);
      // Fallback to minimal setup to prevent crashes
      this.voronoiCenters = [
        [0.3, 0.3],
        [0.7, 0.7],
      ];
      this.voronoiVelocities = [
        [0, 0],
        [0, 0],
      ];
    }
  }

  regenerateCells() {
    this.initializeCells(); // Use the safe initialization method
  }

  // Calculate more accurate Voronoi edge distance
  getVoronoiEdgeDistance(x, y) {
    // Check if there are enough centers
    if (!Array.isArray(this.voronoiCenters) || this.voronoiCenters.length < 2) {
      console.warn("VoronoiField: Not enough centers, reinitializing");
      this.initializeCells();

      // If still not enough centers after reinitializing, return default
      if (
        !Array.isArray(this.voronoiCenters) ||
        this.voronoiCenters.length < 2
      ) {
        return {
          distance: 1,
          gradient: [0, 0],
        };
      }
    }

    // Find two nearest centers
    let nearest = Infinity;
    let secondNearest = Infinity;
    let nearestIndex = 0;
    let secondNearestIndex = 1;

    for (let i = 0; i < this.voronoiCenters.length; i++) {
      const center = this.voronoiCenters[i];

      // Skip invalid centers
      if (!Array.isArray(center) || center.length < 2) {
        continue;
      }

      const [cx, cy] = center;
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearest) {
        secondNearest = nearest;
        secondNearestIndex = nearestIndex;
        nearest = distSq;
        nearestIndex = i;
      } else if (distSq < secondNearest) {
        secondNearest = distSq;
        secondNearestIndex = i;
      }
    }

    // Safety check for valid indices
    if (nearestIndex === secondNearestIndex) {
      // Force second nearest to be different
      for (let i = 0; i < this.voronoiCenters.length; i++) {
        if (i !== nearestIndex) {
          secondNearestIndex = i;
          break;
        }
      }
    }

    // Get the center positions with safety checks
    const center1 = this.voronoiCenters[nearestIndex] || [0.3, 0.3];
    const center2 = this.voronoiCenters[secondNearestIndex] || [0.7, 0.7];
    const [cx1, cy1] = center1;
    const [cx2, cy2] = center2;

    // Find the perpendicular bisector between the two nearest centers
    // This is the Voronoi edge
    const midX = (cx1 + cx2) / 2;
    const midY = (cy1 + cy2) / 2;

    // Vector from center1 to center2
    const vx = cx2 - cx1;
    const vy = cy2 - cy1;
    const vLength = Math.sqrt(vx * vx + vy * vy);

    if (vLength < 0.00001) {
      // Centers are too close, return default
      return {
        distance: 0.01,
        gradient: [0, 0],
      };
    }

    // Normalize the vector
    const nvx = vx / vLength;
    const nvy = vy / vLength;

    // Calculate the projection of the point onto the line from center1 to center2
    const px = x - cx1;
    const py = y - cy1;

    // Dot product to find projection length
    const projectionLength = px * nvx + py * nvy;

    // Point on the line
    const projX = cx1 + nvx * projectionLength;
    const projY = cy1 + nvy * projectionLength;

    // Distance from point to the line
    const dx = x - projX;
    const dy = y - projY;

    // True distance to the perpendicular bisector (Voronoi edge)
    const perpDistance = Math.sqrt(dx * dx + dy * dy);

    // Check if projection point is between the centers
    const isOnEdge = projectionLength >= 0 && projectionLength <= vLength;

    // If not on edge, use distance to midpoint as an approximation
    const edgeDistance = isOnEdge
      ? Math.abs(perpDistance - vLength / 2)
      : Math.abs(
        Math.sqrt((x - midX) * (x - midX) + (y - midY) * (y - midY)) -
        vLength / 2
      );

    // Calculate accurate gradient (direction to nearest Voronoi edge)
    // For true Voronoi edges, it should point perpendicular to the bisector
    let gradientX, gradientY;

    if (isOnEdge) {
      // Perpendicular direction to the line
      gradientX = -nvy;
      gradientY = nvx;

      // Make sure gradient points toward the edge
      const dotProduct = gradientX * dx + gradientY * dy;
      if (dotProduct < 0) {
        gradientX = -gradientX;
        gradientY = -gradientY;
      }
    } else {
      // Direction to midpoint
      gradientX = midX - x;
      gradientY = midY - y;
      const gradLength = Math.sqrt(
        gradientX * gradientX + gradientY * gradientY
      );
      if (gradLength > 0.00001) {
        gradientX /= gradLength;
        gradientY /= gradLength;
      } else {
        gradientX = 0;
        gradientY = 0;
      }
    }

    return {
      distance: edgeDistance,
      gradient: [gradientX, gradientY],
      isOnEdge: isOnEdge,
    };
  }

  applyTurbulence(position, velocity, dt, particleIndex, system) {
    try {
      const [x, y] = position;
      const [vx, vy] = velocity;

      // Get Voronoi edge information with error handling
      let edgeInfo;
      try {
        edgeInfo = this.getVoronoiEdgeDistance(x, y);
      } catch (err) {
        console.error("Error getting voronoi edge distance:", err);
        edgeInfo = { distance: 1, gradient: [0, 0], isOnEdge: false };
      }

      const { distance, gradient, isOnEdge } = edgeInfo;

      // Calculate edge proximity factor - stronger effect very close to edges
      // Use sharper falloff for more defined filaments
      const edgeFactor = Math.max(
        0,
        1.0 - Math.pow(distance / this.edgeWidth, 1.5)
      );

      // Initialize with velocity decay - CRITICAL CHANGE: more decay near edges
      // This makes particles slow down significantly when they reach an edge
      const edgeDecay =
        isOnEdge || edgeFactor > 0.7
          ? this.decayRate * 0.7 // Strong damping on edges
          : this.decayRate; // Normal decay elsewhere

      let newVx =
        vx * edgeDecay * this.velocityBlendFactor +
        vx * (1 - this.velocityBlendFactor);
      let newVy =
        vy * edgeDecay * this.velocityBlendFactor +
        vy * (1 - this.velocityBlendFactor);

      // Apply position forces only if enabled
      if (this.strength > 0) {
        // Calculate force magnitude - stronger attraction to edges
        const forceMagnitude =
          edgeFactor * this.strength * this.attractionFactor;

        // Get gradient direction (points toward edge)
        let [gx, gy] = gradient;

        // PULL MODE: Invert gradient direction for pull mode to attract to edges
        if (this.pullMode) {
          gx = -gx;
          gy = -gy;
        }

        // CRITICAL CHANGE: Check if we're already moving toward the edge
        // This prevents overshooting and ping-ponging across edges
        const movingTowardEdge = vx * gx + vy * gy < 0;

        if (movingTowardEdge || !isOnEdge) {
          // Apply full force if not on edge or moving toward it
          newVx += gx * forceMagnitude * this.forceSmoothingFactor * dt;
          newVy += gy * forceMagnitude * this.forceSmoothingFactor * dt;
        } else {
          // Apply reduced force if already on edge - just enough to stay on it
          // This creates the "sticking" to edges effect
          newVx += gx * forceMagnitude * 0.1 * dt;
          newVy += gy * forceMagnitude * 0.1 * dt;

          // IMPORTANT: Apply force perpendicular to edge to create filaments
          // This creates movement along the edge rather than across it
          const edgeDirection = [-gy, gx]; // Perpendicular to gradient

          // Align velocity more with the edge direction
          const edgeAlignment = 0.05 * forceMagnitude; // Small nudge along edge
          newVx += edgeDirection[0] * edgeAlignment * dt;
          newVy += edgeDirection[1] * edgeAlignment * dt;
        }

        // Add velocity limit for edge particles to ensure they stay slow
        if (isOnEdge || edgeFactor > 0.7) {
          const initialSpeed = Math.sqrt(vx * vx + vy * vy);
          const maxEdgeSpeed = Math.max(
            0.1 * this.strength,
            initialSpeed * 0.6
          );
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speed > maxEdgeSpeed) {
            newVx = (newVx / speed) * maxEdgeSpeed;
            newVy = (newVy / speed) * maxEdgeSpeed;
          }
        }
      }
      return [newVx, newVy];
    } catch (err) {
      console.error("Error in voronoi applyTurbulence:", err);
      return velocity; // Return unchanged velocity on error
    }
  }

  update(dt) {
    this.time += dt;

    // Skip update if strength is zero
    if (this.strength <= 0) return;

    try {
      // Safety check - ensure we have valid cells
      if (
        !Array.isArray(this.voronoiCenters) ||
        this.voronoiCenters.length < 2
      ) {
        this.initializeCells();
        return;
      }

      // Move Voronoi cells
      let radius = 0.5;
      let centerX = 0.5;
      let centerY = 0.5;

      // Get boundary parameters if available
      if (this.boundary) {
        try {
          // Try to get radius from boundary
          radius = this.boundary.getRadius();
        } catch (e) {
          radius = 0.5; // Fallback if getRadius fails
        }

        // Get center coordinates with fallbacks
        centerX = this.boundary.centerX !== undefined ? this.boundary.centerX : 0.5;
        centerY = this.boundary.centerY !== undefined ? this.boundary.centerY : 0.5;
      }

      for (let i = 0; i < this.voronoiCenters.length; i++) {
        if (
          !Array.isArray(this.voronoiCenters[i]) ||
          !Array.isArray(this.voronoiVelocities[i])
        ) {
          continue; // Skip invalid entries
        }

        const [cx, cy] = this.voronoiCenters[i];
        const [vx, vy] = this.voronoiVelocities[i];

        // Update position
        let newX = cx + vx * dt;
        let newY = cy + vy * dt;

        // Bounce off boundary
        const dx = newX - centerX;
        const dy = newY - centerY;
        const distSq = dx * dx + dy * dy;
        const maxRadiusSq = radius * 0.9 * (radius * 0.9);

        if (distSq > maxRadiusSq) {
          // Reflect velocity
          const normal = [dx, dy];
          const normalLen = Math.sqrt(distSq);
          normal[0] /= normalLen;
          normal[1] /= normalLen;

          // v - 2(v·n)n
          const dot = vx * normal[0] + vy * normal[1];
          this.voronoiVelocities[i] = [
            vx - 2 * dot * normal[0],
            vy - 2 * dot * normal[1],
          ];

          // Move back inside boundary
          const overlap = Math.sqrt(distSq) - radius * 0.9;
          newX = newX - normal[0] * overlap;
          newY = newY - normal[1] * overlap;
        }

        // Occasionally change velocity
        if (Math.random() < 0.01) {
          const vAngle = Math.random() * Math.PI * 2;
          const vMag = Math.random() * this.cellMovementSpeed;
          this.voronoiVelocities[i] = [
            Math.cos(vAngle) * vMag,
            Math.sin(vAngle) * vMag,
          ];
        }

        this.voronoiCenters[i] = [newX, newY];
      }

      // Occasionally add/remove cells for more dynamism
      if (Math.random() < 0.001) {
        const action = Math.random();
        if (action < 0.3 && this.voronoiCenters.length > 3) {
          // Remove a random cell
          const index = Math.floor(Math.random() * this.voronoiCenters.length);
          this.voronoiCenters.splice(index, 1);
          this.voronoiVelocities.splice(index, 1);
        } else if (this.voronoiCenters.length < this.cellCount * 1.5) {
          // Add a new cell
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * radius * 0.9;

          this.voronoiCenters.push([
            centerX + Math.cos(angle) * dist,
            centerY + Math.sin(angle) * dist,
          ]);

          const vAngle = Math.random() * Math.PI * 2;
          const vMag = Math.random() * this.cellMovementSpeed;
          this.voronoiVelocities.push([
            Math.cos(vAngle) * vMag,
            Math.sin(vAngle) * vMag,
          ]);
        }
      }
    } catch (err) {
      console.error("Error in voronoi update:", err);
      // Try to recover by reinitializing cells
      this.initializeCells();
    }
  }

  setParameters({
    strength,
    cellCount,
    cellMovementSpeed,
    edgeWidth,
    attractionFactor,
    decayRate,
    pullMode,  // NEW: Add pullMode to parameters
  }) {
    if (strength !== undefined) this.strength = strength;

    // Regenerate cells if count changes
    if (cellCount !== undefined && cellCount !== this.cellCount) {
      this.cellCount = cellCount;
      this.regenerateCells();
    }

    if (cellMovementSpeed !== undefined)
      this.cellMovementSpeed = cellMovementSpeed;
    if (edgeWidth !== undefined) this.edgeWidth = edgeWidth;
    if (attractionFactor !== undefined)
      this.attractionFactor = attractionFactor;
    if (decayRate !== undefined) this.decayRate = decayRate;
    if (pullMode !== undefined) this.pullMode = pullMode;  // NEW: Set pullMode
  }
}