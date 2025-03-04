/**
 * An input modulator that can modify a parameter based on input signals
 * such as microphone audio, EMU sensors, or external inputs
 */
export class InputModulator {
  constructor(manager) {
    this.manager = manager;
    this.enabled = false;
    this.targetName = "";
    this.targetController = null;
    this.originalValue = null; // Store original value to restore when disabled

    // Modulation range
    this.min = 0;
    this.max = 1;
    this.sensitivity = 1.0;

    // Input source configuration
    this.inputSource = "mic"; // "mic", "emu", "external"
    this.frequencyBand = "none"; // For mic: "none", "sub", "bass", etc.

    // Processing settings
    this.smoothing = 0.8;
    this.currentInputValue = 0;
    this.lastOutputValue = 0;
  }

  /**
   * Set the target to modulate
   * @param {string} targetName - Name of the target to modulate
   */
  setTarget(targetName) {
    // If changing targets, reset the previous one
    if (this.targetController && this.enabled) {
      this.resetToOriginal();
    }

    this.targetName = targetName;
    this.targetController = this.manager.targets[targetName];

    // Store the original value when first targeting
    if (this.targetController) {
      try {
        this.originalValue = this.targetController.getValue();
        console.log(
          `Stored original value ${this.originalValue} for ${targetName}`
        );
      } catch (e) {
        console.warn("Could not store original value:", e);
        this.originalValue = null;
      }
    }

    // Set min/max from target range if available
    const targetInfo = this.manager.getTargetInfo(targetName);
    if (
      targetInfo &&
      targetInfo.min !== undefined &&
      targetInfo.max !== undefined
    ) {
      this.min = targetInfo.min;
      this.max = targetInfo.max;
    }

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
   * Set the input source
   * @param {string} source - "mic", "emu", or "external"
   */
  setInputSource(source) {
    if (["mic", "emu", "external"].includes(source)) {
      this.inputSource = source;
    }
  }

  /**
   * Set the frequency band for mic input
   * @param {string} band - "none", "sub", "bass", "lowMid", etc.
   */
  setFrequencyBand(band) {
    this.frequencyBand = band;
  }

  /**
   * Set the current raw input value
   * @param {number} value - Raw input value (0-1)
   */
  setInputValue(value) {
    this.currentInputValue = Math.max(0, Math.min(1, value));
  }

  /**
   * Process the current input value with smoothing and sensitivity
   * @returns {number} Processed value (0-1)
   */
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

  /**
   * Update the modulator
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.targetController || !this.enabled) return;

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

  /**
   * Disable modulation and clean up
   */
  disable() {
    this.enabled = false;
    this.resetToOriginal(); // Reset to original value when disabled
  }
}
