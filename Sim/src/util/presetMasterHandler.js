import { PresetBaseHandler } from "./presetBaseHandler.js";

export class PresetMasterHandler extends PresetBaseHandler {
  constructor(leftGui, rightGui, pulseModUi, inputUi) {
    const defaultPresets = {
      Default: {
        left: leftGui ? leftGui.save() : {},
        right: rightGui ? rightGui.save() : {},
        pulseModulation: null,
        micSettings: null,
        autoPlay: false,
      },
    };
    super("savedPresets", defaultPresets);

    this.leftGui = leftGui;
    this.rightGui = rightGui;
    this.pulseModUi = pulseModUi;
    this.inputUi = inputUi;

    this.protectedPresets = ["Default"];
    this.defaultPreset = "Default";
    this.autoPlayEnabled = false;
  }

  extractDataFromUI() {
    try {
      // Get GUI states
      const leftGuiState = this.leftGui.save();
      const rightGuiState = this.rightGui.save();

      // Filter out non-persistent folders from leftGuiState
      if (leftGuiState.folders) {
        const filteredFolders = {};
        for (const key in leftGuiState.folders) {
          if (key !== "Debug" && key !== "UDP") {
            filteredFolders[key] = leftGuiState.folders[key];
          }
        }
        leftGuiState.folders = filteredFolders;
      }

      // Get pulse modulation state if available
      let pulseModState = null;
      if (this.pulseModUi && this.pulseModUi.pulseModManager) {
        pulseModState = this.pulseModUi.pulseModManager.modulators.map(
          (mod) => ({
            enabled: mod.enabled,
            targetName: mod.targetName,
            type: mod.type,
            frequency: mod.frequency,
            amplitude: mod.amplitude,
            phase: mod.phase,
            bias: mod.bias,
            min: mod.min,
            max: mod.max,
          })
        );
      }

      // Get microphone settings if available
      let micSettings = null;
      if (this.rightGui.main?.externalInput?.micForces) {
        const micForces = this.rightGui.main.externalInput.micForces;
        micSettings = {
          enabled: micForces.isEnabled(),
          sensitivity: micForces.sensitivity || 1.0,
        };

        // Add mic modulators if available
        if (this.inputUi && this.inputUi.modulatorManager) {
          micSettings.modulators = this.inputUi.modulatorManager.modulators
            .filter((mod) => mod.inputSource === "mic")
            .map((mod) => ({
              enabled: mod.enabled,
              targetName: mod.targetName,
              frequencyBand: mod.frequencyBand,
              sensitivity: mod.sensitivity,
              smoothing: mod.smoothing,
              min: mod.min,
              max: mod.max,
            }));
        }
      }

      return {
        left: leftGuiState,
        right: rightGuiState,
        pulseModulation: pulseModState,
        micSettings: micSettings,
        autoPlay: this.autoPlayEnabled,
      };
    } catch (error) {
      console.error("Error extracting master preset data:", error);
      return null;
    }
  }

  applyDataToUI(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return false;
    }

    try {
      // Load GUI states
      if (preset.left && this.leftGui) {
        this.leftGui.load(preset.left);
      }

      if (preset.right && this.rightGui) {
        this.rightGui.load(preset.right);
      }

      // Load pulse modulation presets if available
      if (preset.pulseModulation && this.pulseModUi) {
        this.pulseModUi.clearAllModulators();

        preset.pulseModulation.forEach((modData) => {
          const mod = this.pulseModUi.addModulator();

          if (modData.targetName) mod.setTarget(modData.targetName);
          if (modData.type) mod.setWaveType(modData.type);
          mod.frequency = modData.frequency || 0.5;
          mod.amplitude = modData.amplitude || 0.5;
          mod.phase = modData.phase || 0;
          mod.bias = modData.bias || 0.5;
          mod.min = modData.min || 0;
          mod.max = modData.max || 1;
          mod.enabled = !!modData.enabled;
        });

        this.pulseModUi.updateUI();
      }

      // Load mic settings if available
      if (preset.micSettings && this.inputUi) {
        const settings = preset.micSettings;

        // Clear all mic-related modulators
        this.inputUi.clearMicModulators();

        // Apply mic forces settings
        if (this.rightGui.main?.externalInput?.micForces) {
          const micForces = this.rightGui.main.externalInput.micForces;

          if (settings.enabled) {
            micForces.enable();
          } else {
            micForces.disable();
          }

          if (settings.sensitivity) {
            micForces.setSensitivity(settings.sensitivity);
          }
        }

        // Create modulators from preset
        if (settings.modulators && Array.isArray(settings.modulators)) {
          settings.modulators.forEach((modData) => {
            const mod = this.inputUi.addInputModulator();

            if (modData.targetName) mod.setTarget(modData.targetName);
            mod.setInputSource("mic");
            if (modData.frequencyBand)
              mod.setFrequencyBand(modData.frequencyBand);
            mod.sensitivity = modData.sensitivity || 1.0;
            mod.smoothing = modData.smoothing || 0.7;
            mod.min = modData.min || 0;
            mod.max = modData.max || 1;
            mod.enabled = !!modData.enabled;
          });

          this.inputUi.updateUI();
        }
      }

      // Set auto-play state
      this.autoPlayEnabled = preset.autoPlay || false;

      this.selectedPreset = presetName;
      return true;
    } catch (error) {
      console.error(`Error applying master preset ${presetName}:`, error);
      return false;
    }
  }

  // API compatibility methods with auto-play management
  setAutoPlay(enabled) {
    this.autoPlayEnabled = enabled;

    // Update current preset to remember auto-play setting
    const currentPreset = this.selectedPreset;
    if (currentPreset && this.presets[currentPreset]) {
      this.presets[currentPreset].autoPlay = enabled;
      this.saveToStorage();
    }
  }

  isAutoPlay() {
    return this.autoPlayEnabled;
  }

  savePreset(presetName) {
    const data = this.extractDataFromUI();
    if (!data) return false;
    return super.savePreset(presetName, data, this.protectedPresets);
  }

  loadPreset(presetName) {
    return this.applyDataToUI(presetName);
  }

  deletePreset(presetName) {
    return super.deletePreset(
      presetName,
      this.protectedPresets,
      this.defaultPreset
    );
  }
}
