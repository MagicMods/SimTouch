import { PresetBaseHandler } from "./presetBaseHandler.js";
import { PresetManager } from "./presetManager.js";

export class PresetPulseHandler extends PresetBaseHandler {
  constructor() {
    const defaultPresets = {
      None: { modulators: [] },
    };
    super("savedPulsePresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
  }

  extractDataFromUI(pulseModUi) {
    if (!pulseModUi) {
      console.warn("PulseModulation UI not provided to extractDataFromUI");
      return null;
    }

    try {
      // Debug: Log what methods are actually available
      console.log(
        "Available methods on pulseModUi:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(pulseModUi))
      );

      // Check if the specific method exists and use the correct one
      if (typeof pulseModUi.getModulatorsData === "function") {
        return pulseModUi.getModulatorsData();
      } else {
        // Try alternative method names
        console.warn("getModulatorsData not found, checking for alternatives");

        // Check if PulseModulationUi has a method that returns modulator data
        if (typeof pulseModUi.getModulatorData === "function") {
          return { modulators: pulseModUi.getModulatorData() };
        }

        // Check if there's a different method with similar functionality
        const possibleMethodNames = [
          "getModulatorData",
          "getModulators",
          "getState",
          "getPresetData",
        ];

        for (const methodName of possibleMethodNames) {
          if (typeof pulseModUi[methodName] === "function") {
            console.log(`Using alternative method: ${methodName}`);
            const result = pulseModUi[methodName]();
            return typeof result === "object" ? result : { modulators: result };
          }
        }

        // Last resort: See if the modulatorManager can provide the data
        if (pulseModUi.modulatorManager) {
          console.log("Getting data directly from modulatorManager");
          const modulators = pulseModUi.modulatorManager
            .getModulatorsByType("pulse")
            .map((mod) => ({
              enabled: mod.enabled,
              targetName: mod.targetName,
              frequency: mod.frequency,
              amplitude: mod.amplitude,
              phase: mod.phase,
              waveform: mod.waveform,
              sync: mod.sync,
            }));

          return { modulators };
        }

        // If all fails, return empty data
        console.error("No method found to extract modulator data");
        return { modulators: [] };
      }
    } catch (error) {
      console.error("Error extracting pulse modulation data:", error);
      return { modulators: [] };
    }
  }

  applyDataToUI(presetName, pulseModUi) {
    // Changed from pulseModUI to pulseModUi
    if (this.debug) console.log(`Applying pulse preset: ${presetName}`);

    if (!pulseModUi) {
      console.warn("PulseModulation UI not provided to applyDataToUI");
      return false;
    }

    // Special case for None preset
    if (presetName === "None" || !this.presets[presetName]) {
      console.log(
        "Clearing all pulse modulators (None preset or invalid preset name)"
      );
      pulseModUi.clearAllModulators();
      return true;
    }

    const presetData = this.presets[presetName];
    if (!presetData || !presetData.modulators) {
      console.warn(`Invalid preset data for ${presetName}`);
      return false;
    }

    try {
      console.log(
        `Loading pulse preset: ${presetName} with ${presetData.modulators.length} modulators`
      );

      // Use loadPresetData() which is already implemented in PulseModulationUi
      return pulseModUi.loadPresetData(presetData);
    } catch (error) {
      console.error("Error applying pulse preset data:", error);
      return false;
    }
  }

  savePreset(presetName, pulseModUi) {
    if (!pulseModUi) {
      console.warn("PulseModulation UI not provided to savePreset");
      return false;
    }

    try {
      // Extract the data first
      const data = this.extractDataFromUI(pulseModUi);
      if (!data) {
        console.warn("Failed to extract pulse modulation data");
        return false;
      }

      // Save directly without calling extractDataFromUI again
      if (this.protectedPresets.includes(presetName)) {
        console.warn(`Cannot overwrite protected preset: ${presetName}`);
        return false;
      }

      console.log(`Saving pulse preset: ${presetName}`, data);

      // Store the preset data
      this.presets[presetName] = data;

      // Use saveToStorage() instead of saveToLocalStorage()
      this.saveToStorage(); // ← Changed from saveToLocalStorage

      this.selectedPreset = presetName;

      return true;
    } catch (error) {
      console.error("Error saving pulse preset:", error);
      return false;
    }
  }
}
