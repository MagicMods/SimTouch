import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";
import { debugManager } from '../../util/debugManager.js';
export class InputModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.audioDevices = [];
    this.modulatorFolders = [];
    this.micControllers = [];
    this.audioInputEnabled = false;
    this.modulatorManager = null;
    this.gui.title("Input Modulation");
    this.initInputControls();
    this.presetManager = null;
    this.presetSelect = null;

    // Add target selection state properties
    this.targetSelectionMode = false;
    this.activeModulator = null;
    this.targetSelectionButton = null;

    this.bandVisualizationInterval = setInterval(() => {
      this.updateAllBandVisualizations();
    }, 50);

    this.gui.open();

    // Add CSS for target selection mode if not already present
    if (!document.getElementById("input-modulation-target-selection-styles")) {
      const style = document.createElement("style");
      style.id = "input-modulation-target-selection-styles";
      style.textContent = `
        /* General styles for target selection mode */
        body.input-modulation-target-selection-mode .controller {
          opacity: 0.5;
          pointer-events: none;
        }
        
        /* Style for selectable targets */
        body.input-modulation-target-selection-mode [data-is-target="true"] {
          opacity: 1;
          pointer-events: auto;
          position: relative;
          transition: background-color 0.2s, transform 0.1s;
        }
        
        /* Hover effect for selectable targets */
        body.input-modulation-target-selection-mode [data-is-target="true"]:hover {
          background-color: rgba(255, 255, 100, 0.2);
          transform: scale(1.02);
        }
        
        /* Prevent selection mode affecting input modulation UI itself */
        body.input-modulation-target-selection-mode .input-modulation-ui .controller {
          opacity: 1;
          pointer-events: auto;
        }
      `;
      document.head.appendChild(style);
    }
  }

  get db() {
    return debugManager.get('inputMod');
  }

  //#region Ui Setup

  initInputControls() {
    if (!this.main.externalInput) return;

    const externalInput = this.main.externalInput;

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
    if (this.db) console.log("InputModulationUi initialized with preset manager");
    if (presetManager) {
      this.initPresetControls(presetManager);
    }
  }
  //#endregion

  //#region Modulator

  setModulatorManager(manager) {
    this.modulatorManager = manager;
    if (this.db) console.log("ModulatorManager set in InputModulationUi");
  }

  addInputModulator() {
    if (!this.modulatorManager) {
      console.error("ModulatorManager not available");
      return null;
    }

    this.enableDisableAudioInput(true);

    const modulator = this.modulatorManager.createInputModulator("mic");
    if (!modulator) {
      console.error("Failed to create input modulator");
      return null;
    }

    modulator.type = "input";
    modulator.inputSource = "mic";
    modulator.enabled = modulator.sensitivity > 0;

    if (this.db) console.log("Creating new mic modulator:", modulator);

    const index = this.modulatorFolders.length;
    const folder = this.gui.addFolder(`Audio Modulator ${index + 1}`);

    // Store the folder reference
    this.modulatorFolders.push(folder);

    // Initialize controllers object on the modulator to store references
    modulator.controllers = {};

    folder.open();
    if (this.db) console.log(`Created folder for modulator ${index + 1}`);

    // Store controllers locally for setup, then assign to modulator.controllers
    const localControllers = {};

    localControllers.frequencyBand = folder
      .add(modulator, "frequencyBand", [
        "None",
        "Sub",
        "Bass",
        "LowMid",
        "Mid",
        "HighMid",
        "Presence",
        "Brilliance",
        "Custom"
      ])
      .name("Frequency Band")
      .onChange((value) => {
        // Call the new helper method to handle visibility
        this._updateCustomBandControlsVisibility(modulator, value);

        // Update visualizer marker if available
        if (this.main?.soundVisualizer) {
          const showCustom = value === "Custom"; // Use correct case here too for consistency
          if (showCustom) {
            this.main.soundVisualizer.setCustomBandMarker(
              modulator.customFreq,
              modulator.customWidth,
              true
            );
          } else {
            this.main.soundVisualizer.setCustomBandMarker(0, 0, false);
          }
        }
      });

    localControllers.frequencyBand.domElement.classList.add("full-width");

    localControllers.customFreq = folder
      .add(modulator, "customFreq", 20, 20000, 10)
      .name("Freq Center (Hz)")
      .onChange((value) => {
        // Update visualizer if available
        if (this.main?.soundVisualizer && modulator.frequencyBand === "Custom") {
          this.main.soundVisualizer.setCustomBandMarker(
            value,
            modulator.customWidth,
            true
          );
        }
      });

    localControllers.customWidth = folder
      .add(modulator, "customWidth", 10, 10000, 10)
      .name("Band Width (Hz)")
      .onChange((value) => {
        // Update visualizer if available
        if (this.main?.soundVisualizer && modulator.frequencyBand === "Custom") {
          this.main.soundVisualizer.setCustomBandMarker(
            modulator.customFreq,
            value,
            true
          );
        }
      });

    localControllers.customFreq.show(false);
    localControllers.customWidth.show(false);

    const targetNames = this.modulatorManager.getTargetNames();
    localControllers.targetName = folder
      .add(modulator, "targetName", ["None", ...targetNames])
      .name("Target")
      .onChange((value) => {
        // Skip "None" option
        if (value === "None") return;

        // Connect to target
        if (this.db) console.log(`Setting target to ${value}`);
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
          if (this.db) console.log(`Auto-ranging for target ${value}`);

          // Only update value ranges, not actual values if loading from preset
          if (!modulator._loadingFromPreset) {
            modulator.min = targetInfo.min;
            modulator.max = targetInfo.max;

            // Update UI controls
            if (localControllers.min) localControllers.min.setValue(targetInfo.min);
            if (localControllers.max) localControllers.max.setValue(targetInfo.max);
          }

          // Always update ranges
          if (localControllers.min) {
            localControllers.min.min(targetInfo.min);
            localControllers.min.max(targetInfo.max);
          }

          if (localControllers.max) {
            localControllers.max.min(targetInfo.min);
            localControllers.max.max(targetInfo.max);
          }
        }
      });

    localControllers.targetName.domElement.classList.add("full-width");
    localControllers.targetName.domElement.style.paddingBottom = "5px";

    // Add target selection function to the modulator folder
    const addTargetSelectionUI = () => {
      // Create controller wrapper
      const controllerWrapper = document.createElement('div');
      controllerWrapper.className = 'controller';

      // Create button
      const targetSelectionButton = document.createElement('button');
      targetSelectionButton.textContent = 'Select Target';
      targetSelectionButton.className = 'target-selection-button';

      targetSelectionButton.addEventListener('click', () => {
        this.toggleTargetSelectionMode(modulator);
      });

      // Add button to controller wrapper
      controllerWrapper.appendChild(targetSelectionButton);

      // Add elements to folder
      const folderChildren = folder.domElement.querySelector('.children');
      const targetControllerElement = localControllers.targetName.domElement;
      if (folderChildren && targetControllerElement) {
        folderChildren.insertBefore(controllerWrapper, targetControllerElement);
      }

      // Store references on modulator
      modulator._uiElements = modulator._uiElements || {};
      modulator._uiElements.targetSelectionButton = targetSelectionButton;
    };

    // Add the target selection UI
    addTargetSelectionUI();

    localControllers.sensitivity = folder
      .add(modulator, "sensitivity", 0, 1, 0.01)
      .name("Sensitivity")
      .onChange((value) => {
        const wasEnabled = modulator.enabled;
        modulator.enabled = value > 0;

        // Only reset if going from enabled to disabled
        if (wasEnabled && value === 0) {
          if (this.db) console.log(`Sensitivity is 0, resetting ${modulator.targetName}`);
          modulator.resetToOriginal();
        }
      });

    localControllers.threshold = folder
      .add(modulator, "threshold", 0, 1, 0.01)
      .name("Threshold")
      .onChange((value) => {
        // Force visualization update
        this.updateAllBandVisualizations();
      });

    localControllers.attack = folder
      .add(modulator, "attack", 0, 0.99, 0.01)
      .name("Attack")
      .onChange(() => {
        this.updateAllBandVisualizations();
      });

    localControllers.release = folder
      .add(modulator, "release", 0, 0.99, 0.01)
      .name("Release")
      .onChange(() => {
        this.updateAllBandVisualizations();
      });

    localControllers.min = folder
      .add(modulator, "min", 0, 1, 0.01)
      .name("Min Value");
    localControllers.max = folder
      .add(modulator, "max", 0, 1, 0.01)
      .name("Max Value");

    localControllers.min.domElement.style.paddingTop = "5px";
    localControllers.max.domElement.style.paddingBottom = "5px";

    localControllers.remove = folder
      .add(
        {
          remove: () => {
            if (this.db) console.log(
              `Removing input modulator with target ${modulator.targetName}`
            );

            if (modulator && typeof modulator.resetToOriginal === "function") {
              if (this.db) console.log(
                `Explicitly resetting ${modulator.targetName} to original value ${modulator.originalValue}`
              );
              modulator.resetToOriginal();
            }

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

            folder.destroy();

            // Remove from tracking array
            const folderIndex = this.modulatorFolders.indexOf(folder);
            if (folderIndex > -1) {
              this.modulatorFolders.splice(folderIndex, 1);
            }

            if (this.db) console.log(`Removed input modulator folder`);
          },
        },
        "remove"
      )
      .name("Remove");

    // Assign the created controllers to the modulator instance
    modulator.controllers = localControllers;

    // Store a reference to the folder in the modulator for easier access
    modulator.folder = folder;

    try {
      this.addVisualizationToModulator(modulator, folder);
      if (this.db) console.log(`Added visualization to modulator ${index + 1}`);
    } catch (error) {
      console.error("Failed to add visualization to modulator:", error);
    }

    return modulator;
  }

  // NEW: Helper method to manage custom band control visibility
  _updateCustomBandControlsVisibility(modulator, bandValue) {
    if (!modulator || !modulator.controllers) return;

    const showCustom = bandValue === "Custom"; // Use correct case

    if (modulator.controllers.customFreq) {
      modulator.controllers.customFreq.show(showCustom);
    }
    if (modulator.controllers.customWidth) {
      modulator.controllers.customWidth.show(showCustom);
    }
  }

  getModulatorsData() {

    if (!this.modulatorManager) {
      console.error(
        `Error getting modulator data: modulatorManager is not defined`
      );
      return { modulators: [] };
    }

    const modulators = [];

    try {

      if (
        Array.isArray(this.modulatorFolders) &&
        this.modulatorFolders.length > 0
      ) {
        if (this.db) console.log(
          `InputModulationUi: Extracting data from ${this.modulatorFolders.length} folders`
        );

        this.modulatorFolders.forEach((folder) => {
          try {
            // Extract data from folder
            const modData = {
              type: "input",
              inputSource: "mic",
              enabled: false,
              frequencyBand: "None",
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
        if (this.db) console.log(
          "InputModulationUi: Falling back to modulatorManager for data"
        );

        // Get modulators from manager
        const managerMods = this.modulatorManager.modulators
          .filter((m) => m.type === "input" && m.inputSource === "mic")
          .map((mod) => ({
            type: "input",
            inputSource: "mic",
            enabled: mod.enabled,
            frequencyBand: mod.frequencyBand || "None",
            sensitivity: mod.sensitivity || 1,
            smoothing: mod.smoothing || 0.7,
            min: mod.min || 0,
            max: mod.max || 1,
            targetName: mod.targetName || "None",
          }));

        modulators.push(...managerMods);
      }

      if (this.db) console.log(
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
    if (this.db) console.log("InputModulationUi: Clearing all modulators");

    try {
      // IMPORTANT FIX: Reset to original values FIRST
      if (this.modulatorManager && this.modulatorManager.modulators) {
        this.modulatorManager.modulators
          .filter((m) => m.type === "input" && m.inputSource === "mic")
          .forEach((m) => {
            // Reset to original value before disabling
            try {
              // Try to reset to original value
              m.resetToOriginal();
              if (this.db) console.log(`Resetting ${m.targetName || "unnamed"} to original value`);
            } catch (e) {
              // If resetToOriginal isn't available, just continue
              console.warn(`Failed to reset ${m.targetName || "unnamed"}:`, e);
            }
            // Then disable
            m.enabled = false;
          });
      }

      // Remove from manager
      if (this.modulatorManager && this.modulatorManager.removeModulatorsByInput) {
        this.modulatorManager.removeModulatorsByInput("mic");
      }

      // Remove UI folders
      this.modulatorFolders.forEach((folder) => {
        if (folder) {
          try {
            folder.destroy();
          } catch (e) {
            console.warn("Failed to destroy folder:", e);
          }
        }
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
    if (!this.audioInputEnabled) {
      return;
    }

    // Check if mic forces are enabled
    if (!this.main.externalInput || !this.main.externalInput.micForces ||
      !this.main.externalInput.micForces.enabled) {
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

        // Get global sensitivity with fallback
        let globalSensitivity = 1.0;
        if (this.main.externalInput && this.main.externalInput.micForces) {
          globalSensitivity = this.main.externalInput.micForces.sensitivity || 1.0;
        }

        // Update each modulator with its appropriate audio data
        audioModulators.forEach((modulator) => {
          try {
            // Get the appropriate frequency band value based on modulator's band setting
            let bandValue = 0;

            if (modulator.frequencyBand === "Custom") {
              // Calculate min/max from center frequency and width
              const centerFreq = modulator.customFreq || 1000;
              const width = modulator.customWidth || 100;

              const minFreq = Math.max(20, centerFreq - width / 2);
              const maxFreq = Math.min(20000, centerFreq + width / 2);

              // Get energy for custom frequency range
              bandValue = analyzer.getFrequencyRangeValue(minFreq, maxFreq) || 0;
            } else if (modulator.frequencyBand && modulator.frequencyBand !== "None") {
              // Get band-specific audio level
              bandValue = bandLevels[modulator.frequencyBand] || 0;

              // // Log value for debugging when significant
              // if (bandValue > 0.1) {
              //   if (this.db) console.log(
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

    if (this.db) console.log(`Setting audio input ${enabled ? "enabled" : "disabled"}`);

    // Store internal state
    this.audioInputEnabled = enabled;

    if (enabled) {
      this.main.externalInput.enableMic();
      // Show the main sound visualizer
      if (this.main.soundVisualizer) {
        this.main.soundVisualizer.show();
      }
    } else {
      // Disable mic via external input connector
      this.main.externalInput.disableMic();
      // Hide the main sound visualizer
      if (this.main.soundVisualizer) {
        this.main.soundVisualizer.hide();
      }
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

      // if (this.db) console.log(`Found ${audioInputDevices.length} audio input devices`);
    } catch (error) {
      console.error("Error enumerating audio devices:", error);
    }
  }
  // Method to set the selected audio input device
  setAudioInputDevice(deviceId) {
    if (!this.main.externalInput) return;

    if (this.db) console.log(`Setting audio input device to: ${deviceId}`);
    this.main.externalInput.setAudioInputDevice(deviceId);
  }

  //#endregion

  //#region Visualization

  // Add the visualization helper method
  addVisualizationToModulator(modulator, folder) {
    // Create container for visualization
    const container = document.createElement("div");
    container.classList.add('modulator-vis-container');

    // Create visualization elements
    const bar = document.createElement("div");
    bar.style.width = "0%";
    bar.style.backgroundColor = "#8f8";
    bar.classList.add('modulator-vis-bar');
    container.appendChild(bar);

    // Create threshold marker (initially hidden)
    const thresholdMarker = document.createElement("div");
    thresholdMarker.style.display = "none";
    thresholdMarker.classList.add('modulator-vis-threshold');
    container.appendChild(thresholdMarker);

    const label = document.createElement("div");
    label.textContent = "0%";
    label.classList.add('modulator-vis-label');
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
          let bandName = modulator.frequencyBand === "None" ? "All" : modulator.frequencyBand;

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

      if (this.db) console.log(
        `Loading ${data.modulators.length} input modulators from preset`
      );

      // First clear existing modulators
      this.clearAllModulators();

      // MANUALLY CREATE MODULATORS INSTEAD OF USING loadModulatorsState
      let success = true;

      // Loop through each modulator in the preset data
      for (let i = 0; i < data.modulators.length; i++) {
        const modData = data.modulators[i];
        if (this.db) console.log(
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
            if (this.db) console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
          } else if (prop === "frequencyBand" && modData[prop] !== undefined) {
            // Set frequency band
            controller.setValue(modData[prop]);
            if (this.db) console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
            // >>> ADDED: Call visibility update after setting value from preset
            this._updateCustomBandControlsVisibility(modulator, modData[prop]);
            // >>> ADDED: Explicitly update visualizer marker state when loading preset
            const showCustom = modData[prop] === "Custom";
            if (this.main?.soundVisualizer) {
              // Ensure customFreq/Width are taken from modData if available, else modulator defaults
              const freq = modData.customFreq !== undefined ? modData.customFreq : modulator.customFreq;
              const width = modData.customWidth !== undefined ? modData.customWidth : modulator.customWidth;
              this.main.soundVisualizer.setCustomBandMarker(freq, width, showCustom);
            }
          } else if (prop === "sensitivity" && modData[prop] !== undefined) {
            // Set sensitivity (acts as enable control)
            controller.setValue(modData[prop]);
            if (this.db) console.log(`Set UI controller for ${prop} to ${modData[prop]}`);
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

      if (this.db) console.log(
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

  // Add target selection mode handling methods
  toggleTargetSelectionMode(modulator) {
    // Exiting selection mode
    if (this.targetSelectionMode && this.activeModulator === modulator) {
      if (this.db) console.log('Cancelling target selection mode');
      this.targetSelectionMode = false;
      this.activeModulator = null;

      // Remove highlighting
      this.toggleTargetControlsHighlight(false);

      // Update button 
      this.updateTargetButtonIndicator(modulator, false);

      // Remove click listener with capture phase to match how it was added
      document.removeEventListener('click', this.handleTargetSelection, true);

      // Clear backwards compatibility reference
      this.targetSelectionButton = null;
    }
    // Entering selection mode
    else if (modulator) {
      if (this.db) console.log(`Entering target selection mode for modulator: ${modulator.targetName || 'New Modulator'}`);

      // If already in selection mode for another modulator, cancel that first
      if (this.targetSelectionMode && this.activeModulator) {
        this.updateTargetButtonIndicator(this.activeModulator, false);
      }

      this.targetSelectionMode = true;
      this.activeModulator = modulator;

      // Update button
      this.updateTargetButtonIndicator(modulator, true);

      // Enable highlighting
      this.toggleTargetControlsHighlight(true);

      // Add click listener with capture phase to ensure it fires before other handlers
      document.removeEventListener('click', this.handleTargetSelection, true); // Remove first to prevent duplicates
      document.addEventListener('click', this.handleTargetSelection, true);

      // Backwards compatibility
      if (modulator._uiElements) {
        this.targetSelectionButton = modulator._uiElements.targetSelectionButton;
      }
    }
    // Called from elsewhere (e.g., handleTargetSelection) - just exit mode
    else {
      if (this.targetSelectionMode) {
        if (this.db) console.log('Exiting target selection mode');

        // Remove highlighting
        this.toggleTargetControlsHighlight(false);

        // Update button of active modulator
        if (this.activeModulator) {
          this.updateTargetButtonIndicator(this.activeModulator, false);
        }

        // Remove click listener with capture phase to match how it was added
        document.removeEventListener('click', this.handleTargetSelection, true);

        // Clear state
        this.targetSelectionMode = false;
        this.activeModulator = null;
        this.targetSelectionButton = null;
      }
    }
  }

  handleTargetSelection = (e) => {
    if (this.db) console.log('Target selection click event');

    if (!this.targetSelectionMode || !this.activeModulator) {
      return;
    }

    // Find the clicked element
    let element = e.target;

    // Check if the click is on the selection button itself - ignore it
    if (this.activeModulator._uiElements && element === this.activeModulator._uiElements.targetSelectionButton) { // Add null check for safety
      if (this.db) console.log('Clicked on the target selection button - ignoring');
      return;
    }

    while (element && !element.classList.contains('controller')) {
      element = element.parentElement;
    }

    if (!element) {
      return;
    }

    // Check if this is actually a valid target (has our data attribute)
    if (element.getAttribute('data-is-target') !== 'true') {
      if (this.db) console.log('Clicked on non-target controller - ignoring');
      return;
    }

    // Find the target name from the controller's label
    const labelElement = element.querySelector('.name');
    if (!labelElement) {
      return;
    }

    const targetName = labelElement.textContent.trim();
    if (!targetName) {
      return;
    }

    if (this.db) console.log('Selected target:', targetName);

    // Get the controllers from the activeModulator
    const controllers = this.activeModulator.controllers;
    if (!controllers || !controllers.targetName) {
      if (this.db) console.log('Could not find target controller in modulator');
      this.toggleTargetSelectionMode(null);
      return;
    }

    // Exit target selection mode before changing the target
    this.toggleTargetSelectionMode(null);

    // Update the target dropdown controller directly
    controllers.targetName.setValue(targetName);

    // The controller's onChange event will handle setting the target on the modulator,
    // updating the folder title, and auto-ranging
  }

  updateTargetButtonIndicator(modulator, isActive) {
    if (!modulator || !modulator._uiElements) {
      console.warn('Cannot update button: modulator or UI elements not available');
      return;
    }

    const button = modulator._uiElements.targetSelectionButton;

    if (button) {
      button.style.backgroundColor = isActive ? '#ff4444' : ''; // Use hex color for consistency
      button.textContent = isActive ? 'Cancel Selection' : 'Select Target';
    }
  }

  toggleTargetControlsHighlight(highlight) {
    if (highlight) {
      // First make sure modulator controls are marked
      this.markModulatorControls();

      // Add the selection class to body (will apply general styling)
      document.body.classList.add('input-modulation-target-selection-mode');

      // Get all registered target names
      const validTargetNames = this.modulatorManager ? this.modulatorManager.getTargetNames() : [];

      // For each controller, add highlight only if it's a valid target
      const controllers = document.querySelectorAll('.controller:not(.input-modulator-control)');
      controllers.forEach(controller => {
        const nameElement = controller.querySelector('.name');
        if (nameElement) {
          const controllerName = nameElement.textContent.trim();
          const isValidTarget = validTargetNames.includes(controllerName);

          // Add a custom attribute for targeting CSS
          controller.setAttribute('data-is-target', isValidTarget ? 'true' : 'false');
        }
      });

      if (this.db) console.log(`Enabled target selection highlighting (${validTargetNames.length} valid targets available)`);
    } else {
      // Remove the class from body
      document.body.classList.remove('input-modulation-target-selection-mode');

      // Clean up any data attributes we added
      const controllers = document.querySelectorAll('[data-is-target]');
      controllers.forEach(controller => {
        controller.removeAttribute('data-is-target');
      });

      if (this.db) console.log('Disabled target selection highlighting');
    }
  }

  markModulatorControls() {
    // Mark the input modulation UI to prevent it from being affected by selection mode
    const inputModulationElements = document.querySelectorAll('.lil-gui');
    inputModulationElements.forEach(element => {
      if (element.contains(this.gui.domElement)) {
        element.classList.add('input-modulation-ui');
      }
    });

    // First, get all folder elements for audio modulators
    const modulatorFolders = Array.from(document.querySelectorAll('.lil-gui .title'))
      .filter(el => el.textContent.includes('Audio Modulator'));

    // For each folder, mark all controllers inside as modulator controls
    modulatorFolders.forEach(folderTitle => {
      const folderElement = folderTitle.parentElement;
      if (folderElement) {
        const controllers = folderElement.querySelectorAll('.controller');
        controllers.forEach(controller => {
          controller.classList.add('input-modulator-control');
        });
      }
    });
  }


}
