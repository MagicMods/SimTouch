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
      .name("Global Sensitivity")
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
      .name("Smoothing")
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
    console.log("PulseModulationUi initialized with preset manager");
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
        "treble",
      ])
      .name("Frequency Band");

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

    // Set initial state based on sensitivity
    modulator.enabled = modulator.sensitivity > 0;

    // Add smoothing slider
    controllers.smoothing = folder
      .add(modulator, "smoothing", 0, 0.99, 0.01)
      .name("Smoothing");

    // Add min/max range controls
    controllers.min = folder
      .add(modulator, "min", 0, 1, 0.01)
      .name("Min Value");
    controllers.max = folder
      .add(modulator, "max", 0, 1, 0.01)
      .name("Max Value");

    // Add remove button
    controllers.remove = folder
      .add(
        {
          remove: () => {
            // Disable modulator to reset target
            modulator.enabled = false;

            if (modulator.resetToOriginal) {
              modulator.resetToOriginal();
            }

            // Remove from manager
            this.modulatorManager.removeModulator(modulator);

            // Remove folder
            folder.destroy();

            // Remove from tracking array
            const idx = this.modulatorFolders.indexOf(folder);
            if (idx !== -1) {
              this.modulatorFolders.splice(idx, 1);
            }

            // Log folder removal
            console.log(`Removed modulator folder ${index + 1}`);
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

        // Get data from the UI folders
        this.modulatorFolders.forEach((folder) => {
          try {
            // Find controllers with property values
            const controllers = folder.controllers || [];
            const modData = {
              type: "input",
              inputSource: "mic",
              enabled: false,
              frequencyBand: "none",
              sensitivity: 0,
              smoothing: 0.7,
              min: 0,
              max: 1,
              targetName: "None",
            };

            // Extract values from controllers if available
            controllers.forEach((controller) => {
              if (controller && controller.property && controller.getValue) {
                modData[controller.property] = controller.getValue();
              }
            });

            // Ensure enabled state is consistent with sensitivity
            modData.enabled = modData.sensitivity > 0;

            modulators.push(modData);
          } catch (err) {
            console.error("Error processing folder:", err);
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
            sensitivity: mod.sensitivity || 0,
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

  clearAllModulators() {
    console.log("InputModulationUi: Clearing all modulators");

    try {
      // Disable modulators first
      if (this.modulatorManager?.modulators) {
        this.modulatorManager.modulators
          .filter((m) => m.type === "input" && m.inputSource === "mic")
          .forEach((m) => {
            m.enabled = false;
          });
      }

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

    // Rest of the original update method...
    const globalSensitivity =
      this.main.externalInput?.micForces?.sensitivity || 1.0;

    if (this._lastGlobalSensitivity !== globalSensitivity) {
      console.log(`Global sensitivity: ${globalSensitivity}`);
      this._lastGlobalSensitivity = globalSensitivity;
    }

    // Continue with existing update logic...
    if (this.modulatorManager && this.main.audioAnalyzer) {
      const analyzer = this.main.audioAnalyzer;

      this.modulatorManager.modulators.forEach((modulator) => {
        // Skip inactive modulators to prevent unnecessary resets
        if (modulator.inputSource !== "mic" || modulator.sensitivity <= 0)
          return;

        try {
          // Get band-specific volume
          let value = 0;
          if (modulator.frequencyBand !== "none" && analyzer) {
            const bands = analyzer.calculateBandLevels();
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
                value = ((bands.presence || 0) + (bands.brilliance || 0)) / 2;
                break;
              default:
                value = analyzer.smoothedVolume || 0;
            }
          } else {
            value = analyzer.smoothedVolume || 0;
          }

          // Store raw value
          modulator.rawValue = value;

          // Apply global and local sensitivity
          value *= globalSensitivity * modulator.sensitivity;

          // Store processed value
          modulator.inputValue = value;

          // Apply value to target
          modulator.setInputValue(value);
        } catch (e) {
          console.error("Error processing audio input for modulator:", e);
        }
      });
    }

    if (this.modulatorManager) {
      this.modulatorManager.update();
    }

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

  //#region Preset

  loadPresetData(preset) {
    // Validate preset format
    if (!preset || typeof preset !== "object") {
      console.warn("Invalid preset data: not an object");
      return false;
    }

    // Ensure preset has modulators array
    if (!Array.isArray(preset.modulators)) {
      console.warn("Invalid preset data: missing modulators array");
      return false;
    }

    // Clear existing modulators
    this.clearAllModulators();

    // Empty preset case
    if (preset.modulators.length === 0) {
      return true;
    }

    // Create modulators from the data
    preset.modulators.forEach((modData, index) => {
      const mod = this.addInputModulator();
      if (!mod) return;

      // Mark as loading from preset to prevent side effects
      mod._loadingFromPreset = true;

      // Get the folder for UI updates
      const folder = this.modulatorFolders[this.modulatorFolders.length - 1];

      // Apply basic properties
      Object.keys(modData).forEach((key) => {
        if (key in mod && key !== "target" && key !== "targetName") {
          mod[key] = modData[key];
        }
      });

      // Apply target last
      if (modData.targetName && modData.targetName !== "None") {
        mod.setTarget(modData.targetName);

        // Update target UI
        const targetController = folder.controllers.find(
          (c) => c.property === "targetName"
        );
        if (targetController?.setValue) {
          targetController.setValue(modData.targetName);
        }
      }

      // Update all other UI controls
      folder.controllers.forEach((controller) => {
        if (
          controller.property &&
          controller.property in mod &&
          controller.setValue
        ) {
          controller.setValue(mod[controller.property]);
        }
      });

      // Clear loading flag
      delete mod._loadingFromPreset;
    });

    return true;
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
    modulator.ui = { container, bar, label };

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

        // Update label with proper percentage
        if (modulator.ui.label) {
          const bandName =
            modulator.frequencyBand === "none"
              ? "All"
              : modulator.frequencyBand;
          modulator.ui.label.textContent = `${bandName}: ${Math.round(
            percent
          )}%`;
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
    return this.getModulatorsData();
  }

  // Standard data application method - reuses existing logic
  setData(data) {
    return this.loadPresetData(data);
  }
}
