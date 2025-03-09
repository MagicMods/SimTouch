export class InputModulator {
  // Update the constructor to not set any default target
  constructor(manager) {
    this.manager = manager;
    this.enabled = false; // Start disabled
    this.inputSource = "mic";
    this.frequencyBand = "none";
    this.sensitivity = 1.0;
    this.smoothing = 0.7;
    this.min = 0;
    this.max = 1;
    this.targetName = null; // Start with no target
    this.target = null; // No target object
    this.targetController = null; // No target controller
    this.originalValue = 0;
    this.currentInputValue = 0;
    this.lastOutputValue = 0;
  }

  setTarget(targetName) {
    const target = this.manager.targets[targetName];
    if (!target) {
      console.warn(`Target "${targetName}" not found`);
      return;
    }

    try {
      // Store target info
      this.targetName = targetName;
      this.target = target;

      // CRITICAL FIX: Set the targetController property which is used in update()
      this.targetController = target; // This line was missing!

      // Get current value and store as original
      this.originalValue = target.getValue();

      // Update min and max to match target's range (autorange)
      this.min = target.min;
      this.max = target.max;

      console.log(
        `Set target ${targetName} with range: ${target.min} - ${target.max}`
      );
    } catch (e) {
      console.warn("Could not store original value:", e);
      // Set default value as fallback
      this.originalValue = 0;
    }
  }

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

  setInputSource(source) {
    if (["mic", "emu", "external"].includes(source)) {
      this.inputSource = source;
    }
  }

  setFrequencyBand(band) {
    this.frequencyBand = band;
  }

  setInputValue(value) {
    this.currentInputValue = Math.max(0, Math.min(1, value));
  }

  processInput() {
    // Apply sensitivity to make the response more or less dramatic
    let value = Math.min(1, this.currentInputValue * this.sensitivity);

    // Apply smoothing between this and the last value
    if (this.smoothing > 0) {
      value =
        this.lastOutputValue * this.smoothing + value * (1 - this.smoothing);
    }

    // Store for next frame
    this.lastOutputValue = value;

    return value;
  }

  update(deltaTime) {
    // Skip if no target, not enabled, or sensitivity is zero
    if (
      !this.targetController ||
      !this.target ||
      !this.targetName ||
      !this.enabled ||
      this.sensitivity === 0
    ) {
      return;
    }

    try {
      // Get the processed input value (0-1)
      const normalizedValue = this.processInput();

      // Map from 0-1 to min-max
      const mappedValue = this.min + normalizedValue * (this.max - this.min);

      // Apply to target
      this.targetController.setValue(mappedValue);

      // Update display if available
      if (this.targetController.updateDisplay) {
        this.targetController.updateDisplay();
      }
    } catch (e) {
      console.error(
        `Error updating input modulator for ${this.targetName}:`,
        e
      );
      this.enabled = false; // Disable on error
    }
  }

  disable() {
    this.enabled = false;
    this.resetToOriginal(); // Reset to original value when disabled
  }
}
