class TurbulenceField {
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
    // New geometric pattern controls
    patternFrequency = 2.0,
    patternStyle = "Checkerboard",
    // Time influence controls
    phaseEnabled = false,
    amplitudeEnabled = false,
    phaseSpeed = -1,
    amplitudeSpeed = 0.0,
    phase = 0.0,
    amplitude = 1.0,
    symmetryAmount = 0.0,  // 0 = no symmetry, 1 = full symmetry
    // New pattern offset controls
    patternOffsetX = 0.0,
    patternOffsetY = 0.0,
    // New bias speed controls - these are now ignored and used only as initial acceleration
    biasSpeedX = 0.0,
    biasSpeedY = 0.0,
    biasStrength = 1.0,  // Bias strength parameter
    // New contrast and separation controls
    contrast = 0.5,        // 0 = no contrast, 1 = max contrast
    separation = 0,      // 0 = smooth, 1 = sharp transitions
    // New bias smoothing parameter
    biasSmoothing = 0.8,   // 0 = no smoothing, 1 = max smoothing
    // New blur parameter
    blurAmount = .8,      // 0 = no blur, 1 = max blur
    // Physics parameters for bias movement
    biasFriction = 0.05,   // Friction coefficient for bias movement (0-1)
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
    this.affectPosition = true;
    this.affectScale = true;
    this.scaleStrength = 0;

    this.minScale = 0.5;
    this.maxScale = 2.0;

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
      "bubbles": [0, 0]
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

    // Add bias smoothing
    this.biasSmoothing = biasSmoothing;

    // Add new blur parameter
    this.blurAmount = blurAmount;

    // Add internal bias state tracking for physics model
    this._currentBiasOffsetX = 0;
    this._currentBiasOffsetY = 0;
    this._biasVelocityX = 0;
    this._biasVelocityY = 0;
    this._biasAccelX = biasSpeedX * biasStrength * 0.1; // Initialize with any passed acceleration
    this._biasAccelY = biasSpeedY * biasStrength * 0.1; // but scaled for the physics model
    this.biasFriction = biasFriction;

    // Create dummy properties for backwards compatibility but never use them
    this.biasSpeedX = 0;
    this.biasSpeedY = 0;
  }

  // Apply pattern-specific offset based on current pattern style
  applyPatternSpecificOffset() {
    // Get the current pattern style in lowercase for lookup
    const patternKey = this.patternStyle.toLowerCase();

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

    // ===== STANDARD CONTRAST & SEPARATION =====
    // Get base contrast value (removed time animation)
    let contrastValue = this.contrast;

    // Apply separation (threshold) effect if enabled
    if (this.separation > 0) {
      // Center value around 0 (-0.5 to 0.5 range)
      const centered = value - 0.5;

      // Calculate separation factor (0 = smooth, 1 = very sharp)
      const sepFactor = 1.0 + this.separation * 12.0; // 1.0 to 13.0

      // Apply sigmoid-like function for separation
      value = 1.0 / (1.0 + Math.exp(-centered * sepFactor));
    }

    // Apply contrast power function 
    if (contrastValue > 0) {
      // Apply improved contrast function with more gradual transitions
      // and less pure white while keeping range the same

      // Center the value around 0
      const centered = value - 0.5;

      // Apply a cubic easing function that maintains 0.5 as middle point
      // but creates a more gradual transition toward extremes
      // This curve approaches extremes more slowly than a power function
      const easeFactor = 1.0 + contrastValue * 2.0;
      const eased = Math.sign(centered) * Math.pow(Math.abs(centered), 1.0 / easeFactor);

      // Scale back to [0,1] range
      value = eased + 0.5;

      // Further reduce pure whites without affecting pure blacks
      // by applying a subtle curve to values > 0.75
      if (value > 0.75) {
        // Calculate how far into the top quartile we are (0-1 range)
        const whiteReduction = (value - 0.75) / 0.25;
        // Apply subtle compression to highest values, more aggressive with higher contrast
        const compressionFactor = 0.2 * contrastValue;
        // Rescale the top range to reduce pure whites
        value = 0.75 + (0.25 - compressionFactor) * whiteReduction + compressionFactor * Math.sqrt(whiteReduction);
      }
    }

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

    // For patterns that depend on distance from center, we should adjust calculations
    // since the offset is now applied after rotation, scale, etc.
    switch (patternStyle) {
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
      // Get center coordinates
      const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
      const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

      // 1. Process coordinates through the standardized pipeline
      const [processedX, processedY, procCenterX, procCenterY] = this.processCoordinates(x, y, time);

      // 2. Calculate base pattern using the processed coordinates
      let noise = this.calculatePattern(this.patternStyle.toLowerCase(), processedX, processedY, procCenterX, procCenterY);

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

      // 4. Apply contrast and separation as post-processing
      noise = this.applyContrast((noise + 1) * 0.5, time);

      // 5. Apply blur if enabled and requested
      if (applyBlur && this.blurAmount > 0) {
        // Only do the expensive blur calculation if the blur amount is > 0
        noise = this.applyBlur(x, y, noise, time);
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

    // Scale blur amount to a more useful range (0 to 0.05)
    const sampleRadius = 0.05 * this.blurAmount;
    const numSamples = 8; // Number of samples to take around the center point

    let sum = centerValue; // Start with the center value
    let count = 1; // We've already counted the center

    // Take samples in a circle around the center point
    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2;
      const sampleX = x + Math.cos(angle) * sampleRadius;
      const sampleY = y + Math.sin(angle) * sampleRadius;

      // Process the sample through the full pipeline except blur (to avoid recursion)
      const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
      const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

      // Process coordinates with the same order as processCoordinates
      let px = sampleX;
      let py = sampleY;
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
      let sampleNoise = this.calculatePattern(this.patternStyle.toLowerCase(), px, py, centerX, centerY);

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

      // Apply contrast to the sample
      sampleNoise = this.applyContrast((sampleNoise + 1) * 0.5, time);

      // Add to our sum
      sum += sampleNoise;
      count++;
    }

    // Return the average
    return sum / count;
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
        const value = this.noise2D(nx, ny);

        const index = (y * width + x) * 4;
        data[index] = value * 255;     // R
        data[index + 1] = value * 255; // G
        data[index + 2] = value * 255; // B
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

    // Set the requested pattern style
    this.patternStyle = patternStyle;

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
          const value = this.noise2D(nx, ny);

          const index = (y * width + x) * 4;
          data[index] = value * 255;     // R
          data[index + 1] = value * 255; // G
          data[index + 2] = value * 255; // B
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

    // Initialize with current velocities
    let newVx = vx * this.decayRate;
    let newVy = vy * this.decayRate;

    // If strength is zero, we're done - just return the damped velocity
    if (Math.abs(this.strength) < 0.001) {
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

      // Calculate noise values for particle position
      // Always apply blur for simulation
      const n1 = this.noise2D(x, y, this.time, true);
      const n2 = this.noise2D(y + 1.234, x + 5.678, this.time, true);

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
          // Scale push strength based on pullFactor magnitude
          const pushStrength = Math.abs(this.pullFactor) * this.strength;
          const forceX = (n1 - 0.5) * pushStrength;
          const forceY = (n2 - 0.5) * pushStrength;
          newVx += forceX * dt;
          newVy += forceY * dt;
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
        const n1 = this.noise2D(x, y, this.time, true); // Now uses normalized coordinate processing
        const noiseValue = n1 * this.scaleStrength;
        // Map noise [0,1] to [minScale,maxScale]
        const scalePartFactor =
          this.minScale + noiseValue * (this.maxScale - this.minScale);
        system.particleRadii[particleIndex] =
          system.particleRadius * scalePartFactor;
      }
    } catch (err) {
      console.error("Error in turbulenceField.applyTurbulence:", err);
    }

    return [newVx, newVy];
  }

  /**
   * Update the simulation for the current frame
   * @param {number} dt - Delta time since last frame in seconds
   */
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
      // Use a more moderate acceleration multiplier (3.0)
      // Scale by dt^2 for frame-rate independence and proper physics
      this._biasVelocityX += this._biasAccelX * 3.0 * dt * dt * 60;
      this._biasVelocityY += this._biasAccelY * 3.0 * dt * dt * 60;

      // Apply friction using linear interpolation towards zero
      // This provides more predictable behavior than straight multiplication
      this._biasVelocityX = this._biasVelocityX * frictionFactor;
      this._biasVelocityY = this._biasVelocityY * frictionFactor;

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
    // New bias smoothing parameter
    biasSmoothing,
    // New blur parameter
    blurAmount,
    // Physics parameters
    biasFriction,
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

    // Contrast and separation controls
    if (contrast !== undefined) this.contrast = contrast;
    if (separation !== undefined) this.separation = separation;

    // New bias smoothing parameter
    if (biasSmoothing !== undefined) this.biasSmoothing = biasSmoothing;

    // New blur parameter
    if (blurAmount !== undefined) this.blurAmount = blurAmount;
  }

  // Debug function to help diagnose rotation issues
  debugRotation() {
    console.log("=== Turbulence Field Debug ===");
    console.log("Boundary center:", this.boundary.centerX, this.boundary.centerY);
    console.log("Current rotation:", this.rotation);

    // Test noise values at fixed points to verify rotation
    const testPoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 },
      { x: 0.5, y: 0.5 }  // Center
    ];

    console.log("Testing noise values:");
    testPoints.forEach(pt => {
      // Original coordinates
      console.log(`Point (${pt.x}, ${pt.y}): ${this.noise2D(pt.x, pt.y)}`);

      // Compute what the rotated coordinates should be
      const centerX = this.boundary.centerX;
      const centerY = this.boundary.centerY;
      const tx = pt.x - centerX;
      const ty = pt.y - centerY;
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const rx = tx * cos - ty * sin + centerX;
      const ry = tx * sin + ty * cos + centerY;

      console.log(`Should rotate to (${rx.toFixed(3)}, ${ry.toFixed(3)})`);
    });

    console.log("=== End Debug ===");
  }

  /**
   * Reset the bias physics (velocity and position)
   */
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

  /**
   * Set bias acceleration based on joystick input
   * The joystick values x and y are in the range -1 to 1
   * We'll use these as acceleration values instead of direct speed
   */
  setBiasSpeed(x, y) {
    // Clamp values to -1..1 range
    const clampedX = Math.max(-1, Math.min(1, x || 0));
    const clampedY = Math.max(-1, Math.min(1, y || 0));

    // Scale down the acceleration for smoother response
    // Using a much smaller multiplier (0.2) for gentler acceleration
    // Invert X axis to fix direction
    this._biasAccelX = -clampedX * this.biasStrength * 0.2;
    this._biasAccelY = clampedY * this.biasStrength * 0.2;

    // Always keep the old bias speed properties at zero
    // to ensure they don't interfere with the physics model
    this.biasSpeedX = 0;
    this.biasSpeedY = 0;
  }
}

export { TurbulenceField };
