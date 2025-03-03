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

    this.targetControllers.forEach((config, controller) => {
      if (controller && typeof controller.setValue === "function") {
        // Map amplitude (0-1) to target range
        const value = config.min + amplitude * (config.max - config.min);
        controller.setValue(value);

        // Update display if available
        if (typeof controller.updateDisplay === "function") {
          controller.updateDisplay();
        }
      }
    });
  }

  addTarget(controller, min, max) {
    if (controller && typeof controller.setValue === "function") {
      this.targetControllers.set(controller, { min, max });
    }
    return this;
  }

  removeTarget(controller) {
    this.targetControllers.delete(controller);
    return this;
  }

  clearTargets() {
    this.targetControllers.clear();
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
