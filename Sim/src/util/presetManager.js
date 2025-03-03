class PresetManager {
  constructor(leftGui, rightGui, pulseModUi) {
    if (!leftGui || !rightGui) {
      throw new Error("Both GUI instances required");
    }
    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi; // Store reference to pulseModUi directly
    this.presets = this.loadPresetsFromStorage();
    this.turbPresets = this.loadTurbPresetsFromStorage();
    this.voronoiPresets = this.loadVoronoiPresetsFromStorage();
    this.pulsePresets = this.loadPulsePresetsFromStorage();
    this.selectedPreset = "Default";
    this.selectedTurbPreset = "None";
    this.selectedVoronoiPreset = "None";
    this.selectedPulsePreset = "None";
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
      alert("Preset name already exists!");
      return false;
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

    // Save the filtered state
    this.presets[presetName] = {
      left: leftGuiState,
      right: rightGuiState,
      pulseModulation: pulseModState,
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
      alert("Turbulence preset name already exists!");
      return false;
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
      alert("Voronoi preset name already exists!");
      return false;
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
      alert("Pulse modulation preset name already exists!");
      return false;
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
}

export { PresetManager };
