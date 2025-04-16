export class PulseModulator {
  constructor(manager, debugFlag) {
    if (!manager) {
      throw new Error("ModulatorManager is required for PulseModulator");
    }
    this.debugFlag = debugFlag;
    this.manager = manager;
    this.enabled = true;
    this.targetName = "";
    this.type = "sine";
    this.frequency = 1.0;
    this.frequencyBpm = 60.0; // Add BPM representation of frequency
    this.sync = true;
    this.phase = 0;
    this.min = 0;
    this.max = 1;
    this.time = 0;
    this.targetController = null;
    this.originalValue = null;
    this.currentPhase = 0;
    this.isSelector = false;
    this.selectorOptions = [];
    this.beatDivision = "1";
    this.currentIndex = 0;
    this.direction = 1;
    this.previousWaveType = null;

    this.continuousWaveTypes = ["sine", "square", "triangle", "sawtooth", "pulse", "random", "increment"];
    this.selectorWaveTypes = ["forward", "backward", "loop"];

    // For special wave types
    this._lastBeatTime = 0;
    this._incrementValue = 0;
    this._incrementDirection = 1;
    this._randomValue = 0.5;
    this._wasEnabled = false;
  }


  getDisplayName(index = 1) {
    // Format: "Modulator 1 | TARGET'S NAME"
    if (this.targetName) {
      return `Modulator ${index} | "${this.targetName}"`;
    }
    return `Modulator ${index} | No Target`;
  }


  getBeatDivisionValue() {
    if (!this.beatDivision || this.beatDivision === "1") {
      return 1.0;
    }

    // Parse fractions like "1/4" into decimal values
    if (this.beatDivision.includes("/")) {
      const [numerator, denominator] = this.beatDivision.split("/").map(Number);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        // For musical notation, 1/4 means 4 notes per measure, so we invert
        return denominator / numerator;
      }
    }

    // If it's a simple number (like "2" or "4"), use as divisor (slower)
    // This makes "2" half-time (0.5x) and "4" quarter-time (0.25x)
    const value = Number(this.beatDivision);
    return !isNaN(value) ? 1.0 / value : 1.0;
  }

  // Add a method to reinitialize state when enabled
  reinitialize() {
    // Reset phase and timing related variables
    this.currentPhase = 0;
    this.time = 0;
    this._lastBeatTime = 0;

    // Reset state for special wave types
    if (this.type === "random") {
      this._randomValue = Math.random(); // Generate new random value
    } else if (this.type === "increment") {
      this._incrementValue = 0; // Reset to starting value
      this._incrementDirection = 1; // Reset to moving upward
    } else if (this.isSelector) {
      // For selectors, reset to min index and forward direction
      this.currentIndex = Math.floor(this.min);
      this.direction = 1;
    }
  }

  setTarget(targetName) {
    if (!targetName) {
      throw new Error("Target name is required for setTarget");
    }

    const target = this.manager.targets[targetName];
    if (!target) {
      throw new Error(`Target "${targetName}" not found in ModulatorManager`);
    }

    // Store target info
    this.targetName = targetName;
    this.target = target;
    this.targetController = target;

    // Get current value and store as original
    try {
      this.originalValue = target.getValue();
    } catch (e) {
      throw new Error(`Failed to get value for target "${targetName}": ${e.message}`);
    }

    // Check if target is a selector/dropdown (like Boundary or Mode)
    const wasSelector = this.isSelector;
    this.isSelector = this._detectIfSelector(targetName, target);

    // Handle wave type changes based on target type
    this._handleWaveTypeChange(wasSelector);

    // If it's a selector, get the available options
    if (this.isSelector) {
      this.selectorOptions = this._getSelectorOptions(targetName, target);
      // Update min and max based on number of options
      this.min = 0;
      this.max = this.selectorOptions.length - 1;
      // Initialize current index to min
      this.currentIndex = Math.floor(this.min);
      this.direction = 1; // Default to forward direction
    }
    // Only update min and max if we're NOT loading from preset and it's not a selector
    else if (!this._loadingFromPreset) {
      // Update min and max to match target's range with NaN protection
      this.min = !isNaN(target.min) ? target.min : 0;
      this.max = !isNaN(target.max) ? target.max : 1;
    }
  }

  _handleWaveTypeChange(wasSelector) {
    // Target type has changed (from selector to continuous or vice versa)
    if (this.isSelector !== wasSelector) {
      if (this.isSelector) {
        // Switching from continuous to selector
        // Store the current wave type before switching
        this.previousWaveType = this.type;

        // Set a default selector wave type
        this.type = "forward";
      } else {
        // Switching from selector to continuous
        // Restore previous wave type if available, or use default
        if (this.previousWaveType && this.continuousWaveTypes.includes(this.previousWaveType)) {
          this.type = this.previousWaveType;
        } else {
          this.type = "sine"; // Default
        }
      }
    }
  }

  _detectIfSelector(targetName, controller) {
    // Check specific target names known to be selectors
    if (targetName === "Boundary" || targetName === "Mode" || targetName === "T-PatternStyle") {
      return true;
    }

    // Check if controller has options property or is a select type
    if (controller.options !== undefined ||
      (controller.__select !== undefined)) {
      return true;
    }

    return false;
  }


  _getSelectorOptions(targetName, controller) {
    if (targetName === "Boundary") {
      return ["BOUNCE", "WARP"];
    }

    if (targetName === "Mode") {
      return [
        "--- NOISE ---",
        "Proximity",
        "ProximityB",
        "Density",
        "Velocity",
        "Pressure",
        "Vorticity",
        "Collision",
        "Overlap"
      ];
    }

    if (targetName === "T-PatternStyle") {
      return [
        "checkerboard",
        "waves",
        "spiral",
        "grid",
        "circles",
        "diamonds",
        "ripples",
        "dots",
        "voronoi",
        "cells",
        "fractal",
        "vortex",
        "bubbles",
        "water",
        "classicdrop"
      ];
    }
    // Attempt to get options from controller properties
    if (controller.options) {
      // If options is an object like {key1: value1, key2: value2}
      if (typeof controller.options === 'object' && !Array.isArray(controller.options)) {
        return Object.keys(controller.options);
      }
      // If options is already an array
      else if (Array.isArray(controller.options)) {
        return controller.options;
      }
    }

    // Look for options in select element
    if (controller.__select) {
      const options = [];
      for (let i = 0; i < controller.__select.options.length; i++) {
        options.push(controller.__select.options[i].textContent);
      }
      if (options.length > 0) {
        return options;
      }
    }

    // Fallback: create numeric options from min to max if available
    if (controller.min !== undefined && controller.max !== undefined) {
      const options = [];
      for (let i = controller.min; i <= controller.max; i++) {
        options.push(i.toString());
      }
      return options;
    }

    // Empty fallback
    return [];
  }

  resetToOriginal() {
    if (this.targetController && this.originalValue !== null) {
      try {
        this.targetController.setValue(this.originalValue);
        if (this.targetController.updateDisplay) {
          this.targetController.updateDisplay();
        }
      } catch (e) { console.warn("Could not reset target to original value:", e); }
    }
  }

  update(deltaTime, globalTime) {
    // Check if we're transitioning from disabled to enabled
    if (this.enabled && !this._wasEnabled) {
      this.reinitialize();
    }

    // Update previous state tracking
    this._wasEnabled = this.enabled;

    if (!this.enabled || !this.targetController) return;

    try {
      // Check if sync is enabled and update frequency
      if (
        this.sync &&
        this.manager &&
        typeof this.manager.masterFrequency === "number"
      ) {
        this.frequency = this.manager.masterFrequency;
      }

      // Get beat division multiplier (e.g., 1 for whole notes, 2 for half notes, 4 for quarter notes)
      const divisionMultiplier = this.getBeatDivisionValue();

      // Calculate the effective frequency based on the beat division
      const effectiveFrequency = this.frequency * divisionMultiplier;

      // Calculate range for value mapping
      const actualRange = Math.abs(this.max - this.min);

      // Get current time from global time or internal time
      const currentTime = globalTime || this.time;

      // Calculate phase directly from effective frequency and time
      // This ensures exact beat timing with division multipliers
      const oscillationPhase = (currentTime * effectiveFrequency + this.phase) % 1.0;
      this.currentPhase = oscillationPhase * Math.PI * 2; // Store in radians for compatibility

      // Get the waveform type
      const waveType = this.type || this.waveform || "sine";

      // For beat-synced modes, detect beat boundaries
      // A beat occurs when oscillationPhase crosses from high to low values
      const isBeatBoundary = oscillationPhase < 0.05 &&
        (currentTime - this._lastBeatTime) >= (0.9 / effectiveFrequency);

      if (isBeatBoundary) {
        this._lastBeatTime = currentTime;

        // For random wave type, generate a new random value on each beat
        if (waveType === "random") {
          this._randomValue = Math.random();
        }

        // For increment wave type, step the value on each beat
        if (waveType === "increment") {
          // Calculate step size based on range and desired steps
          const stepCount = this.isSelector ?
            (this.selectorOptions.length - 1) :
            Math.max(10, Math.round(actualRange * 10)); // At least 10 steps

          const stepSize = 1 / stepCount;

          // Update the current position
          this._incrementValue += stepSize * this._incrementDirection;

          // Handle boundary conditions (wrap or bounce)
          if (this._incrementValue >= 1.0) {
            // Reached top, change direction
            this._incrementValue = 1.0;
            this._incrementDirection = -1;
          } else if (this._incrementValue <= 0.0) {
            // Reached bottom, change direction
            this._incrementValue = 0.0;
            this._incrementDirection = 1;
          }
        }
      }

      // Special handling for selector/dropdown type targets
      if (this.isSelector && this.selectorOptions.length > 0) {
        // Get indices from min/max values
        const minIndex = Math.floor(this.min);
        const maxIndex = Math.floor(this.max);

        if (minIndex === maxIndex) {
          // Just use the single allowed value
          const optionValue = this.selectorOptions[minIndex];
          this.targetController.setValue(optionValue);
        } else {
          // Simple timing based on frequency
          const tickInterval = 1.0 / effectiveFrequency;
          if (currentTime - this._lastBeatTime >= tickInterval) {
            this._lastBeatTime = currentTime;

            // Update index based on wave type
            if (waveType === "forward") {
              // Forward: increment index, wrap from max to min
              this.currentIndex++;
              if (this.currentIndex > maxIndex) {
                this.currentIndex = minIndex;
              }
            }
            else if (waveType === "backward") {
              // Backward: decrement index, wrap from min to max
              this.currentIndex--;
              if (this.currentIndex < minIndex) {
                this.currentIndex = maxIndex;
              }
            }
            else if (waveType === "loop") {
              // Loop/Bounce: increment or decrement based on direction, reverse at boundaries
              this.currentIndex += this.direction;

              // Check boundaries and reverse direction if needed
              if (this.currentIndex > maxIndex) {
                this.currentIndex = maxIndex - 1; // Go back one step
                this.direction = -1; // Reverse direction
              } else if (this.currentIndex < minIndex) {
                this.currentIndex = minIndex + 1; // Go forward one step
                this.direction = 1; // Reverse direction
              }
            }
            else {
              // Default behavior (same as forward)
              this.currentIndex++;
              if (this.currentIndex > maxIndex) {
                this.currentIndex = minIndex;
              }
            }

            // Apply the current pattern
            const optionValue = this.selectorOptions[this.currentIndex];
            this.targetController.setValue(optionValue);
          }
        }
      } else {
        // Calculate a normalized oscillation value (0-1)
        let normalizedValue;
        switch (waveType) {
          case "sine":
            normalizedValue = (Math.sin(oscillationPhase * Math.PI * 2) + 1) / 2;
            break;
          case "square":
            normalizedValue = oscillationPhase < 0.5 ? 1 : 0;
            break;
          case "triangle":
            normalizedValue = oscillationPhase < 0.5
              ? oscillationPhase * 2
              : 2 - (oscillationPhase * 2);
            break;
          case "sawtooth":
            normalizedValue = oscillationPhase;
            break;
          case "pulse":
            // Inversed sawtooth with sharp decay then smooth ease out
            normalizedValue = oscillationPhase < 0.2 ? 1.0 - oscillationPhase * 5 : 0;
            break;
          case "random":
            // Use the current random value
            normalizedValue = this._randomValue;
            break;
          case "increment":
            // Use the current increment value
            normalizedValue = this._incrementValue;
            break;
          default:
            normalizedValue = (Math.sin(oscillationPhase * Math.PI * 2) + 1) / 2;
        }

        // Safety check for NaN
        if (isNaN(normalizedValue)) {
          console.warn(`Wave calculation produced NaN for ${this.targetName}. Using default value.`);
          normalizedValue = 0.5;
        }

        // For numeric values, directly map to the target range
        const targetValue = this.min + normalizedValue * (this.max - this.min);

        // Special case handling for T-PatternStyle which needs string values
        if (this.targetName === "T-PatternStyle") {
          // If this is a pattern style target but we're not using selector modes,
          // we need to convert the numeric value to a valid pattern style string
          const turbulenceField = this.manager.main?.turbulenceField;
          if (turbulenceField && turbulenceField.patternOffsets) {
            const patternKeys = Object.keys(turbulenceField.patternOffsets);
            if (patternKeys.length > 0) {
              // Calculate index from targetValue, ensuring it's within bounds
              const index = Math.floor(Math.abs(targetValue)) % patternKeys.length;
              // Set the pattern style to a valid string value
              this.targetController.setValue(patternKeys[index]);
              return; // Skip the normal setValue below
            }
          }
        }

        this.targetController.setValue(targetValue);
      }
    } catch (e) {
      console.error(`Error in pulse modulator update for ${this.targetName}:`, e);
    }

    // Always increment time regardless of errors
    this.time += deltaTime;
  }

  calculateModulation(time, frequency = null) {
    // If no frequency provided, use the appropriate one based on sync setting
    if (frequency === null) {
      frequency = this.sync ? this.manager.masterFrequency : this.frequency;
    }

    // Apply beat division
    const divisionMultiplier = this.getBeatDivisionValue();
    const effectiveFrequency = frequency * divisionMultiplier;

    const t = time * effectiveFrequency * Math.PI * 2 + this.phase;

    let value = 0;
    switch (this.type) {
      case "sine":
        value = Math.sin(t) * 0.5 + 0.5; // Map to 0-1
        break;
      case "square":
        value = Math.sin(t) >= 0 ? 1 : 0;
        break;
      case "triangle":
        value = Math.abs(((t / Math.PI) % 2) - 1); // Map to 0-1
        break;
      case "sawtooth":
        value = ((t / Math.PI) % 2) / 2 + 0.5; // Map to 0-1
        break;
      case "pulse":
        // Inversed sawtooth with sharp decay then smooth ease out
        const pos = ((t / Math.PI) % 2) / 2; // 0-1 position in cycle
        // Sharp decay for first 20% of cycle, then smooth ease out
        value = pos < 0.2 ? 1.0 - pos * 5 : 0; // Sharp decay from 1 to 0 in first 20%
        break;
      case "random":
        // In calculation mode, use a pseudo-random value based on time
        const randomPhase = Math.floor(t / Math.PI);
        value = ((Math.sin(randomPhase * 12345.6789) + 1) / 2); // Pseudo-random 0-1
        break;
      case "increment":
        // In calculation mode, use a gradual increment based on time
        const cyclePos = (t % (Math.PI * 2)) / (Math.PI * 2); // Position in cycle (0-1)
        value = cyclePos; // Simple ramp
        break;
      case "sustainedPulse":
        // Calculate position in the cycle (0 to 1)
        const position = (t % (Math.PI * 2)) / (Math.PI * 2);

        if (position < 0.5) {
          // First half of cycle: maintain at max value (1.0)
          value = 1.0;
        } else {
          // Second half of cycle: linear ramp from max (1.0) to min (0.0)
          value = 1.0 - (position - 0.5) * 2; // Maps position 0.5->1.0 to value 1.0->0.0
        }
        break;
      default:
        value = Math.sin(t) * 0.5 + 0.5;
    }

    return value; // Return 0-1 value
  }

  calculateModulationWithGlobalTime(globalTime) {
    // Apply beat division
    const divisionMultiplier = this.getBeatDivisionValue();
    const effectiveFrequency = this.frequency * divisionMultiplier;

    const phase = globalTime * effectiveFrequency * Math.PI * 2 + this.phase;

    // Select waveform calculation
    switch (this.type) {
      case "sine":
        return (Math.sin(phase) + 1) / 2; // 0 to 1
      case "square":
        return phase % (Math.PI * 2) < Math.PI ? 1 : 0;
      case "triangle":
        const t = (phase % (Math.PI * 2)) / (Math.PI * 2);
        return t < 0.5 ? t * 2 : 2 - t * 2;
      case "sawtooth":
        return (phase % (Math.PI * 2)) / (Math.PI * 2);
      case "pulse":
        // Inversed sawtooth with sharp decay then smooth ease out
        const pos = (phase % (Math.PI * 2)) / (Math.PI * 2); // 0-1 position in cycle
        return pos < 0.2 ? 1.0 - pos * 5 : 0; // Sharp decay in first 20% of cycle
      case "random":
        // In global time calculation, use a pseudo-random value based on phase
        const randomPhase = Math.floor(phase / Math.PI);
        return ((Math.sin(randomPhase * 12345.6789) + 1) / 2); // Pseudo-random 0-1
      case "increment":
        // In global time calculation, use a gradual increment based on phase
        const cyclePos = (phase % (Math.PI * 2)) / (Math.PI * 2); // Position in cycle (0-1)
        return cyclePos; // Simple ramp
      default:
        return (Math.sin(phase) + 1) / 2; // Default to sine
    }
  }


  disable() {
    this.enabled = false;
    this.resetToOriginal(); // Reset to original value when disabled
  }

  resetOnBeat() {
    if (this.type === "random") {
      // Generate a new random value
      this._randomValue = Math.random();
    }
    else if (this.type === "increment") {
      // Step increment value
      const actualRange = Math.abs(this.max - this.min);
      const stepCount = this.isSelector ?
        (this.selectorOptions?.length - 1 || 10) :
        Math.max(10, Math.round(actualRange * 10));

      const stepSize = 1 / stepCount;

      // Update the current position
      this._incrementValue += stepSize * this._incrementDirection;

      // Handle boundary conditions (wrap or bounce)
      if (this._incrementValue >= 1.0) {
        this._incrementValue = 1.0;
        this._incrementDirection = -1;
      } else if (this._incrementValue <= 0.0) {
        this._incrementValue = 0.0;
        this._incrementDirection = 1;
      }
    }
  }
}
