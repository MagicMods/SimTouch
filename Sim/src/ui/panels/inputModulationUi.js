import { BaseUi } from "./baseUi.js";
import { ModulatorManager } from "../../input/modulatorManager.js";

export class InputModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize arrays
    this.audioDevices = [];
    this.modulatorFolders = [];
    this.micControllers = [];

    // Create a ModulatorManager for input modulators - will be replaced by the shared one
    this.modulatorManager = null;

    // Flag to prevent early target registration
    this.deferTargetRegistration = true;

    // Change the GUI title
    this.gui.title("Input Modulation");

    // this.gui = this.createFolder("Microphone Input");

    this.initMicInputControls();

    // Create a single interval for updating all band visualizations
    this.bandVisualizationInterval = setInterval(() => {
      this.updateAllBandVisualizations();
    }, 50);
  }

  //#region Ui

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

  initMicInputControls() {
    if (!this.main.audioAnalyzer) return;

    const analyzer = this.main.audioAnalyzer;
    const externalInput = this.main.externalInput;

    // Store mic modulators folders
    this.micModulatorFolders = [];
    this.micControllers = [];

    // Enable toggle at ROOT level
    this.micEnableController = this.gui
      .add({ enabled: externalInput?.micForces?.enabled || false }, "enabled")
      .name("Enable Audio Input")
      .onChange((value) => {
        this.onMicInputToggled(value);
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

    // Only try to register targets if we're not deferring registration
    if (!this.deferTargetRegistration) {
      this.registerAvailableTargets();
    }

    // Global sensitivity control
    this.micSensitivityController = this.gui
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
    this.micSmoothingController = this.gui
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

    const calibrateController = this.gui
      .add(calibrationControl, "calibrate")
      .name("Calibrate Mic");
    this.micControllers.push(calibrateController);

    // Add modulator button
    const addModulatorControl = {
      add: () => this.addMicModulator(),
    };

    const addModulatorController = this.gui
      .add(addModulatorControl, "add")
      .name("Add Modulator");
    this.micControllers.push(addModulatorController);

    // Add audio analyzer controls in a subfolder
    const analyzerFolder = this.gui.addFolder("Audio Analysis Settings");
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
    const visualizerFolder = this.gui.addFolder("Audio Visualizer");
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

    this.gui.open();
  }

  initPresetControls(presetManager) {
    if (!presetManager) {
      console.warn("No preset manager provided for InputUi");
      return;
    }

    // Save reference to the preset manager
    this.presetManager = presetManager;

    // Create preset controls container
    const presetContainer = document.createElement("div");
    presetContainer.className = "preset-controls";
    presetContainer.style.margin = "10px 0";
    presetContainer.style.display = "flex";
    presetContainer.style.alignItems = "center";
    presetContainer.style.justifyContent = "space-between";

    // Label for better context
    const presetLabel = document.createElement("div");
    presetLabel.textContent = "Mic Presets:";
    presetLabel.style.marginRight = "8px";

    // Create preset selector
    const presetSelect = document.createElement("select");
    presetSelect.className = "preset-selector";
    presetSelect.style.flexGrow = "1";
    presetSelect.style.marginRight = "5px";

    // Create save button
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.className = "save-preset-btn";
    saveButton.style.marginRight = "5px";

    // Create delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-preset-btn";

    // Add elements to container
    presetContainer.appendChild(presetLabel);
    presetContainer.appendChild(presetSelect);
    presetContainer.appendChild(saveButton);
    presetContainer.appendChild(deleteButton);

    // Get insertion point - right AFTER the enable mic checkbox
    let insertPoint = null;
    if (this.micEnableController && this.micEnableController.domElement) {
      insertPoint = this.micEnableController.domElement.nextSibling;
    }

    // Insert at the correct position
    const targetElement =
      this.micPanel?.domElement?.querySelector(".children") ||
      this.gui?.domElement?.querySelector(".children");

    if (targetElement) {
      if (insertPoint) {
        targetElement.insertBefore(presetContainer, insertPoint);
      } else {
        targetElement.insertBefore(presetContainer, targetElement.firstChild);
      }
    }

    // Store references
    this.presetSelect = presetSelect;
    this.savePresetButton = saveButton;
    this.deletePresetButton = deleteButton;
    this.presetContainer = presetContainer;

    // Initially hide preset controls if mic input is disabled
    const enabled = this.main?.externalInput?.micForces?.enabled || false;
    this.presetContainer.style.display = enabled ? "block" : "none";

    // Update dropdown with available presets
    this.updatePresetDropdown();

    // Add event listeners
    presetSelect.addEventListener("change", () => {
      const selectedPreset = presetSelect.value;
      if (selectedPreset && this.presetManager) {
        console.log(`Mic preset selector changed to: ${selectedPreset}`);
        this.presetManager.loadMicPreset(selectedPreset, this);
      }
    });

    saveButton.addEventListener("click", () => {
      // Show save dialog
      const presetName = prompt("Enter name for this mic preset:", "");
      if (presetName && this.presetManager) {
        console.log(`Saving mic preset: ${presetName}`);
        this.presetManager.saveMicPreset(presetName, this);
        // Update dropdown with the new preset
        this.updatePresetDropdown();
        // Select the new preset in the dropdown
        this.presetSelect.value = presetName;
      }
    });

    deleteButton.addEventListener("click", () => {
      const selectedPreset = presetSelect.value;
      if (selectedPreset && selectedPreset !== "None" && this.presetManager) {
        const confirmed = confirm(`Delete mic preset "${selectedPreset}"?`);
        if (confirmed) {
          console.log(`Deleting mic preset: ${selectedPreset}`);
          this.presetManager.deleteMicPreset(selectedPreset);
          // Update dropdown after deletion
          this.updatePresetDropdown();
        }
      }
    });
  }

  addMicModulator() {
    // Create a new input modulator
    const modulator = this.modulatorManager.createInputModulator();
    modulator.inputSource = "mic";

    // Create a folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Mic Modulator ${index + 1}`);

    // Add this folder to our tracking array
    this.modulatorFolders.push(folder);

    // Add UI controls for the modulator

    // Get the LATEST target names directly from the manager
    const targetNames = this.modulatorManager.getTargetNames();
    console.log(
      `Adding mic modulator with ${targetNames.length} available targets`
    );

    // Get references to range controllers for updating later
    let minController, maxController;

    // Add a flag to the modulator to indicate if it's being loaded from a preset
    modulator._loadingFromPreset = false;

    // Add target selector with all available targets - IMPORTANT: Start with no selection
    const targetController = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        // Skip "None" option
        if (value === "None") return;

        // Get target info from the manager
        const targetInfo = this.modulatorManager.getTargetInfo(value);
        if (!targetInfo) return;

        // Connect the modulator to its target
        if (typeof modulator.setTarget === "function") {
          modulator.setTarget(value);
        } else {
          modulator.targetName = value;
        }

        // ALWAYS update the controllers' allowed range to match the target
        if (
          targetInfo &&
          targetInfo.min !== undefined &&
          targetInfo.max !== undefined
        ) {
          const min = targetInfo.min;
          const max = targetInfo.max;
          const step = targetInfo.step || 0.01;

          console.log(
            `Auto-range: Setting min/max controller ranges to ${min}-${max}`
          );

          // CRITICAL CHANGE: Don't destroy and recreate controllers
          // Just update their properties
          if (minController) {
            // Use the min/max/step methods to update the controller range without recreating it
            minController.min(min);
            minController.max(max);
            minController.step(step);
          }

          if (maxController) {
            maxController.min(min);
            maxController.max(max);
            maxController.step(step);
          }

          // Only update VALUES if not loading from preset
          if (!modulator._loadingFromPreset) {
            console.log(`Auto-ranging values for target ${value}`);

            // Update values through the controllers
            if (minController) minController.setValue(min);
            if (maxController) maxController.setValue(max);

            // Also update the underlying properties
            modulator.min = min;
            modulator.max = max;
          } else {
            console.log(
              `Using preset values for target ${value}, updating only input ranges`
            );
            // Reset the flag after first use
            modulator._loadingFromPreset = false;
          }
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
    folder
      .add(modulator, "sensitivity", 0, 5, 0.1)
      .name("Sensitivity")
      .onChange((value) => {
        // When sensitivity is set to 0, disable the modulator effect
        if (value === 0) {
          modulator.enabled = false;
          modulator.resetToOriginal();
        } else {
          modulator.enabled = true;
        }
      });

    // Add smoothing slider
    folder.add(modulator, "smoothing", 0, 0.99, 0.01).name("Smoothing");

    // Add range controls
    minController = folder.add(modulator, "min", 0, 1, 0.01).name("Min Value");
    maxController = folder.add(modulator, "max", 0, 1, 0.01).name("Max Value");

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

    folder.open();

    folder.modulator = modulator; // Add direct reference to the modulator for easier access

    return modulator;
  }

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

  onMicInputToggled(enabled) {
    // Update preset controls visibility
    if (this.presetContainer) {
      this.presetContainer.style.display = enabled ? "block" : "none";
    }

    // Call original toggle functionality if it exists
    if (typeof this.toggleAllMicControlsVisibility === "function") {
      this.toggleAllMicControlsVisibility(enabled);
    }
  }

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

  //#endregion

  //#region Update

  update() {
    if (
      !this.main.audioAnalyzer ||
      !this.main.externalInput.micForces.enabled
    ) {
      return;
    }

    // Update all modulators with their respective frequency band data
    for (let i = 0; i < this.modulatorManager.modulators.length; i++) {
      const modulator = this.modulatorManager.modulators[i];
      if (modulator.inputSource === "mic") {
        const analyzer = this.main.audioAnalyzer;
        const micForces = this.main.externalInput?.micForces;
        let value = 0;

        try {
          // Get the appropriate frequency band value
          if (modulator.frequencyBand !== "none" && analyzer) {
            // Get band-specific volume
            switch (modulator.frequencyBand) {
              case "sub":
                value = analyzer.calculateBandLevels().sub || 0;
                break;
              case "bass":
                value = analyzer.calculateBandLevels().bass || 0;
                break;
              case "lowMid":
                value = analyzer.calculateBandLevels().lowMid || 0;
                break;
              case "mid":
                value = analyzer.calculateBandLevels().mid || 0;
                break;
              case "highMid":
                value = analyzer.calculateBandLevels().highMid || 0;
                break;
              case "treble":
                // Combine presence and brilliance for treble
                const bands = analyzer.calculateBandLevels();
                value = ((bands.presence || 0) + (bands.brilliance || 0)) / 2;
                break;
              default:
                // Full volume
                value = analyzer.smoothedVolume || 0;
                break;
            }
          } else {
            // Use overall volume for "none" band
            value =
              analyzer.smoothedVolume ||
              (micForces && micForces.smoothedAmplitude
                ? micForces.smoothedAmplitude
                : 0);
          }

          // Set the input value for the modulator
          modulator.setInputValue(value);
        } catch (e) {
          console.error("Error processing audio input for modulator:", e);
        }
      }
    }

    // Update all modulators through the manager
    this.modulatorManager.update();
  }

  updateAllBandVisualizations() {
    // Skip if no audio system is available
    if (
      !this.main ||
      !this.main.externalInput ||
      !this.main.externalInput.micForces
    ) {
      return;
    }

    const micForces = this.main.externalInput.micForces;
    const analyzer = this.main.audioAnalyzer;

    // CRITICAL PART: Update individual modulator visualizations
    if (this.modulatorManager) {
      // Loop through all modulators with mic input
      this.modulatorManager.modulators.forEach((modulator) => {
        // Only process mic input modulators with visualization elements
        if (modulator.inputSource === "mic" && modulator._bandVisual) {
          try {
            let value = 0;

            // Get value from analyzer if available
            if (analyzer) {
              if (modulator.frequencyBand === "none") {
                // Use overall volume
                value = analyzer.smoothedVolume || 0;
              } else {
                // Get band-specific values
                const bands = analyzer.calculateBandLevels();
                if (bands) {
                  switch (modulator.frequencyBand) {
                    case "sub":
                      value = bands.sub || 0;
                      break;
                    case "bass":
                      value = bands.bass || 0;
                      break;
                    case "lowMid":
                      value = bands.lowMid || 0;
                      break;
                    case "mid":
                      value = bands.mid || 0;
                      break;
                    case "highMid":
                      value = bands.highMid || 0;
                      break;
                    case "treble":
                      // Average of presence and brilliance
                      value =
                        ((bands.presence || 0) + (bands.brilliance || 0)) / 2;
                      break;
                    default:
                      value = 0;
                  }
                }
              }
            }

            // Apply sensitivity
            value = Math.min(1, value * (modulator.sensitivity || 1));

            // Calculate color based on intensity
            const color = this.getIntensityColor(value);

            // Update visualization elements
            if (modulator._bandVisual.bar) {
              modulator._bandVisual.bar.style.width = `${value * 100}%`;
              // Apply the calculated color
              modulator._bandVisual.bar.style.backgroundColor = color;
            }

            if (modulator._bandVisual.label) {
              const bandName =
                modulator.frequencyBand === "none"
                  ? "All"
                  : modulator.frequencyBand;
              modulator._bandVisual.label.textContent = `${bandName}: ${Math.round(
                value * 100
              )}%`;
            }
          } catch (err) {
            console.warn("Error updating modulator visualization:", err);
          }
        }
      });
    }
  }
  //#endregion

  //#region Preset

  updatePresetDropdown() {
    if (!this.presetSelect || !this.presetManager) return;

    // Clear existing options
    while (this.presetSelect.firstChild) {
      this.presetSelect.removeChild(this.presetSelect.firstChild);
    }

    // Get preset options from manager
    let options = [];
    if (typeof this.presetManager.getMicPresetOptions === "function") {
      options = this.presetManager.getMicPresetOptions();
    } else {
      // Fallback: get from micHandler
      options = this.presetManager.micHandler?.getPresetOptions() || [];
    }

    console.log(
      `Updating mic preset dropdown with options: ${JSON.stringify(options)}`
    );

    // Add options to dropdown
    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option;
      optElement.textContent = option;
      this.presetSelect.appendChild(optElement);
    });

    // Select the current preset if available
    const currentPreset = this.presetManager.getSelectedMicPreset();
    if (currentPreset && options.includes(currentPreset)) {
      this.presetSelect.value = currentPreset;
    }
  }

  loadPresetData(preset) {
    console.log("InputUi: Loading preset data directly");

    try {
      // Validate preset data
      if (!preset || !preset.micSettings) {
        console.warn("Invalid mic preset data format");
        return false;
      }

      const settings = preset.micSettings;

      // Clear existing modulators - use our own internal method
      this.clearAllModulators();

      // Apply mic forces settings
      if (this.main?.externalInput?.micForces) {
        // Set enabled state
        if (settings.enabled) {
          this.main.externalInput.micForces.enable();
          // Update UI toggle
          if (this.micEnableController) {
            this.micEnableController.setValue(true);
            this.toggleAllMicControlsVisibility(true);
          }
        } else {
          this.main.externalInput.micForces.disable();
          // Update UI toggle
          if (this.micEnableController) {
            this.micEnableController.setValue(false);
            this.toggleAllMicControlsVisibility(false);
          }
        }

        // Set sensitivity
        if (settings.sensitivity !== undefined) {
          this.main.externalInput.micForces.setSensitivity(
            settings.sensitivity
          );
          // Update UI slider if it exists
          if (this.micSensitivityController) {
            this.micSensitivityController.setValue(settings.sensitivity);
          }
        }
      }

      // Create modulators from preset
      if (settings.modulators && Array.isArray(settings.modulators)) {
        settings.modulators.forEach((modData) => {
          const mod = this.addMicModulator();
          if (!mod) {
            console.warn("Failed to create mic modulator");
            return;
          }

          // Apply properties
          if (modData.targetName && typeof mod.setTarget === "function") {
            mod.setTarget(modData.targetName);
          }

          // Set input source
          mod.inputSource = "mic";

          // Set frequency band
          if (modData.frequencyBand) {
            mod.frequencyBand = modData.frequencyBand;
          }

          // Apply other properties
          mod.sensitivity = modData.sensitivity || 1.0;
          mod.smoothing = modData.smoothing || 0.7;
          mod.min = modData.min || 0;
          mod.max = modData.max || 1;
          mod.enabled = !!modData.enabled;
        });
      }

      // Update UI visuals
      this.update();

      return true;
    } catch (error) {
      console.error("Error loading mic preset data:", error);
      return false;
    }
  }

  initWithPresetManager(presetManager) {
    if (!presetManager) return;
    this.presetManager = presetManager;
    console.log("InputUi initialized with preset manager");
    // Initialize preset controls
    this.initPresetControls(presetManager);
  }

  //#endregion

  //#region Audio Input

  addAudioDeviceSelector() {
    if (!this.audioDevices) {
      this.audioDevices = [];
    }

    if (!this.gui) return;

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
      : this.gui.domElement.querySelector(".children").firstChild;

    // Add to UI folder
    this.gui.domElement
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

  getIntensityColor(value) {
    // Ensure value is between 0 and 1
    value = Math.max(0, Math.min(1, value));

    let r, g, b;

    if (value < 0.33) {
      // Green to Yellow (0.0 - 0.33)
      // Green: rgb(0, 255, 0) to Yellow: rgb(255, 255, 0)
      r = Math.round(value * 3 * 255);
      g = 255;
      b = 0;
    } else if (value < 0.66) {
      // Yellow to Orange/Red (0.33 - 0.66)
      // Yellow: rgb(255, 255, 0) to Orange: rgb(255, 128, 0)
      r = 255;
      g = Math.round(255 - (value - 0.33) * 3 * 128);
      b = 0;
    } else {
      // Orange to Red (0.66 - 1.0)
      // Orange: rgb(255, 128, 0) to Red: rgb(255, 0, 0)
      r = 255;
      g = Math.round(128 - (value - 0.66) * 3 * 128);
      b = 0;
    }

    return `rgb(${r}, ${g}, ${b})`;
  }

  //#endregion

  //#region Other

  setModulatorManager(manager) {
    this.modulatorManager = manager;
    console.log("InputUi using shared ModulatorManager");
  }

  clearAllModulators() {
    console.log("InputModulationUi: Clearing all modulators");

    try {
      // First, disable all existing modulators
      if (
        this.modulatorManager &&
        Array.isArray(this.modulatorManager.modulators)
      ) {
        this.modulatorManager.modulators
          .filter((mod) => mod.inputSource === "mic")
          .forEach((modulator) => {
            if (modulator && typeof modulator.disable === "function") {
              modulator.disable();
            } else if (modulator) {
              modulator.enabled = false;
            }
          });
      }

      // Remove modulators from the manager
      if (this.modulatorManager) {
        this.modulatorManager.modulators =
          this.modulatorManager.modulators.filter(
            (m) => m.inputSource !== "mic"
          );
      }

      // Clean up UI folders
      if (Array.isArray(this.folders)) {
        // Create a copy of the array since we'll be modifying it
        const foldersToRemove = [...this.folders];

        foldersToRemove.forEach((folder) => {
          if (folder && typeof folder.destroy === "function") {
            folder.destroy();
          }
        });

        // Clear the folders array
        this.folders = [];
      }

      return true;
    } catch (error) {
      console.error("Error clearing modulators:", error);
      return false;
    }
  }

  saveToData() {
    if (!this.modulatorManager) {
      return { modulators: [] };
    }

    // Use the modulatorManager to get modulator states
    const modulatorData = this.modulatorManager.getModulatorsState("pulse");

    return {
      modulators: modulatorData,
    };
  }

  getModulatorsData() {
    return this.saveToData();
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

  //#endregion

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
