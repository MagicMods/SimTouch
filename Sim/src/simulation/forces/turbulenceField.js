class TurbulenceField {
  constructor({
    strength = 3,
    scale = 4.0,
    speed = 1.0,
    octaves = 3,
    persistence = 0.5,
    rotation = 0.0,
    rotationSpeed = 0.0,
    pullFactor = 0.0, // -1 to +1 range parameter
    boundary = null,
    directionBias = [0, 0],
    decayRate = 0.99,
    timeOffset = Math.random() * 1000,
    noiseSeed = Math.random() * 10000,
    domainWarp = 0.3,
    useOrganicNoise = true, // New parameter to choose between noise styles
    // New geometric pattern controls
    patternFrequency = 6.0,
    patternStyle = "",
    // Time influence controls
    phaseEnabled = false,
    frequencyEnabled = false,
    amplitudeEnabled = false,
    phaseSpeed = 1.0,
    frequencySpeed = 1.0,
    amplitudeSpeed = 1.0,
    phase = 0.0,  // Static phase offset
    amplitude = 1.0,  // Static amplitude multiplier
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
    this._octaves = octaves;
    this.persistence = persistence;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;
    this.pullFactor = pullFactor;
    this.time = 0;
    this.directionBias = directionBias;
    this.decayRate = decayRate;
    this.useOrganicNoise = useOrganicNoise;

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

    this.noiseBases = [];
    this.regenerateNoiseBases();

    // Add new geometric pattern controls
    this.patternFrequency = patternFrequency;
    this.patternStyle = patternStyle;

    // Time influence controls
    this.phaseEnabled = phaseEnabled;
    this.frequencyEnabled = frequencyEnabled;
    this.amplitudeEnabled = amplitudeEnabled;
    this.phaseSpeed = phaseSpeed;
    this.frequencySpeed = frequencySpeed;
    this.amplitudeSpeed = amplitudeSpeed;
    this.phase = phase;
    this.amplitude = amplitude;

    // Domain warp time control
    this.domainWarpEnabled = false;
    this.domainWarpSpeed = 1.0;
  }

  // Add getter and setter for octaves
  get octaves() {
    return this._octaves;
  }

  set octaves(value) {
    this._octaves = value;
    this.regenerateNoiseBases();
  }

  // Method to regenerate noise bases when octaves change
  regenerateNoiseBases() {
    try {
      this.noiseBases = [];

      // Use fixed values for testing to ensure consistency
      const baseFrequencies = [
        { freqX: 1.0, freqY: 1.0, phaseX: 0, phaseY: 0 },
        { freqX: 1.0, freqY: 1.0, phaseX: 2.1, phaseY: 1.3 },
        { freqX: 0.9, freqY: 1.1, phaseX: 4.2, phaseY: 3.8 },
        { freqX: 1.1, freqY: 0.9, phaseX: 0.7, phaseY: 5.1 },
        { freqX: 1.0, freqY: 1.0, phaseX: 3.3, phaseY: 2.2 },
        { freqX: 1.0, freqY: 1.0, phaseX: 1.4, phaseY: 4.3 },
        { freqX: 1.0, freqY: 1.0, phaseX: 5.6, phaseY: 0.5 },
        { freqX: 1.0, freqY: 1.0, phaseX: 2.8, phaseY: 3.7 }
      ];

      // Use fixed bases for octaves up to 8
      for (let i = 0; i < this._octaves; i++) {
        // Use modulo to wrap around if we need more than the predefined bases
        const baseIdx = i % baseFrequencies.length;
        this.noiseBases.push(baseFrequencies[baseIdx]);
      }

      // console.log("Regenerated noise bases with center:",
      // this.boundary.centerX, this.boundary.centerY);
    } catch (err) {
      console.error("Error regenerating noise bases:", err);
      // Create fallback bases
      this.noiseBases = [];
      for (let i = 0; i < this._octaves; i++) {
        this.noiseBases.push({
          freqX: 1.0,
          freqY: 1.0,
          phaseX: i * 1.0,
          phaseY: i * 2.0,
        });
      }
    }
  }

  // Add method to generate preview thumbnails
  generatePatternPreview(width = 100, height = 100, style = this.patternStyle, isAnimated = false) {
    // Store original parameters
    const originalParams = {
      useOrganicNoise: this.useOrganicNoise,
      patternStyle: this.patternStyle,
      speed: this.speed,
      scale: this.scale,
      octaves: this._octaves,
      persistence: this.persistence,
      rotation: this.rotation,
      time: this.time,
      domainWarp: this.domainWarp
    };

    // Set parameters for preview
    this.patternStyle = style;
    this.useOrganicNoise = style === "";
    if (!isAnimated) {
      this.time = 0;  // Reset time for static preview
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Generate pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = 1 - (y / height);  // Flip Y coordinate to match simulation space
        const value = this.noise2D(nx, ny);

        // Convert to grayscale (keep values inverted for correct visualization)
        const color = Math.floor((1 - value) * 255);
        const idx = (y * width + x) * 4;
        data[idx] = color;     // R
        data[idx + 1] = color; // G
        data[idx + 2] = color; // B
        data[idx + 3] = 255;   // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Restore original parameters
    Object.assign(this, originalParams);

    return canvas.toDataURL();
  }

  // Add method to generate animated preview
  generateAnimatedPreview(width = 100, height = 100, style = this.patternStyle, updateCallback) {
    let animationFrame;
    const animate = () => {
      // Update time for animation
      this.time += 0.016; // Assuming 60fps
      // Generate new frame
      const dataUrl = this.generatePatternPreview(width, height, style, true);
      // Call the update callback with new frame
      if (updateCallback) updateCallback(dataUrl);
      // Request next frame
      animationFrame = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Return cleanup function
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }

  // Completely redesigned noise2D function that supports both styles
  noise2D(x, y, time) {
    let noise = 0;
    let frequency = this.patternFrequency;
    let amplitude = 1.0;
    let maxValue = 0;

    try {
      const centerX = (this.boundary && typeof this.boundary.centerX === 'number') ? this.boundary.centerX : 0.5;
      const centerY = (this.boundary && typeof this.boundary.centerY === 'number') ? this.boundary.centerY : 0.5;

      if (this.useOrganicNoise) {
        // Organic noise style with domain warping
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        // Apply domain warping with time control
        let warpX = 0, warpY = 0;
        if (this.domainWarp > 0) {
          if (this.speed > 0 && this.domainWarpEnabled) {
            // Time-driven warping
            warpX = this.domainWarp * Math.sin(y * 0.1 + this.time * this.speed * this.domainWarpSpeed);
            warpY = this.domainWarp * Math.sin(x * 0.1 + this.time * this.speed * this.domainWarpSpeed);
          } else {
            // Static warping
            warpX = this.domainWarp * Math.sin(y * 0.1);
            warpY = this.domainWarp * Math.sin(x * 0.1);
          }
        }

        // Apply scale to coordinates
        const scaledX = x * this.scale;
        const scaledY = y * this.scale;

        // Apply rotation and warping to scaled coordinates
        let rx = (scaledX + warpX) * cos - (scaledY + warpY) * sin;
        let ry = (scaledX + warpX) * sin + (scaledY + warpY) * cos;

        let noise = 0;
        let amplitude = 1;
        let maxValue = 0;

        const actualOctaves = Math.min(this._octaves, this.noiseBases.length);

        for (let i = 0; i < actualOctaves; i++) {
          if (!this.noiseBases[i]) continue;

          const base = this.noiseBases[i];
          const frequencyX = Math.pow(2, i) * base.freqX;
          const frequencyY = Math.pow(2, i) * base.freqY;

          // Apply speed to time component
          const timeX = this.time * this.speed;
          const timeY = this.time * this.speed * 0.7;

          const val =
            Math.sin(rx * frequencyX + timeX + base.phaseX) *
            Math.cos(ry * frequencyY + timeY + base.phaseY);

          noise += amplitude * val;
          maxValue += amplitude;
          amplitude *= this.persistence;
        }

        return (noise / maxValue + 1) * 0.5;
      } else {
        // Geometric noise style with clear patterns
        const scaledX = x * this.scale;
        const scaledY = y * this.scale;

        // Apply domain warping to geometric patterns with time control
        let warpedX = scaledX;
        let warpedY = scaledY;
        if (this.domainWarp > 0) {
          // Apply warping after scaling for stronger effect
          const warpFreq = 2.0;  // Increased frequency for more visible warping
          if (this.speed > 0 && this.domainWarpEnabled) {
            // Time-driven warping
            warpedX = scaledX + this.domainWarp * Math.sin(scaledY * warpFreq + this.time * this.speed * this.domainWarpSpeed);
            warpedY = scaledY + this.domainWarp * Math.cos(scaledX * warpFreq + this.time * this.speed * this.domainWarpSpeed);
          } else {
            // Static warping
            warpedX = scaledX + this.domainWarp * Math.sin(scaledY * warpFreq);
            warpedY = scaledY + this.domainWarp * Math.cos(scaledX * warpFreq);
          }
        }

        // Calculate base pattern based on style
        let basePattern;
        switch (this.patternStyle) {
          case "checkerboard":
            basePattern = Math.sin(warpedX * this.patternFrequency) * Math.sin(warpedY * this.patternFrequency);
            break;
          case "waves":
            basePattern = Math.sin(warpedX * this.patternFrequency + warpedY * this.patternFrequency * 0.5);
            break;
          case "spiral":
            // For spiral, convert back to unscaled coordinates for center-based calculation
            const angle = Math.atan2((warpedY / this.scale) - centerY, (warpedX / this.scale) - centerX);
            const radius = Math.sqrt(Math.pow((warpedX / this.scale) - centerX, 2) + Math.pow((warpedY / this.scale) - centerY, 2));
            basePattern = Math.sin(angle * this.patternFrequency + radius * this.patternFrequency * 0.1);
            break;
          case "grid":
            basePattern = Math.sin(warpedX * this.patternFrequency) + Math.sin(warpedY * this.patternFrequency);
            break;
          case "circles":
            const dist = Math.sqrt(Math.pow((warpedX / this.scale) - centerX, 2) + Math.pow((warpedY / this.scale) - centerY, 2));
            basePattern = Math.sin(dist * this.patternFrequency * Math.PI * 2);
            break;
          case "maze":
            basePattern = Math.sin(warpedX * this.patternFrequency * 2) * Math.cos(warpedY * this.patternFrequency * 2);
            break;
          case "ripples":
            const rippleDist = Math.sqrt(Math.pow((warpedX / this.scale) - centerX, 2) + Math.pow((warpedY / this.scale) - centerY, 2));
            basePattern = Math.sin(rippleDist * this.patternFrequency * Math.PI * 2 - this.time * this.speed);
            break;
          case "starfield":
            const starX = ((warpedX / this.scale) - centerX) * this.patternFrequency;
            const starY = ((warpedY / this.scale) - centerY) * this.patternFrequency;
            basePattern = Math.sin(starX * starX + starY * starY);
            break;
          default:
            basePattern = Math.sin(warpedX * this.patternFrequency) * Math.sin(warpedY * this.patternFrequency);
        }

        let rotatedPattern = basePattern;

        if (Math.abs(this.rotation) > 0.0001) {
          // For rotation, convert back to unscaled coordinates
          const tx = (warpedX / this.scale) - centerX;
          const ty = (warpedY / this.scale) - centerY;

          const cos = Math.cos(-this.rotation);
          const sin = Math.sin(-this.rotation);
          const rx = tx * cos - ty * sin;
          const ry = tx * sin + ty * cos;

          const rotX = rx + centerX;
          const rotY = ry + centerY;

          const rotScaledX = rotX * this.scale;
          const rotScaledY = rotY * this.scale;

          // Recalculate pattern with rotated coordinates
          switch (this.patternStyle) {
            case "checkerboard":
              rotatedPattern = Math.sin(rotScaledX * this.patternFrequency) * Math.sin(rotScaledY * this.patternFrequency);
              break;
            case "waves":
              rotatedPattern = Math.sin(rotScaledX * this.patternFrequency + rotScaledY * this.patternFrequency * 0.5);
              break;
            case "spiral":
              const rotAngle = Math.atan2(rotY - centerY, rotX - centerX);
              const rotRadius = Math.sqrt(Math.pow(rotX - centerX, 2) + Math.pow(rotY - centerY, 2));
              rotatedPattern = Math.sin(rotAngle * this.patternFrequency + rotRadius * this.patternFrequency * 0.1);
              break;
            case "grid":
              rotatedPattern = Math.sin(rotScaledX * this.patternFrequency) + Math.sin(rotScaledY * this.patternFrequency);
              break;
          }
        }

        noise = rotatedPattern;

        // Apply time influence based on enabled controls and T-Speed
        if (this.speed > 0) {
          // When T-Speed > 0, use enabled controls as rate multipliers
          if (this.phaseEnabled) {
            const phaseOffset = this.time * this.speed * this.phaseSpeed + this.phase * Math.PI * 2;
            noise = Math.sin(noise * Math.PI * 2 + phaseOffset);
          } else {
            // Apply static phase even when time-driven phase is disabled
            const phaseOffset = this.phase * Math.PI * 2;
            noise = Math.sin(noise * Math.PI * 2 + phaseOffset);
          }

          if (this.amplitudeEnabled) {
            const dynamicAmplitude = 0.5 + 0.5 * Math.sin(this.time * this.speed * this.amplitudeSpeed);
            noise *= this.amplitude * dynamicAmplitude;
          } else {
            // Apply static amplitude even when time-driven amplitude is disabled
            noise *= this.amplitude;
          }

          if (this.frequencyEnabled) {
            const freqScale = 1 + 0.5 * Math.sin(this.time * this.speed * this.frequencySpeed);
            const freqX = warpedX * this.patternFrequency * freqScale;
            const freqY = warpedY * this.patternFrequency * freqScale;
            switch (this.patternStyle) {
              case "checkerboard":
                noise = Math.sin(freqX) * Math.sin(freqY);
                break;
              case "waves":
                noise = Math.sin(freqX + freqY * 0.5);
                break;
              case "grid":
                noise = Math.sin(freqX) + Math.sin(freqY);
                break;
              case "circles":
                const dist = Math.sqrt(Math.pow((warpedX / this.scale) - centerX, 2) + Math.pow((warpedY / this.scale) - centerY, 2));
                noise = Math.sin(dist * this.patternFrequency * Math.PI * 2 * freqScale);
                break;
              case "spiral":
                const angle = Math.atan2((warpedY / this.scale) - centerY, (warpedX / this.scale) - centerX);
                const radius = Math.sqrt(Math.pow((warpedX / this.scale) - centerX, 2) + Math.pow((warpedY / this.scale) - centerY, 2));
                noise = Math.sin(angle * this.patternFrequency + radius * this.patternFrequency * 0.1 * freqScale);
                break;
              case "maze":
                noise = Math.sin(freqX * 2) * Math.cos(freqY * 2);
                break;
              case "ripples":
                const rippleDist = Math.sqrt(Math.pow((warpedX / this.scale) - centerX, 2) + Math.pow((warpedY / this.scale) - centerY, 2));
                noise = Math.sin(rippleDist * this.patternFrequency * Math.PI * 2 * freqScale);
                break;
              case "starfield":
                const starX = ((warpedX / this.scale) - centerX) * this.patternFrequency * freqScale;
                const starY = ((warpedY / this.scale) - centerY) * this.patternFrequency * freqScale;
                noise = Math.sin(starX * starX + starY * starY);
                break;
            }
          }
        } else {
          // When T-Speed = 0, apply static values
          const phaseOffset = this.phase * Math.PI * 2;
          noise = Math.sin(noise * Math.PI * 2 + phaseOffset);
          // Apply static amplitude
          noise *= this.amplitude;
        }

        return (noise + 1) * 0.5;
      }
    } catch (err) {
      console.error("Error in noise2D:", err);
      return 0.5;
    }
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

      // Rest of the method remains unchanged...
      // Apply velocity scaling if enabled - works the same in either mode
      if (this.scaleField) {
        const n1 = this.noise2D(x * this.scale, y * this.scale);
        const scaleFactorField = 1.0 + (n1 - 0.5) * this.strength * 0.1;
        newVx *= scaleFactorField;
        newVy *= scaleFactorField;
      }

      // Apply particle radius scaling if enabled - works the same in either mode
      if (this.affectScale && system?.particleRadii) {
        const n1 = this.noise2D(x * this.scale, y * this.scale);
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
      for (let i = 0; i < this.octaves; i++) {
        this.noiseBases[i].phaseX += (Math.random() - 0.5) * 0.1;
        this.noiseBases[i].phaseY += (Math.random() - 0.5) * 0.1;
      }
    }
  }

  setParameters({
    strength,
    scale,
    speed,
    octaves,
    persistence,
    rotation,
    rotationSpeed,
    directionBias,
    decayRate,
    domainWarp,
    timeOffset,
    useOrganicNoise,
    patternFrequency,
    patternStyle,
    phaseEnabled,
    frequencyEnabled,
    amplitudeEnabled,
    phaseSpeed,
    frequencySpeed,
    amplitudeSpeed,
    phase,
    amplitude,
  }) {
    if (strength !== undefined) this.strength = strength;
    if (scale !== undefined) this.scale = scale;
    if (speed !== undefined) this.speed = speed;
    if (octaves !== undefined) this.octaves = octaves;
    if (persistence !== undefined) this.persistence = persistence;
    if (rotation !== undefined) this.rotation = rotation;
    if (rotationSpeed !== undefined) this.rotationSpeed = rotationSpeed;
    if (directionBias !== undefined) this.directionBias = directionBias;
    if (decayRate !== undefined) this.decayRate = decayRate;
    if (domainWarp !== undefined) this.domainWarp = domainWarp;
    if (timeOffset !== undefined) this.timeOffset = timeOffset;
    if (useOrganicNoise !== undefined) this.useOrganicNoise = useOrganicNoise;
    if (patternFrequency !== undefined) this.patternFrequency = patternFrequency;
    if (patternStyle !== undefined) this.patternStyle = patternStyle;

    // Time influence controls
    if (phaseEnabled !== undefined) this.phaseEnabled = phaseEnabled;
    if (frequencyEnabled !== undefined) this.frequencyEnabled = frequencyEnabled;
    if (amplitudeEnabled !== undefined) this.amplitudeEnabled = amplitudeEnabled;
    if (phaseSpeed !== undefined) this.phaseSpeed = phaseSpeed;
    if (frequencySpeed !== undefined) this.frequencySpeed = frequencySpeed;
    if (amplitudeSpeed !== undefined) this.amplitudeSpeed = amplitudeSpeed;
    if (phase !== undefined) this.phase = phase;
    if (amplitude !== undefined) this.amplitude = amplitude;
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
