/**
 * Audio visualization system with multiple display modes
 * Requires a SoundAnalyzer instance to provide audio data
 */
export class SoundVisualizer {
  constructor(options = {}) {
    // Default configuration
    this.options = {
      container: options.container || document.body,
      width: options.width || 320,
      height: options.height || 200,
      analyzer: options.analyzer || null,
      theme: options.theme || "dark",
      showFps: options.showFps || false,
      visualizations: options.visualizations || [
        "spectrum",
        "waveform",
        "volume",
      ],
      ...options,
    };

    // State variables
    this.isVisible = false;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 0;

    // Canvas and drawing context
    this.container = null;
    this.canvas = null;
    this.ctx = null;

    // Color themes
    this.themes = {
      dark: {
        background: "#1a1a1a",
        primary: "#00ffcc",
        secondary: "#ff3366",
        tertiary: "#ffcc00",
        text: "#ffffff",
        grid: "rgba(255, 255, 255, 0.1)",
        beat: "rgba(255, 51, 102, 0.7)",
      },
      light: {
        background: "#f2f2f2",
        primary: "#00cc99",
        secondary: "#ff3366",
        tertiary: "#ff9900",
        text: "#333333",
        grid: "rgba(0, 0, 0, 0.1)",
        beat: "rgba(255, 51, 102, 0.5)",
      },
      neon: {
        background: "#000000",
        primary: "#00ffff",
        secondary: "#ff00ff",
        tertiary: "#ffff00",
        text: "#ffffff",
        grid: "rgba(0, 255, 255, 0.2)",
        beat: "rgba(255, 0, 255, 0.7)",
      },
    };

    // Current color palette
    this.colors = this.themes[this.options.theme] || this.themes.dark;

    // Animation frame ID for cancellation
    this.animationId = null;

    // Visualization metrics
    this.metrics = {
      peakVolume: 0,
      beatEnergy: 0,
      volumeHistory: new Array(100).fill(0),
    };

    // Bind methods
    this.draw = this.draw.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * Initialize the visualizer
   */
  initialize() {
    // Check if container already exists, if so, clean it up first
    if (this.container) {
      // If we already have a container, just clear its contents
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
    } else {
      // Create container if needed
      this.container = document.createElement("div");
      this.container.className = "sound-visualizer-container";
      this.container.style.position = "fixed";
      this.container.style.bottom = "20px";
      this.container.style.left = "20px"; // Changed from 'right' to 'left'
      this.container.style.zIndex = "1000";
      this.container.style.borderRadius = "8px";
      this.container.style.overflow = "hidden";
      this.container.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
      this.options.container.appendChild(this.container);
    }

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "sound-visualizer-canvas";
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = "block";
    this.container.appendChild(this.canvas);

    // Get drawing context
    this.ctx = this.canvas.getContext("2d");

    // Add resize listener
    window.addEventListener("resize", this.handleResize);

    // Initialize the beat energy level
    if (this.options.analyzer && this.options.analyzer.beatDetection) {
      this.metrics.beatEnergy =
        this.options.analyzer.beatDetection.energyThreshold;
    }

    return this;
  }
  /**
   * Start visualization
   */
  show() {
    if (!this.canvas) {
      this.initialize();
    }

    this.container.style.display = "block";
    this.isVisible = true;

    // Start animation loop
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.draw();

    return this;
  }

  /**
   * Hide visualization
   */
  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }

    this.isVisible = false;

    // Stop animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    return this;
  }

  /**
   * Toggle visibility
   */
  toggle() {
    return this.isVisible ? this.hide() : this.show();
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    if (this.canvas && this.container) {
      // Only update if container dimensions have changed
      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;

      if (
        containerWidth !== this.canvas.width ||
        containerHeight !== this.canvas.height
      ) {
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
      }
    }
  }

  /**
   * Main drawing loop
   */
  draw() {
    if (!this.isVisible || !this.ctx || !this.canvas) {
      this.animationId = null;
      return;
    }

    const now = performance.now();
    const dt = now - this.lastFrameTime;

    // Update FPS calculation every 500ms
    this.frameCount++;
    if (now - this.lastFrameTime >= 500) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFrameTime)
      );
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw visualizations
    let yOffset = 0;
    const padding = 10;
    const analyzer = this.options.analyzer;

    // Only proceed if we have an analyzer with data
    if (analyzer && analyzer.isEnabled) {
      // Update metrics
      if (analyzer.volume > this.metrics.peakVolume) {
        this.metrics.peakVolume = analyzer.volume;
      } else {
        this.metrics.peakVolume = this.metrics.peakVolume * 0.995;
      }

      // Update volume history
      this.metrics.volumeHistory.push(analyzer.volume);
      this.metrics.volumeHistory.shift();

      // Calculate available height and distribution
      const totalVisualizations = this.options.visualizations.length;
      const totalPaddingSpace = padding * (totalVisualizations + 1);
      const availableHeight = this.canvas.height - totalPaddingSpace;

      // Define relative heights for different visualization types (proportions)
      const heightRatios = {
        spectrum: 3,
        waveform: 2,
        volume: 1,
        bands: 2,
        history: 2,
      };

      // Calculate total ratio units
      let totalRatioUnits = 0;
      for (const type of this.options.visualizations) {
        totalRatioUnits += heightRatios[type] || 1;
      }

      // Draw selected visualizations with dynamic heights
      for (const type of this.options.visualizations) {
        // Calculate proportional height for this visualization
        const ratio = heightRatios[type] || 1;
        const height = Math.floor((ratio / totalRatioUnits) * availableHeight);

        switch (type) {
          case "spectrum":
            yOffset += this.drawSpectrum(yOffset, padding, height);
            break;
          case "waveform":
            yOffset += this.drawWaveform(yOffset, padding, height);
            break;
          case "volume":
            yOffset += this.drawVolumeBar(yOffset, padding, height);
            break;
          case "bands":
            yOffset += this.drawFrequencyBands(yOffset, padding, height);
            break;
          case "history":
            yOffset += this.drawVolumeHistory(yOffset, padding, height);
            break;
        }
      }

      // Draw beat indicator if in beat
      if (analyzer.beatDetection && analyzer.beatDetection.isInBeat) {
        this.drawBeatIndicator();
      }
    } else {
      // Draw "No Audio" message
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = "16px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        "No Audio Signal",
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }

    // Draw FPS counter if enabled
    if (this.options.showFps) {
      this.drawFpsCounter();
    }

    // Request next frame
    this.animationId = requestAnimationFrame(this.draw);
  }
  /**
   * Draw frequency spectrum visualization
   */
  drawSpectrum(yOffset, padding, height) {
    const analyzer = this.options.analyzer;

    if (!analyzer || !analyzer.frequencyData) return 0;

    this.ctx.save();

    // Calculate the actual drawable area
    const drawableWidth = this.canvas.width - padding * 2;
    const drawableHeight = height;

    // Draw background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(
      padding,
      yOffset + padding,
      drawableWidth,
      drawableHeight
    );

    // Draw horizontal grid lines
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const y = yOffset + padding + (drawableHeight / 4) * i;
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(padding + drawableWidth, y);
    }
    this.ctx.stroke();

    // Create gradient
    const gradient = this.ctx.createLinearGradient(
      0,
      yOffset + padding,
      0,
      yOffset + padding + drawableHeight
    );
    gradient.addColorStop(0, this.colors.secondary);
    gradient.addColorStop(0.5, this.colors.primary);
    gradient.addColorStop(1, this.colors.tertiary);

    this.ctx.fillStyle = gradient;

    // Get frequency data
    const frequencyData = analyzer.frequencyData;

    // Define a fixed number of bars to display
    const numBars = 128; // We'll show 128 bars regardless of FFT size

    // Calculate bar width to fill the entire drawable width
    const barWidth = (drawableWidth * 3) / numBars;

    // Draw bars using the full width
    for (let i = 0; i < numBars; i++) {
      // Map bar index to the frequency data array
      // This ensures we sample the full range of the frequency data
      const dataIndex = Math.floor((i / numBars) * frequencyData.length);

      // Get the value for this bar
      const value = frequencyData[dataIndex] / 255; // Normalize to 0-1

      // Calculate bar height
      const barHeight = value * drawableHeight;

      // Calculate bar position
      const x = padding + i * barWidth;
      const y = yOffset + padding + drawableHeight - barHeight;

      // Draw bar with full width (no gap)
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Label
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "12px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText("Spectrum", padding, yOffset + padding + 12);

    this.ctx.restore();

    return height + padding;
  }
  /**
   * Draw time domain waveform visualization
   */
  drawWaveform(yOffset, padding, height) {
    const analyzer = this.options.analyzer;

    if (!analyzer || !analyzer.timeData) return 0;

    this.ctx.save();

    // Draw background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(
      padding,
      yOffset + padding,
      this.canvas.width - padding * 2,
      height
    );

    // Draw center line
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(padding, yOffset + padding + height / 2);
    this.ctx.lineTo(
      this.canvas.width - padding,
      yOffset + padding + height / 2
    );
    this.ctx.stroke();

    // Draw waveform
    this.ctx.beginPath();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = this.colors.primary;

    const sliceWidth =
      (this.canvas.width - padding * 2) / analyzer.timeData.length;

    for (let i = 0; i < analyzer.timeData.length; i++) {
      const v = analyzer.timeData[i] / 128.0; // Convert 0-255 to -1.0 to 1.0
      const y = yOffset + padding + (height / 2) * v;
      const x = padding + i * sliceWidth;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Label
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "12px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText("Waveform", padding, yOffset + padding + 12);

    this.ctx.restore();

    return height + padding;
  }

  /**
   * Draw volume level bar
   */
  drawVolumeBar(yOffset, padding, height) {
    const analyzer = this.options.analyzer;

    if (!analyzer) return 0;

    this.ctx.save();

    // Draw background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(
      padding,
      yOffset + padding,
      this.canvas.width - padding * 2,
      height
    );

    // Calculate volume and levels
    const volume = analyzer.smoothedVolume;
    const peak = this.metrics.peakVolume;
    const barWidth = Math.max(1, volume * (this.canvas.width - padding * 2));
    const peakX =
      Math.max(1, peak * (this.canvas.width - padding * 2)) + padding;

    // Create gradient for volume bar
    const gradient = this.ctx.createLinearGradient(
      padding,
      0,
      this.canvas.width - padding,
      0
    );
    gradient.addColorStop(0, this.colors.primary);
    gradient.addColorStop(0.6, this.colors.tertiary);
    gradient.addColorStop(1, this.colors.secondary);

    // Draw volume bar
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(padding, yOffset + padding, barWidth, height);

    // Draw peak indicator
    this.ctx.strokeStyle = this.colors.text;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(peakX, yOffset + padding);
    this.ctx.lineTo(peakX, yOffset + padding + height);
    this.ctx.stroke();

    // Draw volume value text
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "12px sans-serif";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `Volume: ${(volume * 100).toFixed(1)}%`,
      this.canvas.width - padding,
      yOffset + padding + height / 2 + 4
    );

    this.ctx.textAlign = "left";
    this.ctx.fillText("Volume", padding, yOffset + padding + 12);

    this.ctx.restore();

    return height + padding;
  }

  /**
   * Draw frequency bands visualization
   */
  drawFrequencyBands(yOffset, padding, height) {
    const analyzer = this.options.analyzer;

    if (!analyzer || !analyzer.bands) return 0;

    this.ctx.save();

    // Draw background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(
      padding,
      yOffset + padding,
      this.canvas.width - padding * 2,
      height
    );

    // Get band levels
    const bands = analyzer.calculateBandLevels();
    const bandNames = Object.keys(bands);
    const bandWidth = (this.canvas.width - padding * 2) / bandNames.length;

    // Draw each band level
    const colors = [
      this.colors.primary,
      this.colors.secondary,
      this.colors.tertiary,
      this.colors.primary,
      this.colors.secondary,
      this.colors.tertiary,
      this.colors.primary,
    ];

    for (let i = 0; i < bandNames.length; i++) {
      const bandName = bandNames[i];
      const level = bands[bandName];
      const barHeight = level * height;
      const x = padding + i * bandWidth;
      const y = yOffset + padding + height - barHeight;

      // Fill bar
      this.ctx.fillStyle = colors[i % colors.length];
      this.ctx.fillRect(x, y, bandWidth - 2, barHeight);

      // Draw label
      this.ctx.fillStyle = this.colors.text;
      this.ctx.font = "10px sans-serif";
      this.ctx.textAlign = "center";
      const shortName = bandName.substring(0, 4);
      this.ctx.fillText(
        shortName,
        x + bandWidth / 2,
        yOffset + padding + height - 2
      );
    }

    // Label
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "12px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText("Frequency Bands", padding, yOffset + padding + 12);

    this.ctx.restore();

    return height + padding;
  }

  /**
   * Draw volume history
   */
  drawVolumeHistory(yOffset, padding, height) {
    const analyzer = this.options.analyzer;

    if (!analyzer) return 0;

    this.ctx.save();

    // Draw background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(
      padding,
      yOffset + padding,
      this.canvas.width - padding * 2,
      height
    );

    // Draw center line and grid lines
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    for (let i = 0; i < 3; i++) {
      const y = yOffset + padding + (height / 3) * i;
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(this.canvas.width - padding, y);
    }
    this.ctx.stroke();

    // Draw volume history
    this.ctx.beginPath();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = this.colors.primary;

    const historyWidth = this.canvas.width - padding * 2;
    const pointSpacing = historyWidth / (this.metrics.volumeHistory.length - 1);

    for (let i = 0; i < this.metrics.volumeHistory.length; i++) {
      const x = padding + i * pointSpacing;
      const y =
        yOffset + padding + height - this.metrics.volumeHistory[i] * height;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    // Stroke path
    this.ctx.stroke();

    // Fill below the line
    this.ctx.lineTo(padding + historyWidth, yOffset + padding + height);
    this.ctx.lineTo(padding, yOffset + padding + height);
    this.ctx.closePath();
    this.ctx.fillStyle = "rgba(0, 255, 204, 0.1)";
    this.ctx.fill();

    // Label
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "12px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText("History", padding, yOffset + padding + 12);

    this.ctx.restore();

    return height + padding;
  }

  /**
   * Draw beat indicator
   */
  drawBeatIndicator() {
    this.ctx.save();

    // Draw beat indicator as a pulsing circle in the corner
    const beatSize = 16;
    const x = this.canvas.width - beatSize - 10;
    const y = 10 + beatSize;
    const now = performance.now();
    const analyzer = this.options.analyzer;

    // Create a pulsing circle
    this.ctx.beginPath();
    this.ctx.arc(
      x,
      y,
      beatSize * (0.7 + Math.sin(now / 100) * 0.3),
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = this.colors.beat;
    this.ctx.fill();

    // Draw text
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "bold 10px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("BEAT", x, y);

    this.ctx.restore();
  }

  /**
   * Draw FPS counter
   */
  drawFpsCounter() {
    this.ctx.save();

    // Draw FPS counter in top left corner
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`FPS: ${this.fps}`, 5, 5);

    this.ctx.restore();
  }

  /**
   * Set color theme
   */
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.options.theme = themeName;
      this.colors = this.themes[themeName];
    } else {
      console.warn(`Theme "${themeName}" not found, using current theme`);
    }
    return this;
  }

  /**
   * Add a custom theme
   */
  addTheme(name, colors) {
    this.themes[name] = { ...colors };
    return this;
  }

  /**
   * Set visualizations to show
   */
  setVisualizations(types) {
    if (Array.isArray(types)) {
      this.options.visualizations = types;
    }
    return this;
  }

  /**
   * Set container size
   */
  setSize(width, height) {
    this.options.width = width;
    this.options.height = height;

    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    return this;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.hide();

    window.removeEventListener("resize", this.handleResize);

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.canvas = null;
    this.ctx = null;
    this.container = null;
  }
}
