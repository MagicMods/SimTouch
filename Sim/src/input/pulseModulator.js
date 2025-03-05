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

    // Update min and max to match target's range with NaN protection
    this.min = !isNaN(target.min) ? target.min : 0;
    this.max = !isNaN(target.max) ? target.max : 1;

    console.log(
      `Set target ${targetName} with range: ${this.min} - ${this.max}`
    );
  }

  /**
   * Reset target to its original value
   */
  resetToOriginal() {
    if (this.targetController && this.originalValue !== null) {
      try {
        console.log(
          `Resetting target ${this.targetName} to original value ${this.originalValue}`
        );
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
   */
  update(deltaTime) {
    if (!this.enabled || !this.targetController) return;

    // Check if sync is enabled and update frequency
    if (
      this.sync &&
      this.manager &&
      typeof this.manager.masterFrequency === "number"
    ) {
      this.frequency = this.manager.masterFrequency;
    }

    // Increment phase based on frequency
    this.currentPhase += deltaTime * this.frequency * Math.PI * 2;

    // Keep phase in sensible range
    while (this.currentPhase > Math.PI * 2) {
      this.currentPhase -= Math.PI * 2;
    }

    // Get oscillation value (-1 to 1) based on wave type
    let value = 0;

    switch (this.waveType) {
      case "sine":
        value = Math.sin(this.currentPhase);
        break;
      case "triangle":
        value =
          1 -
          4 *
            Math.abs(
              Math.floor(this.currentPhase / Math.PI + 0.5) -
                this.currentPhase / Math.PI
            );
        break;
      case "square":
        value = this.currentPhase < Math.PI * 2 * this.pwm ? 1 : -1;
        break;
      default:
        value = Math.sin(this.currentPhase); // Default to sine
    }

    // Map from -1/1 to min/max
    // FIX: Add validation to prevent NaN values
    const range = isNaN(this.max - this.min) ? 1 : this.max - this.min;
    const baseValue = isNaN(this.min) ? 0 : this.min;
    let mappedValue = baseValue + (value * 0.5 + 0.5) * range;

    // Protection against NaN
    if (isNaN(mappedValue)) {
      console.warn(
        `Mapped value is NaN for ${this.targetName}, using defaults`
      );
      mappedValue = baseValue || 0;
    }

    // Apply to target
    if (
      this.targetController &&
      typeof this.targetController.setValue === "function"
    ) {
      this.targetController.setValue(mappedValue);
    }
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
   * Disable modulation and clean up
   */
  disable() {
    this.enabled = false;
    this.resetToOriginal(); // Reset to original value when disabled
  }
}
export { PulseModulator };
