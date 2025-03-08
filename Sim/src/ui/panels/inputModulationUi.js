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

    // Update modulators with current audio data
    if (this.modulatorManager) {
      this.modulatorManager.update();
    }
  }

  updateAllBandVisualizations() {
    if (!this.main.externalInput?.micForces?.enabled) return;

    // Get all input modulators with mic source
    const modulators =
      this.modulatorManager?.modulators.filter(
        (m) => m.type === "input" && m.inputSource === "mic"
      ) || [];

    // Update each modulator's visualization
    modulators.forEach((modulator) => {
      if (modulator.ui?.bar) {
        // Get the current value
        const value = modulator.currentValue || 0;
        const percent = Math.min(100, Math.max(0, value * 100));

        // Update the visualization
        modulator.ui.bar.style.width = `${percent}%`;
        modulator.ui.bar.style.backgroundColor = this.getIntensityColor(value);

        // Update the label
        if (modulator.ui.label) {
          const bandName =
            modulator.frequencyBand === "none"
              ? "All"
              : modulator.frequencyBand;
          modulator.ui.label.textContent = `${bandName}: ${Math.round(
            percent
          )}%`;
        }
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
    console.log("InputModulationUi: Loading preset data");

    try {
      // Validate preset data
      if (!preset || !preset.modulators || !Array.isArray(preset.modulators)) {
        console.error("Invalid input modulation preset data", preset);
        return false;
      }

      // Clear existing modulators
      this.clearAllModulators();

      // For "None" preset, just clear modulators and return
      if (preset.modulators.length === 0) {
        return true;
      }

      // Process each modulator in the preset data
      preset.modulators.forEach((modData) => {
        const mod = this.addMicModulator();
        if (mod) {
          // Mark loading from preset to prevent auto-ranging
          mod._loadingFromPreset = true;

          // Copy all properties
          Object.keys(modData).forEach((key) => {
            if (key in mod) {
              mod[key] = modData[key];
            }
          });

          // Set target last
          if (modData.targetName && modData.targetName !== "None") {
            mod.setTarget(modData.targetName);
          }
        }
      });

      return true;
    } catch (error) {
      console.error("Error loading input modulation preset data:", error);
      return false;
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

  getModulatorsData() {
    if (!this.modulatorManager) {
      return { modulators: [] };
    }

    return {
      modulators:
        this.modulatorManager.getModulatorsState("input", "mic") || [],
    };
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

      console.log(`Found ${audioInputDevices.length} audio input devices`);
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

  // Add this method to the InputModulationUi class
  addMicModulator() {
    // Check if we have ModulatorManager reference
    if (!this.modulatorManager) {
      console.error("ModulatorManager not available in InputModulationUi");
      return null;
    }

    // Get target names from ModulatorManager
    const targetNames = this.modulatorManager.getTargetNames();
    if (targetNames.length === 0) {
      console.warn("No targets available for mic modulation");
      return null;
    }

    // Create a new modulator
    const modulator = this.modulatorManager.createInputModulator("mic");

    if (!modulator) {
      console.error("Failed to create mic modulator");
      return null;
    }

    // Create folder for this modulator
    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Audio Modulator ${index + 1}`);
    folder.open();

    // Store the folder reference
    this.modulatorFolders.push(folder);

    // Add enable/disable toggle
    folder
      .add(modulator, "enabled")
      .name("Enabled")
      .onChange((value) => {
        // Just update the modulator's enabled state
        modulator.enabled = value;
      });

    // Add target selector
    const targetController = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        modulator.setTarget(value);
      });

    // Set the initial target to "None"
    targetController.setValue("None");

    // Add frequency band selector
    folder
      .add(modulator, "frequencyBand", [
        "none", // All frequencies
        "sub", // Sub bass (20-60Hz)
        "bass", // Bass (60-250Hz)
        "lowMid", // Low midrange (250-500Hz)
        "mid", // Midrange (500-2000Hz)
        "highMid", // High midrange (2-4kHz)
        "treble", // Treble (4-6kHz)
        "presence", // Presence (6-20kHz)
      ])
      .name("Frequency Band");

    // Add sensitivity control
    folder.add(modulator, "sensitivity", 0.1, 10, 0.1).name("Sensitivity");

    // Add smoothing control
    folder.add(modulator, "smoothing", 0, 0.99, 0.01).name("Smoothing");

    // Add min/max range controllers
    folder.add(modulator, "min", -10, 10, 0.1).name("Min Value");

    folder.add(modulator, "max", -10, 10, 0.1).name("Max Value");

    // Add a visualization bar
    this.addVisualizationToModulator(modulator, folder);

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

    // Create the visualization bar
    const bar = document.createElement("div");
    bar.style.position = "absolute";
    bar.style.left = "0";
    bar.style.top = "0";
    bar.style.height = "100%";
    bar.style.width = "0%";
    bar.style.backgroundColor = "#8f8";
    bar.style.borderRadius = "3px";
    bar.style.transition = "width 0.1s, background-color 0.1s";
    container.appendChild(bar);

    // Create label for the bar
    const label = document.createElement("div");
    label.style.position = "absolute";
    label.style.width = "100%";
    label.style.textAlign = "center";
    label.style.color = "white";
    label.style.fontSize = "10px";
    label.style.lineHeight = "15px";
    label.textContent = "0%";
    label.style.mixBlendMode = "difference"; // Make text visible on any background
    container.appendChild(label);

    // Store references to the visualization elements
    modulator.ui = {
      container,
      bar,
      label,
    };

    // Add to the folder's DOM
    if (folder.domElement) {
      const li = document.createElement("li");
      li.className = "visualization";
      li.appendChild(container);
      folder.domElement.querySelector("ul").appendChild(li);
    }

    return container;
  }
}
