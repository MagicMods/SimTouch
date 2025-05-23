import { eventBus } from '../../util/eventManager.js'; // Added import
import { TickLog } from '../../util/tickLog.js';
import { debugManager } from '../../util/debugManager.js';
export class TurbulenceField {
  constructor({
    strength = 4,
    scale = 3.0,
    speed = 1.0,
    rotation = 0.0,
    rotationSpeed = 0.0,
    pullFactor = 1.0, // -1 to +1 range parameter
    boundary = null,
    directionBias = [0, 0],
    decayRate = 0.99,
    timeOffset = Math.random() * 1000,
    noiseSeed = Math.random() * 10000,
    domainWarp = 0,
    domainWarpSpeed = 0,

    patternFrequency = 2.0,
    patternStyle = "Checkerboard",

    phaseEnabled = false,
    amplitudeEnabled = false,
    phaseSpeed = -1,
    amplitudeSpeed = 0.0,
    phase = 0.0,
    amplitude = 1.0,
    symmetryAmount = 0.0,

    patternOffsetX = 0.0,
    patternOffsetY = 0.0,

    contrast = 0.5,
    separation = 0,      // 0 = smooth, 1 = sharp transitions
    contrastShadowPoint = 0.1,     // Where dark enhancement begins (0-0.5)
    contrastMidPoint = 0.35,       // Center of enhancement curve
    contrastHighlightPoint = 0.7,  // Where enhancement tapers off
    contrastDarkBoost = 1.5,       // How much to enhance shadows

    blurAmount = .8,      // 0 = no blur, 1 = max blur

    biasSpeedX = 0.0,
    biasSpeedY = 0.0,
    biasStrength = 0.3,  // Bias strength parameter
    biasFriction = 0.05,   // Friction coefficient for bias movement (0-1)
    biasSmoothing = 0.8,   // 0 = no smoothing, 1 = max smoothing
    biasTune = 1,       // Fine tuning of bias responsiveness
    biasSensitivity = 0.5, // Global sensitivity multiplier (0-1)
  } = {}) {
    if (
      !boundary ||
      typeof boundary.centerX !== "number" ||
      typeof boundary.centerY !== "number" ||
      typeof boundary.getRadius !== "function"
    ) {
      throw new Error(
        "TurbulenceField requires a valid CircularBoundary with centerX, centerY, and getRadius()"
      );
    }
    this.boundary = boundary;
    this.strength = strength;
    this.scale = scale;
    this.speed = speed;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.pullFactor = pullFactor;
    this.time = 0;
    this.directionBias = directionBias;
    this.decayRate = decayRate;

    this.scaleField = false;
    this.affectPosition = false; // Set to true by default
    this.affectScale = false; // Set to true by default to match the working version
    this.scaleStrength = 1.0;

    this.minScale = 0.008;
    this.maxScale = 0.03;

    this.timeOffset = timeOffset;
    this.noiseSeed = noiseSeed;
    this.domainWarp = domainWarp;
    this.time = 0;

    // Add new geometric pattern controls
    this.patternFrequency = patternFrequency;
    this.patternStyle = patternStyle;

    // Time influence controls
    this.phaseEnabled = phaseEnabled;
    this.amplitudeEnabled = amplitudeEnabled;
    this.phaseSpeed = phaseSpeed;
    this.amplitudeSpeed = amplitudeSpeed;
    this.phase = phase;
    this.amplitude = amplitude;

    // Symmetry control
    this.symmetryAmount = symmetryAmount;

    // Domain warp time control
    this.domainWarpEnabled = false;
    this.domainWarpSpeed = domainWarpSpeed;

    // Pattern-specific default offsets
    this.patternOffsets = {
      // Format: [offsetX, offsetY] for scale=3, freq=2
      // These values are now applied AFTER rotation, scale, etc.
      "checkerboard": [0.5, -0.5],
      "waves": [0, 0],
      "spiral": [0, 0],
      "grid": [0.5, -0.5],
      "circles": [0, 0],
      "diamonds": [0.1, -.12],
      "ripples": [0, 0],
      "dots": [0.5, -0.5],
      "voronoi": [0, 0],
      "cells": [0.5, -0.5],
      "fractal": [0.5, -0.5],
      "vortex": [0, 0],
      "bubbles": [0, 0],
      "water": [0, 0],
      "classicdrop": [0, 0]
    };

    // New pattern offset controls
    this.patternOffsetX = patternOffsetX;
    this.patternOffsetY = patternOffsetY;

    // Apply pattern-specific offset immediately when initializing with a pattern
    this.applyPatternSpecificOffset();

    // Initialize physics model (no need for old biasSpeed properties)
    this.biasStrength = biasStrength;  // Store bias strength

    // New contrast and separation controls
    this.contrast = contrast;
    this.separation = separation;

    // Bandpass contrast parameters
    this.contrastShadowPoint = contrastShadowPoint;
    this.contrastMidPoint = contrastMidPoint;
    this.contrastHighlightPoint = contrastHighlightPoint;
    this.contrastDarkBoost = contrastDarkBoost;

    // Add bias smoothing
    this.biasSmoothing = biasSmoothing;

    // Add new blur parameter
    this.blurAmount = blurAmount;

    // Add sensitivity control
    this.biasSensitivity = biasSensitivity;

    // Add internal bias state tracking for physics model
    this._currentBiasOffsetX = 0;
    this._currentBiasOffsetY = 0;
    this._biasVelocityX = 0;
    this._biasVelocityY = 0;
    this._biasAccelX = biasSpeedX * biasStrength * 0.1; // Initialize with any passed acceleration
    this._biasAccelY = biasSpeedY * biasStrength * 0.1; // but scaled for the physics model
    this.biasFriction = biasFriction;
    this.biasTune = biasTune;

    // Create dummy properties for backwards compatibility but never use them
    this.biasSpeedX = 0;
    this.biasSpeedY = 0;

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));

    // Subscribe to boundary updates
    eventBus.on('physicsBoundaryRecreated', ({ physicsBoundary }) => {
      if (physicsBoundary) {
        this.boundary = physicsBoundary;
        if (this.db) console.log("TurbulenceField updated boundary reference.");
      } else {
        console.error("TurbulenceField received null boundary on physicsBoundaryRecreated event.");
      }
    });

    this.tick = new TickLog(1000, this.db);
    this.tickCoordinates = new TickLog(1000, this.db);
    this.debugRadiusData = []; // Initialize class member for debug data
  }

  get db() {
    return debugManager.get('turbulence');
  }

  // --- Start Aspect Ratio Correction --- // TODO: REVIEW
  _getCorrectedNoiseCoordinates(nx, ny) {

    if (this.db && this.tickCoordinates.GetTick()) { // Log occasionally
      const boundaryType = this.boundary ? this.boundary.getBoundaryType ? this.boundary.getBoundaryType() : 'NO TYPE METHOD' : 'NO BOUNDARY';
      let detailsInfo = 'N/A';
      if (this.boundary && this.boundary.getBoundaryDetails) {
        try {
          detailsInfo = JSON.stringify(this.boundary.getBoundaryDetails());
        } catch (e) { detailsInfo = 'Error getting details'; }
      }
      console.log(`_getCorrectedNoiseCoordinates: BoundaryType='${boundaryType}', Details=${detailsInfo}`);
    }

    if (!this.boundary || typeof this.boundary.getBoundaryType !== 'function' || !this.boundary.getBoundaryDetails) {
      // console.warn("TurbulenceField: Boundary details unavailable for aspect ratio correction.");
      return { nx, ny }; // Return uncorrected if boundary info missing
    }

    const boundaryType = this.boundary.getBoundaryType();

    // No correction needed for circular boundaries as they are inherently aspect=1 within the normalized space
    if (boundaryType === 'CIRCULAR') {
      return { nx, ny };
    }

    if (boundaryType === 'RECTANGULAR') {
      const details = this.boundary.getBoundaryDetails();

      // Calculate aspect ratio based on the normalized boundary dimensions
      const normalizedWidth = details.maxX - details.minX;
      const normalizedHeight = details.maxY - details.minY;

      if (!normalizedHeight || normalizedHeight === 0 || !normalizedWidth || normalizedWidth === 0) {
        if (this.db) {
          console.warn(`TurbulenceField: Boundary normalized height/width is zero or invalid (${normalizedWidth}x${normalizedHeight}), skipping aspect ratio correction.`);
        }
        // console.warn("TurbulenceField: Boundary normalized height/width is zero, skipping aspect ratio correction.");
        return { nx, ny }; // Avoid division by zero or invalid dimensions
      }

      const aspectRatio = normalizedWidth / normalizedHeight;

      let corrected_nx = nx;
      let corrected_ny = ny;

      // --- START NEW MAPPING LOGIC ---
      // Calculate position relative to boundary origin (0-1 range within boundary)
      const relativeX = (nx - details.minX) / normalizedWidth;
      const relativeY = (ny - details.minY) / normalizedHeight;

      let tx, ty;
      if (aspectRatio >= 1) { // Wider or Square: Compress X, use Y directly
        tx = (relativeX - 0.5) / aspectRatio + 0.5;
        ty = relativeY;
      } else { // Taller: Use X directly, compress Y
        tx = relativeX;
        ty = (relativeY - 0.5) * aspectRatio + 0.5;
      }
      // --- END NEW MAPPING LOGIC ---

      // Return the texture coordinates
      return { nx: tx, ny: ty };
    } else {
      // Unknown boundary type, return uncorrected
      // console.warn(`TurbulenceField: Unknown boundary type '${boundaryType}' for aspect ratio correction.`);
      return { nx, ny };
    }
  }
  // --- End Aspect Ratio Correction ---

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (simParams?.turbulence) {
      const turbulenceParams = simParams.turbulence;

      // Update all relevant properties using nullish coalescing
      this.strength = turbulenceParams.strength ?? this.strength;
      this.scale = turbulenceParams.scale ?? this.scale;
      this.speed = turbulenceParams.speed ?? this.speed;
      this.rotationSpeed = turbulenceParams.rotationSpeed ?? this.rotationSpeed;
      this.rotation = turbulenceParams.rotation ?? this.rotation;
      this.pullFactor = turbulenceParams.pullFactor ?? this.pullFactor;
      this.affectPosition = turbulenceParams.affectPosition ?? this.affectPosition;
      this.scaleField = turbulenceParams.scaleField ?? this.scaleField;
      this.affectScale = turbulenceParams.affectScale ?? this.affectScale;
      this.minScale = turbulenceParams.minScale ?? this.minScale;
      this.maxScale = turbulenceParams.maxScale ?? this.maxScale;
      this.patternStyle = turbulenceParams.patternStyle ?? this.patternStyle;
      this.decayRate = turbulenceParams.decayRate ?? this.decayRate;

      // Handle directionBias array
      if (turbulenceParams.directionBiasX !== undefined) {
        this.directionBias[0] = turbulenceParams.directionBiasX;
      }
      if (turbulenceParams.directionBiasY !== undefined) {
        this.directionBias[1] = turbulenceParams.directionBiasY;
      }

      // Continue updating other params
      this.contrast = turbulenceParams.contrast ?? this.contrast;
      this.biasStrength = turbulenceParams.biasStrength ?? this.biasStrength;
      this.patternFrequency = turbulenceParams.patternFrequency ?? this.patternFrequency;
      this.noiseSeed = turbulenceParams.noiseSeed ?? this.noiseSeed;
      this.separation = turbulenceParams.separation ?? this.separation;
      this.domainWarp = turbulenceParams.domainWarp ?? this.domainWarp;
      this.domainWarpSpeed = turbulenceParams.domainWarpSpeed ?? this.domainWarpSpeed;
      this.symmetryAmount = turbulenceParams.symmetryAmount ?? this.symmetryAmount;
      this.phase = turbulenceParams.phase ?? this.phase;
      this.phaseSpeed = turbulenceParams.phaseSpeed ?? this.phaseSpeed;
      this.blurAmount = turbulenceParams.blurAmount ?? this.blurAmount;

      // Handle bias acceleration mapped from display properties
      if (turbulenceParams._displayBiasAccelX !== undefined) {
        this._biasAccelX = -turbulenceParams._displayBiasAccelX; // Invert back for internal use
      }
      if (turbulenceParams._displayBiasAccelY !== undefined) {
        this._biasAccelY = turbulenceParams._displayBiasAccelY;
      }

      // Check if dependent values need recalculation after updates
      // For now, let's assume no specific update method is needed beyond what happens in `update` or `applyTurbulence`
      // If issues arise, we might need to add calls like `applyPatternSpecificOffset()` here.
    }
    // if(this.db) console.log (`TurbulenceField updated params via event`);
  }

  // Apply pattern-specific offset based on current pattern style
  applyPatternSpecificOffset() {
    // Get the current pattern style in lowercase for lookup
    const patternKey = typeof this.patternStyle === 'string' ? this.patternStyle.toLowerCase() : 'checkerboard';

    // Get pattern-specific offset or default to [0,0]
    const [offsetX, offsetY] = this.patternOffsets[patternKey] || [0, 0];

    // Always apply the pattern-specific offset
    this.patternOffsetX = offsetX;
    this.patternOffsetY = offsetY;
  }

  // Apply pattern offset and time-based bias with physics model
  applyOffset(x, y, time) {
    // This method is now empty as we're handling offsets directly in processCoordinates
    // for better separation of pattern offset and physics-based movement
    return [x, y];
  }

  // Coordinate processing pipeline helper functions

  // Apply symmetry based on amount
  applySymmetry(x, y, centerX, centerY) {
    if (this.symmetryAmount <= 0) return [x, y];

    // Calculate distance from center
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Calculate angle from center
    const angle = Math.atan2(dy, dx);

    // Calculate symmetric angle based on symmetry amount
    const symmetricAngle = angle * (1 + this.symmetryAmount);

    // Convert back to coordinates
    return [
      centerX + dist * Math.cos(symmetricAngle),
      centerY + dist * Math.sin(symmetricAngle)
    ];
  }

  // Apply scale to coordinates
  applyScale(x, y, scale, centerX, centerY) {
    // Translate to center, scale, then translate back
    const tx = x - centerX;
    const ty = y - centerY;
    const sx = tx * scale;
    const sy = ty * scale;
    return [sx + centerX, sy + centerY];
  }

  // Apply domain warping to coordinates
  applyDomainWarp(x, y, time, centerX, centerY) {
    if (this.domainWarp <= 0) return [x, y];

    // Apply warp relative to center
    const tx = x - centerX;
    const ty = y - centerY;
    const warpFreq = 2.0;

    // Apply warping
    let wx, wy;
    if (this.speed > 0 && this.domainWarpSpeed > 0) {
      // Time-driven warping
      wx = tx + this.domainWarp * Math.sin(ty * warpFreq + time * this.speed * this.domainWarpSpeed);
      wy = ty + this.domainWarp * Math.cos(tx * warpFreq + time * this.speed * this.domainWarpSpeed);
    } else {
      // Static warping
      wx = tx + this.domainWarp * Math.sin(ty * warpFreq);
      wy = ty + this.domainWarp * Math.cos(tx * warpFreq);
    }

    // Return to original coordinate space
    return [wx + centerX, wy + centerY];
  }

  // Apply rotation to coordinates
  applyRotation(x, y, centerX, centerY, rotation) {
    if (Math.abs(rotation) <= 0.0001) return [x, y];

    // Translate to origin
    const tx = x - centerX;
    const ty = y - centerY;

    // Rotate
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const rx = tx * cos - ty * sin;
    const ry = tx * sin + ty * cos;

    // Translate back
    return [rx + centerX, ry + centerY];
  }

  // Apply contrast and separation to pattern value
  applyContrast(value, time) {
    // Store original value for debugging
    const originalValue = value;

    // ===== PULL MODE EFFECTS =====
    // Apply transformation based on pullFactor (-1 to 1 range)
    if (this.pullFactor !== 0) {
      if (this.pullFactor < 0) {
        // BLACK MODE (negative values)
        // Linear interpolation toward inverted pattern
        // At pullFactor = -1: fully inverted
        // At pullFactor = 0: no effect
        value = value * (1 + this.pullFactor) + (1 - value) * (-this.pullFactor);
      } else {
        // WHITE MODE (positive values)
        // Enhance white areas by applying a stronger curve
        // At pullFactor = 1: maximum enhancement
        // At pullFactor = 0: no effect

        // Apply a more aggressive enhancement for white mode
        if (value > 0.5) {
          // For brighter areas, push toward white (1.0)
          // pullFactor controls how strongly we push
          value = 0.5 + (value - 0.5) * (1.0 + this.pullFactor * 3.0);
        } else {
          // For darker areas, push toward black (0.0)
          // pullFactor controls how strongly we push
          value = value * (1.0 - this.pullFactor * 0.5);
        }

        // Ensure values stay in valid range
        value = Math.max(0.0, Math.min(1.0, value));
      }
    }

    // ===== BANDPASS CONTRAST =====
    // Get base contrast value (removed time animation)
    let contrastValue = this.contrast;

    // Apply bandpass contrast if enabled
    if (contrastValue > 0) {
      // Apply bandpass contrast - enhance dark to mid-tones while preserving whites

      // Step 1: Boost contrast in dark regions (below midpoint)
      if (value < this.contrastMidPoint) {
        // Calculate how far into the shadow range we are (0-1 range)
        const shadowRange = (value - this.contrastShadowPoint) /
          (this.contrastMidPoint - this.contrastShadowPoint);

        // Apply stronger contrast to darker areas while preserving very dark shadows
        if (shadowRange > 0) {
          // Apply a non-linear curve to the dark range
          const boostedValue = this.contrastShadowPoint +
            shadowRange * (this.contrastMidPoint - this.contrastShadowPoint) *
            Math.pow(shadowRange, 1.0 / (1.0 + this.contrastDarkBoost * contrastValue));

          // Mix with original value based on contrast strength
          value = value * (1 - contrastValue) + boostedValue * contrastValue;
        }
      }
      // Step 2: Gradually reduce contrast effect as we approach highlights
      else if (value < this.contrastHighlightPoint) {
        // Calculate how far into the transition range we are (0-1)
        const transitionRange = (value - this.contrastMidPoint) /
          (this.contrastHighlightPoint - this.contrastMidPoint);

        // Apply less contrast as we approach highlights
        const contrastReduction = Math.pow(transitionRange, 0.5);
        const adjustedContrast = contrastValue * (1 - contrastReduction);

        // Apply a gentler curve to the mid-tone range
        const midCurve = this.contrastMidPoint +
          (value - this.contrastMidPoint) *
          Math.pow((value - this.contrastMidPoint) /
            (this.contrastHighlightPoint - this.contrastMidPoint),
            1.0 - adjustedContrast * 0.5);

        // Mix with original value based on adjusted contrast strength
        value = value * (1 - adjustedContrast) + midCurve * adjustedContrast;
      }
      // Step 3: Leave values above highlight point untouched
      // (no code needed - we simply don't modify values above contrastHighlightPoint)
    }

    // Apply separation (threshold) effect if enabled
    if (this.separation > 0) {
      // Center value around 0 (-0.5 to 0.5 range)
      const centered = value - 0.5;

      // Calculate separation factor (0 = smooth, 1 = very sharp)
      const sepFactor = 1.0 + this.separation * 12.0; // 1.0 to 13.0

      // Apply sigmoid-like function for separation
      value = 1.0 / (1.0 + Math.exp(-centered * sepFactor));
    }

    // // Debug logging - randomly log some values to avoid flooding console
    // if (this.db && Math.random() < 0.0001) {
    //   console.log(`Contrast ${this.contrast.toFixed(2)} applied:`,
    //     originalValue.toFixed(3), "->", value.toFixed(3));
    // }

    return Math.max(0, Math.min(1, value)); // Clamp to [0,1] range to be safe
  }

  // Process coordinates through the entire pipeline
  processCoordinates(x, y, time) {
    const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
    const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

    // Process in correct order: rotate → scale → warp → symmetry → offset
    // Split the offset application into pattern offset and physics-based bias offset
    let [px, py] = [x, y];
    [px, py] = this.applyRotation(px, py, centerX, centerY, this.rotation);
    [px, py] = this.applyScale(px, py, this.scale, centerX, centerY);
    [px, py] = this.applyDomainWarp(px, py, time, centerX, centerY);
    [px, py] = this.applySymmetry(px, py, centerX, centerY);

    // Apply pattern offset separately from physics-based bias
    px = px - this.patternOffsetX;
    py = py + this.patternOffsetY;

    // Apply physics-based bias offset only
    px = px + this._currentBiasOffsetX;
    py = py + this._currentBiasOffsetY;

    return [px, py, centerX, centerY];
  }

  // Calculate pattern value for any pattern type using normalized coordinates
  calculatePattern(patternStyle, x, y, centerX, centerY) {
    let patternValue;

    // Use pattern frequency consistently in all patterns
    const freq = this.patternFrequency;

    // Ensure patternStyle is a string and convert to lowercase
    const pattern = typeof patternStyle === 'string' ? patternStyle.toLowerCase() : 'checkerboard';

    // For patterns that depend on distance from center, we should adjust calculations
    // since the offset is now applied after rotation, scale, etc.
    switch (pattern) {
      case "checkerboard":
        patternValue = Math.sin(x * freq) * Math.sin(y * freq);
        break;
      case "waves":
        patternValue = Math.sin(x * freq + y * freq * 0.5);
        break;
      case "spiral":
        // Calculate angle and radius from center coordinates
        const angle = Math.atan2(y - centerY, x - centerX);
        const radius = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        patternValue = Math.sin(angle * freq + radius * freq * 0.1);
        break;
      case "grid":
        patternValue = Math.sin(x * freq) + Math.sin(y * freq);
        break;
      case "circles":
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        patternValue = Math.sin(dist * freq * Math.PI * .3);
        break;
      case "diamonds": // New pattern replacing maze
        patternValue = Math.sin(x * freq + y * freq) * Math.cos(x * freq - y * freq) * .8;
        break;
      case "ripples":
        const rippleDist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        patternValue = Math.sin(rippleDist * freq * Math.PI * .4 - this.time * this.speed);
        break;
      case "dots": // New pattern replacing starfield
        // Create a grid of soft dots
        const dotX = Math.sin(x * freq * 0.17 * Math.PI);
        const dotY = Math.sin(y * freq * 0.17 * Math.PI);
        const dotValue = Math.sqrt(dotX * dotX + dotY * dotY);
        patternValue = Math.cos(dotValue * Math.PI * 1);
        break;
      case "water":
        const waterBase = Math.sin(y * freq * 0.5 + x * freq * 0.2 + this.time * this.speed * 0.5);
        const surfaceRipples = Math.sin(x * freq * 1.5 + y * freq * 1.2 + this.time * this.speed * 0.3) * 0.3;
        patternValue = waterBase * 0.5 + surfaceRipples;
        break;
      case "classicdrop":
        // Generate classic water drop effect with expanding ripples
        // Initialize with a calm water surface
        patternValue = 0;

        // Ensure animation continues by using phaseSpeed for timing
        // Create a time factor that always advances regardless of UI state
        const phaseTime = this.time * Math.max(Math.abs(this.phaseSpeed), 1) * this.speed;

        // Use the frequency to control the rate of drops
        // Higher frequency = more drops
        const maxDrops = Math.max(3, Math.floor(freq * 3)); // 3 drops minimum, more with higher freq

        // Create several drops that appear at random times and locations
        for (let i = 0; i < maxDrops; i++) {
          // Use drop-specific seeds for pseudo-random but deterministic behavior
          const dropSeed = 12.9898 * (i + 1) + 4.1414;
          const timeSeed = 78.233 * (i + 1) + 7.7575;
          const sizeSeed = 43758.5453 * (i + 1) + 1.8989;

          // Add time-based randomness to drop positions
          // Creating a chaotic but smooth variation in positions
          const timeVariation = phaseTime * 0.05; // Subtle time influence
          const positionNoise = Math.sin(dropSeed * 13.33 + timeVariation) * 0.3; // ±0.3 variation

          // Calculate drop position using hash function for consistent randomness
          // Now with added time-based variation for less repetitive patterns
          const positionRadius = 1 + positionNoise; // Radius varies between 0.7 and 1.3
          const angleVariation = Math.sin(timeSeed * 0.75 + timeVariation * 0.3) * 0.2; // ±0.2 angle variation

          const dropX = centerX + positionRadius * Math.cos(dropSeed + i * 2.2 + angleVariation);
          const dropY = centerY + positionRadius * Math.sin(timeSeed + i * 4.3 + angleVariation);

          // Calculate time cycle for each drop (when it appears)
          // Each drop has its own cycle offset to avoid all drops appearing at once
          const dropCycleOffset = i * (Math.PI * 2) / maxDrops; // Evenly distribute drop timing
          const dropCycleLength = 8.0 / freq; // Longer cycles with lower frequency

          // Add small random variation to cycle timing for more natural look
          const cycleVariation = Math.sin(sizeSeed * 3.333 + i * 7.1) * 0.1; // ±10% variation in timing
          const adjustedDropCycleOffset = dropCycleOffset * (1 + cycleVariation);

          // Use phaseTime instead of this.time * this.speed to keep animation going
          const dropTimeNorm = (phaseTime + adjustedDropCycleOffset) % dropCycleLength;

          // Drop only appears in the first part of its cycle, then disappears until next cycle
          const dropActiveTime = dropCycleLength * 0.75; // Active for 75% of cycle

          if (dropTimeNorm < dropActiveTime) {
            // Calculate normalized age of the drop (0 to 1)
            const dropAge = dropTimeNorm / dropActiveTime;

            // Calculate distance from drop center
            const dropDist = Math.sqrt(Math.pow(x - dropX, 2) + Math.pow(y - dropY, 2));

            // Calculate expanding ripple radius
            // Starts small and expands outward based on age
            const rippleSpeed = 1.0 + Math.sin(sizeSeed) * 0.4; // Significantly increased speed per drop
            const rippleRadius = dropAge * rippleSpeed;

            // Calculate width of the ripple (thinner as it expands)
            const rippleWidth = 0.12 + 0.18 * (1 - dropAge);

            // Calculate intensity of the ripple (fades as it expands)
            const rippleIntensity = 1.0 - dropAge * 0.8;

            // Create the ripple effect using distance from expanding circle
            const rippleDist = Math.abs(dropDist - rippleRadius);
            const ripple = Math.exp(-rippleDist * rippleDist / (rippleWidth * rippleWidth)) * rippleIntensity;

            // Add this drop's contribution to the overall pattern
            patternValue += ripple;
          }
        }

        // Add some subtle background waves for a water surface effect
        // Also use phaseTime for consistent animation
        const calmWater = Math.sin(x * freq * 0.2 + y * freq * 0.3 + phaseTime * 0.2) * 0.1;
        patternValue += calmWater;

        // Normalize the pattern value to avoid excessive brightness with multiple drops
        patternValue = Math.min(1.0, patternValue * 0.7);
        break;
      case "cells": // Simplified cellular pattern
        // Use a larger cell size for fewer cells
        const cellSize = 2.4 / freq; // Scaled up from 1.6
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);

        // Only check the 4 nearest cells instead of 9
        let minCellDist = Infinity;
        for (let offY = 0; offY <= 1; offY++) {
          for (let offX = 0; offX <= 1; offX++) {
            const cellGridX = gridX + offX;
            const cellGridY = gridY + offY;

            // Simpler hash function with less variation
            const cellHash = Math.sin(cellGridX * 12.9898 + cellGridY * 78.233) * 43758.5453;

            // Cell centers are more predictable (less random variation)
            const cellCenterX = (cellGridX + 0.5) * cellSize;
            const cellCenterY = (cellGridY + 0.5) * cellSize;

            const cellDx = x - cellCenterX;
            const cellDy = y - cellCenterY;
            const cellDist = Math.sqrt(cellDx * cellDx + cellDy * cellDy);

            minCellDist = Math.min(minCellDist, cellDist);
          }
        }

        // Use a gentler frequency for smoother transitions
        patternValue = Math.sin(minCellDist * Math.PI * 1.5); // Reduced from 2.0
        break;
      case "voronoi":
        // Create a cellular pattern using multiple centers
        const numCenters = 4; // Reduced from 6 for simpler pattern
        let minDist = Infinity;
        let secondMinDist = Infinity;

        for (let i = 0; i < numCenters; i++) {
          const angle = (i / numCenters) * Math.PI * 2;
          // Scale up the circle radius for larger cells
          const seedX = centerX + Math.cos(angle) * 1.5; // Increased from 1.0
          const seedY = centerY + Math.sin(angle) * 1.5; // Increased from 1.0
          const dx = x - seedX;
          const dy = y - seedY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Keep track of two smallest distances for edge detection
          if (dist < minDist) {
            secondMinDist = minDist;
            minDist = dist;
          } else if (dist < secondMinDist) {
            secondMinDist = dist;
          }
        }

        // Use a gentler frequency for smoother transitions
        patternValue = Math.sin(minDist * freq * Math.PI * .5); // Reduced from 2.0
        break;
      case "fractal":
        // Create a recursive pattern
        let fractalValue = 1;
        let amplitude = 1;
        let frequency = freq;
        for (let i = 0; i < 3; i++) {
          // Scale coordinates properly for each octave
          const scaledX = x * frequency;
          const scaledY = y * frequency;
          fractalValue += amplitude * Math.sin(scaledX) * Math.sin(scaledY);
          amplitude *= 0.5;
          frequency *= 1;
        }
        patternValue = fractalValue;
        break;
      case "vortex":
        // Create a swirling vortex pattern
        const vortexX = (x - centerX);
        const vortexY = (y - centerY);
        const vortexAngle = Math.atan2(vortexY, vortexX);
        const vortexDist = Math.sqrt(vortexX * vortexX + vortexY * vortexY);
        patternValue = Math.sin(vortexAngle * freq + vortexDist * 2);
        break;
      case "bubbles":
        // Create organic bubble-like patterns
        const bubbleX = (x - centerX) * freq;
        const bubbleY = (y - centerY) * freq;
        const bubbleDist = Math.sqrt(bubbleX * bubbleX + bubbleY * bubbleY);
        patternValue = Math.sin(bubbleDist * 1) * Math.cos(bubbleX * 1) * Math.sin(bubbleY * 1);
        break;
      default:
        patternValue = Math.sin(x * freq) * Math.sin(y * freq);
    }

    return patternValue;
  }

  // Completely redesigned noise2D function that supports geometric patterns
  noise2D(x, y, time = this.time, applyBlur = false) {
    try {

      // --- Apply aspect ratio correction to input coordinates ---
      const { nx: corrected_x, ny: corrected_y } = this._getCorrectedNoiseCoordinates(x, y);
      // --- End correction ---

      // 1. Process coordinates through the standardized pipeline
      // Use corrected coordinates from now on
      const [processedX, processedY, procCenterX, procCenterY] = this.processCoordinates(corrected_x, corrected_y, time);

      // 2. Calculate base pattern using the processed coordinates
      // Add type checking for patternStyle
      let patternStyleStr = typeof this.patternStyle === 'string' ? this.patternStyle.toLowerCase() : 'checkerboard';
      let noise = this.calculatePattern(patternStyleStr, processedX, processedY, procCenterX, procCenterY);

      // 3. Apply phase offset (time-influenced or static)
      if (this.speed > 0) {
        // When T-Speed > 0, use speed controls for animation
        if (Math.abs(this.phaseSpeed) > 0) {
          const phaseOffset = time * this.speed * Math.abs(this.phaseSpeed) * Math.sign(this.phaseSpeed) + this.phase * Math.PI * 2;
          noise = Math.sin(noise * Math.PI * 2 + phaseOffset);
        } else {
          // Apply static phase when speed is 0
          const phaseOffset = this.phase * Math.PI * 2;
          noise = Math.sin(noise * Math.PI * 2 + phaseOffset);
        }

        if (this.amplitudeEnabled) {
          const dynamicAmplitude = 0.5 + 0.5 * Math.sin(time * this.speed * this.amplitudeSpeed);
          noise *= this.amplitude * dynamicAmplitude;
        } else {
          // Apply static amplitude even when time-driven amplitude is disabled
          noise *= this.amplitude;
        }
      } else {
        // When T-Speed = 0, apply static values
        const phaseOffset = this.phase * Math.PI * 2;
        noise = Math.sin(noise * Math.PI * 2 + phaseOffset);
        // Apply static amplitude
        noise *= this.amplitude;
      }

      // // 4. Apply contrast and separation as post-processing
      // noise = this.applyContrast((noise + 1) * 0.5, time);
      // // Convert back from [0,1] to [-1,1] range
      // noise = noise * 2 - 1;

      // 5. Apply blur if enabled and requested
      if (applyBlur && this.blurAmount > 0) {
        // Only do the expensive blur calculation if the blur amount is > 0
        // Pass the ORIGINAL x, y for blur sampling, but use corrected base value
        noise = this.applyBlur(x, y, noise, time); // Pass original x,y
      }

      return noise;
    } catch (err) {
      console.error("Error in noise2D:", err);
      return 0.5;
    }
  }

  // Apply blur by sampling multiple nearby points
  applyBlur(x, y, centerValue, time) {
    if (this.blurAmount <= 0) return centerValue;

    // Check if this is the Classic Drop pattern and reduce samples for better performance
    // Add type checking for patternStyle
    const patternStyleStr = typeof this.patternStyle === 'string' ? this.patternStyle.toLowerCase() : 'checkerboard';
    const isClassicDrop = patternStyleStr === "classicdrop";

    // Scale blur amount to a more useful range (0 to 0.05)
    const sampleRadius = 0.05 * this.blurAmount;

    // Use significantly fewer samples for Classic Drop pattern to improve performance
    // For other patterns, use the full 16 samples for quality
    const numSamples = isClassicDrop ? 4 : 16; // Only use 4 samples for Classic Drop vs 16 for others

    // Convert centerValue to 0-1 range for contrast processing
    const centerValueNormalized = (centerValue + 1) * 0.5;
    let sum = this.applyContrast(centerValueNormalized, time); // Start with the processed center value
    let count = 1; // We've already counted the center

    // Take samples in a circle around the center point
    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2;
      const sampleX = x + Math.cos(angle) * sampleRadius;
      const sampleY = y + Math.sin(angle) * sampleRadius;

      // --- Apply aspect ratio correction to sample coordinates ---
      const { nx: corrected_sampleX, ny: corrected_sampleY } = this._getCorrectedNoiseCoordinates(sampleX, sampleY);
      // --- End correction ---

      // Process the sample through the full pipeline except blur (to avoid recursion)
      const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
      const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

      // Process coordinates with the same order as processCoordinates
      let px = corrected_sampleX;
      let py = corrected_sampleY;
      [px, py] = this.applyRotation(px, py, centerX, centerY, this.rotation);
      [px, py] = this.applyScale(px, py, this.scale, centerX, centerY);
      [px, py] = this.applyDomainWarp(px, py, time, centerX, centerY);
      [px, py] = this.applySymmetry(px, py, centerX, centerY);

      // Apply pattern offset separately from physics-based bias (match processCoordinates exactly)
      px = px - this.patternOffsetX;
      py = py + this.patternOffsetY;

      // Apply physics-based bias offset only
      px = px + this._currentBiasOffsetX;
      py = py + this._currentBiasOffsetY;

      // Calculate pattern
      let sampleNoise = this.calculatePattern(patternStyleStr, px, py, centerX, centerY);

      // Apply phase and amplitude
      if (this.speed > 0) {
        if (Math.abs(this.phaseSpeed) > 0) {
          const phaseOffset = time * this.speed * Math.abs(this.phaseSpeed) * Math.sign(this.phaseSpeed) + this.phase * Math.PI * 2;
          sampleNoise = Math.sin(sampleNoise * Math.PI * 2 + phaseOffset);
        } else {
          const phaseOffset = this.phase * Math.PI * 2;
          sampleNoise = Math.sin(sampleNoise * Math.PI * 2 + phaseOffset);
        }

        if (this.amplitudeEnabled) {
          const dynamicAmplitude = 0.5 + 0.5 * Math.sin(time * this.speed * this.amplitudeSpeed);
          sampleNoise *= this.amplitude * dynamicAmplitude;
        } else {
          sampleNoise *= this.amplitude;
        }
      } else {
        const phaseOffset = this.phase * Math.PI * 2;
        sampleNoise = Math.sin(sampleNoise * Math.PI * 2 + phaseOffset);
        sampleNoise *= this.amplitude;
      }

      // Apply contrast to the sample (convert to 0-1 range first)
      sampleNoise = this.applyContrast((sampleNoise + 1) * 0.5, time);

      // Add to our sum
      sum += sampleNoise;
      count++;
    }

    // Return the average and convert back to -1 to 1 range
    return sum / count * 2 - 1;
  }

  // Add preview generation methods
  generatePatternPreview(width, height, patternStyle) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Store current pattern style
    const originalStyle = this.patternStyle;
    // Set the requested pattern style
    this.patternStyle = patternStyle;

    // Generate preview
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;
        // Enable blur in preview generation
        const value = this.noise2D(nx, ny, this.time, true);

        // Map from [-1, 1] to [0, 255] for display
        const mappedValue = (value + 1) * 0.5;
        const colorValue = Math.floor(mappedValue * 255);

        const index = (y * width + x) * 4;
        data[index] = colorValue;     // R
        data[index + 1] = colorValue; // G
        data[index + 2] = colorValue; // B
        data[index + 3] = 255;         // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Restore original pattern style
    this.patternStyle = originalStyle;

    return canvas.toDataURL();
  }

  generateAnimatedPreview(width, height, patternStyle, callback) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Store current pattern style and time
    const originalStyle = this.patternStyle;
    const originalTime = this.time;

    // Set the requested pattern style (ensuring it's a string)
    this.patternStyle = typeof patternStyle === 'string' ? patternStyle : 'checkerboard';

    let animationFrame;
    let lastTime = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update time for animation
      this.time += deltaTime;

      // Generate preview
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const nx = x / width;
          const ny = y / height;
          // Enable blur in animated preview
          const value = this.noise2D(nx, ny, this.time, true);

          // Map from [-1, 1] to [0, 255] for display
          const mappedValue = (value + 1) * 0.5;
          const colorValue = Math.floor(mappedValue * 255);

          const index = (y * width + x) * 4;
          data[index] = colorValue;     // R
          data[index + 1] = colorValue; // G
          data[index + 2] = colorValue; // B
          data[index + 3] = 255;         // A
        }
      }

      ctx.putImageData(imageData, 0, 0);
      callback(canvas.toDataURL());
      animationFrame = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Return cleanup function
    return () => {
      cancelAnimationFrame(animationFrame);
      // Restore original values
      this.patternStyle = originalStyle;
      this.time = originalTime;
    };
  }

  applyTurbulence(position, velocity, dt, particleIndex, system) {
    const [x, y] = position;
    const [vx, vy] = velocity;

    let newVx = vx * this.decayRate;
    let newVy = vy * this.decayRate;

    // Even if strength is low, still process if we're affecting particle scale
    if (Math.abs(this.strength) < 0.001 && !this.affectScale) {
      return [newVx, newVy];
    }

    try {
      // APPLY DIRECTION BIAS FIRST - this should work in either mode
      // Scale direction bias by strength and apply it consistently
      if ((this.directionBias[0] !== 0 || this.directionBias[1] !== 0) && this.affectPosition) {
        newVx += this.directionBias[0] * this.strength * dt;
        newVy += this.directionBias[1] * this.strength * dt;
      }

      // NOTE: The noise pattern itself is now affected by pullFactor:
      // - When pullFactor = 0: Original pattern with no modifications
      // - When pullFactor > 0: White areas become more pronounced (enhanced contrast)
      // - When pullFactor < 0: Pattern gradually inverts (black areas become active)
      // This is applied in the applyContrast method during noise generation

      // Calculate noise value for particle position
      // Always apply blur for simulation
      const n1 = this.noise2D(x, y, this.time, true);

      if (this.affectPosition) {
        if (this.pullFactor > 0) {
          // PULL MODE: Move toward noise peaks (positive pullFactor)
          // Sample additional points to calculate gradient
          const epsilon = 0.01;  // Small sampling distance
          const nx = this.noise2D(x + epsilon, y, this.time, true);
          const ny = this.noise2D(x, y + epsilon, this.time, true);

          // Calculate approximate gradient (direction toward higher values)
          const gradX = (nx - n1) / epsilon;
          const gradY = (ny - n1) / epsilon;

          // Calculate gradient magnitude and normalize
          const gradMag = Math.sqrt(gradX * gradX + gradY * gradY);
          if (gradMag > 0.001) {
            // Apply force toward higher noise values, scaled by pullFactor
            const normalizedGradX = gradX / gradMag;
            const normalizedGradY = gradY / gradMag;

            // Scale force by pull factor (0 to 1 range)
            const pullStrength = this.pullFactor * this.strength;
            newVx += normalizedGradX * pullStrength * dt;
            newVy += normalizedGradY * pullStrength * dt;
          }
        } else if (this.pullFactor < 0) {
          // PUSH MODE: Particles are pushed by the noise field values
          // Calculate gradient like in PULL MODE
          const epsilon = 0.01;  // Small sampling distance
          const nx = this.noise2D(x + epsilon, y, this.time, true);
          const ny = this.noise2D(x, y + epsilon, this.time, true);

          // Calculate approximate gradient (direction toward higher values)
          const gradX = (nx - n1) / epsilon;
          const gradY = (ny - n1) / epsilon;

          // Calculate gradient magnitude and normalize
          const gradMag = Math.sqrt(gradX * gradX + gradY * gradY);
          if (gradMag > 0.001) {
            // For consistency with visualization:
            // - For mild negative values (-0.01 to -0.5): push AWAY from white (higher values)
            // - For stronger negative values (< -0.5): pull TOWARD white
            // This matches how the visualization works with the applyContrast inversion
            let normalizedGradX, normalizedGradY;

            if (this.pullFactor > -0.5) {
              // Push away from white (original behavior)
              normalizedGradX = -gradX / gradMag;
              normalizedGradY = -gradY / gradMag;
            } else {
              // Pull toward white when pullFactor gets more negative
              // This behavior change matches what's happening in the visualization
              normalizedGradX = gradX / gradMag;
              normalizedGradY = gradY / gradMag;
            }

            // Scale force by pull factor (0 to 1 range)
            const pushStrength = Math.abs(this.pullFactor) * this.strength;
            newVx += normalizedGradX * pushStrength * dt;
            newVy += normalizedGradY * pushStrength * dt;
          }
        }
        // At pullFactor = 0, no additional forces are applied
      }

      // Apply velocity scaling if enabled - works the same in either mode
      if (this.scaleField) {
        // Use the new noise2D implementation (which uses proper coordinate processing)
        // instead of directly scaling x and y
        const n1 = this.noise2D(x, y, this.time, true);
        const scaleFactorField = 1.0 + (n1 - 0.5) * this.strength * 0.1;
        newVx *= scaleFactorField;
        newVy *= scaleFactorField;
      }

      // Apply particle radius scaling if enabled - works the same in either mode
      if (this.affectScale && system?.particleRadii) {
        // Now uses normalized coordinate processing
        const n1 = this.noise2D(x, y, this.time, true);

        // Use minScale and maxScale to determine the range of particle sizes
        // n1 is a value between 0 and 1 from the noise function
        const particleSize = this.minScale + n1 * (this.maxScale - this.minScale);

        // Ensure the size is within the valid range
        const finalSize = Math.max(this.minScale, Math.min(this.maxScale, particleSize));

        // Set the particle size for this specific particle
        system.particleRadii[particleIndex] = finalSize;
        if (this.tick.GetTick() && this.db) {
          console.log("Particle sizes:", system.particleRadii[0], system.particleRadii[1], system.particleRadii[2], system.particleRadii[3], system.particleRadii[4]);
        }
      }
    } catch (err) {
      console.error("Error in turbulenceField.applyTurbulence:", err);
    }

    return [newVx, newVy];
  }

  update(dt) {
    // Update time variable with delta time
    this.time += dt * this.speed;

    if (this.strength <= 0) return;

    // Apply rotation
    this.rotation += dt * this.rotationSpeed;
    // Keep rotation in range [0, 2π]
    this.rotation = this.rotation % (Math.PI * 2);

    // Apply bias physics (acceleration, velocity, position)
    if (this.biasStrength > 0) {
      // Use a smaller friction coefficient for smoother deceleration
      // Scale friction by dt for frame-rate independence
      const frictionFactor = Math.pow(1 - this.biasFriction, dt * 60);

      // Apply acceleration to velocity
      // Increase multiplier from 3.0 to 4.0 to compensate for lower input sensitivity
      // while maintaining responsiveness
      this._biasVelocityX += this._biasAccelX * 4.0 * dt * dt * 60;
      this._biasVelocityY += this._biasAccelY * 4.0 * dt * dt * 60;

      // Apply friction using linear interpolation towards zero
      this._biasVelocityX = this._biasVelocityX * frictionFactor * this.biasSensitivity;
      this._biasVelocityY = this._biasVelocityY * frictionFactor * this.biasSensitivity;

      // Apply velocity to position (scaled by dt)
      this._currentBiasOffsetX += this._biasVelocityX * dt * 60;
      this._currentBiasOffsetY += this._biasVelocityY * dt * 60;
    }

    // Shift phase values occasionally for variation
    if (Math.random() < 0.001) {
      this.timeOffset = Math.random() * 1000;
    }
  }

  setParameters({
    strength,
    scale,
    speed,
    rotation,
    rotationSpeed,
    pullFactor,
    directionBias,
    decayRate,
    domainWarp,
    timeOffset,
    patternFrequency,
    patternStyle,
    phaseEnabled,
    amplitudeEnabled,
    phaseSpeed,
    amplitudeSpeed,
    phase,
    amplitude,
    symmetryAmount,
    // Pattern offset parameters
    patternOffsetX,
    patternOffsetY,
    biasSpeedX,
    biasSpeedY,
    biasStrength,
    contrast,
    separation,
    // Bandpass contrast parameters
    contrastShadowPoint,
    contrastMidPoint,
    contrastHighlightPoint,
    contrastDarkBoost,
    // New bias smoothing parameter
    biasSmoothing,
    // New blur parameter
    blurAmount,
    // Physics parameters
    biasFriction,
    biasTune,
  }) {
    if (strength !== undefined) this.strength = strength;
    if (scale !== undefined) this.scale = scale;
    if (speed !== undefined) this.speed = speed;
    if (rotation !== undefined) this.rotation = rotation;
    if (rotationSpeed !== undefined) this.rotationSpeed = rotationSpeed;
    if (pullFactor !== undefined) this.pullFactor = pullFactor;
    if (directionBias !== undefined) this.directionBias = directionBias;
    if (decayRate !== undefined) this.decayRate = decayRate;
    if (domainWarp !== undefined) this.domainWarp = domainWarp;
    if (timeOffset !== undefined) this.timeOffset = timeOffset;
    if (patternFrequency !== undefined) this.patternFrequency = patternFrequency;

    // Handle pattern style change - always apply pattern-specific offsets
    let patternChanged = false;
    if (patternStyle !== undefined && patternStyle !== this.patternStyle) {
      // Convert to string if a numeric value is provided (from modulation)
      if (typeof patternStyle !== 'string') {
        // Get available pattern styles as fallback
        const patternKeys = Object.keys(this.patternOffsets);
        if (patternKeys.length > 0) {
          // Use modulo to wrap the numeric value to a valid pattern
          const index = Math.floor(Math.abs(patternStyle)) % patternKeys.length;
          patternStyle = patternKeys[index];
        } else {
          patternStyle = 'checkerboard'; // Default fallback
        }
      }

      this.patternStyle = patternStyle;
      patternChanged = true;
    }

    // Time influence controls
    if (phaseEnabled !== undefined) this.phaseEnabled = phaseEnabled;
    if (amplitudeEnabled !== undefined) this.amplitudeEnabled = amplitudeEnabled;
    if (phaseSpeed !== undefined) this.phaseSpeed = phaseSpeed;
    if (amplitudeSpeed !== undefined) this.amplitudeSpeed = amplitudeSpeed;
    if (phase !== undefined) this.phase = phase;
    if (amplitude !== undefined) this.amplitude = amplitude;

    // Symmetry control
    if (symmetryAmount !== undefined) this.symmetryAmount = symmetryAmount;

    // Pattern offset controls
    if (patternOffsetX !== undefined) this.patternOffsetX = patternOffsetX;
    if (patternOffsetY !== undefined) this.patternOffsetY = patternOffsetY;

    // If pattern changed, apply pattern-specific offset
    if (patternChanged) {
      this.applyPatternSpecificOffset();
    }

    // Bias speed controls - update to set acceleration only, not position
    if (biasSpeedX !== undefined) {
      // Store as acceleration for physics model only, not as a direct offset speed
      this._biasAccelX = biasSpeedX * (this.biasStrength || 1);

      // IMPORTANT: Remove the old bias speed property that might be causing the issue
      // We don't want this property to interfere with the physics-based model
      this.biasSpeedX = 0;
    }

    if (biasSpeedY !== undefined) {
      // Store as acceleration for physics model only, not as a direct offset speed
      this._biasAccelY = biasSpeedY * (this.biasStrength || 1);

      // IMPORTANT: Remove the old bias speed property that might be causing the issue
      // We don't want this property to interfere with the physics-based model
      this.biasSpeedY = 0;
    }

    if (biasStrength !== undefined) this.biasStrength = biasStrength;

    // Physics parameters
    if (biasFriction !== undefined) this.biasFriction = biasFriction;
    if (biasTune !== undefined) this.biasTune = biasTune;

    // Contrast and separation controls
    if (contrast !== undefined) this.contrast = contrast;
    if (separation !== undefined) this.separation = separation;

    // Bandpass contrast parameters
    if (contrastShadowPoint !== undefined) this.contrastShadowPoint = contrastShadowPoint;
    if (contrastMidPoint !== undefined) this.contrastMidPoint = contrastMidPoint;
    if (contrastHighlightPoint !== undefined) this.contrastHighlightPoint = contrastHighlightPoint;
    if (contrastDarkBoost !== undefined) this.contrastDarkBoost = contrastDarkBoost;

    // New bias smoothing parameter
    if (biasSmoothing !== undefined) this.biasSmoothing = biasSmoothing;

    // New blur parameter
    if (blurAmount !== undefined) this.blurAmount = blurAmount;
  }

  // Debug function to help diagnose rotation issues
  debugRotation() {
    if (this.db) console.log("=== Turbulence Field Debug ===");
    if (this.db) console.log("Boundary center:", this.boundary.centerX, this.boundary.centerY);
    if (this.db) console.log("Current rotation:", this.rotation);

    // Test noise values at fixed points to verify rotation
    const testPoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 },
      { x: 0.5, y: 0.5 }  // Center
    ];

    if (this.db) console.log("Testing noise values:");
    testPoints.forEach(pt => {
      // Original coordinates
      if (this.db) console.log(`Point (${pt.x}, ${pt.y}): ${this.noise2D(pt.x, pt.y)}`);

      // Compute what the rotated coordinates should be
      const centerX = this.boundary.centerX;
      const centerY = this.boundary.centerY;
      const tx = pt.x - centerX;
      const ty = pt.y - centerY;
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const rx = tx * cos - ty * sin + centerX;
      const ry = tx * sin + ty * cos + centerY;

      if (this.db) console.log(`Should rotate to (${rx.toFixed(3)}, ${ry.toFixed(3)})`);
    });

    if (this.db) console.log("=== End Debug ===");
  }

  resetBias() {
    this._currentBiasOffsetX = 0;
    this._currentBiasOffsetY = 0;
    this._biasVelocityX = 0;
    this._biasVelocityY = 0;
    this._biasAccelX = 0;
    this._biasAccelY = 0;

    // Also reset the old bias speed properties to ensure they don't interfere
    this.biasSpeedX = 0;
    this.biasSpeedY = 0;
  }


  setBiasSensitivity(sensitivity) {
    // Clamp sensitivity to valid range
    const value = Math.max(0, Math.min(1, sensitivity || 0.25));
    this.biasSensitivity = value;



    if (this.db) console.log(`Bias sensitivity set to ${(this.biasSensitivity * 100).toFixed(0)}%`);


    return this.biasSensitivity;
  }


  setBiasSpeed(x, y) {
    // Clamp values to -1..1 range
    const clampedX = Math.max(-1, Math.min(1, x || 0));
    const clampedY = Math.max(-1, Math.min(1, y || 0));

    // Scale down the acceleration for smoother response
    // Reduce multiplier from 0.2 to 0.05 for significantly lower sensitivity
    this._biasAccelX = -clampedX * this.biasStrength * this.biasTune;
    this._biasAccelY = clampedY * this.biasStrength * this.biasTune;

    // Also reduce direction bias sensitivity to match the reduced acceleration
    // Reduce from 0.5 to 0.15 for better balance
    this.directionBias[0] = clampedX * 0.15 * this.biasTune;
    this.directionBias[1] = clampedY * 0.15 * this.biasTune;

    // Always keep the old bias speed properties at zero
    // to ensure they don't interfere with the physics model
    this.biasSpeedX = 0;
    this.biasSpeedY = 0;
  }



  // Debug function to analyze pullFactor behavior
  debugPullFactor() {
    if (this.db) console.log("=== Turbulence Pull Factor Analysis ===");
    if (this.db) console.log(`Current pullFactor: ${this.pullFactor.toFixed(3)}`);

    // Sample a test point at the center
    const centerX = this.boundary.centerX;
    const centerY = this.boundary.centerY;

    // Get noise value at center
    const n = this.noise2D(centerX, centerY, this.time, true);

    // Calculate gradient
    const epsilon = 0.01;
    const nx = this.noise2D(centerX + epsilon, centerY, this.time, true);
    const ny = this.noise2D(centerX, centerY + epsilon, this.time, true);
    const gradX = (nx - n) / epsilon;
    const gradY = (ny - n) / epsilon;

    // Get visualization color (0-255)
    const visualColor = Math.floor(((n + 1) * 0.5) * 255);

    if (this.db) console.log(`Noise at center: ${n.toFixed(3)} (display: RGB ${visualColor},${visualColor},${visualColor})`);
    if (this.db) console.log(`Gradient direction: X=${gradX.toFixed(3)}, Y=${gradY.toFixed(3)}`);

    // Show what direction particles would move
    let moveDir;
    if (this.pullFactor > 0) {
      moveDir = "TOWARD white (gradient direction)";
    } else if (this.pullFactor > -0.5) {
      moveDir = "AWAY from white (opposite gradient)";
    } else {
      moveDir = "TOWARD white (gradient direction)";
    }

    if (this.db) console.log(`Particle movement: ${moveDir}`);
    if (this.db) console.log("=== End Analysis ===");
  }
}