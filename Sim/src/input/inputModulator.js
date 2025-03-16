export class InputModulator {
  // Update the constructor to not set any default target
  constructor(manager) {
    this.manager = manager;
    this.enabled = false; // Start disabled
    this.inputSource = "mic";
    this.frequencyBand = "none";
    this.sensitivity = 1.0;
    this.smoothing = 0.7;
    this.threshold = 0; // Add threshold property (0 = disabled)
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

      // console.log(
      //   `Set target ${targetName} with range: ${target.min} - ${target.max}`
      // );
    } catch (e) {
      console.warn("Could not store original value:", e);
      // Set default value as fallback
      this.originalValue = 0;
    }
  }

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

  setInputSource(source) {
    if (["mic", "emu", "external"].includes(source)) {
      this.inputSource = source;
    }
  }

  setFrequencyBand(band) {
    this.frequencyBand = band;
  }

  // Fix the setInputValue method to store and process the input
  setInputValue(value) {
    // Store the raw input value
    this.currentInputValue = value;

    // For immediate feedback, we can also process it right away
    // Important to do this so the value is available for visualization immediately
    if (this.enabled && this.sensitivity > 0) {
      // Process the input value and update lastOutputValue
      const processedValue = this.processInput();
      this.lastOutputValue = processedValue;

      // // Debug log for high values
      // if (processedValue > 0.1) {
      //   console.log(
      //     `Input modulator ${
      //       this.targetName || "unnamed"
      //     }: processed value = ${processedValue.toFixed(2)}`
      //   );
      // }
    }
  }

  // Update processInput to apply threshold logic
  processInput() {
    // Make sure we have a valid input value
    if (
      this.currentInputValue === undefined ||
      this.currentInputValue === null
    ) {
      return 0;
    }

    // Apply sensitivity
    let value = Math.min(
      1,
      Math.max(0, this.currentInputValue * this.sensitivity)
    );

    // Apply threshold logic
    if (this.threshold > 0) {
      if (value < this.threshold) {
        value = 0; // Below threshold, no effect (will map to minimum)
      } else {
        // Rescale the value so threshold->1 maps to 0->1
        value = (value - this.threshold) / (1 - this.threshold);
      }
    }

    // Apply smoothing between this and the last value
    if (this.smoothing > 0 && this.lastOutputValue !== undefined) {
      value =
        this.lastOutputValue * this.smoothing + value * (1 - this.smoothing);
    }

    // Return the processed value
    return value;
  }

  // Fix the update method to use the processed input
  update(deltaTime) {
    // Skip if disabled
    if (!this.enabled || this.sensitivity === 0) {
      return;
    }

    try {
      // The output value has already been processed in setInputValue
      const normalizedValue = this.lastOutputValue || 0;

      // Only update target if we have one
      if (this.targetController && this.targetName) {
        // Map from 0-1 to min-max
        const mappedValue = this.min + normalizedValue * (this.max - this.min);

        // Apply to target (only if non-zero or we've never applied a value)
        if (normalizedValue > 0 || this._lastAppliedValue === undefined) {
          this.targetController.setValue(mappedValue);
          this._lastAppliedValue = mappedValue;

          // // Log significant changes
          // if (normalizedValue > 0.2) {
          //   console.log(
          //     `Setting ${this.targetName} to ${mappedValue.toFixed(
          //       2
          //     )} (from ${normalizedValue.toFixed(2)})`
          //   );
          // }
        }
      }
    } catch (e) {
      console.error(
        `Error updating input modulator for ${this.targetName || "unnamed"}:`,
        e
      );
    }
  }

  disable() {
    this.enabled = false;
    this.resetToOriginal(); // Reset to original value when disabled
  }
}
