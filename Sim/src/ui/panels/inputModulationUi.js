import { BaseUi } from "./baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class InputModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize arrays and references
    this.audioDevices = [];
    this.modulatorFolders = [];
    this.micControllers = [];

    // ModulatorManager will be set by UiManager
    this.modulatorManager = null;

    // Change the GUI title
    this.gui.title("Input Modulation");

    // Initialize basic controls
    this.initMicInputControls();

    // PresetManager will be initialized later
    this.presetManager = null;
    this.presetSelect = null; // Reference to the HTML select element

    // Create a single interval for updating all band visualizations
    this.bandVisualizationInterval = setInterval(() => {
      this.updateAllBandVisualizations();
    }, 50);
  }

  initializeWithUiPanels(leftUi, rightUi) {
    console.log("InputModulationUi initializing with UI panels");
    this.leftUi = leftUi;
    this.rightUi = rightUi;
    console.log("InputModulationUi initialized with UI panels");
  }

  initMicInputControls() {
    if (!this.main.externalInput) return;

    const externalInput = this.main.externalInput;

    // Enable toggle at ROOT level
    this.micEnableController = this.gui
      .add({ enabled: externalInput?.micForces?.enabled || false }, "enabled")
      .name("Enable Audio Input")
      .onChange((value) => {
        if (externalInput && externalInput.micForces) {
          if (value) {
            externalInput.enableMic();
          } else {
            externalInput.disableMic();
          }
          this.onMicInputToggled(value);
        }
      });

    // Add device selector right after the enable toggle
    this.addAudioDeviceSelector();

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
        if (externalInput && externalInput.micForces) {
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
        if (externalInput && externalInput.micForces) {
          externalInput.setMicSmoothing(value);
        }
      });
    this.micControllers.push(this.micSmoothingController);

    // Add calibrate button
    const calibrateObj = {
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
      .add(calibrateObj, "calibrate")
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

    // Hide controls initially (or show if already enabled)
    const isEnabled = externalInput?.micForces?.enabled || false;
    this.toggleAllMicControlsVisibility(isEnabled);

    this.gui.open();
  }

  // Initialize with custom HTML preset controls - following the PulseModulationUi pattern
  initPresetControls(presetManager) {
    if (!presetManager) {
      console.warn("PresetManager not provided to InputModulationUi");
      return;
    }

    this.presetManager = presetManager;

    // Find the correct container in GUI structure
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in GUI");
      return;
    }

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";
    presetSelect.style.margin = "5px";

    // Store reference to the select element
    this.presetSelect = presetSelect;

    // Populate dropdown options
    this.updatePresetDropdown(presetSelect);

    // Set up change event handler
    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Input modulation preset selector changed to:", value);
      this.presetManager.loadPreset(PresetManager.TYPES.MIC, value, this);
    });

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px";
    actionsContainer.style.flexWrap = "wrap"; // Allow wrapping if needed

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter input modulation preset name:");
      if (
        presetName &&
        this.presetManager.savePreset(PresetManager.TYPES.MIC, presetName, this)
      ) {
        this.updatePresetDropdown(presetSelect);
        alert(`Input modulation preset "${presetName}" saved.`);
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

      if (
        confirm(`Delete preset "${current}"?`) &&
        this.presetManager.deletePreset(PresetManager.TYPES.MIC, current)
      ) {
        this.updatePresetDropdown(presetSelect);
        alert(`Input modulation preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Insert preset controls after the enable toggle
    let insertPoint = this.micEnableController?.domElement?.nextSibling;

    if (insertPoint) {
      containerElement.insertBefore(presetSelect, insertPoint);
      containerElement.insertBefore(actionsContainer, presetSelect.nextSibling);
    } else {
      containerElement.appendChild(presetSelect);
      containerElement.appendChild(actionsContainer);
    }
  }

  // Helper method to update dropdown options
  updatePresetDropdown(selectElement) {
    if (!this.presetManager || !selectElement) return;

    const options = this.presetManager.getPresetOptions(
      PresetManager.TYPES.MIC
    );
    console.log(
      "Updating input modulation preset dropdown with options:",
      options
    );

    // Clear existing options
    selectElement.innerHTML = "";

    // Add all available presets
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Set current selection
    const currentPreset = this.presetManager.getSelectedPreset(
      PresetManager.TYPES.MIC
    );
    if (currentPreset) {
      selectElement.value = currentPreset;
    }
  }

  // Initialize with preset manager
  initWithPresetManager(presetManager) {
    console.log("InputModulationUi initialized with preset manager");
    if (presetManager) {
      this.presetManager = presetManager;
      this.initPresetControls(presetManager);
    }
  }

  update() {
    if (!this.main.externalInput?.micForces?.enabled) return;

    // Get global sensitivity
    const globalSensitivity =
      this.main.externalInput?.micForces?.sensitivity || 1.0;

    // Only log when it changes
    if (this._lastGlobalSensitivity !== globalSensitivity) {
      console.log(`Global sensitivity: ${globalSensitivity}`);
      this._lastGlobalSensitivity = globalSensitivity;
    }

    // Process mic input for each modulator
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

    // Run general update pass
    if (this.modulatorManager) {
      this.modulatorManager.update();
    }

    // Update visualizations
    this.updateAllBandVisualizations();
  }

  updateAllBandVisualizations() {
    if (!this.main.externalInput?.micForces?.enabled) return;

    // Use dynamic detection
    const modulators = (this.modulatorManager?.modulators || []).filter((m) => {
      return m.inputSource === "mic" || (m.ui && m.ui.bar);
    });

    // Update each modulator's visualization
    modulators.forEach((modulator) => {
      if (!modulator.ui?.bar) return;

      try {
        // IMPORTANT: Use the sensitivity-adjusted value (inputValue), not the raw value
        // This value already incorporates both global and local sensitivity
        const value =
          modulator.inputValue !== undefined
            ? modulator.inputValue
            : modulator.value || 0;

        // Update the bar
        const percent = Math.min(100, Math.max(0, value * 100));
        modulator.ui.bar.style.width = `${percent}%`;
        modulator.ui.bar.style.backgroundColor = this.getIntensityColor(value);

        // Update label with sensitivity-adjusted percentage
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

  onMicInputToggled(enabled) {
    // Show/hide all controllers except the enable switch
    this.toggleAllMicControlsVisibility(enabled);

    // Also toggle the preset controls
    if (this.presetSelect) {
      this.presetSelect.parentElement.style.display = enabled
        ? "block"
        : "none";
    }
  }

  toggleAllMicControlsVisibility(show) {
    // Toggle visibility for all controllers except the enable switch
    this.micControllers.forEach((controller) => {
      if (controller?.domElement) {
        controller.domElement.style.display = show ? "block" : "none";
      }
    });

    // Toggle visibility of modulator folders
    this.modulatorFolders.forEach((folder) => {
      if (folder?.domElement) {
        folder.domElement.parentElement.style.display = show ? "block" : "none";
      }
    });
  }

  setModulatorManager(manager) {
    this.modulatorManager = manager;
    console.log("ModulatorManager set in InputModulationUi");
  }

  loadPresetData(preset) {
    console.log("InputModulationUi: Loading preset data", preset);

    if (!preset) {
      console.error("Invalid preset data");
      return false;
    }

    // Clear existing modulators
    this.clearAllModulators();

    // Extract modulators array, handling different formats
    let modulators = [];

    if (Array.isArray(preset.modulators)) {
      // Direct modulators array
      modulators = preset.modulators;
    } else if (
      preset.micSettings &&
      Array.isArray(preset.micSettings.modulators)
    ) {
      // Nested in micSettings
      modulators = preset.micSettings.modulators;
    } else {
      console.warn("No modulators found in preset");
      return true; // Still return success for empty presets
    }

    console.log(`Creating ${modulators.length} modulators from preset`);

    // Create modulators from the data
    modulators.forEach((modData, index) => {
      const mod = this.addMicModulator();
      if (!mod) return;

      // Mark as loading from preset
      mod._loadingFromPreset = true;

      // Get folder for UI updates
      const folder = this.modulatorFolders[this.modulatorFolders.length - 1];

      // Apply basic properties
      if (modData.frequencyBand) mod.frequencyBand = modData.frequencyBand;
      if (modData.smoothing !== undefined) mod.smoothing = modData.smoothing;
      if (modData.min !== undefined) mod.min = modData.min;
      if (modData.max !== undefined) mod.max = modData.max;
      if (modData.sensitivity !== undefined)
        mod.sensitivity = modData.sensitivity;

      // Set target last (after other properties)
      if (modData.targetName && modData.targetName !== "None") {
        console.log(
          `Setting target for modulator ${index + 1} to ${modData.targetName}`
        );
        mod.setTarget(modData.targetName);
      }

      // Update all controllers
      folder.controllers.forEach((controller) => {
        if (
          controller.property &&
          controller.property in mod &&
          controller.setValue
        ) {
          controller.setValue(mod[controller.property]);
        }
      });

      // Enable based on sensitivity
      mod.enabled = mod.sensitivity > 0;

      // Clear loading flag
      delete mod._loadingFromPreset;
    });

    return true;
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

  getModulatorsData() {
    const modulators = [];

    // Process each modulator folder
    this.modulatorFolders.forEach((folder) => {
      // Create a clean modulator data object
      const modData = {
        type: "input",
        inputSource: "mic",
        frequencyBand: "none",
        sensitivity: 0,
        smoothing: 0.7,
        min: 0,
        max: 1,
        targetName: "None",
      };

      // Extract values from controllers
      folder.controllers.forEach((controller) => {
        if (controller?.property) {
          const prop = controller.property;
          if (controller.getValue) {
            // Convert to appropriate type
            let value = controller.getValue();
            if (typeof value === "number" && isNaN(value)) value = 0;
            modData[prop] = value;
          }
        }
      });

      // Ensure enabled state is consistent with sensitivity
      modData.enabled = modData.sensitivity > 0;

      // Add to modulators array
      modulators.push(modData);
    });

    return { modulators };
  }

  dispose() {
    // Clean up interval
    if (this.bandVisualizationInterval) {
      clearInterval(this.bandVisualizationInterval);
    }

    // Clear modulators
    this.clearAllModulators();

    // Call parent dispose
    super.dispose();
  }

  getIntensityColor(value) {
    // Create a color gradient from green to red
    const hue = (1 - value) * 120; // 120=green, 0=red
    return `hsl(${hue}, 100%, 50%)`;
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

  // Fixed implementation of addMicModulator
  addMicModulator() {
    if (!this.modulatorManager) {
      console.error("ModulatorManager not available");
      return null;
    }

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
}
