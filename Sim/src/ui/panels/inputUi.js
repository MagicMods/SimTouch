import { BaseUi } from "./baseUi.js";
import { ModulatorManager } from "../../input/modulatorManager.js";

export class InputUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize arrays
    this.audioDevices = [];
    this.modulatorFolders = [];
    this.micControllers = [];

    // Create a ModulatorManager for input modulators - will be replaced by the shared one
    this.modulatorManager = new ModulatorManager();

    // Flag to prevent early target registration
    this.deferTargetRegistration = true;

    // Change the GUI title
    this.gui.title("Inputs");

    // Use the original initialization flow
    this.initInputControls();

    // Create a single interval for updating all band visualizations
    this.bandVisualizationInterval = setInterval(() => {
      this.updateAllBandVisualizations();
    }, 50);
  }

  dispose() {
    // Clear the band visualization interval
    if (this.bandVisualizationInterval) {
      clearInterval(this.bandVisualizationInterval);
      this.bandVisualizationInterval = null;
    }

    // Call parent dispose
    super.dispose();
  }

  // Set the shared ModulatorManager
  setModulatorManager(manager) {
    this.modulatorManager = manager;
    console.log("InputUi using shared ModulatorManager");
  }

  // Initialize with UI panels just like PulseModulationUi
  initializeWithUiPanels(leftUi, rightUi, targetsRegistered = false) {
    console.log("InputUi initializing with UI panels");

    // Store UI references
    this.leftUi = leftUi;
    this.rightUi = rightUi;

    // Don't register targets if they're already registered
    if (!targetsRegistered) {
      console.log("InputUi registering targets (not pre-registered)");
      this.registerAvailableTargets();
    } else {
      console.log("InputUi using pre-registered targets");
      // No need to register, targets already available
      this.deferTargetRegistration = false;
    }

    // Verify targets are available
    const targetNames = this.modulatorManager.getTargetNames();
    console.log(`InputUi has ${targetNames.length} available targets`);

    // Update all target dropdowns
    this.updateTargetDropdowns();

    console.log("InputUi initialized with UI panels");
  }

  // Add this method to scan available controllers from leftUi and rightUi
  registerAvailableTargets() {
    console.log("InputUi delegating target registration to ModulatorManager");

    // If deferring, don't register targets yet
    if (this.deferTargetRegistration) {
      console.log(
        "InputUi deferring target registration until UI panels are ready"
      );
      return;
    }

    // No need to call this directly since UiManager handles it now with the shared manager
    if (this.leftUi && this.rightUi) {
      this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);
    } else if (this.main.ui) {
      // Fallback to using main.ui references
      this.modulatorManager.registerTargetsFromUi(
        this.main.ui.leftUi,
        this.main.ui.rightUi
      );
    } else {
      console.warn("InputUi could not find UI panels for target registration");
    }
  }

  // Main update method to handle audio input modulation
  update() {
    if (!this.main.audioAnalyzer) return;

    // Update all modulators with their respective frequency band data
    for (let i = 0; i < this.modulatorManager.modulators.length; i++) {
      const modulator = this.modulatorManager.modulators[i];
      if (modulator.inputSource === "mic") {
        const analyzer = this.main.audioAnalyzer;
        const micForces = this.main.externalInput?.micForces;
        let value = 0;

        try {
          // Get the appropriate frequency band value
          switch (modulator.frequencyBand) {
            case "sub":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("sub")
                  : 0;
              break;
            case "bass":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("bass")
                  : 0;
              break;
            case "lowMid":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("lowMid")
                  : 0;
              break;
            case "mid":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("mid")
                  : 0;
              break;
            case "highMid":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("highMid")
                  : 0;
              break;
            case "treble":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("treble")
                  : 0;
              break;
            case "none":
            default:
              // Use whatever volume method is available on the analyzer
              if (typeof analyzer.getVolume === "function") {
                value = analyzer.getVolume();
              } else if (typeof analyzer.volume !== "undefined") {
                value = analyzer.volume;
              } else if (micForces?.smoothedAmplitude !== undefined) {
                value = micForces.smoothedAmplitude;
              } else {
                value = 0;
              }
              break;
          }

          // Add occasional logging to debug
          if (Math.random() < 0.01) {
            console.log(
              `Audio data (${modulator.frequencyBand}): ${value.toFixed(4)}`
            );
          }

          // Set the input value for the modulator
          modulator.setInputValue(value);
        } catch (e) {
          console.warn(
            `Error getting audio data for ${modulator.frequencyBand}:`,
            e
          );
        }
      }
    }

    // Update all modulators through the manager
    this.modulatorManager.update();
  }

  // Update band visualizations in the UI
  updateAllBandVisualizations() {
    if (
      !this.main.audioAnalyzer ||
      !this.main.externalInput?.micForces?.enabled
    )
      return;

    const analyzer = this.main.audioAnalyzer;
    const micForces = this.main.externalInput.micForces;
    const now = performance.now();

    // Update modulators with visual elements
    if (this.modulatorFolders) {
      this.modulatorManager.modulators.forEach((modulator) => {
        // Skip if no visualization or not time to update yet
        if (
          !modulator._bandVisual ||
          now - modulator._bandVisual.lastUpdate < 50
        )
          return;
        modulator._bandVisual.lastUpdate = now;

        // Update the visualization based on frequency band
        this.updateSingleBandVisualization(modulator, analyzer, micForces);
      });
    }
  }

  // Helper method to update a single band visualization
  updateSingleBandVisualization(modulator, analyzer, micForces) {
    let rawValue = 0;
    let bandName = "All";

    // Method to safely check for function existence and call if it exists
    const safeCall = (obj, methodName, ...args) => {
      if (obj && typeof obj[methodName] === "function") {
        return obj[methodName](...args);
      }
      return 0;
    };

    if (modulator.frequencyBand !== "none" && analyzer) {
      // Get the appropriate frequency band value
      switch (modulator.frequencyBand) {
        case "sub":
          rawValue =
            safeCall(analyzer, "getAverageEnergy", "sub") ||
            safeCall(micForces, "getBandEnergy", "sub") ||
            0;
          bandName = "Sub Bass";
          break;
        case "bass":
          rawValue =
            safeCall(analyzer, "getAverageEnergy", "bass") ||
            safeCall(micForces, "getBandEnergy", "bass") ||
            0;
          bandName = "Bass";
          break;
        case "lowMid":
          rawValue =
            safeCall(analyzer, "getAverageEnergy", "lowMid") ||
            safeCall(micForces, "getBandEnergy", "lowMid") ||
            0;
          bandName = "Low Mid";
          break;
        case "mid":
          rawValue =
            safeCall(analyzer, "getAverageEnergy", "mid") ||
            safeCall(micForces, "getBandEnergy", "mid") ||
            0;
          bandName = "Mid";
          break;
        case "highMid":
          rawValue =
            safeCall(analyzer, "getAverageEnergy", "highMid") ||
            safeCall(micForces, "getBandEnergy", "highMid") ||
            0;
          bandName = "High Mid";
          break;
        case "treble":
          rawValue =
            safeCall(analyzer, "getAverageEnergy", "treble") ||
            safeCall(micForces, "getBandEnergy", "treble") ||
            0;
          bandName = "Treble";
          break;
        default:
          // Instead of calling getVolumeNormalized directly, try multiple possible methods
          rawValue =
            safeCall(analyzer, "getVolumeLevel") ||
            safeCall(analyzer, "getVolume") ||
            safeCall(micForces, "getSmoothedAmplitude") ||
            micForces.smoothedAmplitude ||
            0;
          bandName = "All";
          break;
      }
    } else {
      // Full range mode - try multiple volume access methods
      rawValue =
        safeCall(analyzer, "getVolumeLevel") ||
        safeCall(analyzer, "getVolume") ||
        safeCall(micForces, "getSmoothedAmplitude") ||
        micForces.smoothedAmplitude ||
        0;
    }

    // Apply sensitivity and smoothing
    let bandValue = rawValue * modulator.sensitivity;

    // Normalize to 0-1 range for visualization
    bandValue = Math.min(1.0, Math.max(0, bandValue));

    // Update the visual (0-100%)
    const level = bandValue * 100;
    modulator._bandVisual.bar.style.width = `${level}%`;

    // Update label with band name and value percentage
    modulator._bandVisual.label.textContent = `${bandName}: ${Math.round(
      level
    )}%`;

    // Color the bar based on level
    if (level > 80) {
      modulator._bandVisual.bar.style.backgroundColor = "#f44"; // Red for high levels
    } else if (level > 50) {
      modulator._bandVisual.bar.style.backgroundColor = "#ff4"; // Yellow for medium levels
    } else {
      modulator._bandVisual.bar.style.backgroundColor = "#4f4"; // Green for low levels
    }
  }

  // Keep the core method to add a modulator
  addMicModulator() {
    // Create a new input modulator
    const modulator = this.modulatorManager.createInputModulator();
    modulator.inputSource = "mic"; // Explicitly set the input source to mic

    // Create a folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.micInputFolder.addFolder(`Mic Modulator ${index + 1}`);

    // Add this folder to our tracking array
    this.modulatorFolders.push(folder);

    // Add UI controls for the modulator
    folder
      .add(modulator, "enabled")
      .name("Enabled")
      .onChange((value) => {
        if (!value) modulator.resetToOriginal();
      });

    // Get the LATEST target names directly from the manager
    const targetNames = this.modulatorManager.getTargetNames();
    console.log(
      `Adding mic modulator with ${targetNames.length} available targets`
    );

    // Get references to range controllers for updating later
    let minController, maxController;

    // Add target selector with all available targets - IMPORTANT: Start with no selection
    const targetController = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        // Only set target if it's not "None"
        if (value && value !== "None") {
          console.log(`Setting target to ${value}`);
          modulator.setTarget(value);
          this.updateRangeForTarget(modulator, minController, maxController);
        } else {
          // Disable modulation if "None" is selected
          modulator.targetName = null;
          modulator.target = null;
          modulator.targetController = null;
        }
      });

    // Set the initial value to "None"
    targetController.setValue("None");

    // Add frequency band selector
    const bands = {
      "All (Volume)": "none",
      "Sub Bass": "sub",
      Bass: "bass",
      "Low Mid": "lowMid",
      Mid: "mid",
      "High Mid": "highMid",
      Treble: "treble",
    };
    folder.add(modulator, "frequencyBand", bands).name("Frequency Band");

    // Add sensitivity slider
    folder.add(modulator, "sensitivity", 0.1, 5, 0.1).name("Sensitivity");

    // Add smoothing slider
    folder.add(modulator, "smoothing", 0, 0.99, 0.01).name("Smoothing");

    // Add range controls
    minController = folder.add(modulator, "min", 0, 1, 0.01).name("Min Value");
    maxController = folder.add(modulator, "max", 0, 1, 0.01).name("Max Value");

    // Add auto-range button
    const autoRangeControl = {
      autoRange: () => {
        this.updateRangeForTarget(modulator, minController, maxController);
      },
    };
    folder.add(autoRangeControl, "autoRange").name("Auto Range");

    // Add remove button
    const removeObj = {
      remove: () => {
        // Disable modulator to reset target
        if (modulator.enabled) {
          modulator.enabled = false;
          modulator.resetToOriginal();
        }

        // Remove from manager
        this.modulatorManager.modulators =
          this.modulatorManager.modulators.filter((m) => m !== modulator);

        // Remove folder
        folder.destroy();

        // Remove from tracking array
        const idx = this.modulatorFolders.indexOf(folder);
        if (idx !== -1) {
          this.modulatorFolders.splice(idx, 1);
        }
      },
    };
    folder.add(removeObj, "remove").name("Remove");

    // Add visualization
    this.addVisualizationToModulator(modulator, folder);

    // DO NOT set a default target here - require user to select one

    // Open the folder by default
    folder.open();

    return modulator;
  }
  // Add this helper method just like in PulseModulationUi
  updateRangeForTarget(modulator, minController, maxController) {
    const targetName = modulator.targetName;
    if (!targetName) return;

    // Get target info from ModulatorManager
    const targetInfo = this.modulatorManager.getTargetInfo(targetName);

    if (
      targetInfo &&
      targetInfo.min !== undefined &&
      targetInfo.max !== undefined
    ) {
      const min = targetInfo.min;
      const max = targetInfo.max;
      const step = targetInfo.step || 0.01;

      // Update the modulator's min/max
      modulator.min = min;
      modulator.max = max;

      // Update controller ranges
      if (minController) {
        minController.min(min);
        minController.max(max);
        minController.setValue(min);
        minController.step(step);
        minController.updateDisplay();
      }

      if (maxController) {
        maxController.min(min);
        maxController.max(max);
        maxController.setValue(max);
        maxController.step(step);
        maxController.updateDisplay();
      }

      console.log(`Auto-ranged for target ${targetName}: ${min} - ${max}`);
    }
  }

  // Keep the visualization creation helper
  addVisualizationToModulator(modulator, folder) {
    // Add a band visualization to show the frequency band activity
    const bandVisualContainer = document.createElement("div");
    bandVisualContainer.style.margin = "8px 0";
    bandVisualContainer.style.padding = "0";
    bandVisualContainer.style.position = "relative";

    // Create band level visualization
    const bandVisual = document.createElement("div");
    bandVisual.style.height = "16px";
    bandVisual.style.backgroundColor = "#333";
    bandVisual.style.borderRadius = "3px";
    bandVisual.style.overflow = "hidden";
    bandVisual.style.position = "relative";

    // Create the level bar
    const bandLevelBar = document.createElement("div");
    bandLevelBar.style.height = "100%";
    bandLevelBar.style.backgroundColor = "#4f4";
    bandLevelBar.style.width = "0%";
    bandLevelBar.style.position = "absolute";
    bandLevelBar.style.left = "0";
    bandLevelBar.style.top = "0";
    bandLevelBar.style.transition = "width 0.05s ease-out";

    // Create label that shows band name and level
    const bandLabel = document.createElement("div");
    bandLabel.style.position = "absolute";
    bandLabel.style.left = "5px";
    bandLabel.style.top = "0";
    bandLabel.style.color = "#fff";
    bandLabel.style.fontSize = "10px";
    bandLabel.style.lineHeight = "16px";
    bandLabel.style.textShadow = "1px 1px 1px rgba(0,0,0,0.5)";
    bandLabel.style.whiteSpace = "nowrap";
    bandLabel.style.overflow = "hidden";
    bandLabel.textContent = "All: 0%";

    // Add elements to container
    bandVisual.appendChild(bandLevelBar);
    bandVisual.appendChild(bandLabel);
    bandVisualContainer.appendChild(bandVisual);

    // Add to the folder's DOM
    folder.domElement
      .querySelector(".children")
      .appendChild(bandVisualContainer);

    // Store references for updating
    modulator._bandVisual = {
      container: bandVisualContainer,
      bar: bandLevelBar,
      label: bandLabel,
      lastUpdate: 0,
      currentValue: 0,
    };
  }

  // Essential compatibility method for ModulatorManager
  updateControllerDisplays() {
    // This method is for compatibility with ModulatorManager
    // It will be populated later if needed
  }

  initInputControls() {
    // Create top-level folders for each input type
    this.mouseInputFolder = this.createFolder("Mouse Input");
    this.emuInputFolder = this.createFolder("EMU Input");
    this.externalInputFolder = this.createFolder("Touch Input");
    this.micInputFolder = this.createFolder("Microphone Input");

    // Initialize input controls
    this.initMouseControls();
    this.initEmuInputControls();
    this.initExternalInputControls();
    this.initMicInputControls();

    // Set default open states
    this.mouseInputFolder.open(false);
    this.emuInputFolder.open(false);
    this.externalInputFolder.open(false);
  }

  initMouseControls() {
    const particles = this.main.particleSystem;
    if (!particles?.mouseForces) return;

    this.mouseInputFolder
      .add(particles.mouseForces, "impulseRadius", 0.5, 2, 0.01)
      .name("Input Radius");

    this.mouseInputFolder
      .add(particles.mouseForces, "impulseMag", 0.01, 0.12, 0.001)
      .name("Impulse Magnitude");
  }

  initExternalInputControls() {
    if (!this.main.externalInput) return;

    const externalInput = this.main.externalInput;
    const mouseForces = this.main.mouseForces;

    // External input enable/disable
    this.externalInputFolder
      .add({ enabled: mouseForces.externalInputEnabled }, "enabled")
      .name("Enable External Input")
      .onChange((value) => {
        if (value) {
          externalInput.enable();
        } else {
          externalInput.disable();
        }
      });

    // Create a persistent button type object
    const buttonTypeControl = {
      type: mouseForces.externalMouseState.button,
    };

    // Button type selector
    const buttonController = this.externalInputFolder
      .add(buttonTypeControl, "type", {
        "Left (Attract)": 0,
        "Middle (Drag)": 1,
        "Right (Repulse)": 2,
      })
      .name("Button Type")
      .onChange((value) => {
        // Update the actual button type in mouseForces
        mouseForces.externalMouseState.button = value;

        // Apply the change via externalInput
        externalInput.setMouseButton(
          value,
          mouseForces.externalMouseState.isPressed
        );

        console.log("Button type changed to:", value);
      });

    // Update the UI when external data changes button type
    externalInput.onButtonTypeChange = (type) => {
      buttonTypeControl.type = type;
      buttonController.updateDisplay();
    };

    // Sensitivity control
    this.externalInputFolder
      .add(
        { sensitivity: mouseForces.externalSensitivity },
        "sensitivity",
        0.0001,
        0.01
      )
      .name("Sensitivity")
      .onChange((value) => {
        externalInput.setSensitivity(value);
      });

    // Position display (read-only)
    const positionDisplay = {
      position: `X: ${mouseForces.externalMouseState.position.x.toFixed(
        2
      )}, Y: ${mouseForces.externalMouseState.position.y.toFixed(2)}`,
    };

    const positionController = this.externalInputFolder
      .add(positionDisplay, "position")
      .name("Position")
      .disable();

    // Update position display periodically
    setInterval(() => {
      if (mouseForces.externalInputEnabled) {
        positionDisplay.position = `X: ${mouseForces.externalMouseState.position.x.toFixed(
          2
        )}, Y: ${mouseForces.externalMouseState.position.y.toFixed(2)}`;
        positionController.updateDisplay();
      }
    }, 100);
  }

  initEmuInputControls() {
    // Make sure EMU forces exist before adding controls
    if (!this.main.externalInput?.emuForces) return;

    const externalInput = this.main.externalInput;
    const emuForces = externalInput.emuForces;

    // EMU input enable/disable
    this.emuInputFolder
      .add({ enabled: false }, "enabled")
      .name("Enable EMU Input")
      .onChange((value) => {
        if (value) {
          externalInput.enableEmu();
        } else {
          externalInput.disableEmu();
        }
      });

    // Accel sensitivity
    this.emuInputFolder
      .add({ sensitivity: 1.0 }, "sensitivity", 0.1, 5.0, 0.1)
      .name("Accel Sensitivity")
      .onChange((value) => {
        externalInput.setAccelSensitivity(value);
      });

    // Accel gravity multiplier - adjust the range for better control
    this.emuInputFolder
      .add(
        { multiplier: emuForces.accelGravityMultiplier },
        "multiplier",
        0.1,
        5.0,
        0.1
      )
      .name("Gravity Strength")
      .onChange((value) => {
        emuForces.setAccelGravityMultiplier(value);
      });

    // Add a toggle for 360-degree gravity
    this.emuInputFolder
      .add({ enabled: true }, "enabled")
      .name("360° Gravity")
      .onChange((value) => {
        // This is already the default behavior, but adding a UI control for clarity
      });

    // Calibration button
    const calibrateButton = {
      calibrate: () => {
        externalInput.calibrateEmu();
        console.log("EMU sensors calibrated");
      },
    };

    this.emuInputFolder
      .add(calibrateButton, "calibrate")
      .name("Calibrate Sensors");

    // EMU data display (read-only)
    const dataDisplay = {
      accel: "X: 0.00, Y: 0.00, Z: 0.00",
    };

    const accelController = this.emuInputFolder
      .add(dataDisplay, "accel")
      .name("Accelerometer")
      .disable();

    // Update sensor displays periodically
    setInterval(() => {
      if (emuForces?.enabled) {
        const data = emuForces.emuData;
        dataDisplay.accel = `X: ${data.accelX.toFixed(
          2
        )}, Y: ${data.accelY.toFixed(2)}, Z: ${data.accelZ.toFixed(2)}`;
        accelController.updateDisplay();
      }
    }, 100);

    // Add visualizer toggle
    this.emuInputFolder
      .add({ showVisualizer: true }, "showVisualizer")
      .name("Show Visualization")
      .onChange((value) => {
        if (value) {
          this.main.emuVisualizer.show();
        } else {
          this.main.emuVisualizer.hide();
        }
      });
  }

  initMicInputControls() {
    if (!this.main.audioAnalyzer) return;

    const analyzer = this.main.audioAnalyzer;
    const externalInput = this.main.externalInput;

    // Store mic modulators folders
    this.micModulatorFolders = [];
    this.micControllers = [];

    // Enable toggle at ROOT level
    this.micEnableController = this.micInputFolder
      .add({ enabled: externalInput?.micForces?.enabled || false }, "enabled")
      .name("Enable Audio Input")
      .onChange((value) => {
        if (value) {
          externalInput.enableMic();

          // If visualizer is supposed to be visible, it will show now
          if (externalInput.micForces.visualizerVisible) {
            // Give a short delay to ensure audio is initialized
            setTimeout(() => {
              externalInput.micForces.showVisualizer();

              // Ensure checkbox is synced
              if (this.visualizerToggle) {
                this.visualizerToggle.setValue(true);
              }
            }, 100);
          }

          // Refresh device list when enabled
          if (this.audioInputDeviceSelect) {
            this.populateAudioDevices();
          }
        } else {
          externalInput.disableMic();
        }

        // Toggle visibility of all other controls
        this.toggleAllMicControlsVisibility(value);
      });

    // Add device selector right after the enable toggle
    this.addAudioDeviceSelector();

    // Register available targets from other UI panels
    this.registerAvailableTargets();

    // Global sensitivity control
    this.micSensitivityController = this.micInputFolder
      .add(
        { sensitivity: externalInput?.micForces?.sensitivity || 1.0 },
        "sensitivity",
        0.1,
        10.0,
        0.1
      )
      .name("Global Sensitivity")
      .onChange((value) => {
        if (externalInput) {
          externalInput.setMicSensitivity(value);
        }
      });
    this.micControllers.push(this.micSensitivityController);

    // Global smoothing control
    this.micSmoothingController = this.micInputFolder
      .add(
        { smoothing: externalInput?.micForces?.smoothing || 0.8 },
        "smoothing",
        0,
        1,
        0.01
      )
      .name("Smoothing")
      .onChange((value) => {
        if (externalInput) {
          externalInput.setMicSmoothing(value);
        }
      });
    this.micControllers.push(this.micSmoothingController);

    // Calibrate button
    const calibrationControl = {
      calibrate: () => {
        if (externalInput?.micForces?.enabled) {
          externalInput.calibrateMic();
          alert("Microphone calibrated to current ambient level");
        } else {
          alert("Please enable microphone input first");
        }
      },
    };

    const calibrateController = this.micInputFolder
      .add(calibrationControl, "calibrate")
      .name("Calibrate Mic");
    this.micControllers.push(calibrateController);

    // Add modulator button
    const addModulatorControl = {
      add: () => this.addMicModulator(),
    };

    const addModulatorController = this.micInputFolder
      .add(addModulatorControl, "add")
      .name("Add Modulator");
    this.micControllers.push(addModulatorController);

    // Rest of the method remains unchanged...
    // ...

    // Add audio analyzer controls in a subfolder
    const analyzerFolder = this.micInputFolder.addFolder(
      "Audio Analysis Settings"
    );
    this.micControllers.push(analyzerFolder);

    // FFT size control
    const fftSizes = {
      "512 (Faster)": 512,
      "1024 (Default)": 1024,
      "2048 (Detailed)": 2048,
      "4096 (High Detail)": 4096,
      "8192 (Max Detail)": 8192,
    };

    analyzerFolder
      .add({ fftSize: "1024 (Default)" }, "fftSize", Object.keys(fftSizes))
      .name("FFT Resolution")
      .onChange((value) => {
        if (externalInput?.micForces) {
          externalInput.micForces.setFftSize(fftSizes[value]);
        }
      });

    // Beat detection controls
    analyzerFolder
      .add({ threshold: 1.5 }, "threshold", 1.1, 3.0, 0.1)
      .name("Beat Threshold")
      .onChange((value) => {
        if (externalInput?.micForces?.analyzer) {
          externalInput.micForces.analyzer.setBeatDetectionConfig({
            energyThreshold: value,
          });
        }
      });

    // Visualizer controls
    const visualizerFolder = this.micInputFolder.addFolder("Audio Visualizer");
    this.micControllers.push(visualizerFolder);

    // Toggle visualizer
    const vizState = {
      show: externalInput?.micForces?.visualizerVisible || false,
    };

    // Create the controller
    const visualizerToggle = visualizerFolder
      .add(vizState, "show")
      .name("Show Visualizer")
      .onChange((value) => {
        if (externalInput?.micForces) {
          if (value) {
            externalInput.micForces.showVisualizer();
          } else {
            externalInput.micForces.hideVisualizer();
          }
        }
      });

    // Store reference to update later
    this.visualizerToggle = visualizerToggle;

    // Theme selector
    visualizerFolder
      .add({ theme: "dark" }, "theme", ["dark", "light", "neon"])
      .name("Visualizer Theme")
      .onChange((value) => {
        if (externalInput?.micForces) {
          externalInput.micForces.setVisualizerTheme(value);
        }
      });

    // Visualization modes
    const vizTypes = {
      "Frequency Spectrum": "spectrum",
      Waveform: "waveform",
      "Volume Level": "volume",
      "Frequency Bands": "bands",
      "Volume History": "history",
    };

    // Create a selection of checkboxes for visualizations
    const selectedVizs = {
      "Frequency Spectrum": true,
      Waveform: true,
      "Volume Level": true,
      "Frequency Bands": true,
      "Volume History": false,
    };

    // Add a checkbox for each visualization type
    Object.keys(vizTypes).forEach((vizName) => {
      visualizerFolder
        .add(selectedVizs, vizName)
        .name(vizName)
        .onChange(() => {
          // Create array of selected visualization types
          const selected = Object.keys(selectedVizs)
            .filter((key) => selectedVizs[key])
            .map((key) => vizTypes[key]);

          if (externalInput?.micForces?.visualizer) {
            externalInput.micForces.setVisualizations(selected);
          }
        });
    });

    // Close these folders by default
    analyzerFolder.open(false);
    visualizerFolder.open(false);

    // Hide controls initially (or show if already enabled)
    const isEnabled = externalInput?.micForces?.enabled || false;
    this.toggleAllMicControlsVisibility(isEnabled);

    this.micInputFolder.open();
  }

  // Add these methods to the InputUi class
  getControlTargets() {
    // Access leftUi implementation if available
    if (
      this.main.ui &&
      this.main.ui.leftUi &&
      typeof this.main.ui.leftUi.getControlTargets === "function"
    ) {
      return this.main.ui.leftUi.getControlTargets();
    }

    // Fallback to a minimal implementation
    return ["None", "Particle Size", "Gravity Strength", "Repulsion"];
  }

  getControllerForTarget(targetName) {
    // Access leftUi implementation if available
    if (
      this.main.ui &&
      this.main.ui.leftUi &&
      typeof this.main.ui.leftUi.getControllerForTarget === "function"
    ) {
      return this.main.ui.leftUi.getControllerForTarget(targetName);
    }

    // Fallback to null
    return null;
  }

  findTargetNameByController(controller) {
    if (!controller) {
      console.warn("Null controller provided to findTargetNameByController");
      return null;
    }

    // Log the controller we're trying to find
    console.log("Finding target name for controller:", controller.property);

    // Try exact controller matching first
    const targets = this.getControlTargets();
    for (const targetName of targets) {
      if (targetName === "None") continue;

      const info = this.getControllerForTarget(targetName);
      if (info?.controller === controller) {
        console.log(`Found exact match for controller: ${targetName}`);
        return targetName;
      }
    }

    // If no exact match, try matching by property
    const propertyName = controller.property;
    if (propertyName) {
      // Log all available target properties for debugging
      console.log("Available target properties:");
      for (const targetName of targets) {
        if (targetName === "None") continue;

        const info = this.getControllerForTarget(targetName);
        if (info?.controller) {
          console.log(`- ${targetName}: ${info.controller.property}`);
        }
      }

      // Try to find a match by property
      for (const targetName of targets) {
        if (targetName === "None") continue;

        const info = this.getControllerForTarget(targetName);
        if (info?.controller?.property === propertyName) {
          console.log(`Found property match for controller: ${targetName}`);
          return targetName;
        }
      }

      // As a last resort, try matching by similar property name
      for (const targetName of targets) {
        if (targetName === "None") continue;

        // If target name contains the property or vice versa
        if (
          targetName.toLowerCase().includes(propertyName.toLowerCase()) ||
          propertyName.toLowerCase().includes(targetName.toLowerCase())
        ) {
          console.log(`Found partial name match for controller: ${targetName}`);
          return targetName;
        }
      }
    }

    console.warn(
      `Could not find target name for controller: ${propertyName || "unknown"}`
    );
    return null;
  }

  // Add a new method to create mic modulators
  addMicModulator_Old() {
    if (!this.main.externalInput?.micForces) {
      console.error("No mic forces available");
      return null;
    }

    const micForces = this.main.externalInput.micForces;

    // Create a new modulator object
    const modulator = {
      target: "None",
      sensitivity: 1.0,
      min: 0,
      max: 1,
      frequencyMin: 0,
      frequencyMax: 20000,
    };

    // Create a new folder for this modulator
    const index = this.micModulatorFolders
      ? this.micModulatorFolders.length
      : 0;
    const folder = this.micInputFolder.addFolder(`Modulator ${index + 1}`);

    if (!this.micModulatorFolders) {
      this.micModulatorFolders = [];
    }
    this.micModulatorFolders.push(folder);

    // Store modulator reference in the folder for easy access
    folder._modulator = modulator;

    // Get control targets - THIS CHANGE IS CRITICAL
    const targets = this.getControlTargets();

    // Create a key-based array of target options (with "None")
    const targetOptions = ["None", ...Object.keys(targets)];

    console.log("Available targets for mic modulator:", targetOptions);

    // Add target selector - FIXED to use string names instead of objects
    const targetController = folder
      .add(modulator, "target", targetOptions)
      .name("Target Parameter")
      .onChange((targetName) => {
        // Log the actual targetName string
        console.log(`Mic modulator: selected target "${targetName}"`);

        // Remove previous target if one exists
        if (modulator._activeController) {
          micForces.removeTarget(modulator._activeController);
          modulator._activeController = null;
        }

        if (targetName === "None") {
          return;
        }

        // Get controller info using the string name
        const controlInfo = this.getControllerForTarget(targetName);
        console.log(
          `Mic modulator: got control info for "${targetName}":`,
          controlInfo
        );

        if (controlInfo && controlInfo.controller) {
          // Update min/max based on the controller's range
          modulator.min = controlInfo.min;
          modulator.max = controlInfo.max;

          console.log(
            `Mic modulator: setting range for ${targetName}: ${controlInfo.min} - ${controlInfo.max}`
          );

          // Update the UI sliders
          minController.min(controlInfo.min * 0.5);
          minController.max(controlInfo.max * 1.5);
          maxController.min(controlInfo.min * 0.5);
          maxController.max(controlInfo.max * 1.5);

          minController.setValue(controlInfo.min);
          maxController.setValue(controlInfo.max);

          // Add/update the target in micForces
          micForces.addTarget(
            controlInfo.controller,
            modulator.min,
            modulator.max,
            folder,
            modulator.sensitivity,
            {
              min: modulator.frequencyMin,
              max: modulator.frequencyMax,
            }
          );

          console.log(
            `Mic modulator: successfully added target for ${targetName}`
          );

          // Store the active controller reference for cleanup
          modulator._activeController = controlInfo.controller;
        } else {
          console.warn(
            `Mic modulator: could not find controller for ${targetName}`
          );
        }
      });

    // Sensitivity for this specific modulator
    folder
      .add(modulator, "sensitivity", 0.1, 2.0, 0.01)
      .name("Sensitivity")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetSensitivity(modulator._activeController, value);
        }
      });

    // Min/max range controls
    const minController = folder
      .add(modulator, "min", 0, 1, 0.01)
      .name("Min Value")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetRange(
            modulator._activeController,
            value,
            modulator.max
          );
        }
      });

    const maxController = folder
      .add(modulator, "max", 0, 1, 0.01)
      .name("Max Value")
      .onChange((value) => {
        if (modulator._activeController) {
          micForces.updateTargetRange(
            modulator._activeController,
            modulator.min,
            value
          );
        }
      });

    // Add frequency band selector instead of min/max frequency sliders
    const bandOptions = {
      "None (Full Range)": "none",
      "Sub Bass (20-60 Hz)": "sub",
      "Bass (60-250 Hz)": "bass",
      "Low Mid (250-500 Hz)": "lowMid",
      "Mid Range (500-2k Hz)": "mid",
      "High Mid (2k-4k Hz)": "highMid",
      "Presence (4k-6k Hz)": "presence",
      "Brilliance (6k-20k Hz)": "brilliance",
    };

    // Add band selection to modulator object
    modulator.frequencyBand = "none";

    folder
      .add(modulator, "frequencyBand", bandOptions)
      .name("Frequency Band")
      .onChange((bandKey) => {
        if (!micForces || !modulator._activeController) return;

        if (bandKey === "none") {
          // Full range
          modulator.frequencyMin = 0;
          modulator.frequencyMax = 20000;
          micForces.updateTargetFrequencyRange(
            modulator._activeController,
            0,
            20000
          );
          console.log("Set frequency band to full range");
        } else if (micForces.analyzer && micForces.analyzer.bands[bandKey]) {
          // Get band range from analyzer
          const band = micForces.analyzer.bands[bandKey];
          modulator.frequencyMin = band.min;
          modulator.frequencyMax = band.max;

          // Update the target frequency range
          micForces.updateTargetFrequencyRange(
            modulator._activeController,
            band.min,
            band.max
          );

          console.log(
            `Set frequency band to ${bandKey}: ${band.min}-${band.max} Hz`
          );
        }
      });

    // Remove button
    const removeControl = {
      remove: () => {
        // First remove from MicForces
        if (modulator._activeController) {
          micForces.removeTarget(modulator._activeController);
        }

        // Remove folder from UI
        folder.destroy();

        // Remove from tracking array
        const folderIndex = this.micModulatorFolders.indexOf(folder);
        if (folderIndex > -1) {
          this.micModulatorFolders.splice(folderIndex, 1);
        }
      },
    };

    folder.add(removeControl, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    // Add a small band visualization to show the frequency band activity
    const bandVisualContainer = document.createElement("div");
    bandVisualContainer.style.margin = "8px 0";
    bandVisualContainer.style.padding = "0";
    bandVisualContainer.style.position = "relative";

    // Create band level visualization
    const bandVisual = document.createElement("div");
    bandVisual.style.height = "16px";
    bandVisual.style.backgroundColor = "#333";
    bandVisual.style.borderRadius = "3px";
    bandVisual.style.overflow = "hidden";
    bandVisual.style.position = "relative";

    // Create the level bar
    const bandLevelBar = document.createElement("div");
    bandLevelBar.style.height = "100%";
    bandLevelBar.style.backgroundColor = "#4f4";
    bandLevelBar.style.width = "0%";
    bandLevelBar.style.position = "absolute";
    bandLevelBar.style.left = "0";
    bandLevelBar.style.top = "0";
    bandLevelBar.style.transition = "width 0.05s ease-out";

    // Create label that shows band name and level
    const bandLabel = document.createElement("div");
    bandLabel.style.position = "absolute";
    bandLabel.style.left = "5px";
    bandLabel.style.top = "0";
    bandLabel.style.color = "#fff";
    bandLabel.style.fontSize = "10px";
    bandLabel.style.lineHeight = "16px";
    bandLabel.style.textShadow = "1px 1px 1px rgba(0,0,0,0.5)";
    bandLabel.style.whiteSpace = "nowrap";
    bandLabel.style.overflow = "hidden";
    bandLabel.textContent = "Band: 0%";

    // Add elements to container
    bandVisual.appendChild(bandLevelBar);
    bandVisual.appendChild(bandLabel);
    bandVisualContainer.appendChild(bandVisual);

    // Add to the folder's DOM
    folder.domElement
      .querySelector(".children")
      .appendChild(bandVisualContainer);

    // Store references for updating
    modulator._bandVisual = {
      container: bandVisualContainer,
      bar: bandLevelBar,
      label: bandLabel,
      lastUpdate: 0,
      currentValue: 0,
    };

    return modulator;
  }

  addMicModulator_New() {
    // Create a new input modulator
    const modulator = this.modulatorManager.createInputModulator();

    // Create a folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.micInputFolder.addFolder(`Mic Modulator ${index + 1}`);

    // Add this folder to our tracking array
    this.modulatorFolders.push(folder);

    // Add UI controls for the modulator
    folder
      .add(modulator, "enabled")
      .name("Enabled")
      .onChange((value) => {
        // If disabled, reset to original value
        if (!value) modulator.resetToOriginal();
      });

    // Add target selector
    const targetNames = this.modulatorManager.getTargetNames();

    // Get references to range controllers for updating later
    let minController, maxController;

    folder
      .add(modulator, "targetName", targetNames)
      .name("Target")
      .onChange((value) => {
        // Set the target
        modulator.setTarget(value);

        // Auto-range: Update min/max controllers
        if (modulator.target) {
          // Update the range controls with the target's min/max
          const targetMin = modulator.target.min;
          const targetMax = modulator.target.max;

          // Update model values
          modulator.min = targetMin;
          modulator.max = targetMax;

          // Update controller ranges and values
          if (minController) {
            minController.min(targetMin * 0.5);
            minController.max(targetMax * 1.5);
            minController.setValue(targetMin);
            minController.updateDisplay();
          }

          if (maxController) {
            maxController.min(targetMin * 0.5);
            maxController.max(targetMax * 1.5);
            maxController.setValue(targetMax);
            maxController.updateDisplay();
          }
        }
      });

    // Add frequency band selector
    const bands = {
      "All (Volume)": "none",
      "Sub Bass": "sub",
      Bass: "bass",
      "Low Mid": "lowMid",
      Mid: "mid",
      "High Mid": "highMid",
      Treble: "treble",
    };
    folder.add(modulator, "frequencyBand", bands).name("Frequency Band");

    // Add sensitivity slider
    folder.add(modulator, "sensitivity", 0.1, 5, 0.1).name("Sensitivity");

    // Add smoothing slider
    folder.add(modulator, "smoothing", 0, 0.99, 0.01).name("Smoothing");

    // Add range controls with empty ranges initially
    minController = folder.add(modulator, "min", 0, 1, 0.01).name("Min Value");
    maxController = folder.add(modulator, "max", 0, 1, 0.01).name("Max Value");

    // Add remove button
    const removeObj = {
      remove: () => {
        // Remove the modulator
        this.modulatorManager.modulators =
          this.modulatorManager.modulators.filter((m) => m !== modulator);

        // Remove the folder
        folder.destroy();

        // Remove from our tracking array
        const idx = this.modulatorFolders.indexOf(folder);
        if (idx !== -1) {
          this.modulatorFolders.splice(idx, 1);
        }
      },
    };
    folder.add(removeObj, "remove").name("Remove");

    // Add a small band visualization to show the frequency band activity
    const bandVisualContainer = document.createElement("div");
    bandVisualContainer.style.margin = "8px 0";
    bandVisualContainer.style.padding = "0";
    bandVisualContainer.style.position = "relative";

    // Create band level visualization
    const bandVisual = document.createElement("div");
    bandVisual.style.height = "16px";
    bandVisual.style.backgroundColor = "#333";
    bandVisual.style.borderRadius = "3px";
    bandVisual.style.overflow = "hidden";
    bandVisual.style.position = "relative";

    // Create the level bar
    const bandLevelBar = document.createElement("div");
    bandLevelBar.style.height = "100%";
    bandLevelBar.style.backgroundColor = "#4f4";
    bandLevelBar.style.width = "0%";
    bandLevelBar.style.position = "absolute";
    bandLevelBar.style.left = "0";
    bandLevelBar.style.top = "0";
    bandLevelBar.style.transition = "width 0.05s ease-out";

    // Create label that shows band name and level
    const bandLabel = document.createElement("div");
    bandLabel.style.position = "absolute";
    bandLabel.style.left = "5px";
    bandLabel.style.top = "0";
    bandLabel.style.color = "#fff";
    bandLabel.style.fontSize = "10px";
    bandLabel.style.lineHeight = "16px";
    bandLabel.style.textShadow = "1px 1px 1px rgba(0,0,0,0.5)";
    bandLabel.style.whiteSpace = "nowrap";
    bandLabel.style.overflow = "hidden";
    bandLabel.textContent = "All: 0%";

    // Add elements to container
    bandVisual.appendChild(bandLevelBar);
    bandVisual.appendChild(bandLabel);
    bandVisualContainer.appendChild(bandVisual);

    // Add to the folder's DOM
    folder.domElement
      .querySelector(".children")
      .appendChild(bandVisualContainer);

    // Store references for updating
    modulator._bandVisual = {
      container: bandVisualContainer,
      bar: bandLevelBar,
      label: bandLabel,
      lastUpdate: 0,
      currentValue: 0,
    };

    return modulator;
  }

  // Add a new method to create mic modulators
  addMicModulator() {
    // Use the new implementation by default
    return this.addMicModulator_New();
  }

  // Update the microphone UI display from preset
  updateMicInputDisplay() {
    if (!this.main.externalInput?.micForces) return;

    const micForces = this.main.externalInput.micForces;

    // Update global controls
    if (this.micSensitivityController) {
      this.micSensitivityController.setValue(micForces.sensitivity || 1.0);
      this.micSensitivityController.updateDisplay();
    }

    if (this.micSmoothingController) {
      this.micSmoothingController.setValue(micForces.smoothing || 0.8);
      this.micSmoothingController.updateDisplay();
    }

    // Clear existing modulators
    if (this.micModulatorFolders && this.micModulatorFolders.length > 0) {
      console.log("Clearing existing microphone modulators");

      // Remove all GUI folders
      for (let i = this.micModulatorFolders.length - 1; i >= 0; i--) {
        if (this.micModulatorFolders[i]) {
          this.micModulatorFolders[i].destroy();
        }
      }
      this.micModulatorFolders = [];
    }

    // Get all active controllers from micForces
    const activeControllers = Array.from(micForces.targetControllers.entries());
    console.log(
      `Found ${activeControllers.length} active mic controllers to recreate`
    );

    // Get all control targets by name (not the controllers themselves)
    const targetNames = ["None", ...Object.keys(this.getControlTargets())];

    // For each active controller, find its matching target name
    activeControllers.forEach(([controller, config], index) => {
      // Create new modulator
      const modulator = this.addMicModulator();
      if (!modulator) return;

      // Get folder
      const folder =
        this.micModulatorFolders[this.micModulatorFolders.length - 1];
      if (!folder) return;

      // Store controller reference
      modulator._activeController = controller;

      // Find target name by property matching
      const propertyName = controller.property;
      let matchingTargetName = null;

      // Use property name to find matching target
      for (const targetName of targetNames) {
        if (targetName === "None") continue;

        const info = this.getControllerForTarget(targetName);
        if (info?.controller?.property === propertyName) {
          matchingTargetName = targetName;
          break;
        }
      }

      // Set values on modulator
      modulator.min = config.min;
      modulator.max = config.max;
      modulator.sensitivity = config.sensitivity || 1.0;

      // Set the target dropdown with the string name
      if (matchingTargetName) {
        console.log(`Setting target dropdown to "${matchingTargetName}"`);

        // Get target controller (first controller in folder)
        const targetController = folder.controllers[0];

        // Set value and explicitly call its callbacks
        targetController.setValue(matchingTargetName);
        targetController._callbacks.forEach((cb) => cb(matchingTargetName));
      }

      // Update displays for the other controllers
      for (let i = 1; i < folder.controllers.length; i++) {
        folder.controllers[i].updateDisplay();
      }

      // Inside the updateMicInputDisplay method, after setting sensitivity:
      // Add code to restore frequency band selection based on frequency range

      // Find the matching band for this frequency range
      if (config.frequency) {
        const min = config.frequency.min;
        const max = config.frequency.max;

        // Find matching band
        let matchingBand = "none";

        if (micForces.analyzer && micForces.analyzer.bands) {
          // Look through bands to find a matching one
          for (const [bandKey, bandRange] of Object.entries(
            micForces.analyzer.bands
          )) {
            if (
              Math.abs(bandRange.min - min) < 10 &&
              Math.abs(bandRange.max - max) < 10
            ) {
              matchingBand = bandKey;
              break;
            }
          }
        }

        // Set band in modulator object
        modulator.frequencyBand = matchingBand;

        // Update band dropdown (usually 3rd controller in folder)
        const bandController = folder.controllers[2]; // After target and sensitivity
        if (bandController) {
          bandController.setValue(matchingBand);
          bandController.updateDisplay();
        }

        // Also update the visual label to match the selected band
        if (modulator._bandVisual && modulator._bandVisual.label) {
          let bandName = matchingBand === "none" ? "Full Range" : matchingBand;

          // Format the band name to look nice
          if (bandName !== "Full Range") {
            bandName = bandName.charAt(0).toUpperCase() + bandName.slice(1);
            if (bandName === "LowMid") bandName = "Low Mid";
            if (bandName === "HighMid") bandName = "High Mid";
          }

          modulator._bandVisual.label.textContent = `${bandName}: 0%`;
        }
      }
    });

    // Update UI input enabled state
    if (this.micEnableController) {
      const isEnabled = micForces.enabled || false;
      this.micEnableController.setValue(isEnabled);
      this.toggleAllMicControlsVisibility(isEnabled);
    }
  }

  // Add preset control methods
  initMicPresetControls(presetManager) {
    if (!presetManager) {
      console.warn("PresetManager not provided to InputUi");
      return;
    }

    this.presetManager = presetManager;

    // Create preset controls for the main mic input folder
    // const presetLabel = document.createElement("div");
    // presetLabel.style.paddingBottom = "6px";
    // presetLabel.style.paddingTop = "6px";
    // presetLabel.textContent = "Presets";
    // presetLabel.style.fontWeight = "bold";

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";
    presetSelect.style.margin = "5px 0";
    presetSelect.style.width = "100%";

    this.updateMicPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Mic input preset selector changed to:", value);
      this.presetManager.loadMicPreset(value, this);
    });

    this.micPresetControls = { selector: presetSelect };

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "0 0 8px 0";
    actionsContainer.style.flexWrap = "wrap";

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter microphone preset name:");
      if (
        presetName &&
        this.presetManager.saveMicPreset(
          presetName,
          this.main.externalInput.micForces
        )
      ) {
        this.updateMicPresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedMicPreset();
        alert(`Microphone preset "${presetName}" saved.`);
      }
    });

    // DELETE BUTTON
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.style.margin = "0 2px";
    deleteButton.addEventListener("click", () => {
      const current = presetSelect.value;
      if (current === "None") {
        alert("Cannot delete the None preset!");
        return;
      }
      console.log("Attempting to delete mic preset:", current);
      if (
        confirm(`Delete mic preset "${current}"?`) &&
        this.presetManager.deleteMicPreset(current)
      ) {
        this.updateMicPresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedMicPreset();
        alert(`Microphone preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Get the insertion point - after the enable button but before other controls
    const enableController = this.micEnableController;
    const insertionPoint = enableController
      ? enableController.domElement.nextSibling
      : this.micInputFolder.domElement.querySelector(".children").firstChild;

    // Create a container for our preset controls
    const presetContainer = document.createElement("div");
    presetContainer.classList.add("controller");
    presetContainer.style.marginTop = "4px";
    // presetContainer.appendChild(presetLabel);
    presetContainer.appendChild(presetSelect);
    presetContainer.appendChild(actionsContainer);

    // Store reference to the container for visibility toggling
    this.presetContainer = presetContainer;

    // Insert after the enable button
    if (insertionPoint) {
      this.micInputFolder.domElement
        .querySelector(".children")
        .insertBefore(presetContainer, insertionPoint);
    } else {
      this.micInputFolder.domElement
        .querySelector(".children")
        .appendChild(presetContainer);
    }

    // Set initial visibility based on microphone enabled state
    const isEnabled = this.main.externalInput?.micForces?.enabled || false;
    this.toggleMicPresetControlsVisibility(isEnabled);
  }

  // Helper method to update preset dropdown
  updateMicPresetDropdown(selectElement) {
    if (!this.main.presetManager) return;

    const options = this.main.presetManager.getMicPresetOptions();
    console.log("Updating mic preset dropdown with options:", options);

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.main.presetManager.getSelectedMicPreset();
  }

  // Add a helper method to enable/disable modulations when switching presets
  disableMicModulations() {
    const externalInput = this.main.externalInput;
    if (externalInput?.micForces) {
      externalInput.micForces.clearTargets();
    }

    // Clear UI representation
    if (this.micModulatorFolders) {
      this.micModulatorFolders.forEach((folder) => folder.destroy());
      this.micModulatorFolders = [];
    }
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;
    console.log("InputUi initialized with preset manager");

    // For now, we'll skip the complex preset UI
    // We'll add it back once the core functionality is working
  }

  // Add a helper method to toggle preset controls visibility
  toggleMicPresetControlsVisibility(show) {
    if (this.presetContainer) {
      this.presetContainer.style.display = show ? "block" : "none";
    }
  }

  // Updated method to toggle visibility of all mic controls
  toggleAllMicControlsVisibility(show) {
    // Toggle preset controls
    if (this.presetContainer) {
      this.presetContainer.style.display = show ? "block" : "none";
    }

    // Toggle all other controllers
    if (this.micControllers) {
      for (const controller of this.micControllers) {
        if (controller) {
          // Handle both dat.gui controllers and direct DOM elements
          if (controller.domElement) {
            // Regular dat.gui controller
            controller.domElement.style.display = show ? "block" : "none";

            // Special handling for folders
            if (controller._title) {
              // Folders have a _title property
              // For folders, we need to toggle the entire folder element
              const folderElement = controller.domElement.parentElement;
              if (folderElement && folderElement.classList.contains("folder")) {
                folderElement.style.display = show ? "block" : "none";
              }

              // Also close folders when hiding
              if (!show && controller.closed === false) {
                controller.close();
              }
            }
          } else if (controller instanceof HTMLElement) {
            // Direct DOM element like our device container
            controller.style.display = show ? "block" : "none";
          }
        }
      }
    }

    // Toggle modulator folders
    if (this.micModulatorFolders) {
      for (const folder of this.micModulatorFolders) {
        if (folder && folder.domElement) {
          // For folders, we need to toggle the entire folder element
          const folderElement = folder.domElement.parentElement;
          if (folderElement && folderElement.classList.contains("folder")) {
            folderElement.style.display = show ? "block" : "none";
          } else {
            folder.domElement.style.display = show ? "block" : "none";
          }

          // Close folders when hiding
          if (!show && folder.closed === false) {
            folder.close();
          }
        }
      }
    }
  }

  ////////

  addAudioDeviceSelector() {
    if (!this.audioDevices) {
      this.audioDevices = [];
    }

    if (!this.micInputFolder) return;

    // Container for device selection
    const deviceContainer = document.createElement("div");
    deviceContainer.classList.add("controller");
    deviceContainer.style.marginTop = "8px";
    deviceContainer.style.marginBottom = "8px";

    // Label for device selection
    const deviceLabel = document.createElement("div");
    deviceLabel.textContent = "Select Audio Input";
    deviceLabel.style.marginBottom = "4px";

    // Create select dropdown
    this.audioInputDeviceSelect = document.createElement("select");
    this.audioInputDeviceSelect.classList.add("preset-select");
    this.audioInputDeviceSelect.style.padding = "4px";
    this.audioInputDeviceSelect.style.width = "100%";

    // Add option for loading devices
    const loadingOption = document.createElement("option");
    loadingOption.textContent = "Loading audio devices...";
    this.audioInputDeviceSelect.appendChild(loadingOption);

    // Handle device change
    this.audioInputDeviceSelect.addEventListener("change", (e) => {
      const deviceId = e.target.value;
      console.log("Selected audio device:", deviceId);
      this.setAudioInputDevice(deviceId);
    });

    // Add elements to container
    deviceContainer.appendChild(deviceLabel);
    deviceContainer.appendChild(this.audioInputDeviceSelect);

    // Find insertion point - right after the enable button
    const insertionPoint = this.micEnableController
      ? this.micEnableController.domElement.nextSibling
      : this.micInputFolder.domElement.querySelector(".children").firstChild;

    // Add to UI folder
    this.micInputFolder.domElement
      .querySelector(".children")
      .insertBefore(deviceContainer, insertionPoint);

    // Store reference to the container for visibility toggling
    this.deviceContainer = deviceContainer;
    this.micControllers.push(deviceContainer);

    // Populate with available devices
    this.populateAudioDevices();
  }

  // Add method to populate audio devices
  async populateAudioDevices() {
    try {
      // Check if browser supports MediaDevices API
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("Browser doesn't support device enumeration");
        return;
      }

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );

      // Clear existing options
      this.audioInputDeviceSelect.innerHTML = "";

      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "default";
      defaultOption.textContent = "Default Input";
      this.audioInputDeviceSelect.appendChild(defaultOption);

      // Add each audio input device
      audioInputDevices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        // Handle unnamed devices by giving them a generic name
        option.textContent =
          device.label ||
          `Audio Input ${audioInputDevices.indexOf(device) + 1}`;
        this.audioInputDeviceSelect.appendChild(option);
        this.audioDevices.push(device);
      });
    } catch (err) {
      console.error("Error enumerating audio devices:", err);
      this.audioInputDeviceSelect.innerHTML =
        "<option>Error loading devices</option>";
    }
  }

  // Method to set the selected audio input device
  setAudioInputDevice(deviceId) {
    if (!this.main.externalInput) return;

    const constraints = {
      audio: {
        deviceId: deviceId !== "default" ? { exact: deviceId } : undefined,
      },
    };

    // Pass these constraints to the external input manager
    this.main.externalInput.setAudioInputDevice(constraints);
  }

  // Update the updateAllBandVisualizations method

  updateAllBandVisualizations() {
    if (
      !this.main.audioAnalyzer ||
      !this.main.externalInput?.micForces?.enabled
    ) {
      return;
    }

    const analyzer = this.main.audioAnalyzer;
    const micForces = this.main.externalInput.micForces;
    const now = performance.now();

    // Update modulators with visual elements
    if (this.modulatorFolders) {
      this.modulatorManager.modulators.forEach((modulator) => {
        if (!modulator._bandVisual) return;

        // Limit update frequency for performance
        if (now - modulator._bandVisual.lastUpdate < 50) return;
        modulator._bandVisual.lastUpdate = now;

        let rawValue = 0;
        let bandName = "All";

        // Method to safely check for function existence and call if it exists
        const safeCall = (obj, methodName, ...args) => {
          if (obj && typeof obj[methodName] === "function") {
            return obj[methodName](...args);
          }
          return 0;
        };

        if (modulator.frequencyBand !== "none" && analyzer) {
          // Get the appropriate frequency band value
          switch (modulator.frequencyBand) {
            case "sub":
              rawValue =
                safeCall(analyzer, "getAverageEnergy", "sub") ||
                safeCall(micForces, "getBandEnergy", "sub") ||
                0;
              bandName = "Sub Bass";
              break;
            case "bass":
              rawValue =
                safeCall(analyzer, "getAverageEnergy", "bass") ||
                safeCall(micForces, "getBandEnergy", "bass") ||
                0;
              bandName = "Bass";
              break;
            case "lowMid":
              rawValue =
                safeCall(analyzer, "getAverageEnergy", "lowMid") ||
                safeCall(micForces, "getBandEnergy", "lowMid") ||
                0;
              bandName = "Low Mid";
              break;
            case "mid":
              rawValue =
                safeCall(analyzer, "getAverageEnergy", "mid") ||
                safeCall(micForces, "getBandEnergy", "mid") ||
                0;
              bandName = "Mid";
              break;
            case "highMid":
              rawValue =
                safeCall(analyzer, "getAverageEnergy", "highMid") ||
                safeCall(micForces, "getBandEnergy", "highMid") ||
                0;
              bandName = "High Mid";
              break;
            case "treble":
              rawValue =
                safeCall(analyzer, "getAverageEnergy", "treble") ||
                safeCall(micForces, "getBandEnergy", "treble") ||
                0;
              bandName = "Treble";
              break;
            default:
              // Instead of calling getVolumeNormalized directly, try multiple possible methods
              rawValue =
                safeCall(analyzer, "getVolumeLevel") ||
                safeCall(analyzer, "getVolume") ||
                safeCall(micForces, "getSmoothedAmplitude") ||
                micForces.smoothedAmplitude ||
                0;
              bandName = "All";
              break;
          }
        } else {
          // Full range mode - try multiple volume access methods
          rawValue =
            safeCall(analyzer, "getVolumeLevel") ||
            safeCall(analyzer, "getVolume") ||
            safeCall(micForces, "getSmoothedAmplitude") ||
            micForces.smoothedAmplitude ||
            0;
        }

        // Apply sensitivity and smoothing
        let bandValue = rawValue * modulator.sensitivity;

        // Normalize to 0-1 range for visualization
        bandValue = Math.min(1.0, Math.max(0, bandValue));

        // Update the visual (0-100%)
        const level = bandValue * 100;
        modulator._bandVisual.bar.style.width = `${level}%`;

        // Update label with band name and value percentage
        modulator._bandVisual.label.textContent = `${bandName}: ${Math.round(
          level
        )}%`;

        // Color the bar based on level
        if (level > 80) {
          modulator._bandVisual.bar.style.backgroundColor = "#f44"; // Red for high levels
        } else if (level > 50) {
          modulator._bandVisual.bar.style.backgroundColor = "#ff4"; // Yellow for medium levels
        } else {
          modulator._bandVisual.bar.style.backgroundColor = "#4f4"; // Green for low levels
        }
      });
    }
  }

  // Also add this method to ensure compatibility with ModulatorManager
  updateControllerDisplays() {
    // This method intentionally does nothing for now
    // Will be implemented later to update UI when modulation occurs
  }

  // Add or update the update() method to ensure it processes audio modulators
  update() {
    if (!this.main.audioAnalyzer) return;

    // Update all modulators with their respective frequency band data
    for (let i = 0; i < this.modulatorManager.modulators.length; i++) {
      const modulator = this.modulatorManager.modulators[i];
      if (modulator.inputSource === "mic") {
        const analyzer = this.main.audioAnalyzer;
        const micForces = this.main.externalInput?.micForces;
        let value = 0;

        try {
          // Get the appropriate frequency band value
          switch (modulator.frequencyBand) {
            case "sub":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("sub")
                  : 0;
              break;
            case "bass":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("bass")
                  : 0;
              break;
            case "lowMid":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("lowMid")
                  : 0;
              break;
            case "mid":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("mid")
                  : 0;
              break;
            case "highMid":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("highMid")
                  : 0;
              break;
            case "treble":
              value =
                typeof analyzer.getAverageEnergy === "function"
                  ? analyzer.getAverageEnergy("treble")
                  : 0;
              break;
            case "none":
            default:
              // Use whatever volume method is available on the analyzer
              if (typeof analyzer.getVolume === "function") {
                value = analyzer.getVolume();
              } else if (typeof analyzer.volume !== "undefined") {
                value = analyzer.volume;
              } else if (micForces?.smoothedAmplitude !== undefined) {
                value = micForces.smoothedAmplitude;
              } else {
                value = 0;
              }
              break;
          }

          // // Add occasional logging to debug
          // if (Math.random() < 0.01) {
          //   console.log(
          //     `Audio data (${modulator.frequencyBand}): ${value.toFixed(4)}`
          //   );
          // }

          // Set the input value for the modulator
          modulator.setInputValue(value);
        } catch (e) {
          console.warn(
            `Error getting audio data for ${modulator.frequencyBand}:`,
            e
          );
        }
      }
    }

    // Update all modulators through the manager
    this.modulatorManager.update();
  }

  // Add this method to scan available controllers from leftUi and rightUi
  registerAvailableTargets() {
    console.log("InputUi delegating target registration to ModulatorManager");

    // Use the centralized method in ModulatorManager
    if (this.leftUi && this.rightUi) {
      this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);
    } else if (this.main.ui) {
      // Fallback to using main.ui references
      this.modulatorManager.registerTargetsFromUi(
        this.main.ui.leftUi,
        this.main.ui.rightUi
      );
    } else {
      console.warn("InputUi could not find UI panels for target registration");
    }
  }

  // Add this method to create a new input modulator with UI controls
  addMicModulator() {
    // Create a new input modulator
    const modulator = this.modulatorManager.createInputModulator();
    modulator.inputSource = "mic";

    // Create a folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.micInputFolder.addFolder(`Mic Modulator ${index + 1}`);

    // Add this folder to our tracking array
    this.modulatorFolders.push(folder);

    // Add UI controls for the modulator
    folder
      .add(modulator, "enabled")
      .name("Enabled")
      .onChange((value) => {
        if (!value) modulator.resetToOriginal();
      });

    // Get the LATEST target names directly from the manager
    const targetNames = this.modulatorManager.getTargetNames();
    console.log(
      `Adding mic modulator with ${targetNames.length} available targets`
    );

    // Get references to range controllers for updating later
    let minController, maxController;

    // Add target selector with all available targets - IMPORTANT: Start with no selection
    const targetController = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        // Only set target if it's not "None"
        if (value && value !== "None") {
          console.log(`Setting target to ${value}`);
          modulator.setTarget(value);
          this.updateRangeForTarget(modulator, minController, maxController);
        } else {
          // Disable modulation if "None" is selected
          modulator.targetName = null;
          modulator.target = null;
          modulator.targetController = null;
        }
      });

    // Set the initial value to "None"
    targetController.setValue("None");

    // Add frequency band selector
    const bands = {
      "All (Volume)": "none",
      "Sub Bass": "sub",
      Bass: "bass",
      "Low Mid": "lowMid",
      Mid: "mid",
      "High Mid": "highMid",
      Treble: "treble",
    };
    folder.add(modulator, "frequencyBand", bands).name("Frequency Band");

    // Add sensitivity slider
    folder.add(modulator, "sensitivity", 0.1, 5, 0.1).name("Sensitivity");

    // Add smoothing slider
    folder.add(modulator, "smoothing", 0, 0.99, 0.01).name("Smoothing");

    // Add range controls
    minController = folder.add(modulator, "min", 0, 1, 0.01).name("Min Value");
    maxController = folder.add(modulator, "max", 0, 1, 0.01).name("Max Value");

    // Add auto-range button
    const autoRangeControl = {
      autoRange: () => {
        this.updateRangeForTarget(modulator, minController, maxController);
      },
    };
    folder.add(autoRangeControl, "autoRange").name("Auto Range");

    // Add remove button
    const removeObj = {
      remove: () => {
        // Disable modulator to reset target
        if (modulator.enabled) {
          modulator.enabled = false;
          modulator.resetToOriginal();
        }

        // Remove from manager
        this.modulatorManager.modulators =
          this.modulatorManager.modulators.filter((m) => m !== modulator);

        // Remove folder
        folder.destroy();

        // Remove from tracking array
        const idx = this.modulatorFolders.indexOf(folder);
        if (idx !== -1) {
          this.modulatorFolders.splice(idx, 1);
        }
      },
    };
    folder.add(removeObj, "remove").name("Remove");

    // Add visualization
    this.addVisualizationToModulator(modulator, folder);

    // DO NOT set a default target here - require user to select one

    // Open the folder by default
    folder.open();

    return modulator;
  }

  // Extract visualization creation to a separate method
  addVisualizationToModulator(modulator, folder) {
    // Add a small band visualization to show the frequency band activity
    const bandVisualContainer = document.createElement("div");
    bandVisualContainer.style.margin = "8px 0";
    bandVisualContainer.style.padding = "0";
    bandVisualContainer.style.position = "relative";

    // Create band level visualization
    const bandVisual = document.createElement("div");
    bandVisual.style.height = "16px";
    bandVisual.style.backgroundColor = "#333";
    bandVisual.style.borderRadius = "3px";
    bandVisual.style.overflow = "hidden";
    bandVisual.style.position = "relative";

    // Create the level bar
    const bandLevelBar = document.createElement("div");
    bandLevelBar.style.height = "100%";
    bandLevelBar.style.backgroundColor = "#4f4";
    bandLevelBar.style.width = "0%";
    bandLevelBar.style.position = "absolute";
    bandLevelBar.style.left = "0";
    bandLevelBar.style.top = "0";
    bandLevelBar.style.transition = "width 0.05s ease-out";

    // Create label that shows band name and level
    const bandLabel = document.createElement("div");
    bandLabel.style.position = "absolute";
    bandLabel.style.left = "5px";
    bandLabel.style.top = "0";
    bandLabel.style.color = "#fff";
    bandLabel.style.fontSize = "10px";
    bandLabel.style.lineHeight = "16px";
    bandLabel.style.textShadow = "1px 1px 1px rgba(0,0,0,0.5)";
    bandLabel.style.whiteSpace = "nowrap";
    bandLabel.style.overflow = "hidden";
    bandLabel.textContent = "All: 0%";

    // Add elements to container
    bandVisual.appendChild(bandLevelBar);
    bandVisual.appendChild(bandLabel);
    bandVisualContainer.appendChild(bandVisual);

    // Add to the folder's DOM
    folder.domElement
      .querySelector(".children")
      .appendChild(bandVisualContainer);

    // Store references for updating
    modulator._bandVisual = {
      container: bandVisualContainer,
      bar: bandLevelBar,
      label: bandLabel,
      lastUpdate: 0,
      currentValue: 0,
    };
  }

  // Add the initialization method similar to PulseModulationUi
  initializeWithUiPanels(leftUi, rightUi) {
    // Store UI references
    this.leftUi = leftUi;
    this.rightUi = rightUi;

    console.log("InputUi initialized with UI panels");
  }

  // Add this method to InputUi class
  setModulatorManager(manager) {
    this.modulatorManager = manager;
  }

  // Add this method to update target dropdowns for all modulators
  updateTargetDropdowns() {
    // Get the updated list of target names
    const targetNames = this.modulatorManager.getTargetNames();

    if (!targetNames || targetNames.length === 0) {
      console.warn("No targets available for dropdown update");
      return;
    }

    console.log(`Updating target dropdowns with ${targetNames.length} targets`);

    // Update each modulator folder's target dropdown
    if (this.modulatorFolders) {
      this.modulatorFolders.forEach((folder) => {
        // Find the target controller (usually the second controller in the folder)
        const targetController = folder.controllers.find(
          (c) => c.property === "targetName"
        );

        if (targetController && targetController.options) {
          // Update available options
          targetController.options(targetNames);
          targetController.updateDisplay();

          // If the target is already set, make sure it's still in the list
          const modulator = this.modulatorManager.modulators.find((m) =>
            folder.controllers.some((c) => c.object === m)
          );

          if (
            modulator &&
            modulator.targetName &&
            !targetNames.includes(modulator.targetName)
          ) {
            // Target no longer exists, reset to first available target
            if (targetNames.length > 0) {
              modulator.setTarget(targetNames[0]);
              targetController.updateDisplay();
            }
          }
        }
      });
    }
  }
}
