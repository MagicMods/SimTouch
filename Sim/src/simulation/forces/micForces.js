import { SoundAnalyzer } from "../../sound/soundAnalyzer.js";
import { SoundVisualizer } from "../../sound/soundVisualizer.js";

export class MicInputForces {
  constructor() {
    this.enabled = false;
    this.targetControllers = new Map();
    this.baselineAmplitude = 0.05; // Silent threshold

    // Configuration
    this.sensitivity = 1.0;
    this.smoothing = 0.8;
    this.fftSize = 1024;

    // Create analyzer with our settings
    this.analyzer = new SoundAnalyzer({
      fftSize: this.fftSize,
      smoothingTimeConstant: this.smoothing,
      minDecibels: -90,
      maxDecibels: -10,
    });

    // Create visualizer (but don't show it yet)
    this.visualizer = new SoundVisualizer({
      analyzer: this.analyzer,
      width: 320,
      height: 240,
      visualizations: ["spectrum", "waveform", "volume", "bands", "history"],
      theme: "dark",
    });

    // Audio data - exposed for compatibility with existing code
    this.amplitude = 0;
    this.smoothedAmplitude = 0;
    this.dataArray = null; // Will be filled by analyzer

    // Visualization state - set to true by default
    this.visualizerVisible = true;

    // Bind methods for analyzer callbacks
    this.processAudioData = this.processAudioData.bind(this);
  }

  async enable() {
    if (this.enabled) return true;

    try {
      // Initialize and enable the analyzer
      await this.analyzer.initialize();
      await this.analyzer.enable();

      // Set callback to process audio data
      this.analyzer.onAnalyze = this.processAudioData;

      // Initialize data array reference for compatibility
      this.dataArray = this.analyzer.frequencyData;

      // Set flag
      this.enabled = true;
      console.log("Microphone input enabled");

      // Show visualizer if it's supposed to be visible (default is true)
      if (this.visualizerVisible) {
        this.showVisualizer();
      }

      return true;
    } catch (error) {
      console.error("Error enabling microphone:", error);
      return false;
    }
  }

  disable() {
    if (!this.enabled) return;

    this.enabled = false;

    // Hide visualizer
    this.hideVisualizer();

    // Disable analyzer
    if (this.analyzer) {
      this.analyzer.disable();
    }

    // Reset data
    this.amplitude = 0;
    this.smoothedAmplitude = 0;

    console.log("Microphone input disabled");
  }

  processAudioData(data) {
    if (!this.enabled) return;

    // Update our exposed properties with data from analyzer
    this.amplitude = data.volume;
    this.smoothedAmplitude = data.smoothedVolume;

    // Apply sensitivity and subtract baseline
    const processedAmplitude = Math.max(
      0,
      (this.smoothedAmplitude - this.baselineAmplitude) * this.sensitivity
    );

    // Update target controllers
    this.updateTargets(processedAmplitude);
  }

  // Update the updateTargets method to handle sensitivity correctly
  updateTargets(amplitude) {
    if (!this.enabled) return;

    // Use frequency data from analyzer
    const frequencyData = this.analyzer.frequencyData;

    this.targetControllers.forEach((config, controller) => {
      if (controller && typeof controller.setValue === "function") {
        let rawAmplitude = amplitude;

        // Apply frequency filtering if we have frequency data
        if (
          frequencyData &&
          config.frequency &&
          (config.frequency.min > 0 || config.frequency.max < 20000)
        ) {
          // Get frequency-specific amplitude using analyzer helper method
          rawAmplitude = this.analyzer.getFrequencyRangeValue(
            config.frequency.min,
            config.frequency.max
          );

          // Apply baseline subtraction
          rawAmplitude = Math.max(0, rawAmplitude - this.baselineAmplitude);
        }

        // Apply sensitivity to make detection more/less responsive
        // but keep the value normalized between 0-1
        let targetAmplitude =
          rawAmplitude * this.sensitivity * config.sensitivity;

        // Clamp to 0-1 range for proper mapping
        targetAmplitude = Math.min(1.0, Math.max(0, targetAmplitude));

        // Map the normalized amplitude (0-1) to target range
        const value = config.min + targetAmplitude * (config.max - config.min);
        controller.setValue(value);

        // Update display if available
        if (typeof controller.updateDisplay === "function") {
          controller.updateDisplay();
        }
      }
    });
  }

  // Toggle visualizer visibility
  toggleVisualizer() {
    if (this.visualizerVisible) {
      this.hideVisualizer();
    } else {
      this.showVisualizer();
    }
    return this.visualizerVisible;
  }

  // Show audio visualizer
  showVisualizer() {
    if (!this.visualizer) return false;

    // Only show if input is enabled
    if (!this.enabled) {
      // Just mark that we want it visible when enabled
      this.visualizerVisible = true;
      return false;
    }

    this.visualizer.initialize();
    this.visualizer.show();
    this.visualizerVisible = true;
    return true;
  }

  // Hide audio visualizer
  hideVisualizer() {
    if (!this.visualizer) return false;

    this.visualizer.hide();
    this.visualizerVisible = false;
    return true;
  }

  addTarget(
    controller,
    min,
    max,
    folder = null,
    sensitivity = 1.0,
    frequency = null,
    frequencyBand = "none"
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
        frequencyBand: frequencyBand || "none",
      });

      console.log("Added mic target:", {
        min,
        max,
        sensitivity,
        folder: folder?._title,
        frequencyBand,
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

    // Update analyzer's gain if available
    if (this.analyzer) {
      // Pass sensitivity to analyzer
      this.analyzer.setGain(value);
    }

    // Update visualizer if available
    if (this.visualizer) {
      // Tell visualizer to redraw with new sensitivity
      this.visualizer.updateOptions({ gain: value });
    }

    console.log(`Global sensitivity set to ${value}`);
    return this;
  }

  setSmoothing(value) {
    if (value >= 0 && value <= 1) {
      this.smoothing = value;
      if (this.analyzer) {
        this.analyzer.setConfig({ smoothingTimeConstant: value });
      }
    }
    return this;
  }

  // Change FFT size
  setFftSize(size) {
    if (this.analyzer) {
      this.analyzer.setConfig({ fftSize: size });
      // Update our data array reference
      this.dataArray = this.analyzer.frequencyData;
    }
    return this;
  }

  // Change audio device
  async changeDevice(deviceId) {
    if (this.analyzer) {
      return await this.analyzer.changeDevice(deviceId);
    }
    return false;
  }

  // Get list of available audio devices
  async getAudioDevices() {
    if (this.analyzer) {
      return await this.analyzer.refreshDevices();
    }
    return [];
  }

  // Set visualizer theme
  setVisualizerTheme(theme) {
    if (this.visualizer) {
      this.visualizer.setTheme(theme);
    }
    return this;
  }

  // Set which visualizations to display
  setVisualizations(types) {
    if (this.visualizer) {
      this.visualizer.setVisualizations(types);
    }
    return this;
  }

  calibrate() {
    if (this.analyzer && this.analyzer.isEnabled) {
      this.analyzer.calibrate(1000, 1.2).then((baseline) => {
        this.baselineAmplitude = baseline;
        console.log(`Microphone calibrated: baseline=${baseline.toFixed(4)}`);
      });
    }
    return this;
  }
}
