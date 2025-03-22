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
    this.sync = true; // Add sync property
    this.phase = 0;
    this.min = 0;
    this.max = 1;
    this.time = 0;
    this.targetController = null;
    this.originalValue = null; // Store original value to restore when disabled
    this.currentPhase = 0; // Add currentPhase property
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

    // Only update min and max if we're NOT loading from preset
    // This allows preset values to override the default target ranges
    if (!this._loadingFromPreset) {
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

      // Calculate phase based on correct time
      const currentTime = globalTime || this.time;
      const totalPhase =
        currentTime * this.frequency * Math.PI * 2 + (this.phase || 0);
      this.currentPhase = totalPhase % (Math.PI * 2);

      // Get the waveform type correctly - handle both 'type' and 'waveform' properties for compatibility
      const waveType = this.type || this.waveform || "sine";

      // Calculate the wave value based on type
      let value;
      switch (waveType) {
        case "sine":
          value = (Math.sin(totalPhase) + 1) / 2; // 0 to 1
          break;
        case "square":
          value = totalPhase % (Math.PI * 2) < Math.PI ? 1 : 0;
          break;
        case "triangle":
          const t = (totalPhase % (Math.PI * 2)) / (Math.PI * 2);
          value = t < 0.5 ? t * 2 : 2 - t * 2;
          break;
        case "sawtooth":
          value = (totalPhase % (Math.PI * 2)) / (Math.PI * 2);
          break;
        default:
          value = (Math.sin(totalPhase) + 1) / 2; // Default to sine
      }

      // Safety check for NaN before mapping
      if (isNaN(value)) {
        console.log(
          `Wave calculation produced NaN for ${this.targetName}. Using default value.`
        );
        value = 0.5; // Use middle value as fallback
      }

      // Map to target range
      const mappedValue = this.min + value * (this.max - this.min);

      // Apply to target
      this.targetController.setValue(mappedValue);
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
