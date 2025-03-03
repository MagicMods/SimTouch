export class MicInputForces {
  constructor() {
    this.enabled = false;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.dataArray = null;
    this.animationFrameId = null;

    // Configuration
    this.sensitivity = 1.0;
    this.smoothing = 0.8;
    this.fftSize = 1024;

    // Audio data
    this.amplitude = 0;
    this.smoothedAmplitude = 0;
    this.targetControllers = new Map();
    this.baselineAmplitude = 0.05; // Silent threshold

    // Bind methods
    this.processAudioData = this.processAudioData.bind(this);
  }

  async enable() {
    if (this.enabled) return;

    try {
      // Create audio context and get microphone access
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Setup audio processing pipeline
      const source = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;

      // Connect source to analyser (not to destination to prevent feedback)
      source.connect(this.analyser);

      // Create data array for frequency analysis
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Start processing audio
      this.enabled = true;
      this.processAudioData();
      console.log("Microphone input enabled");
    } catch (error) {
      console.error("Error enabling microphone:", error);
      return false;
    }

    return true;
  }

  disable() {
    if (!this.enabled) return;

    this.enabled = false;

    // Stop animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Close microphone connection
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Reset data
    this.analyser = null;
    this.dataArray = null;
    this.amplitude = 0;
    this.smoothedAmplitude = 0;

    console.log("Microphone input disabled");
  }

  processAudioData() {
    if (!this.enabled || !this.analyser || !this.dataArray) {
      this.animationFrameId = null;
      return;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average amplitude (0-1)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }

    this.amplitude = sum / (this.dataArray.length * 255);

    // Apply smoothing for more stable values
    this.smoothedAmplitude =
      this.smoothedAmplitude * 0.8 + this.amplitude * 0.2;

    // Apply sensitivity and subtract baseline
    const processedAmplitude = Math.max(
      0,
      (this.smoothedAmplitude - this.baselineAmplitude) * this.sensitivity
    );

    // Update target controllers
    this.updateTargets(processedAmplitude);

    // Continue processing in the next frame
    this.animationFrameId = requestAnimationFrame(this.processAudioData);
  }

  updateTargets(amplitude) {
    if (!this.enabled) return;

    // If we have frequency data, do frequency-based processing
    const frequencyData = this.dataArray;

    this.targetControllers.forEach((config, controller) => {
      if (controller && typeof controller.setValue === "function") {
        let targetAmplitude = amplitude;

        // Apply frequency filtering if we have frequency data
        if (
          frequencyData &&
          config.frequency &&
          (config.frequency.min > 0 || config.frequency.max < 20000)
        ) {
          // Calculate frequency-specific amplitude
          let sum = 0;
          let count = 0;

          // Map frequency range to bin indices
          // Assuming standard 44.1kHz sample rate, fftSize bins map to frequency ranges
          const binCount = this.analyser.frequencyBinCount;
          const maxFreq = 22050; // Nyquist frequency (half sample rate)

          const minBin = Math.floor(
            (config.frequency.min / maxFreq) * binCount
          );
          const maxBin = Math.ceil((config.frequency.max / maxFreq) * binCount);

          // Sum amplitudes in the target frequency range
          for (let i = minBin; i < maxBin && i < binCount; i++) {
            sum += frequencyData[i];
            count++;
          }

          if (count > 0) {
            // Normalize to 0-1 range
            targetAmplitude = sum / (count * 255);

            // Apply baseline subtraction and sensitivity
            targetAmplitude = Math.max(
              0,
              (targetAmplitude - this.baselineAmplitude) *
                this.sensitivity *
                config.sensitivity
            );
          }
        } else {
          // Just apply global sensitivity and the modulator's sensitivity
          targetAmplitude = amplitude * config.sensitivity;
        }

        // Map amplitude (0-1) to target range
        const value = config.min + targetAmplitude * (config.max - config.min);
        controller.setValue(value);

        // Update display if available
        if (typeof controller.updateDisplay === "function") {
          controller.updateDisplay();
        }
      }
    });
  }

  addTarget(
    controller,
    min,
    max,
    folder = null,
    sensitivity = 1.0,
    frequency = null
  ) {
    if (controller && typeof controller.setValue === "function") {
      // Check if this controller is already a target, and if so, remove it first
      if (this.targetControllers.has(controller)) {
        this.removeTarget(controller);
      }

      // Add the new configuration
      this.targetControllers.set(controller, {
        min,
        max,
        folder,
        sensitivity: sensitivity || 1.0,
        frequency: frequency || { min: 0, max: 20000 },
      });

      console.log("Added mic target:", {
        min,
        max,
        sensitivity,
        folder: folder?._title,
      });
    }
    return this;
  }

  hasTarget(folder) {
    if (!folder) return false;

    for (const config of this.targetControllers.values()) {
      if (config.folder === folder) return true;
    }

    return false;
  }

  removeTargetByFolder(folder) {
    if (!folder) return this;

    for (const [controller, config] of this.targetControllers.entries()) {
      if (config.folder === folder) {
        this.targetControllers.delete(controller);
        break;
      }
    }

    return this;
  }

  updateTargetRange(controller, min, max) {
    if (this.targetControllers.has(controller)) {
      const config = this.targetControllers.get(controller);
      config.min = min;
      config.max = max;
    }
    return this;
  }

  updateTargetSensitivity(controller, sensitivity) {
    if (this.targetControllers.has(controller)) {
      const config = this.targetControllers.get(controller);
      config.sensitivity = sensitivity;
    }
    return this;
  }

  updateTargetFrequencyRange(controller, freqMin, freqMax) {
    if (this.targetControllers.has(controller)) {
      const config = this.targetControllers.get(controller);
      config.frequency = { min: freqMin, max: freqMax };
    }
    return this;
  }

  removeTarget(controller) {
    if (controller) {
      // Make sure to reset the controller value to its current value (stop modulation)
      try {
        // Get the current value from the controller if possible
        if (typeof controller.getValue === "function") {
          const currentValue = controller.getValue();
          controller.setValue(currentValue);
        }
      } catch (e) {
        console.warn("Error resetting controller value:", e);
      }

      // Remove from targetControllers map
      this.targetControllers.delete(controller);
      console.log("Target removed from mic forces");
    }
    return this;
  }

  clearTargets() {
    // Reset all controllers before removing them
    for (const [controller, config] of this.targetControllers.entries()) {
      try {
        // Get the current value from the controller if possible
        if (typeof controller.getValue === "function") {
          const currentValue = controller.getValue();
          controller.setValue(currentValue);
        }
      } catch (e) {
        console.warn("Error resetting controller value:", e);
      }
    }

    // Clear the map
    this.targetControllers.clear();
    console.log("All mic targets cleared");
    return this;
  }

  setSensitivity(value) {
    this.sensitivity = value;
    return this;
  }

  setSmoothing(value) {
    if (value >= 0 && value <= 1) {
      this.smoothing = value;
      if (this.analyser) {
        this.analyser.smoothingTimeConstant = value;
      }
    }
    return this;
  }

  calibrate() {
    // Future enhancement: could analyze current room noise level
    // and automatically set baselineAmplitude
    return this;
  }
}
