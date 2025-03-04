/**
 * Advanced audio analysis system with configurable parameters and analysis capabilities
 */
export class SoundAnalyzer {
  constructor(options = {}) {
    // Configuration
    this.options = {
      fftSize: options.fftSize || 2048,
      smoothingTimeConstant: options.smoothingTimeConstant || 0.8,
      minDecibels: options.minDecibels || -90,
      maxDecibels: options.maxDecibels || -10,
      ...options,
    };

    // Audio processing state
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.source = null;
    this.isInitialized = false;
    this.isEnabled = false;

    // Analysis data
    this.frequencyData = null;
    this.timeData = null;
    this.volume = 0;
    this.smoothedVolume = 0;
    this.peak = 0;
    this.lastVolume = 0;
    this.volumeDelta = 0;
    this.baselineVolume = 0.05;

    // Frequency bands (common ranges in Hz)
    this.bands = {
      sub: { min: 20, max: 60 }, // Sub bass
      bass: { min: 60, max: 250 }, // Bass
      lowMid: { min: 250, max: 500 }, // Low midrange
      mid: { min: 500, max: 2000 }, // Midrange
      highMid: { min: 2000, max: 4000 }, // High midrange
      presence: { min: 4000, max: 6000 }, // Presence
      brilliance: { min: 6000, max: 20000 }, // Brilliance
    };

    // Beat detection
    this.beatDetection = {
      energyThreshold: 1.5,
      energyHistory: [],
      historySize: 43, // ~1 second at 24ms intervals
      beatHoldTime: 100, // ms
      beatDecayRate: 0.98,
      lastBeatTime: 0,
      isInBeat: false,
    };

    // Available audio devices
    this.devices = [];
    this.selectedDeviceId = null;

    // Callbacks
    this.onBeat = null;
    this.onAnalyze = null;

    // Analysis loop reference
    this.analysisLoopId = null;

    // Bind methods
    this.analyze = this.analyze.bind(this);
  }

  /**
   * Initialize the audio context and analyzer
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.options.fftSize;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
      this.analyser.minDecibels = this.options.minDecibels;
      this.analyser.maxDecibels = this.options.maxDecibels;

      // Create data arrays
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      // Fetch available devices
      await this.refreshDevices();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize audio analyzer:", error);
      return false;
    }
  }

  /**
   * Get list of available audio input devices
   */
  async refreshDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.filter((device) => device.kind === "audioinput");
      return this.devices;
    } catch (error) {
      console.error("Error getting audio devices:", error);
      return [];
    }
  }

  /**
   * Start audio capture and analysis
   * @param {string} deviceId - Optional device ID to use
   */
  async enable(deviceId = null) {
    if (this.isEnabled) return true;

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Configure audio constraints
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      // Get user media stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.selectedDeviceId = deviceId;

      // Create media source
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Connect the source to the analyser (but not to destination to prevent feedback)
      this.source.connect(this.analyser);

      // Start analysis loop
      this.isEnabled = true;
      this.startAnalysisLoop();

      console.log("Sound analyzer enabled");
      return true;
    } catch (error) {
      console.error("Error enabling sound analyzer:", error);
      return false;
    }
  }

  /**
   * Stop audio capture and analysis
   */
  disable() {
    if (!this.isEnabled) return;

    // Stop analysis loop
    if (this.analysisLoopId) {
      cancelAnimationFrame(this.analysisLoopId);
      this.analysisLoopId = null;
    }

    // Disconnect source if it exists
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.isEnabled = false;
    console.log("Sound analyzer disabled");
  }

  /**
   * Start the continuous analysis loop
   */
  startAnalysisLoop() {
    this.analyze();
  }

  /**
   * Perform audio analysis (called each animation frame)
   */
  analyze() {
    if (!this.isEnabled || !this.analyser) {
      this.analysisLoopId = null;
      return;
    }

    // Get time and frequency data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);

    // Calculate volume
    this.calculateVolume();

    // Detect beats
    this.detectBeat();

    // Call the onAnalyze callback if registered
    if (typeof this.onAnalyze === "function") {
      this.onAnalyze({
        frequencyData: this.frequencyData,
        timeData: this.timeData,
        volume: this.volume,
        smoothedVolume: this.smoothedVolume,
        volumeDelta: this.volumeDelta,
        isInBeat: this.beatDetection.isInBeat,
        bands: this.calculateBandLevels(),
      });
    }

    // Continue the loop
    this.analysisLoopId = requestAnimationFrame(this.analyze);
  }

  /**
   * Calculate current audio volume
   */
  calculateVolume() {
    // Store previous volume for delta calculation
    this.lastVolume = this.volume;

    // Calculate current volume from frequency data
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    this.volume = sum / (this.frequencyData.length * 255);

    // Calculate volume delta (rate of change)
    this.volumeDelta = this.volume - this.lastVolume;

    // Update smoothed volume
    this.smoothedVolume = this.smoothedVolume * 0.8 + this.volume * 0.2;

    // Track peak volume
    if (this.volume > this.peak) {
      this.peak = this.volume;
    } else {
      this.peak *= 0.99; // Gradually decrease peak to adjust to changing conditions
    }

    return this.volume;
  }

  /**
   * Calculate energy levels for defined frequency bands
   */
  calculateBandLevels() {
    const bandLevels = {};
    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.audioContext.sampleRate;
    const maxFreq = sampleRate / 2; // Nyquist frequency

    // Calculate the band levels
    for (const [bandName, bandRange] of Object.entries(this.bands)) {
      // Calculate bin indices for this frequency range
      const minBin = Math.floor((bandRange.min / maxFreq) * binCount);
      const maxBin = Math.min(
        Math.floor((bandRange.max / maxFreq) * binCount),
        binCount - 1
      );

      // Sum the energy in this band
      let sum = 0;
      let count = 0;

      for (let i = minBin; i <= maxBin; i++) {
        sum += this.frequencyData[i];
        count++;
      }

      // Store normalized value (0-1)
      bandLevels[bandName] = count > 0 ? sum / (count * 255) : 0;
    }

    return bandLevels;
  }

  /**
   * Get the energy level for a specific frequency range
   */
  getFrequencyRangeValue(minFreq, maxFreq) {
    if (!this.analyser || !this.frequencyData) return 0;

    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.audioContext.sampleRate;
    const maxFreq_hz = sampleRate / 2; // Nyquist frequency

    // Calculate bin indices for this frequency range
    const minBin = Math.floor((minFreq / maxFreq_hz) * binCount);
    const maxBin = Math.min(
      Math.floor((maxFreq / maxFreq_hz) * binCount),
      binCount - 1
    );

    // Sum the energy in this band
    let sum = 0;
    let count = 0;

    for (let i = minBin; i <= maxBin; i++) {
      sum += this.frequencyData[i];
      count++;
    }

    // Return normalized value (0-1)
    return count > 0 ? sum / (count * 255) : 0;
  }

  /**
   * Beat detection algorithm
   */
  detectBeat() {
    const now = performance.now();
    const instantEnergy = this.volume;

    // Add current energy to history
    this.beatDetection.energyHistory.push(instantEnergy);
    if (
      this.beatDetection.energyHistory.length > this.beatDetection.historySize
    ) {
      this.beatDetection.energyHistory.shift();
    }

    // Calculate average energy from history
    let avgEnergy = 0;
    for (let i = 0; i < this.beatDetection.energyHistory.length; i++) {
      avgEnergy += this.beatDetection.energyHistory[i];
    }
    avgEnergy /= this.beatDetection.energyHistory.length;

    // Detect beat when energy rises above threshold
    const energyRatio = instantEnergy / Math.max(avgEnergy, 0.01);

    // Beat occurs when energy is significantly higher than average and we're not in a cooldown period
    if (
      energyRatio > this.beatDetection.energyThreshold &&
      now - this.beatDetection.lastBeatTime > this.beatDetection.beatHoldTime
    ) {
      this.beatDetection.isInBeat = true;
      this.beatDetection.lastBeatTime = now;

      // Trigger onBeat callback if registered
      if (typeof this.onBeat === "function") {
        this.onBeat({
          energy: instantEnergy,
          threshold: avgEnergy * this.beatDetection.energyThreshold,
          ratio: energyRatio,
        });
      }
    } else if (
      now - this.beatDetection.lastBeatTime >
      this.beatDetection.beatHoldTime
    ) {
      // Apply decay to beat state
      this.beatDetection.isInBeat = false;
    }

    return this.beatDetection.isInBeat;
  }

  /**
   * Set audio analyzer configuration
   */
  setConfig(options) {
    if (!options) return this;

    // Update options
    this.options = { ...this.options, ...options };

    // Apply configuration to analyzer if it exists
    if (this.analyser) {
      if (options.fftSize) this.analyser.fftSize = options.fftSize;
      if (options.smoothingTimeConstant !== undefined) {
        this.analyser.smoothingTimeConstant = options.smoothingTimeConstant;
      }
      if (options.minDecibels !== undefined)
        this.analyser.minDecibels = options.minDecibels;
      if (options.maxDecibels !== undefined)
        this.analyser.maxDecibels = options.maxDecibels;

      // Recreate data arrays if fftSize changed
      if (options.fftSize) {
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyser.fftSize);
      }
    }

    return this;
  }

  /**
   * Configure beat detection parameters
   */
  setBeatDetectionConfig(config) {
    if (!config) return this;

    // Update beat detection configuration
    this.beatDetection = {
      ...this.beatDetection,
      ...config,
    };

    // Reset history if history size changed
    if (config.historySize) {
      this.beatDetection.energyHistory = [];
    }

    return this;
  }

  /**
   * Set or modify a frequency band definition
   */
  setFrequencyBand(name, minFreq, maxFreq) {
    this.bands[name] = { min: minFreq, max: maxFreq };
    return this;
  }

  /**
   * Calibrate baseline volume based on current ambient sound
   * @param {number} sampleDurationMs - How long to sample for calibration in milliseconds
   * @param {number} multiplier - Multiplier to apply to detected baseline
   */
  async calibrate(sampleDurationMs = 1000, multiplier = 1.2) {
    return new Promise((resolve) => {
      if (!this.isEnabled) {
        console.warn("Analyzer must be enabled before calibration");
        resolve(this.baselineVolume);
        return;
      }

      // Sample volumes over time
      const samples = [];
      let samplingComplete = false;

      // Sampling function
      const sampleVolume = () => {
        samples.push(this.volume);

        if (samples.length * 16.67 < sampleDurationMs) {
          // ~60fps = 16.67ms per frame
          requestAnimationFrame(sampleVolume);
        } else {
          samplingComplete = true;
        }
      };

      // Start sampling
      sampleVolume();

      // Wait for sampling to complete
      const checkCompletion = () => {
        if (samplingComplete) {
          // Calculate average volume from samples
          let sum = 0;
          for (const sample of samples) {
            sum += sample;
          }
          const avgVolume = sum / samples.length;

          // Set baseline with multiplier
          this.baselineVolume = Math.max(0.01, avgVolume * multiplier);
          console.log(
            `Sound analyzer calibrated. Baseline: ${this.baselineVolume.toFixed(
              4
            )}`
          );

          resolve(this.baselineVolume);
        } else {
          setTimeout(checkCompletion, 50);
        }
      };

      checkCompletion();
    });
  }

  /**
   * Change audio input device
   */
  async changeDevice(deviceId) {
    // If we're enabled, restart with the new device
    const wasEnabled = this.isEnabled;

    if (wasEnabled) {
      this.disable();
    }

    this.selectedDeviceId = deviceId;

    if (wasEnabled) {
      return this.enable(deviceId);
    }

    return true;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.disable();

    // Close audio context if it exists
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.frequencyData = null;
    this.timeData = null;
    this.isInitialized = false;
  }
}
