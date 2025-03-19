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
    phaseSpeed = 0.0,
    amplitudeSpeed = 0.0,
    phase = 0.0,
    amplitude = 1.0,
    symmetryAmount = 0.0,  // 0 = no symmetry, 1 = full symmetry
    // New pattern offset controls
    patternOffsetX = 0.0,
    patternOffsetY = 0.0,
    // New bias speed controls
    biasSpeedX = 0.0,
    biasSpeedY = 0.0,
    biasSpeed = 0.0,
    // New contrast and separation controls
    contrast = 0.5,        // 0 = no contrast, 1 = max contrast
    contrastSpeed = 0.0,   // Speed of contrast oscillation
    separation = 0.5,      // 0 = smooth, 1 = sharp transitions
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

    // New pattern offset controls
    this.patternOffsetX = patternOffsetX;
    this.patternOffsetY = patternOffsetY;

    // New bias speed controls (speed of pattern movement in X/Y)
    this.biasSpeedX = biasSpeedX;
    this.biasSpeedY = biasSpeedY;
    this.biasSpeed = biasSpeed;

    // New contrast and separation controls
    this.contrast = contrast;
    this.contrastSpeed = contrastSpeed;
    this.separation = separation;
  }

  // Coordinate processing pipeline helper functions

  // Apply pattern offset and time-based bias
  applyOffset(x, y, time) {
    // Calculate time-based offsets from bias speeds
    const timeOffsetX = time * this.speed * this.biasSpeedX * this.biasSpeed;
    const timeOffsetY = time * this.speed * this.biasSpeedY * this.biasSpeed;

    // Apply both static offset and time-based bias
    return [
      x + this.patternOffsetX + timeOffsetX,
      y + this.patternOffsetY + timeOffsetY
    ];
  }

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
  applyScale(x, y, scale) {
    return [x * scale, y * scale];
  }

  // Apply domain warping to coordinates
  applyDomainWarp(x, y, time) {
    if (this.domainWarp <= 0) return [x, y];

    const warpFreq = 2.0;

    if (this.speed > 0 && this.domainWarpSpeed > 0) {
      // Time-driven warping
      return [
        x + this.domainWarp * Math.sin(y * warpFreq + time * this.speed * this.domainWarpSpeed),
        y + this.domainWarp * Math.cos(x * warpFreq + time * this.speed * this.domainWarpSpeed)
      ];
    } else {
      // Static warping
      return [
        x + this.domainWarp * Math.sin(y * warpFreq),
        y + this.domainWarp * Math.cos(x * warpFreq)
      ];
    }
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
    // Get base contrast value (optionally animated)
    let contrastValue = this.contrast;
    if (this.contrastSpeed > 0 && this.speed > 0) {
      // Oscillate contrast between original value and 1.0
      contrastValue = this.contrast +
        (1.0 - this.contrast) * 0.5 *
        (1 + Math.sin(time * this.speed * this.contrastSpeed));
    }

    // Scale contrast - higher values create more extreme results
    const contrastPower = 1.0 + contrastValue * 3.0; // 1.0 to 4.0 range

    // For separation, we'll use a modified sigmoid function
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
      // Apply different power functions for values above and below 0.5
      // to maintain the center point
      if (value > 0.5) {
        // Scale from 0.5-1.0 to 0.5-1.0 with increased contrast
        const scaled = (value - 0.5) * 2; // 0-1 range
        value = 0.5 + (Math.pow(scaled, contrastPower) * 0.5);
      } else {
        // Scale from 0-0.5 to 0-0.5 with increased contrast
        const scaled = value * 2; // 0-1 range
        value = Math.pow(scaled, contrastPower) * 0.5;
      }
    }

    return value;
  }

  // Process coordinates through the entire pipeline
  processCoordinates(x, y, time) {
    const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
    const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

    // Process in correct order: offset → symmetry → scale → warp → rotate
    let [px, py] = this.applyOffset(x, y, time);
    [px, py] = this.applySymmetry(px, py, centerX, centerY);
    [px, py] = this.applyScale(px, py, this.scale);
    [px, py] = this.applyDomainWarp(px, py, time);
    [px, py] = this.applyRotation(px, py, centerX, centerY, this.rotation);

    return [px, py, centerX, centerY];
  }

  // Calculate pattern value for any pattern type using normalized coordinates
  calculatePattern(patternStyle, x, y, centerX, centerY) {
    let patternValue;

    // Use pattern frequency consistently in all patterns
    const freq = this.patternFrequency;

    switch (patternStyle) {
      case "checkerboard":
        patternValue = Math.sin(x * freq) * Math.sin(y * freq);
        break;
      case "waves":
        patternValue = Math.sin(x * freq + y * freq * 0.5);
        break;
      case "spiral":
        const angle = Math.atan2(y - centerY, x - centerX);
        const radius = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        patternValue = Math.sin(angle * freq + radius * freq * 0.1);
        break;
      case "grid":
        patternValue = Math.sin(x * freq) + Math.sin(y * freq);
        break;
      case "circles":
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        patternValue = Math.sin(dist * freq * Math.PI * 2);
        break;
      case "maze":
        patternValue = Math.sin(x * freq * 2) * Math.cos(y * freq * 2);
        break;
      case "ripples":
        const rippleDist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        patternValue = Math.sin(rippleDist * freq * Math.PI * 2 - this.time * this.speed);
        break;
      case "starfield":
        const starX = (x - centerX) * freq;
        const starY = (y - centerY) * freq;
        patternValue = Math.sin(starX * starX + starY * starY);
        break;
      case "voronoi":
        // Create a cellular pattern using multiple centers
        const numCenters = 8;
        let minDist = Infinity;
        for (let i = 0; i < numCenters; i++) {
          const angle = (i / numCenters) * Math.PI * 2;
          const centerX = 0.5 + Math.cos(angle) * 0.3;
          const centerY = 0.5 + Math.sin(angle) * 0.3;
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          minDist = Math.min(minDist, dist);
        }
        patternValue = Math.sin(minDist * freq * Math.PI * 2);
        break;
      case "fractal":
        // Create a recursive pattern
        let fractalValue = 0;
        let amplitude = 1;
        let frequency = freq;
        for (let i = 0; i < 4; i++) {
          // Scale coordinates properly for each octave
          const scaledX = x * frequency;
          const scaledY = y * frequency;
          fractalValue += amplitude * Math.sin(scaledX) * Math.sin(scaledY);
          amplitude *= 0.5;
          frequency *= 2;
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
        patternValue = Math.sin(bubbleDist * 2) * Math.cos(bubbleX * 3) * Math.sin(bubbleY * 3);
        break;
      default:
        patternValue = Math.sin(x * freq) * Math.sin(y * freq);
    }

    return patternValue;
  }

  // Completely redesigned noise2D function that supports geometric patterns
  noise2D(x, y, time = this.time) {
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

      return noise;
    } catch (err) {
      console.error("Error in noise2D:", err);
      return 0.5;
    }
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

      // Calculate noise and determine mode based on pullFactor
      if (this.pullFactor > 0 && this.affectPosition) {
        // PULL MODE: Move toward noise peaks (positive pullFactor)

        // Sample noise at multiple points to calculate gradient
        const epsilon = 0.01;  // Small sampling distance
        const n0 = this.noise2D(x, y);
        const nx = this.noise2D(x + epsilon, y);
        const ny = this.noise2D(x, y + epsilon);

        // Calculate approximate gradient (direction toward higher values)
        const gradX = (nx - n0) / epsilon;
        const gradY = (ny - n0) / epsilon;

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
      } else if (this.affectPosition) {
        // PUSH MODE: Use the existing implementation for pushing particles
        // Calculate noise at particle position
        const n1 = this.noise2D(x, y);
        const n2 = this.noise2D(y + 1.234, x + 5.678);

        // Scale push strength from 0 (at pullFactor = 0) to 1 (at pullFactor = -1)
        const pushStrength = this.strength * Math.abs(Math.min(0, this.pullFactor));
        const forceX = (n1 - 0.5) * pushStrength;
        const forceY = (n2 - 0.5) * pushStrength;
        newVx += forceX * dt;
        newVy += forceY * dt;
      }
      // When pullFactor is -1, no force is applied (particles only affected by decay)

      // Apply velocity scaling if enabled - works the same in either mode
      if (this.scaleField) {
        // Use the new noise2D implementation (which uses proper coordinate processing)
        // instead of directly scaling x and y
        const n1 = this.noise2D(x, y);
        const scaleFactorField = 1.0 + (n1 - 0.5) * this.strength * 0.1;
        newVx *= scaleFactorField;
        newVy *= scaleFactorField;
      }

      // Apply particle radius scaling if enabled - works the same in either mode
      if (this.affectScale && system?.particleRadii) {
        const n1 = this.noise2D(x, y); // Now uses normalized coordinate processing
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

  update(dt) {
    this.time += dt;

    if (this.strength <= 0) return;

    // Apply rotation based on rotation speed
    if (this.rotationSpeed > 0) {
      this.rotation += this.rotationSpeed * dt;
      // Keep rotation within [0, 2π]
      this.rotation %= Math.PI * 2;
    }

    // Occasionally shift phase values for more variation
    if (Math.random() < 0.001) {
      for (let i = 0; i < this.patternFrequency; i++) {
        // Assuming patternFrequency is used for phase shift
        // This is a placeholder and should be replaced with actual phase shift logic
      }
    }

    // These time-based updates are now handled directly in the coordinate processing
    // through the applyOffset method, which calculates time-based offsets based on
    // biasSpeedX, biasSpeedY, and biasSpeed values.
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
    // New parameters
    patternOffsetX,
    patternOffsetY,
    biasSpeedX,
    biasSpeedY,
    biasSpeed,
    contrast,
    contrastSpeed,
    separation,
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
    if (patternStyle !== undefined) this.patternStyle = patternStyle;

    // Time influence controls
    if (phaseEnabled !== undefined) this.phaseEnabled = phaseEnabled;
    if (amplitudeEnabled !== undefined) this.amplitudeEnabled = amplitudeEnabled;
    if (phaseSpeed !== undefined) this.phaseSpeed = phaseSpeed;
    if (amplitudeSpeed !== undefined) this.amplitudeSpeed = amplitudeSpeed;
    if (phase !== undefined) this.phase = phase;
    if (amplitude !== undefined) this.amplitude = amplitude;

    // Symmetry control
    if (symmetryAmount !== undefined) this.symmetryAmount = symmetryAmount;

    // New pattern offset controls
    if (patternOffsetX !== undefined) this.patternOffsetX = patternOffsetX;
    if (patternOffsetY !== undefined) this.patternOffsetY = patternOffsetY;

    // New bias speed controls
    if (biasSpeedX !== undefined) this.biasSpeedX = biasSpeedX;
    if (biasSpeedY !== undefined) this.biasSpeedY = biasSpeedY;
    if (biasSpeed !== undefined) this.biasSpeed = biasSpeed;

    // New contrast and separation controls
    if (contrast !== undefined) this.contrast = contrast;
    if (contrastSpeed !== undefined) this.contrastSpeed = contrastSpeed;
    if (separation !== undefined) this.separation = separation;
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
}

export { TurbulenceField };
