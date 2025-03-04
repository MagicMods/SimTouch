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
    // Traverse the GUI structure to find the path to this controller
    // This is a simplified approach - you'll need a more robust implementation
    const guiName = controller.parent?._title || "unknown";
    const propName = controller.property || "unknown";
    return `${guiName}.${propName}`;
  }

  findControllerByPath(path) {
    // Find controller by the stored path
    const [guiName, propName] = path.split(".");

    // Search in leftGui and rightGui
    const allGuis = [this.leftGui, this.rightGui];
    for (const gui of allGuis) {
      const folder = gui.folders.find((f) => f._title === guiName);
      if (folder) {
        const controller = folder.controllers.find(
          (c) => c.property === propName
        );
        if (controller) return controller;
      }
    }

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
    if (!preset || !preset.mic) return false;

    console.log("Loading microphone preset:", preset.mic);

    const micForces = inputUi.main.externalInput?.micForces;
    if (!micForces) {
      console.warn("MicForces not available");
      return false;
    }

    // Apply global settings
    if (preset.mic.settings) {
      micForces.setSensitivity(preset.mic.settings.sensitivity || 1.0);
      micForces.setSmoothing(preset.mic.settings.smoothing || 0.8);
      micForces.baselineAmplitude =
        preset.mic.settings.baselineAmplitude || 0.05;
    }

    // Clear existing modulators
    micForces.clearTargets();

    // Add modulators from preset
    if (
      preset.mic.modulators &&
      Array.isArray(preset.mic.modulators) &&
      preset.mic.modulators.length > 0
    ) {
      preset.mic.modulators.forEach((modData) => {
        const controller = this.findControllerByPath(modData.controllerPath);
        if (controller) {
          micForces.addTarget(
            controller,
            modData.min,
            modData.max,
            null,
            modData.sensitivity,
            modData.frequency
          );
        }
      });
    }

    // Update UI
    inputUi.updateMicInputDisplay();

    this.selectedMicPreset = presetName;
    console.log(`Loaded microphone preset "${presetName}"`);
    return true;
  }

  getSelectedMicPreset() {
    return this.selectedMicPreset;
  }
  //#endregion
}

export { PresetManager };
