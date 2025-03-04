class PresetManager {
  constructor(leftGui, rightGui, pulseModUi, inputUi) {
    if (!leftGui || !rightGui) {
      throw new Error("Both GUI instances required");
    }
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi; // Store reference to pulseModUi directly
    this.inputUi = inputUi; // Add reference to inputUi
    this.presets = this.loadPresetsFromStorage();
    this.turbPresets = this.loadTurbPresetsFromStorage();
    this.voronoiPresets = this.loadVoronoiPresetsFromStorage();
    this.pulsePresets = this.loadPulsePresetsFromStorage();
    this.micPresets = this.loadMicPresetsFromStorage(); // Add initialization of micPresets
    this.selectedPreset = "Default";
    this.selectedTurbPreset = "None";
    this.selectedVoronoiPreset = "None";
    this.selectedPulsePreset = "None";
    this.selectedMicPreset = "None"; // Add initialization of selectedMicPreset
  }
  loadPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedPresets");
    return storedPresets
      ? JSON.parse(storedPresets)
      : { Default: { left: this.leftGui.save(), right: this.rightGui.save() } };
  }

  savePresetsToStorage() {
    localStorage.setItem("savedPresets", JSON.stringify(this.presets));
    console.log("Saved presets to storage:", this.presets);
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  savePreset(presetName) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }
    if (this.presets[presetName]) {
      const confirmOverride = confirm(
        `"${presetName}" preset already exists. Do you want to override it?`
      );
      if (!confirmOverride) return false;
    }

    // Save the complete GUI state
    const leftGuiState = this.leftGui.save();
    const rightGuiState = this.rightGui.save();

    // Filter out non-persistent folders (Debug and UDP) from leftGuiState
    if (leftGuiState.folders) {
      // Remove Debug folder if it exists
      if (leftGuiState.folders.Debug) {
        delete leftGuiState.folders.Debug;
      }

      // Remove UDP Network folder if it exists
      if (leftGuiState.folders["UDP Network"]) {
        delete leftGuiState.folders["UDP Network"];
      }
    }

    // Get pulse modulation state if available
    let pulseModState = null;
    if (this.pulseModUi && this.pulseModUi.pulseModManager) {
      const modulators = this.pulseModUi.pulseModManager.modulators;
      if (modulators && modulators.length > 0) {
        pulseModState = modulators.map((mod) => ({
          enabled: mod.enabled,
          targetName: mod.targetName,
          type: mod.type,
          frequency: mod.frequency,
          min: mod.min,
          max: mod.max,
          phase: mod.phase,
        }));
        console.log("Saving pulse modulation state:", pulseModState);
      }
    }

    // Get microphone settings if available
    let micSettings = null;
    if (this.rightGui.main?.externalInput?.micForces) {
      const micForces = this.rightGui.main.externalInput.micForces;
      micSettings = {
        sensitivity: micForces.sensitivity,
        smoothing: micForces.smoothing,
        baselineAmplitude: micForces.baselineAmplitude,
        // Save active targets as modulators
        modulators: Array.from(micForces.targetControllers.entries()).map(
          ([controller, config]) => {
            return {
              controllerPath: this.findControllerPath(controller),
              min: config.min,
              max: config.max,
              sensitivity: config.sensitivity || 1.0,
              frequency: config.frequency || { min: 0, max: 20000 },
            };
          }
        ),
      };
      console.log("Saving microphone settings:", micSettings);
    }

    // Save the filtered state
    this.presets[presetName] = {
      left: leftGuiState,
      right: rightGuiState,
      pulseModulation: pulseModState,
      micSettings: micSettings, // Add mic settings to preset
    };

    this.selectedPreset = presetName;
    this.savePresetsToStorage();
    console.log(
      "Saved preset with pulse modulation state:",
      this.presets[presetName]
    );
    return true;
  }

  deletePreset(presetName) {
    if (presetName === "Default") {
      alert("Cannot delete the Default preset!");
      return false;
    }
    if (!this.presets[presetName]) {
      console.warn("Preset not found:", presetName);
      return false;
    }
    delete this.presets[presetName];
    this.selectedPreset = "Default";
    this.savePresetsToStorage();
    return true;
  }

  loadPreset(presetName) {
    const preset = this.presets[presetName];
    if (preset) {
      if (preset.left) {
        // Create a deep copy to avoid modifying the original preset
        const leftState = JSON.parse(JSON.stringify(preset.left));

        // If the debug or UDP settings were somehow saved in an older preset, remove them
        if (leftState.folders) {
          // Ensure Debug folder is not loaded if present
          if (leftState.folders.Debug) {
            delete leftState.folders.Debug;
          }

          // Ensure UDP Network folder is not loaded if present
          if (leftState.folders["UDP Network"]) {
            delete leftState.folders["UDP Network"];
          }
        }

        // Load the filtered state
        this.leftGui.load(leftState);
      }

      if (preset.right) this.rightGui.load(preset.right);

      // Handle pulse modulation state - ALWAYS clear existing modulators first
      if (this.pulseModUi) {
        // Clear all existing modulators first
        if (
          this.pulseModUi.modulatorFolders &&
          this.pulseModUi.modulatorFolders.length > 0
        ) {
          console.log("Clearing existing pulse modulators");

          // Remove all GUI folders
          for (
            let i = this.pulseModUi.modulatorFolders.length - 1;
            i >= 0;
            i--
          ) {
            if (this.pulseModUi.modulatorFolders[i]) {
              this.pulseModUi.modulatorFolders[i].destroy();
            }
          }
          this.pulseModUi.modulatorFolders = [];
        }

        // Reset the modulator manager
        if (this.pulseModUi.pulseModManager) {
          this.pulseModUi.pulseModManager.modulators = [];

          // Only add modulators from preset if they exist
          if (
            preset.pulseModulation &&
            Array.isArray(preset.pulseModulation) &&
            preset.pulseModulation.length > 0
          ) {
            console.log(
              "Loading pulse modulation state:",
              preset.pulseModulation
            );

            // Add modulators from preset
            preset.pulseModulation.forEach((modData) => {
              const modulator = this.pulseModUi.addPulseModulator();
              if (modulator) {
                // Apply saved properties
                modulator.enabled = modData.enabled;
                modulator.setTarget(modData.targetName || "None");
                modulator.type = modData.type || "sine";
                modulator.frequency = modData.frequency || 1;
                modulator.min = modData.min !== undefined ? modData.min : 0;
                modulator.max = modData.max !== undefined ? modData.max : 1;
                modulator.phase = modData.phase || 0;

                // Update the GUI to reflect changes
                const index =
                  this.pulseModUi.pulseModManager.modulators.indexOf(modulator);
                if (
                  index >= 0 &&
                  index < this.pulseModUi.modulatorFolders.length
                ) {
                  const folder = this.pulseModUi.modulatorFolders[index];
                  if (folder && folder.controllers) {
                    folder.controllers.forEach((controller) => {
                      if (controller && controller.updateDisplay) {
                        controller.updateDisplay();
                      }
                    });
                  }
                }
              }
            });
          } else {
            console.log(
              "No pulse modulation data in preset - cleared existing modulators"
            );
          }
        }
      }

      // Handle mic settings if present
      if (preset.micSettings && this.rightGui.main.externalInput?.micForces) {
        const micForces = this.rightGui.main.externalInput.micForces;
        const micSettings = preset.micSettings;

        console.log("Loading microphone settings:", micSettings);

        // Apply basic settings
        micForces.setSensitivity(micSettings.sensitivity || 1.0);
        micForces.setSmoothing(micSettings.smoothing || 0.8);
        micForces.baselineAmplitude = micSettings.baselineAmplitude || 0.05;

        // Clear existing targets
        micForces.clearTargets();

        // Restore modulators if available
        if (micSettings.modulators && Array.isArray(micSettings.modulators)) {
          micSettings.modulators.forEach((modulatorInfo) => {
            const controller = this.findControllerByPath(
              modulatorInfo.controllerPath
            );
            if (controller) {
              micForces.addTarget(
                controller,
                modulatorInfo.min,
                modulatorInfo.max,
                null, // folder will be set by updateMicInputDisplay
                modulatorInfo.sensitivity,
                modulatorInfo.frequency
              );
            }
          });
        }

        // Update UI to reflect settings
        if (this.rightGui.main.inputUi) {
          this.rightGui.main.inputUi.updateMicInputDisplay();
        }
      }

      this.selectedPreset = presetName;
      console.log(
        `Loaded preset "${presetName}" (excluding non-persistent folders):`,
        preset
      );
      return true;
    }
    return false;
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }

  // Export all presets (main, turbulence, voronoi) to a JSON file
  exportPresets() {
    const allPresets = {
      presets: this.presets,
      turbPresets: this.turbPresets,
      voronoiPresets: this.voronoiPresets,
      pulsePresets: this.pulsePresets,
      micPresets: this.micPresets, // Add this linee
    };

    const dataStr = JSON.stringify(allPresets, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileName = `svibe-presets-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileName);
    linkElement.style.display = "none";
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);

    console.log("Exported presets to file:", exportFileName);
    return true;
  }

  // Import presets from a JSON file
  importPresets(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);
      let importCount = 0;

      // Import main presets
      if (importedData.presets) {
        Object.entries(importedData.presets).forEach(([name, preset]) => {
          // Skip Default preset to avoid overriding core settings
          if (name !== "Default") {
            this.presets[name] = preset;
            importCount++;
          }
        });
        this.savePresetsToStorage();
      }

      // Import turbulence presets
      if (importedData.turbPresets) {
        Object.entries(importedData.turbPresets).forEach(([name, preset]) => {
          // Skip None preset
          if (name !== "None") {
            this.turbPresets[name] = preset;
            importCount++;
          }
        });
        this.saveTurbPresetsToStorage();
      }

      // Import voronoi presets
      if (importedData.voronoiPresets) {
        Object.entries(importedData.voronoiPresets).forEach(
          ([name, preset]) => {
            // Skip None and Default presets
            if (name !== "None" && name !== "Default") {
              this.voronoiPresets[name] = preset;
              importCount++;
            }
          }
        );
        this.saveVoronoiPresetsToStorage();
      }

      // Import pulse presets
      if (importedData.pulsePresets) {
        Object.entries(importedData.pulsePresets).forEach(([name, preset]) => {
          // Skip None preset
          if (name !== "None") {
            this.pulsePresets[name] = preset;
            importCount++;
          }
        });
        this.savePulsePresetsToStorage();
      }

      // Import mic presets
      if (importedData.micPresets) {
        Object.entries(importedData.micPresets).forEach(([name, preset]) => {
          // Skip None preset
          if (name !== "None") {
            this.micPresets[name] = preset;
            importCount++;
          }
        });
        this.saveMicPresetsToStorage();
      }

      console.log(`Successfully imported ${importCount} presets`);
      return importCount;
    } catch (error) {
      console.error("Failed to import presets:", error);
      return false;
    }
  }

  //#region Turbulence Presets

  loadTurbPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedTurbPresets");
    const defaults = {
      None: { turb: { controllers: [{ property: "strength", value: 0 }] } },
    };
    return storedPresets
      ? { ...defaults, ...JSON.parse(storedPresets) }
      : defaults;
  }

  saveTurbPresetsToStorage() {
    localStorage.setItem("savedTurbPresets", JSON.stringify(this.turbPresets));
    console.log("Saved turbulence presets to storage:", this.turbPresets);
  }

  getTurbPresetOptions() {
    return Object.keys(this.turbPresets);
  }

  saveTurbPreset(presetName, turbGui) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }
    if (this.turbPresets[presetName]) {
      const confirmOverride = confirm(
        `"${presetName}" turbulence preset already exists. Do you want to override it?`
      );
      if (!confirmOverride) return false;
    }
    const fullState = turbGui.save();
    console.log("Full turbulence GUI state:", fullState);
    this.turbPresets[presetName] = { turb: fullState };
    this.selectedTurbPreset = presetName;
    this.saveTurbPresetsToStorage();
    return true;
  }

  deleteTurbPreset(presetName) {
    if (presetName === "None") {
      alert("Cannot delete the None turbulence preset!");
      return false;
    }
    if (!this.turbPresets[presetName]) {
      console.warn("Turbulence preset not found:", presetName);
      return false;
    }
    delete this.turbPresets[presetName];
    this.selectedTurbPreset = "None";
    this.saveTurbPresetsToStorage();
    return true;
  }

  loadTurbPreset(presetName, turbGui) {
    const preset = this.turbPresets[presetName];
    if (preset && preset.turb) {
      console.log("Loading turbulence preset state:", preset.turb);
      try {
        turbGui.load(preset.turb);
      } catch (e) {
        console.error("Failed to load preset via lil-gui load:", e);
        const applyControllers = (controllers, gui) => {
          controllers.forEach((c) => {
            const controller = gui
              .controllersRecursive()
              .find((ctrl) => ctrl.property === c.property);
            if (controller) controller.setValue(c.value);
          });
        };
        const traverseFolders = (state, gui) => {
          if (state.controllers) applyControllers(state.controllers, gui);
          if (state.folders) {
            Object.entries(state.folders).forEach(([key, folderState]) => {
              const folder = gui.folders.find((f) => f._title === key);
              if (folder) traverseFolders(folderState, folder);
            });
          }
        };
        traverseFolders(preset.turb, turbGui);
      }
      // Always enforce strength = 0 for "None"
      if (presetName === "None") {
        const strengthController = turbGui
          .controllersRecursive()
          .find((c) => c.property === "strength");
        if (strengthController) {
          strengthController.setValue(0);
          console.log("Manually set strength to 0 for 'None'");
        } else {
          console.warn(
            "Strength controller not found in RightUi GUI controllersRecursive"
          );
        }
      }
      this.selectedTurbPreset = presetName;
      console.log(`Loaded turbulence preset "${presetName}":`, preset);
      return true;
    }
    return false;
  }

  getSelectedTurbPreset() {
    return this.selectedTurbPreset;
  }
  //#endregion

  //#region Voronoi
  loadVoronoiPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedVoronoiPresets");
    const defaults = {
      None: { voronoi: { controllers: [{ property: "strength", value: 0 }] } },
      Default: {
        voronoi: {
          controllers: [
            { property: "strength", value: 1.0 },
            { property: "edgeWidth", value: 10 },
            { property: "attractionFactor", value: 1.0 },
            { property: "cellCount", value: 10 },
            { property: "cellMovementSpeed", value: 0.2 },
            { property: "decayRate", value: 0.99 },
            { property: "affectPosition", value: true },
            { property: "affectScale", value: true },
            { property: "minScale", value: 0.4 },
            { property: "maxScale", value: 1.5 },
          ],
        },
      },
    };
    return storedPresets
      ? { ...defaults, ...JSON.parse(storedPresets) }
      : defaults;
  }

  saveVoronoiPresetsToStorage() {
    localStorage.setItem(
      "savedVoronoiPresets",
      JSON.stringify(this.voronoiPresets)
    );
    console.log("Saved voronoi presets to storage:", this.voronoiPresets);
  }

  getVoronoiPresetOptions() {
    return Object.keys(this.voronoiPresets);
  }

  saveVoronoiPreset(presetName, voronoiGui) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }
    if (this.voronoiPresets[presetName]) {
      const confirmOverride = confirm(
        `"${presetName}" Voronoi preset already exists. Do you want to override it?`
      );
      if (!confirmOverride) return false;
    }
    const fullState = voronoiGui.save();
    console.log("Full voronoi GUI state:", fullState);
    this.voronoiPresets[presetName] = { voronoi: fullState };
    this.selectedVoronoiPreset = presetName;
    this.saveVoronoiPresetsToStorage();
    return true;
  }

  deleteVoronoiPreset(presetName) {
    if (presetName === "None" || presetName === "Default") {
      alert(`Cannot delete the ${presetName} voronoi preset!`);
      return false;
    }
    if (!this.voronoiPresets[presetName]) {
      console.warn("Voronoi preset not found:", presetName);
      return false;
    }
    delete this.voronoiPresets[presetName];
    this.selectedVoronoiPreset = "Default";
    this.saveVoronoiPresetsToStorage();
    return true;
  }

  loadVoronoiPreset(presetName, voronoiGui) {
    const preset = this.voronoiPresets[presetName];
    if (preset && preset.voronoi) {
      console.log("Loading voronoi preset state:", preset.voronoi);
      try {
        voronoiGui.load(preset.voronoi);
      } catch (e) {
        console.error("Failed to load voronoi preset via lil-gui load:", e);
        const applyControllers = (controllers, gui) => {
          controllers.forEach((c) => {
            const controller = gui
              .controllersRecursive()
              .find((ctrl) => ctrl.property === c.property);
            if (controller) controller.setValue(c.value);
          });
        };
        const traverseFolders = (state, gui) => {
          if (state.controllers) applyControllers(state.controllers, gui);
          if (state.folders) {
            Object.entries(state.folders).forEach(([key, folderState]) => {
              const folder = gui.folders.find((f) => f._title === key);
              if (folder) traverseFolders(folderState, folder);
            });
          }
        };
        traverseFolders(preset.voronoi, voronoiGui);
      }

      // Always enforce strength = 0 for "None"
      if (presetName === "None") {
        const strengthController = voronoiGui
          .controllersRecursive()
          .find((c) => c.property === "strength");
        if (strengthController) {
          strengthController.setValue(0);
          console.log("Manually set voronoi strength to 0 for 'None'");
        } else {
          console.warn(
            "Strength controller not found in Voronoi GUI controllersRecursive"
          );
        }
      }

      // Trigger cell regeneration if cellCount changed
      const voronoiField = this.rightGui.main.voronoiField;
      if (voronoiField) {
        voronoiField.regenerateCells();
      }

      this.selectedVoronoiPreset = presetName;
      console.log(`Loaded voronoi preset "${presetName}":`, preset);
      return true;
    }
    return false;
  }

  getSelectedVoronoiPreset() {
    return this.selectedVoronoiPreset;
  }

  //#endregion

  //#region Pulse Presets
  // Pulse modulation preset methods
  loadPulsePresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedPulsePresets");
    const defaults = {
      None: { pulse: { modulators: [] } },
    };
    return storedPresets
      ? { ...defaults, ...JSON.parse(storedPresets) }
      : defaults;
  }

  savePulsePresetsToStorage() {
    localStorage.setItem(
      "savedPulsePresets",
      JSON.stringify(this.pulsePresets)
    );
    console.log(
      "Saved pulse modulation presets to storage:",
      this.pulsePresets
    );
  }

  getPulsePresetOptions() {
    return Object.keys(this.pulsePresets);
  }

  savePulsePreset(presetName, pulseModManager) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }
    if (this.pulsePresets[presetName]) {
      const confirmOverride = confirm(
        `"${presetName}" pulse modulation preset already exists. Do you want to override it?`
      );
      if (!confirmOverride) return false;
    }

    // Save the modulators state
    const modulators = pulseModManager.modulators.map((mod) => ({
      enabled: mod.enabled,
      targetName: mod.targetName,
      type: mod.type,
      frequency: mod.frequency,
      min: mod.min,
      max: mod.max,
      phase: mod.phase,
    }));

    this.pulsePresets[presetName] = { pulse: { modulators } };
    this.selectedPulsePreset = presetName;
    this.savePulsePresetsToStorage();
    console.log(`Saved pulse modulation preset "${presetName}":`, modulators);
    return true;
  }

  deletePulsePreset(presetName) {
    if (presetName === "None") {
      alert("Cannot delete the None pulse modulation preset!");
      return false;
    }
    if (!this.pulsePresets[presetName]) {
      console.warn("Pulse modulation preset not found:", presetName);
      return false;
    }
    delete this.pulsePresets[presetName];
    this.selectedPulsePreset = "None";
    this.savePulsePresetsToStorage();
    return true;
  }

  loadPulsePreset(presetName, pulseModUi) {
    const preset = this.pulsePresets[presetName];
    if (preset && preset.pulse && preset.pulse.modulators) {
      console.log("Loading pulse modulation preset:", preset.pulse.modulators);

      // Clear existing modulators
      if (pulseModUi.pulseModManager) {
        // Remove all GUI folders first
        pulseModUi.modulatorFolders.forEach((folder) => folder.destroy());
        pulseModUi.modulatorFolders = [];

        // Reset the modulator manager
        pulseModUi.pulseModManager.modulators = [];

        // Add modulators from preset
        if (preset.pulse.modulators.length > 0) {
          preset.pulse.modulators.forEach((modData) => {
            const modulator = pulseModUi.addPulseModulator();
            if (modulator) {
              // Apply saved properties
              modulator.enabled = modData.enabled;
              modulator.setTarget(modData.targetName);
              modulator.type = modData.type;
              modulator.frequency = modData.frequency;
              modulator.min = modData.min;
              modulator.max = modData.max;
              modulator.phase = modData.phase;

              // Update the GUI to reflect changes
              const index =
                pulseModUi.pulseModManager.modulators.indexOf(modulator);
              if (index >= 0 && index < pulseModUi.modulatorFolders.length) {
                const folder = pulseModUi.modulatorFolders[index];
                folder.controllers.forEach((controller) =>
                  controller.updateDisplay()
                );
              }
            }
          });
        }
      } else {
        console.warn("PulseModUi instance not fully initialized");
        return false;
      }

      this.selectedPulsePreset = presetName;
      console.log(`Loaded pulse modulation preset "${presetName}"`);
      return true;
    }
    return false;
  }

  getSelectedPulsePreset() {
    return this.selectedPulsePreset;
  }
  //#endregion

  // Add helper methods to PresetManager
  findControllerPath(controller) {
    // Create a more robust identifier that includes hierarchy and property info
    const guiName = controller.parent?._title || "unknown";
    const propName = controller.property || "unknown";
    const objectPath =
      controller.object && controller.object.constructor
        ? controller.object.constructor.name
        : "unknown";

    // Store more information to help locate the controller
    return `${guiName}.${propName}.${objectPath}`;
  }

  findControllerByPath(path) {
    if (!path) {
      console.warn("Empty controller path provided");
      return null;
    }

    // Parse the enhanced path components
    const [guiName, propName, objectPath] = path.split(".");

    if (!guiName || !propName) {
      console.warn(`Invalid controller path: ${path}`);
      return null;
    }

    console.log(`Finding controller for path: ${path} (property: ${propName})`);

    // Try a direct shortcut first for common controllers
    if (this.leftUi) {
      // Check if this is a common controller in leftUi
      const directController = this.leftUi.getControllerForTarget(propName);
      if (directController && directController.controller) {
        console.log(`Found controller using direct lookup: ${propName}`);
        return directController.controller;
      }
    }

    // Function to recursively search for a controller in a GUI
    const findInGui = (gui) => {
      // Look through all controllers in this GUI
      for (const controller of gui.controllers) {
        if (controller.property === propName) {
          console.log(`Found matching property: ${propName}`);
          return controller;
        }
      }

      // Check in all folders
      for (const folder of gui.folders) {
        // Check if the folder name matches
        if (folder._title === guiName) {
          // Look in this folder first as it's the most likely match
          for (const controller of folder.controllers) {
            if (controller.property === propName) {
              console.log(
                `Found controller in matching folder: ${guiName}.${propName}`
              );
              return controller;
            }
          }
        }

        // Check in subfolders regardless of name
        for (const controller of folder.controllers) {
          if (controller.property === propName) {
            console.log(
              `Found controller in folder: ${folder._title}.${propName}`
            );
            return controller;
          }
        }

        // Recursively search nested folders
        const result = findInGui(folder);
        if (result) return result;
      }

      return null;
    };

    // Search in both left and right GUIs
    const allGuis = [this.leftGui, this.rightGui];
    for (const gui of allGuis) {
      if (!gui) continue;

      const result = findInGui(gui);
      if (result) return result;
    }

    // Last resort: look for controller by property name alone
    console.warn(
      `Controller not found by path. Trying property name only: ${propName}`
    );

    for (const gui of allGuis) {
      if (!gui) continue;

      // Collect all controllers recursively
      const allControllers = [];
      const collectControllers = (g) => {
        allControllers.push(...g.controllers);
        g.folders.forEach(collectControllers);
      };
      collectControllers(gui);

      // Find by property name
      const controller = allControllers.find((c) => c.property === propName);
      if (controller) {
        console.log(`Found controller by property name: ${propName}`);
        return controller;
      }
    }

    console.warn(`Controller not found for path: ${path}`);
    return null;
  }

  //#region Mic Presets
  // Microphone input preset methods
  loadMicPresetsFromStorage() {
    const storedPresets = localStorage.getItem("savedMicPresets");
    const defaults = {
      None: { mic: { modulators: [] } },
    };
    return storedPresets
      ? { ...defaults, ...JSON.parse(storedPresets) }
      : defaults;
  }

  saveMicPresetsToStorage() {
    localStorage.setItem("savedMicPresets", JSON.stringify(this.micPresets));
    console.log("Saved microphone input presets to storage:", this.micPresets);
  }

  getMicPresetOptions() {
    return Object.keys(this.micPresets);
  }

  saveMicPreset(presetName, micForces) {
    if (!presetName || presetName.trim() === "") {
      alert("Preset name cannot be empty!");
      return false;
    }

    if (this.micPresets[presetName]) {
      const confirmOverride = confirm(
        `"${presetName}" microphone preset already exists. Do you want to override it?`
      );
      if (!confirmOverride) return false;
    }

    // Save the modulators state
    const modulators = Array.from(micForces.targetControllers.entries()).map(
      ([controller, config]) => {
        return {
          controllerPath: this.findControllerPath(controller),
          min: config.min,
          max: config.max,
          sensitivity: config.sensitivity || 1.0,
          frequency: config.frequency || { min: 0, max: 20000 },
        };
      }
    );

    // Save global settings
    const settings = {
      sensitivity: micForces.sensitivity || 1.0,
      smoothing: micForces.smoothing || 0.8,
      baselineAmplitude: micForces.baselineAmplitude || 0.05,
    };

    this.micPresets[presetName] = {
      mic: {
        modulators,
        settings,
      },
    };

    this.selectedMicPreset = presetName;
    this.saveMicPresetsToStorage();
    console.log(`Saved microphone input preset "${presetName}":`, modulators);
    return true;
  }

  deleteMicPreset(presetName) {
    if (presetName === "None") {
      alert("Cannot delete the None microphone preset!");
      return false;
    }

    if (!this.micPresets[presetName]) {
      console.warn("Microphone preset not found:", presetName);
      return false;
    }

    delete this.micPresets[presetName];
    this.selectedMicPreset = "None";
    this.saveMicPresetsToStorage();
    return true;
  }

  loadMicPreset(presetName, inputUi) {
    const preset = this.micPresets[presetName];
    if (!preset || !preset.mic) {
      console.warn(`Mic preset "${presetName}" not found or invalid`);
      return false;
    }

    console.log(`Loading mic preset "${presetName}":`, preset.mic);

    // Make sure we have the mic forces and input UI
    if (!inputUi || !this.rightGui.main?.externalInput?.micForces) {
      console.warn("Input UI or mic forces not available");
      return false;
    }

    const micForces = this.rightGui.main.externalInput.micForces;

    // First, clear all existing mic targets
    console.log("Clearing existing mic targets");
    micForces.clearTargets();

    // Clear the UI modulators as well
    if (inputUi.micModulatorFolders && inputUi.micModulatorFolders.length > 0) {
      for (let i = inputUi.micModulatorFolders.length - 1; i >= 0; i--) {
        if (inputUi.micModulatorFolders[i]) {
          inputUi.micModulatorFolders[i].destroy();
        }
      }
      inputUi.micModulatorFolders = [];
    }

    // Apply global settings
    if (preset.mic.settings) {
      console.log("Applying mic global settings:", preset.mic.settings);
      micForces.sensitivity = preset.mic.settings.sensitivity || 1.0;
      micForces.smoothing = preset.mic.settings.smoothing || 0.8;
      micForces.baselineAmplitude =
        preset.mic.settings.baselineAmplitude || 0.05;
    }

    // Then recreate modulators from the preset
    if (
      preset.mic.modulators &&
      Array.isArray(preset.mic.modulators) &&
      preset.mic.modulators.length > 0
    ) {
      console.log(
        `Creating ${preset.mic.modulators.length} mic modulators from preset`
      );

      // Create new modulators one by one
      preset.mic.modulators.forEach((modData, index) => {
        console.log(`Setting up mic modulator ${index + 1}:`, modData);

        // Create a new modulator UI element
        const modulator = inputUi.addMicModulator();
        if (!modulator) return;

        // Find the controller using path
        const controller = this.findControllerByPath(modData.controllerPath);
        if (!controller) {
          console.warn(
            `Could not find controller for path: ${modData.controllerPath}`
          );
          return;
        }

        // Get the folder for this modulator
        const folder =
          inputUi.micModulatorFolders[inputUi.micModulatorFolders.length - 1];
        if (!folder) return;

        // Find the target name for this controller
        const targetName = this._findTargetNameForController(controller);
        if (!targetName) {
          console.warn(
            `Could not identify target name for controller: ${modData.controllerPath}`
          );
          return;
        }

        console.log(
          `Found target name ${targetName} for controller path ${modData.controllerPath}`
        );

        // Store the controller reference so the onChange can use it
        modulator._activeController = controller;

        // Set values on the modulator
        modulator.min = modData.min;
        modulator.max = modData.max;
        modulator.sensitivity = modData.sensitivity || 1.0;

        if (modData.frequency) {
          modulator.frequencyMin =
            modData.frequency.min !== undefined ? modData.frequency.min : 0;
          modulator.frequencyMax =
            modData.frequency.max !== undefined ? modData.frequency.max : 20000;
        }

        // Get the target selector controller (first in the folder)
        const targetController = folder.controllers[0];

        // CRITICAL STEP: Set the target dropdown value AND trigger its onChange handler
        targetController.setValue(targetName);

        // Force update all other controllers in the folder
        for (let i = 0; i < folder.controllers.length; i++) {
          if (i !== 0) {
            // Skip the target controller as it was just set
            folder.controllers[i].updateDisplay();
          }
        }
      });
    }

    // Update mic UI
    inputUi.updateMicInputDisplay();

    // Update the selected preset
    this.selectedMicPreset = presetName;
    console.log(`Successfully loaded mic preset "${presetName}"`);
    return true;
  }

  // Helper to find target name for a controller
  _findTargetNameForController(controller) {
    if (!controller) return null;

    // Try using LeftUI's findTargetNameByController if available
    if (
      this.leftUi &&
      typeof this.leftUi.findTargetNameByController === "function"
    ) {
      return this.leftUi.findTargetNameByController(controller);
    }

    // Use InputUi's method if available and leftUi doesn't have it
    if (
      this.inputUi &&
      typeof this.inputUi.findTargetNameByController === "function"
    ) {
      return this.inputUi.findTargetNameByController(controller);
    }

    // Fallback: try to match by property name
    const propName = controller.property || "";

    // Try to find matching target in LeftUI
    if (this.leftUi) {
      const targets = this.leftUi.getControlTargets();
      for (const targetName in targets) {
        if (targets[targetName]?.property === propName) {
          return targetName;
        }
      }
    }

    return null;
  }

  getSelectedMicPreset() {
    return this.selectedMicPreset;
  }
  //#endregion

  // Add this method to the PresetManager class
  dumpControllerPaths() {
    console.log("=== Available Controller Paths ===");

    // Check controllers in leftGui
    if (this.leftGui) {
      console.log("Left GUI controllers:");
      this._dumpGuiControllers(this.leftGui);
    }

    // Check controllers in rightGui
    if (this.rightGui) {
      console.log("Right GUI controllers:");
      this._dumpGuiControllers(this.rightGui);
    }

    console.log("=== End Controller Paths ===");
  }

  // Helper method to recursively dump controllers
  _dumpGuiControllers(gui, path = "") {
    // Log controllers in this GUI
    gui.controllers.forEach((controller) => {
      const name = controller.property || "unknown";
      const fullPath = path ? `${path}.${name}` : name;
      console.log(`- ${fullPath}: ${controller.getValue()}`);
    });

    // Recursively check folders
    gui.folders.forEach((folder) => {
      const folderName = folder._title || "unknown";
      const folderPath = path ? `${path}.${folderName}` : folderName;
      console.log(`Folder: ${folderPath}`);
      this._dumpGuiControllers(folder, folderPath);
    });
  }

  // Add this method to the PresetManager class
  debugControllerLookup() {
    console.log("=== Controller Lookup Debug ===");

    // Check leftUi
    console.log("LeftUI controllers:");
    if (this.leftUi) {
      const targets = this.leftUi.getControlTargets();
      for (const targetName of targets) {
        const info = this.leftUi.getControllerForTarget(targetName);
        if (info && info.controller) {
          const path = this.findControllerPath(info.controller);
          console.log(`- ${targetName}: ${path} (${info.min}-${info.max})`);
        } else {
          console.log(`- ${targetName}: No controller info`);
        }
      }
    } else {
      console.log("No leftUi available");
    }

    console.log("=== End Debug Info ===");
  }
}

export { PresetManager };
