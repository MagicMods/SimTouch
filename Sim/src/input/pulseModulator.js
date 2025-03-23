/**
 * A pulse modulator that can modify a parameter over time
 */
class PulseModulator {
  constructor(manager) {
    this.manager = manager;
    this.enabled = false;
    this.targetName = "";
    this.type = "sine";
    this.frequency = 1.0;
    this.frequencyBpm = 60.0; // Add BPM representation of frequency
    this.sync = true; // Add sync property
    this.phase = 0;
    this.min = 0;
    this.max = 1;
    this.time = 0;
    this.targetController = null;
    this.originalValue = null; // Store original value to restore when disabled
    this.currentPhase = 0; // Add currentPhase property
    this.isSelector = false; // Flag to indicate if target is a selector/dropdown
    this.selectorOptions = []; // Array to store available options for selectors
  }

  /**
   * Get a display name for this modulator that includes the target name
   * @param {number} index - Index of this modulator (defaults to 1)
   * @returns {string} Formatted display name
   */
  getDisplayName(index = 1) {
    // Format: "Modulator 1 | TARGET'S NAME"
    if (this.targetName) {
      return `Modulator ${index} | "${this.targetName}"`;
    }
    return `Modulator ${index} | No Target`;
  }

  /**
   * Set the target to modulate
   * @param {string} targetName - Name of the target to modulate
   */
  setTarget(targetName) {
    const target = this.manager.targets[targetName];
    if (!target) {
      console.warn(`Target "${targetName}" not found`);
      return;
    }

    // Store target info
    this.targetName = targetName;
    this.target = target;
    this.targetController = target;

    // Get current value and store as original
    try {
      this.originalValue = target.getValue();
    } catch (e) {
      console.warn("Could not get target value:", e);
      this.originalValue = 0;
    }

    // Check if target is a selector/dropdown (like Boundary or Mode)
    this.isSelector = this._detectIfSelector(targetName, target);

    // If it's a selector, get the available options
    if (this.isSelector) {
      this.selectorOptions = this._getSelectorOptions(targetName, target);
      // Update min and max based on number of options
      this.min = 0;
      this.max = this.selectorOptions.length - 1;
      console.log(`Target ${targetName} detected as selector with ${this.selectorOptions.length} options:`, this.selectorOptions);
    }
    // Only update min and max if we're NOT loading from preset and it's not a selector
    else if (!this._loadingFromPreset) {
      // Update min and max to match target's range with NaN protection
      this.min = !isNaN(target.min) ? target.min : 0;
      this.max = !isNaN(target.max) ? target.max : 1;

      // console.log(
      //   `Set target ${targetName} with range: ${this.min} - ${this.max}`
      // );
    } else {
      console.log(
        `Set target ${targetName} keeping preset range: ${this.min} - ${this.max}`
      );
    }
  }

  /**
   * Detect if a target is a selector/dropdown type
   * @param {string} targetName - Name of the target
   * @param {object} controller - The controller object
   * @returns {boolean} True if target is a selector
   */
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

  /**
   * Get available options for a selector target
   * @param {string} targetName - Name of the target
   * @param {object} controller - The controller object
   * @returns {Array} Array of available options
   */
  _getSelectorOptions(targetName, controller) {
    // Special case for known targets
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

    // Try to get options from controller
    if (controller.options) {
      return Object.values(controller.options);
    }

    if (controller.__select) {
      return Array.from(controller.__select.options).map(opt => opt.value);
    }

    // Default fallback
    return ["Option 1", "Option 2"];
  }

  /**
   * Reset target to its original value
   */
  resetToOriginal() {
    if (this.targetController && this.originalValue !== null) {
      try {
        // console.log(
        //   `Resetting target ${this.targetName} to original value ${this.originalValue}`
        // );
        this.targetController.setValue(this.originalValue);
        if (this.targetController.updateDisplay) {
          this.targetController.updateDisplay();
        }
      } catch (e) {
        console.warn("Could not reset target to original value:", e);
      }
    }
  }

  /**
   * Update the modulator
   * @param {number} deltaTime - Time since last update in seconds
   * @param {number} globalTime - Global time in seconds
   */
  update(deltaTime, globalTime) {
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

      // =====================================================================
      // NEW APPROACH: Fixed amplitude oscillation with variable center point
      // =====================================================================

      // Calculate range midpoint and size
      const actualRange = Math.abs(this.max - this.min);
      const midpoint = (this.min + this.max) / 2;

      // Define our standard oscillation rate in units per second
      // This is the key to fixing the proportionality issue
      const UNITS_PER_SECOND = 2.0; // Standard rate for all oscillations
      let adjustedRate = UNITS_PER_SECOND;

      // Get the original base frequency
      const baseFrequency = this.frequency;

      // For selectors, use a much slower rate of change
      if (this.isSelector && this.selectorOptions.length > 0) {
        // Calculate available options within the range
        const minIndex = Math.max(0, Math.min(this.selectorOptions.length - 1, Math.floor(this.min)));
        const maxIndex = Math.max(0, Math.min(this.selectorOptions.length - 1, Math.floor(this.max)));
        const numChoices = maxIndex - minIndex + 1;

        if (numChoices <= 1) {
          // Special case: single option - just stay at that option
          adjustedRate = 0;
        } else {
          // Use a fixed rate for selectors (options per second)
          adjustedRate = 0.5; // Half an option per second
        }
      } else {
        // For numeric values, adjust rate based on range size
        if (actualRange < 0.1) {
          // Very small ranges
          adjustedRate = 0.05; // 0.05 units per second
        } else if (actualRange < 0.5) {
          // Small ranges
          adjustedRate = 0.1; // 0.1 units per second
        } else if (actualRange < 1.0) {
          // Medium-small ranges
          adjustedRate = 0.25; // 0.25 units per second
        } else if (actualRange < 2.0) {
          // Medium ranges
          adjustedRate = 0.5; // 0.5 units per second
        } else if (actualRange < 5.0) {
          // Larger medium ranges
          adjustedRate = 1.0; // 1.0 units per second
        } else {
          // Large ranges (≥5.0)
          adjustedRate = 2.0; // 2.0 units per second
        }
      }

      // Apply master frequency scaling but maintain our fixed rate relationship
      adjustedRate *= (baseFrequency / 1.0); // Scale by master frequency ratio

      // Apply target-specific scaling
      if (this.targetName === "Mode") {
        adjustedRate *= 0.5; // Slower for Mode selector
      } else if (this.targetName === "T-PatternStyle") {
        adjustedRate *= 0.25; // Much slower for pattern styles
      }

      // Store for debugging
      this._rateUnitsPerSecond = adjustedRate;

      // Calculate how much the value would change in this timestep
      const currentTime = globalTime || this.time;

      // Calculate a normalized phase (0-1) based on time and adjusted rate
      const oscillationPhase = (currentTime * adjustedRate + this.phase) % 1.0;
      this.currentPhase = oscillationPhase * Math.PI * 2; // Store in radians for compatibility

      // Get the waveform type
      const waveType = this.type || this.waveform || "sine";

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
        default:
          normalizedValue = (Math.sin(oscillationPhase * Math.PI * 2) + 1) / 2;
      }

      // Safety check for NaN
      if (isNaN(normalizedValue)) {
        console.log(`Wave calculation produced NaN for ${this.targetName}. Using default value.`);
        normalizedValue = 0.5;
      }

      // IMPORTANT: This is the key change - we map to the target value range differently
      let targetValue;

      // Special handling for selector/dropdown type targets
      if (this.isSelector && this.selectorOptions.length > 0) {
        // For selectors, we need to map to a valid option index
        const minIndex = Math.max(0, Math.min(this.selectorOptions.length - 1, Math.floor(this.min)));
        const maxIndex = Math.max(0, Math.min(this.selectorOptions.length - 1, Math.floor(this.max)));

        if (minIndex === maxIndex) {
          // Just use the single allowed value
          const optionValue = this.selectorOptions[minIndex];
          this.targetController.setValue(optionValue);
        } else {
          // Map the normalized value to an index
          const indexRange = maxIndex - minIndex;
          const optionIndex = minIndex + Math.floor(normalizedValue * (indexRange + 1));
          const safeIndex = Math.min(maxIndex, Math.max(minIndex, optionIndex));

          // Get and apply the option value
          const optionValue = this.selectorOptions[safeIndex];
          this.targetController.setValue(optionValue);
        }
      } else {
        // For numeric values, directly map to the target range
        targetValue = this.min + normalizedValue * (this.max - this.min);
        this.targetController.setValue(targetValue);
      }
    } catch (e) {
      console.error(
        `Error in pulse modulator update for ${this.targetName}:`,
        e
      );
    }

    // Always increment time regardless of errors
    this.time += deltaTime;
  }

  /**
   * Calculate the modulation value based on time and settings
   * @param {number} time - Current time in seconds
   * @param {number} frequency - Frequency to use (could be master or local)
   * @returns {number} Modulation value 0-1
   */
  calculateModulation(time, frequency = null) {
    // If no frequency provided, use the appropriate one based on sync setting
    if (frequency === null) {
      frequency = this.sync ? this.manager.masterFrequency : this.frequency;
    }

    const t = time * frequency * Math.PI * 2 + this.phase;

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

  /**
   * Calculate the modulation value based on global time
   * @param {number} globalTime - Global time in seconds
   * @returns {number} Modulation value 0-1
   */
  calculateModulationWithGlobalTime(globalTime) {
    const phase = globalTime * this.frequency * Math.PI * 2 + this.phase;

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
      default:
        return (Math.sin(phase) + 1) / 2; // Default to sine
    }
  }

  /**
   * Disable modulation and clean up
   */
  disable() {
    this.enabled = false;
    this.resetToOriginal(); // Reset to original value when disabled
  }
}
export { PulseModulator };
