import { BaseUi } from "./baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class InputModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.audioDevices = [];
    this.modulatorFolders = [];
    this.micControllers = [];

    this.modulatorManager = null;

    this.deferTargetRegistration = true;
    this.gui.title("Input Modulation");
    this.initMicInputControls();

    this.presetManager = null;
    this.presetController = null;
    this.targetControllerMap = new Map();

    this.bandVisualizationInterval = setInterval(() => {
      this.updateAllBandVisualizations();
    }, 50);
  }

  //#region Ui

  initializeWithUiPanels(leftUi, rightUi) {
    console.log("InputUi initializing with UI panels");

    this.leftUi = leftUi;
    this.rightUi = rightUi;
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
    this.presetManager = presetManager;

    const folder = this.gui.addFolder("Presets");
    folder.open();

    // Add preset selection dropdown
    const presetOptions = this.presetManager.getPresetOptions(
      PresetManager.TYPES.MIC
    );

    folder
      .add({ preset: presetOptions[0] || "None" }, "preset", presetOptions)
      .name("Presets")
      .onChange((value) => {
        if (value) {
          this.presetManager.loadPreset(PresetManager.TYPES.MIC, value, this);
        }
      });

    // Save preset button
    const saveController = folder
      .add({ save: () => {} }, "save")
      .name("Save Preset");
    saveController.domElement.querySelector(".name").style.width =
      "calc(100% - 80px)";

    // Add save input and button
    const saveContainer = document.createElement("div");
    saveContainer.style.display = "flex";
    saveContainer.style.alignItems = "center";
    saveContainer.style.width = "100%";

    const saveInput = document.createElement("input");
    saveInput.type = "text";
    saveInput.placeholder = "Preset name";
    saveInput.style.flex = "1";
    saveInput.style.marginRight = "5px";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "0 0 auto";

    saveContainer.appendChild(saveInput);
    saveContainer.appendChild(saveButton);

    saveController.domElement
      .querySelector(".widget")
      .appendChild(saveContainer);

    // Save button click handler
    saveButton.addEventListener("click", () => {
      const name = saveInput.value;
      if (name) {
        this.presetManager.savePreset(PresetManager.TYPES.MIC, name, this);
        this.updatePresetDropdown();
      }
    });

    // Delete preset button
    const deleteController = folder
      .add({ delete: () => {} }, "delete")
      .name("Delete Preset");
    deleteController.domElement.querySelector(".name").style.width =
      "calc(100% - 80px)";

    // Add delete input and button
    const deleteContainer = document.createElement("div");
    deleteContainer.style.display = "flex";
    deleteContainer.style.alignItems = "center";
    deleteContainer.style.width = "100%";

    const deleteInput = document.createElement("input");
    deleteInput.type = "text";
    deleteInput.placeholder = "Preset name";
    deleteInput.style.flex = "1";
    deleteInput.style.marginRight = "5px";

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "0 0 auto";

    deleteContainer.appendChild(deleteInput);
    deleteContainer.appendChild(deleteButton);

    deleteController.domElement
      .querySelector(".widget")
      .appendChild(deleteContainer);

    // Delete button click handler
    deleteButton.addEventListener("click", () => {
      const name = deleteInput.value;
      if (name) {
        this.presetManager.deletePreset(PresetManager.TYPES.MIC, name);
        this.updatePresetDropdown();
      }
    });
  }

  updatePresetDropdown(selectElement) {
    // Find the dropdown if not provided
    if (!selectElement) {
      const presetFolder = this.gui.__folders["Presets"];
      selectElement = presetFolder?.__controllers?.find(
        (c) => c.property === "preset"
      );
    }

    if (selectElement) {
      // Get the updated options
      const options = this.presetManager.getPresetOptions(
        PresetManager.TYPES.MIC
      );

      // Update the options
      selectElement.options(options);
    }
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;
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

        // IMPROVED: Use ModulatorManager's method instead of direct array manipulation
        const index = this.modulatorManager.modulators.indexOf(modulator);
        if (index !== -1) {
          this.modulatorManager.removeModulator(index);
        }

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

  updatePresetDropdown(selectElement) {
    // Find the dropdown if not provided
    if (!selectElement) {
      const presetFolder = this.gui.__folders["Presets"];
      selectElement = presetFolder?.__controllers?.find(
        (c) => c.property === "preset"
      );
    }

    if (selectElement) {
      // Get the updated options
      const options = this.presetManager.getPresetOptions(
        PresetManager.TYPES.MIC
      );

      // Update the options
      selectElement.options(options);
    }
  }

  loadPresetData(preset) {
    console.log("InputUi: Loading preset data");

    try {
      // Validate preset data
      if (!preset) {
        console.warn("Empty preset data");
        return false;
      }

      // Handle different preset formats
      const settings = preset.micSettings || preset;

      if (!settings) {
        console.warn("No mic settings found in preset");
        return false;
      }

      // Clear existing modulators - use our own internal method
      this.clearAllModulators();

      // Apply mic forces settings
      if (this.main?.externalInput?.micForces) {
        // Set enabled state
        if (settings.enabled !== undefined) {
          if (settings.enabled) {
            this.main.externalInput.micForces.enable();
          } else {
            this.main.externalInput.micForces.disable();
          }

          // Update UI toggle
          if (this.micEnableController) {
            this.micEnableController.setValue(settings.enabled);
            this.toggleAllMicControlsVisibility(settings.enabled);
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
        console.log(
          `Creating ${settings.modulators.length} modulators from preset`
        );

        settings.modulators.forEach((modData) => {
          const mod = this.addMicModulator();
          if (!mod) return;

          // Set input source
          mod.inputSource = "mic";

          // Apply all properties from data
          Object.keys(modData).forEach((key) => {
            if (key in mod) {
              mod[key] = modData[key];
            }
          });

          // Find the controller for the target and set it last
          const folder =
            this.modulatorFolders[this.modulatorFolders.length - 1];
          const targetController = folder.controllers.find(
            (c) => c.property === "targetName"
          );

          if (targetController && modData.targetName) {
            targetController.setValue(modData.targetName);
          }
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
    if (!presetManager) {
      console.warn("PresetManager not provided");
      return;
    }

    this.presetManager = presetManager;
    this.initPresetControls(presetManager);
    console.log(`${this.constructor.name} initialized with preset manager`);
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

      // IMPROVED: Use ModulatorManager's method instead of direct array filtering
      if (this.modulatorManager) {
        this.modulatorManager.removeModulatorsByType("input");
      }

      // Clean up UI folders
      if (Array.isArray(this.modulatorFolders)) {
        // Create a copy of the array since we'll be modifying it
        const foldersToRemove = [...this.modulatorFolders];

        foldersToRemove.forEach((folder) => {
          if (folder && typeof folder.destroy === "function") {
            folder.destroy();
          }
        });

        // Clear the folders array
        this.modulatorFolders = [];
      }

      return true;
    } catch (error) {
      console.error("Error clearing modulators:", error);
      return false;
    }
  }

  getModulatorsData() {
    if (!this.modulatorManager) {
      return { modulators: [] };
    }

    // Use the modulatorManager to get modulator states
    const modulatorData = this.modulatorManager.getModulatorsState("input");

    return {
      enabled: this.main?.externalInput?.micForces?.enabled || false,
      sensitivity: this.main?.externalInput?.micForces?.sensitivity || 1.0,
      smoothing: this.main?.externalInput?.micForces?.smoothing || 0.8,
      modulators: modulatorData,
    };
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
}
