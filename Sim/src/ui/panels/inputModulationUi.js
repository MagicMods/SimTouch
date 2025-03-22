import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class InputModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize arrays and references
    this.audioDevices = [];
    this.modulatorFolders = [];
    this.micControllers = [];

    // Track internal state separately from UI state
    this.audioInputEnabled = false;

    // ModulatorManager will be set by UiManager
    this.modulatorManager = null;

    // Change the GUI title
    this.gui.title("Input Modulation");

    // Initialize controls directly in the root GUI
    this.initInputControls();

    // PresetManager will be initialized later
    this.presetManager = null;
    this.presetSelect = null; // Reference to the HTML select element

    // Create a single interval for updating all band visualizations
    this.bandVisualizationInterval = setInterval(() => {
      this.updateAllBandVisualizations();
    }, 50);

    this.gui.open();
  }

  //#region Ui Setup

  initInputControls() {
    if (!this.main.externalInput) return;

    const externalInput = this.main.externalInput;

    // Global sensitivity control (now directly in root GUI)
    this.micSensitivityController = this.gui
      .add(
        { sensitivity: externalInput?.micForces?.sensitivity || 1.0 },
        "sensitivity",
        0.1,
        10.0,
        0.1
      )
      .name("IM-Sensitivity")
      .onChange((value) => {
        if (externalInput && externalInput.micForces) {
          externalInput.setMicSensitivity(value);
        }
      });
    this.micSensitivityController.domElement.style.marginTop = "10px";
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
      .name("IM-Smooth")
      .onChange((value) => {
        if (externalInput && externalInput.micForces) {
          externalInput.setMicSmoothing(value);
        }
      });
    this.micControllers.push(this.micSmoothingController);

    // Add modulator button
    const addModulatorControl = {
      add: () => this.addInputModulator(),
    };

    const addModulatorController = this.gui
      .add(addModulatorControl, "add")
      .name("Add Modulator");
    addModulatorController.domElement.style.marginTop = "10px";
    this.micControllers.push(addModulatorController);
  }

  initPresetControls(presetManager) {
    if (!presetManager) return;

    this.presetManager = presetManager;

    // Find the correct container in GUI structure
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) return;

    // Create standardized preset controls
    this.presetControl = this.presetManager.createPresetControls(
      PresetManager.TYPES.INPUT,
      containerElement,
      { insertFirst: true }
    );
  }

  // Initialize with preset manager
  initWithPresetManager(presetManager) {
    console.log("InputModulationUi initialized with preset manager");
    if (presetManager) {
      this.initPresetControls(presetManager);
    }
  }
  //#endregion

  //#region Modulator

  setModulatorManager(manager) {
    this.modulatorManager = manager;
    console.log("ModulatorManager set in InputModulationUi");
  }

  // Fixed implementation of addInputModulator
  addInputModulator() {
    if (!this.modulatorManager) {
      console.error("ModulatorManager not available");
      return null;
    }

    // ADDED: Enable audio input when adding a modulator
    this.enableDisableAudioInput(true);

    // Create a new modulator
    const modulator = this.modulatorManager.createInputModulator("mic");
    if (!modulator) {
      console.error("Failed to create input modulator");
      return null;
    }

    // Ensure type is correctly set
    modulator.type = "input";
    modulator.inputSource = "mic";

    // CRITICAL FIX: Explicitly enable the modulator if sensitivity > 0
    modulator.enabled = modulator.sensitivity > 0;

    console.log("Creating new mic modulator:", modulator);

    // Create folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Audio Modulator ${index + 1}`);

    // Store the folder reference
    this.modulatorFolders.push(folder);

    // Explicitly open the folder (important for visibility)
    folder.open();

    console.log(`Created folder for modulator ${index + 1}`);

    // Store references to controllers
    const controllers = {};

    // Add frequency band selector as first control
    controllers.frequencyBand = folder
      .add(modulator, "frequencyBand", [
        "none",
        "sub",
        "bass",
        "lowMid",
        "mid",
        "highMid",
        "presence",
        "brilliance",
        "custom"  // Add custom option
      ])
      .name("Frequency Band")
      .onChange((value) => {
        // Show/hide custom controls when band changes
        const showCustom = value === "custom";

        controllers.customFreq.show(showCustom);
        controllers.customWidth.show(showCustom);

        // Update visualizer marker if available
        if (this.main.micForces && this.main.micForces.visualizer) {
          if (showCustom) {
            this.main.micForces.visualizer.setCustomBandMarker(
              modulator.customFreq,
              modulator.customWidth,
              true
            );
          } else {
            this.main.micForces.visualizer.setCustomBandMarker(0, 0, false);
          }
        }
      });

    controllers.frequencyBand.domElement.classList.add("full-width");
    // Add these controls after the frequency band control
    // Add custom center frequency
    controllers.customFreq = folder
      .add(modulator, "customFreq", 20, 20000, 10)
      .name("Freq Center (Hz)")
      .onChange((value) => {
        // Update visualizer if available
        if (this.main.micForces.visualizer && modulator.frequencyBand === "custom") {
          this.main.micForces.visualizer.setCustomBandMarker(
            value,
            modulator.customWidth,
            true
          );
        }
      });

    // Add custom bandwidth
    controllers.customWidth = folder
      .add(modulator, "customWidth", 10, 10000, 10)
      .name("Band Width (Hz)")
      .onChange((value) => {
        // Update visualizer if available
        if (this.main.micForces.visualizer && modulator.frequencyBand === "custom") {
          this.main.micForces.visualizer.setCustomBandMarker(
            modulator.customFreq,
            value,
            true
          );
        }
      });

    controllers.customFreq.show(false);
    controllers.customWidth.show(false);

    // Add target selector - done after frequency band so it's more prominent
    const targetNames = this.modulatorManager.getTargetNames();
    controllers.targetName = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        // Skip "None" option
        if (value === "None") return;

        // Connect to target
        console.log(`Setting target to ${value}`);
        modulator.setTarget(value);

        // Update the folder name to include the target name
        folder.title(`Audio Modulator ${index + 1}  |  ${value}`);

        // Auto-range when appropriate
        const targetInfo = this.modulatorManager.getTargetInfo(value);
        if (
          targetInfo &&
          targetInfo.min !== undefined &&
          targetInfo.max !== undefined
        ) {
          console.log(`Auto-ranging for target ${value}`);

          // Only update value ranges, not actual values if loading from preset
          if (!modulator._loadingFromPreset) {
            modulator.min = targetInfo.min;
            modulator.max = targetInfo.max;

            // Update UI controls
            if (controllers.min) controllers.min.setValue(targetInfo.min);
            if (controllers.max) controllers.max.setValue(targetInfo.max);
          }

          // Always update ranges
          if (controllers.min) {
            controllers.min.min(targetInfo.min);
            controllers.min.max(targetInfo.max);
          }

          if (controllers.max) {
            controllers.max.min(targetInfo.min);
            controllers.max.max(targetInfo.max);
          }
        }
      });

    controllers.targetName.domElement.classList.add("full-width");
    controllers.targetName.domElement.style.paddingBottom = "5px";

    // Add sensitivity slider (0-1 range) - this acts as the enable control
    controllers.sensitivity = folder
      .add(modulator, "sensitivity", 0, 1, 0.01)
      .name("Sensitivity")
      .onChange((value) => {
        // Enable/disable based on sensitivity
        const wasEnabled = modulator.enabled;
        modulator.enabled = value > 0;

        // Only reset if going from enabled to disabled
        if (wasEnabled && value === 0) {
          console.log(`Sensitivity is 0, resetting ${modulator.targetName}`);
          modulator.resetToOriginal();
        }
      });

    // Add threshold slider after the sensitivity slider
    controllers.threshold = folder
      .add(modulator, "threshold", 0, 1, 0.01)
      .name("Threshold")
      .onChange((value) => {
        // Force visualization update
        this.updateAllBandVisualizations();
      });

    // Add attack slider (lower values = faster attack)
    controllers.attack = folder
      .add(modulator, "attack", 0, 0.99, 0.01)
      .name("Attack")
      .onChange(() => {
        this.updateAllBandVisualizations();
      });

    // Add release slider (higher values = longer sustain)
    controllers.release = folder
      .add(modulator, "release", 0, 0.99, 0.01)
      .name("Release")
      .onChange(() => {
        this.updateAllBandVisualizations();
      });

    // Add min/max range controls
    controllers.min = folder
      .add(modulator, "min", 0, 1, 0.01)
      .name("Min Value");
    controllers.max = folder
      .add(modulator, "max", 0, 1, 0.01)
      .name("Max Value");

    controllers.min.domElement.style.paddingTop = "5px";
    controllers.max.domElement.style.paddingBottom = "5px";
    // Replace the remove button implementation with this corrected version
    controllers.remove = folder
      .add(
        {
          remove: () => {
            console.log(
              `Removing input modulator with target ${modulator.targetName}`
            );

            // CRITICAL FIX: Reset the target to its original value FIRST
            if (modulator && typeof modulator.resetToOriginal === "function") {
              console.log(
                `Explicitly resetting ${modulator.targetName} to original value ${modulator.originalValue}`
              );
              modulator.resetToOriginal();
            }

            // Disable the modulator to prevent any future updates
            modulator.enabled = false;

            // Now remove it from the modulators array
            const index = this.modulatorManager.modulators.indexOf(modulator);
            if (index !== -1) {
              this.modulatorManager.modulators.splice(index, 1);
            } else {
              // Alternative approach if the modulator isn't found by reference
              this.modulatorManager.modulators =
                this.modulatorManager.modulators.filter(
                  (mod) => mod !== modulator
                );
            }

            // Remove folder from UI
            folder.destroy();

            // Remove from tracking array
            const folderIndex = this.modulatorFolders.indexOf(folder);
            if (folderIndex > -1) {
              this.modulatorFolders.splice(folderIndex, 1);
            }

            console.log(`Removed input modulator folder`);
          },
        },
        "remove"
      )
      .name("Remove");

    // Store controllers in modulator for easy access
    modulator.controllers = controllers;

    try {
      // Add visualization bar
      this.addVisualizationToModulator(modulator, folder);
      console.log(`Added visualization to modulator ${index + 1}`);
    } catch (error) {
      console.error("Failed to add visualization:", error);
    }

    return modulator;
  }

  getModulatorsData() {
    // TEMPORARY DEBUG CHECK - REMOVE IN PRODUCTION
    if (!this.modulatorManager) {
      console.error(
        `Error getting modulator data: modulatorManager is not defined`
      );
      return { modulators: [] };
    }

    const modulators = [];

    try {
      // First try to get data from modulator folders
      if (
        Array.isArray(this.modulatorFolders) &&
        this.modulatorFolders.length > 0
      ) {
        console.log(
          `InputModulationUi: Extracting data from ${this.modulatorFolders.length} folders`
        );

        this.modulatorFolders.forEach((folder) => {
          try {
            // Extract data from folder
            const modData = {
              type: "input",
              inputSource: "mic",
              enabled: false,
              frequencyBand: "none",
              sensitivity: 0,
              smoothing: 0.7,  // Keep for backward compatibility
              attack: 0.3,     // Add attack property
              release: 0.7,    // Add release property
              threshold: 0,
              min: 0,
              max: 1,
              targetName: "None",
              // Use center frequency and width instead of min/max
              customFreq: 1000,
              customWidth: 100
            };

            // Extract values from controllers
            folder.controllers.forEach((controller) => {
              if (controller?.property) {
                const prop = controller.property;
                if (controller.getValue) {
                  modData[prop] = controller.getValue();
                } else if (controller.object && prop in controller.object) {
                  modData[prop] = controller.object[prop];
                }
              }
            });

            // Special handling: enabled state is determined by sensitivity
            modData.enabled = modData.sensitivity > 0;

            modulators.push(modData);
          } catch (err) {
            console.error("Error extracting modulator data from folder:", err);
          }
        });
      }

      // Fallback to modulatorManager if no folders or empty result
      if (modulators.length === 0 && this.modulatorManager) {
        console.log(
          "InputModulationUi: Falling back to modulatorManager for data"
        );

        // Get modulators from manager
        const managerMods = this.modulatorManager.modulators
          .filter((m) => m.type === "input" && m.inputSource === "mic")
          .map((mod) => ({
            type: "input",
            inputSource: "mic",
            enabled: mod.enabled,
            frequencyBand: mod.frequencyBand || "none",
            sensitivity: mod.sensitivity || 1,
            smoothing: mod.smoothing || 0.7,
            min: mod.min || 0,
            max: mod.max || 1,
            targetName: mod.targetName || "None",
          }));

        modulators.push(...managerMods);
      }

      console.log(
        `InputModulationUi: Prepared input modulation data with ${modulators.length} modulators`
      );

      // Get the global sensitivity if available
      const sensitivity =
        this.main?.externalInput?.micForces?.sensitivity || 1.0;

      return {
        enabled: this.audioInputEnabled || false,
        sensitivity: sensitivity,
        modulators: modulators,
      };
    } catch (error) {
      console.error("Error preparing input modulation data:", error);
      return {
        enabled: false,
        sensitivity: 1.0,
        modulators: [],
      };
    }
  }

  // Update the clearAllModulators method
  clearAllModulators() {
    console.log("InputModulationUi: Clearing all modulators");

    try {
      // IMPORTANT FIX: Reset to original values FIRST
      if (this.modulatorManager?.modulators) {
        this.modulatorManager.modulators
          .filter((m) => m.type === "input" && m.inputSource === "mic")
          .forEach((m) => {
            // Reset to original value before disabling
            if (typeof m.resetToOriginal === "function") {
              console.log(
                `Resetting ${m.targetName || "unnamed"} to original value`
              );
              m.resetToOriginal();
            }
            // Then disable
            m.enabled = false;
          });
      }

      // Rest of existing implementation...
      // Remove from manager
      if (this.modulatorManager?.removeModulatorsByInput) {
        this.modulatorManager.removeModulatorsByInput("mic");
      }

      // Remove UI folders
      this.modulatorFolders.forEach((folder) => {
        if (folder?.destroy) folder.destroy();
      });
      this.modulatorFolders = [];

      return true;
    } catch (error) {
      console.error("Error clearing modulators:", error);
      return false;
    }
  }

  //#endregion

  //#region Update

  // Fix the update method - this is the critical piece
  update() {
    // Check folder state directly - if open, process regardless of stored state
    const folderOpen = !this.gui.closed;

    // Update internal state if needed to match folder state
    if (folderOpen !== this.audioInputEnabled) {
      this.audioInputEnabled = folderOpen;
    }

    // Only process if enabled
    if (
      !this.audioInputEnabled ||
      !this.main.externalInput?.micForces?.enabled
    ) {
      return;
    }

    // Get the audio analyzer
    const analyzer = this.main.audioAnalyzer;
    if (!analyzer || !analyzer.isEnabled) {
      return;
    }

    // Process the audio data and update modulators
    if (this.modulatorManager) {
      // Get all input modulators
      const audioModulators = this.modulatorManager.modulators.filter(
        (mod) => mod.inputSource === "mic" && mod.sensitivity > 0
      );

      if (audioModulators.length > 0) {
        // Get all band levels at once to avoid repeated calculation
        const bandLevels = analyzer.calculateBandLevels();
        const globalVolume = analyzer.smoothedVolume || 0;

        // Get global sensitivity
        const globalSensitivity =
          this.main.externalInput?.micForces?.sensitivity || 1.0;

        // Update each modulator with its appropriate audio data
        audioModulators.forEach((modulator) => {
          try {
            // Get the appropriate frequency band value based on modulator's band setting
            let bandValue = 0;

            if (modulator.frequencyBand === "custom") {
              // Calculate min/max from center frequency and width
              const centerFreq = modulator.customFreq || 1000;
              const width = modulator.customWidth || 100;

              const minFreq = Math.max(20, centerFreq - width / 2);
              const maxFreq = Math.min(20000, centerFreq + width / 2);

              // Get energy for custom frequency range
              bandValue = analyzer.getFrequencyRangeValue(minFreq, maxFreq) || 0;
            } else if (modulator.frequencyBand && modulator.frequencyBand !== "none") {
              // Get band-specific audio level
              bandValue = bandLevels[modulator.frequencyBand] || 0;

              // // Log value for debugging when significant
              // if (bandValue > 0.1) {
              //   console.log(
              //     `Band ${modulator.frequencyBand} level: ${bandValue.toFixed(2)}`
              //   );
              // }
            } else {
              // Use global volume if no specific band is selected
              bandValue = globalVolume;
            }

            // CRITICAL FIX: Apply global sensitivity before sending to modulator
            bandValue = bandValue * globalSensitivity;

            // Set the input value on the modulator
            modulator.setInputValue(bandValue);
          } catch (e) {
            console.error(`Error updating modulator with audio data:`, e);
          }
        });
      }
    }

    // Update modulators after setting input values
    if (this.modulatorManager) {
      this.modulatorManager.update();
    }

    // Update visualizations
    this.updateAllBandVisualizations();
  }

  //#endregion

  //#region Audio

  // Enable/disable audio input based on folder state
  enableDisableAudioInput(enabled) {
    if (!this.main.externalInput) return;

    console.log(`Setting audio input ${enabled ? "enabled" : "disabled"}`);

    // Store internal state
    this.audioInputEnabled = enabled;

    if (enabled) {
      this.main.externalInput.enableMic();
    }
  }
  addAudioDeviceSelector() {
    // Create a dropdown for audio input devices
    const deviceSelector = { device: "default" };

    // Add to GUI
    const deviceController = this.gui
      .add(deviceSelector, "device", ["default"])
      .name("Audio Input Device")
      .onChange((value) => {
        if (this.main.externalInput) {
          this.setAudioInputDevice(value);
        }
      });

    this.micControllers.push(deviceController);

    // Populate the dropdown with available devices
    this.populateAudioDevices(deviceController);

    return deviceController;
  }
  // Method to populate audio devices
  async populateAudioDevices(controller) {
    try {
      // Check if we can access media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn("MediaDevices API not supported in this browser");
        return;
      }

      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Filter to just audio input devices
      const audioInputDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );

      // Store the devices
      this.audioDevices = audioInputDevices;

      // Create options map with friendly names
      const options = { default: "Default Input" };

      audioInputDevices.forEach((device, index) => {
        const label = device.label || `Microphone ${index + 1}`;
        options[device.deviceId] = label;
      });

      // Update the controller with new options
      if (controller) {
        controller.options(options);
      }

      // console.log(`Found ${audioInputDevices.length} audio input devices`);
    } catch (error) {
      console.error("Error enumerating audio devices:", error);
    }
  }
  // Method to set the selected audio input device
  setAudioInputDevice(deviceId) {
    if (!this.main.externalInput) return;

    console.log(`Setting audio input device to: ${deviceId}`);
    this.main.externalInput.setAudioInputDevice(deviceId);
  }

  //#endregion

  //#region Visualization

  // Add the visualization helper method
  addVisualizationToModulator(modulator, folder) {
    // Create container for visualization
    const container = document.createElement("div");
    container.style.marginTop = "10px";
    container.style.marginBottom = "5px";
    container.style.width = "100%";
    container.style.height = "15px";
    container.style.backgroundColor = "#333";
    container.style.position = "relative";
    container.style.borderRadius = "3px";

    // Create visualization elements
    const bar = document.createElement("div");
    bar.style.position = "absolute";
    bar.style.left = "0";
    bar.style.top = "0";
    bar.style.height = "100%";
    bar.style.width = "0%";
    bar.style.backgroundColor = "#8f8";
    bar.style.borderRadius = "3px";
    container.appendChild(bar);

    // Create threshold marker (initially hidden)
    const thresholdMarker = document.createElement("div");
    thresholdMarker.style.position = "absolute";
    thresholdMarker.style.width = "2px";
    thresholdMarker.style.height = "100%";
    thresholdMarker.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
    thresholdMarker.style.zIndex = "2";
    thresholdMarker.style.display = "none"; // Initially hidden
    container.appendChild(thresholdMarker);

    const label = document.createElement("div");
    label.style.position = "absolute";
    label.style.width = "100%";
    label.style.textAlign = "center";
    label.style.color = "white";
    label.style.fontSize = "10px";
    label.style.lineHeight = "15px";
    label.textContent = "0%";
    container.appendChild(label);

    // Store UI references
    modulator.ui = { container, bar, label, threshold: thresholdMarker };

    // Add to folder DOM carefully
    try {
      if (!folder.domElement) {
        console.warn("Folder DOM element not available");
        return container;
      }

      // Different approaches for different GUI libraries
      const ul = folder.domElement.querySelector("ul");
      if (ul) {
        // DAT.GUI style
        const li = document.createElement("li");
        li.className = "visualization";
        li.appendChild(container);
        ul.appendChild(li);
      } else {
        // Alternative approach
        const div = document.createElement("div");
        div.className = "visualization-container";
        div.appendChild(container);
        folder.domElement.appendChild(div);
      }
    } catch (error) {
      console.error("Error adding visualization to DOM:", error);
    }

    return container;
  }
  // Update visualization method also needs to respect GUI state
  updateAllBandVisualizations() {
    // Check if folder is open - important for visualization
    const folderOpen = !this.gui.closed;

    // Always update the visualizers if the folder is open, even if internal state is wrong
    if (
      (!folderOpen && !this.audioInputEnabled) ||
      !this.main.externalInput?.micForces?.enabled
    ) {
      return;
    }

    // If we got here and the states don't match, update internal state
    if (folderOpen !== this.audioInputEnabled) {
      this.audioInputEnabled = folderOpen;
    }

    // Rest of the original visualization update code...
    const modulators = (this.modulatorManager?.modulators || []).filter((m) => {
      return m.inputSource === "mic" || (m.ui && m.ui.bar);
    });

    // Update each modulator's visualization
    modulators.forEach((modulator) => {
      if (!modulator.ui?.bar) return;

      try {
        // Use the lastOutputValue property which contains the smoothed output value
        // This is what's actually affecting the target
        const value = modulator.lastOutputValue || 0;

        // Update the bar
        const percent = Math.min(100, Math.max(0, value * 100));
        modulator.ui.bar.style.width = `${percent}%`;
        modulator.ui.bar.style.backgroundColor = this.getIntensityColor(value);

        // Update threshold marker visibility and position
        if (modulator.ui.threshold) {
          if (modulator.threshold > 0) {
            // Show and position threshold marker
            modulator.ui.threshold.style.display = "block";
            modulator.ui.threshold.style.left = `${modulator.threshold * 100}%`;
          } else {
            // Hide threshold marker when not used
            modulator.ui.threshold.style.display = "none";
          }
        }

        // Update label with proper percentage
        if (modulator.ui.label) {
          let bandName = modulator.frequencyBand === "none" ? "All" : modulator.frequencyBand;

          // For custom band, show the frequency range
          if (bandName === "custom") {
            const centerFreq = modulator.customFreq || 1000;
            const width = modulator.customWidth || 100;
            bandName = `${centerFreq}±${width / 2}Hz`;
          }

          modulator.ui.label.textContent = `${bandName}: ${Math.round(percent)}%`;
        }
      } catch (e) {
        // Silently ignore visualization errors
      }
    });
  }

  getIntensityColor(value) {
    // Create a color gradient from green to red
    const hue = (1 - value) * 120; // 120=green, 0=red
    return `hsl(${hue}, 100%, 50%)`;
  }

  //#endregion

  //#region Other
  // Clean up on dispose
  dispose() {
    // Stop DOM observer
    if (this.folderObserver) {
      this.folderObserver.disconnect();
      this.folderObserver = null;
    }

    if (this.bandVisualizationInterval) {
      clearInterval(this.bandVisualizationInterval);
      this.bandVisualizationInterval = null;
    }

    // Call parent dispose if it exists
    if (super.dispose) {
      super.dispose();
    }
  }
  //#endregion

  // Standard data extraction method - reuses existing logic
  getData() {
    // Use existing getModulatorsData method which already has good implementation
    return this.getModulatorsData();
  }

  // Standard data application method - reuses existing logic
  setData(data) {
    // Validate data
    if (!data) {
      console.error(
        "Invalid input modulation preset data: data is null or undefined"
      );
      return false;
    }

    try {
      // Validate modulators array
      if (!data.modulators) {
        console.error("Invalid preset data: missing modulators array");
        return false;
      }

      if (!Array.isArray(data.modulators)) {
        console.error("Invalid preset data: modulators is not an array");
        return false;
      }

      if (!this.modulatorManager) {
        console.error(
          "Cannot load modulators: modulatorManager is not initialized"
        );
        return false;
      }

      console.log(
        `Loading ${data.modulators.length} input modulators from preset`
      );

      // First clear existing modulators
      this.clearAllModulators();

      // MANUALLY CREATE MODULATORS INSTEAD OF USING loadModulatorsState
      let success = true;

      // Loop through each modulator in the preset data
      for (let i = 0; i < data.modulators.length; i++) {
        const modData = data.modulators[i];
        console.log(
          `Creating input modulator ${i + 1} with target: ${modData.targetName}`
        );

        // Create a new modulator
        const modulator = this.addInputModulator();

        if (!modulator) {
          console.error(`Failed to create input modulator ${i + 1}`);
          success = false;
          continue;
        }

        // Find the folder for this modulator
        const folder = this.modulatorFolders[i];
        if (!folder) {
          console.error(`Folder not found for modulator ${i + 1}`);
          continue;
        }

        // Update UI controllers directly for special properties
        folder.controllers.forEach((controller) => {
          const prop = controller.property;
          if (prop === "targetName" && modData[prop] !== undefined) {
            // Explicitly set the UI value for target dropdown
            controller.setValue(modData[prop]);
            console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
          } else if (prop === "frequencyBand" && modData[prop] !== undefined) {
            // Set frequency band
            controller.setValue(modData[prop]);
            console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
          } else if (prop === "sensitivity" && modData[prop] !== undefined) {
            // Set sensitivity (acts as enable control)
            controller.setValue(modData[prop]);
            console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
          }
          // Other properties are set normally on the modulator object
          else if (modData[prop] !== undefined) {
            modulator[prop] = modData[prop];
          }
        });

        // Set target using the method which connects the modulator to its target
        if (modData.targetName && typeof modulator.setTarget === "function") {
          modulator.setTarget(modData.targetName);
        }

        // Handle backward compatibility for attack/release
        if (modData.attack === undefined && modData.smoothing !== undefined) {
          // If old preset without attack/release, use smoothing for both
          modulator.attack = modData.smoothing;
          modulator.release = modData.smoothing;
        } else {
          // Otherwise use the properties if defined, or defaults
          modulator.attack = modData.attack !== undefined ? modData.attack : 0.3;
          modulator.release = modData.release !== undefined ? modData.release : 0.7;
        }

        // Set min/max if available
        if (modData.min !== undefined && modData.max !== undefined) {
          // Find min/max controllers and update them
          const minController = folder.controllers.find(
            (c) => c.property === "min"
          );
          const maxController = folder.controllers.find(
            (c) => c.property === "max"
          );

          if (minController) minController.setValue(modData.min);
          if (maxController) maxController.setValue(modData.max);
        }
      }

      // Update UI after all modulators are created
      this.update();

      // Force refresh of UI controllers
      this.updateControllerDisplays();

      console.log(
        `Successfully loaded ${data.modulators.length} input modulators from preset`
      );

      return success;
    } catch (error) {
      console.error("Error applying input modulation preset:", error);
      return false;
    }
  }

  // Add this method if it doesn't exist to update controller displays
  updateControllerDisplays() {
    // Update all modulator UI controllers to reflect current values
    if (!this.modulatorManager || !this.modulatorFolders) return;

    this.modulatorManager.modulators
      .filter((m) => m.type === "input" && m.inputSource === "mic")
      .forEach((modulator, index) => {
        // Find the folder for this modulator
        const folder = this.modulatorFolders[index];
        if (!folder) return;

        // Update all controllers in the folder
        folder.controllers.forEach((controller) => {
          // Only update controllers for properties that exist on the modulator
          if (modulator.hasOwnProperty(controller.property)) {
            controller.updateDisplay();
          }
        });
      });
  }
}
