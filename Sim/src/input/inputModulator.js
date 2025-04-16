export class InputModulator {
  constructor(manager, debugFlags) {
    this.debug = debugFlags;
    this.manager = manager;
    this.enabled = true;
    this.inputSource = "mic";
    this.frequencyBand = "None";
    this.sensitivity = 1.0;
    this.attack = 0.3;
    this.release = 0.7;
    this.threshold = 0;
    this.min = 0;
    this.max = 1;
    this.targetName = null;
    this.target = null;
    this.targetController = null;
    this.originalValue = 0;
    this.currentInputValue = 0;
    this.lastOutputValue = 0;

    // Replace min/max with center frequency and width
    this.customFreq = 1000; // Center frequency (Hz)
    this.customWidth = 100;  // Width of band (Hz)
  }

  getDisplayName(index = 1) {
    // Format: "Audio Modulator 1 | TARGET'S NAME"
    if (this.targetName) {
      return `Audio Modulator ${index} | "${this.targetName}"`;
    }
    return `Audio Modulator ${index} | No Target`;
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
      this.targetController = target;

      // Get current value and store as original
      this.originalValue = target.getValue();

      // Update min and max to match target's range (autorange)
      this.min = target.min;
      this.max = target.max;

      if (this.debug.inputMod) console.log(`Set target ${targetName} with range: ${target.min} - ${target.max}`);
    } catch (e) {
      console.warn("Could not store original value:", e);
      // Set default value as fallback
      this.originalValue = 0;
    }
  }

  resetToOriginal() {
    if (this.targetController && this.originalValue !== null) {
      try {
        if (this.debug.inputMod) console.log(`Resetting target ${this.targetName} to original value ${this.originalValue}`);
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

      // Debug log for high values
      if (processedValue > 0.1) {
        if (this.debug.inputMod) console.log(`Input modulator ${this.targetName || "unnamed"}: processed value = ${processedValue.toFixed(2)}`);
      }
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

    // Apply attack/release depending on signal direction
    if (this.lastOutputValue !== undefined) {
      if (value > this.lastOutputValue) {
        // Signal is increasing - use attack (lower value = faster attack)
        value = this.lastOutputValue * this.attack + value * (1 - this.attack);
      } else {
        // Signal is decreasing - use release (higher value = longer sustain)
        value = this.lastOutputValue * this.release + value * (1 - this.release);
      }
    }
    return value;
  }


  update(deltaTime) {
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

          // Log significant changes
          if (normalizedValue > 0.2) {
            if (this.debug.inputMod) console.log(`Setting ${this.targetName} to ${mappedValue.toFixed(2)} (from ${normalizedValue.toFixed(2)})`);
          }
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
    this.resetToOriginal();
  }
}
