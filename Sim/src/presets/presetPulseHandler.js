import { PresetBaseHandler } from "./presetBaseHandler.js";
import { PresetManager } from "./presetManager.js";

export class PresetPulseHandler extends PresetBaseHandler {
  constructor() {
    // Initialize with a clean default "None" preset
    const defaultPresets = {
      None: { modulators: [] },
    };
    super("savedPulsePresets", defaultPresets);

    this.protectedPresets = ["None"];
    this.defaultPreset = "None";
  }

  // Extract data from UI component
  extractDataFromUI(pulseModUI) {
    if (!pulseModUI) {
      console.error("No PulseModulationUi provided");
      return null;
    }

    try {
      // Get clean data via the modern API
      const data = pulseModUI.getModulatorsData();

      // Validate data structure
      if (!data || typeof data !== "object") {
        console.error("Invalid data returned from PulseModulationUi");
        return { modulators: [] };
      }

      // Ensure modulators is an array
      if (!Array.isArray(data.modulators)) {
        console.warn("Modulators is not an array, using empty array");
        data.modulators = [];
      }

      console.log(`Extracted ${data.modulators.length} pulse modulators`);
      return data;
    } catch (error) {
      console.error("Error extracting pulse modulation data:", error);
      return { modulators: [] };
    }
  }

  // Apply data to UI component
  applyDataToUI(presetName, pulseModUI) {
    console.log(`Loading pulse preset: ${presetName}`);

    // Special case for "None" preset
    if (presetName === "None") {
      console.log("Loading empty 'None' preset");
      pulseModUI.clearAllModulators();
      this.selectedPreset = "None";
      return true;
    }

    // Get the preset data
    const preset = this.presets[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return false;
    }

    try {
      console.log("Applying preset data to PulseModulationUi");

      // Apply the data via the modern API
      const result = pulseModUI.loadPresetData(preset);

      if (result) {
        this.selectedPreset = presetName;
        console.log(`Successfully loaded pulse preset: ${presetName}`);
        return true;
      }

      console.warn(`Failed to load pulse preset: ${presetName}`);
      return false;
    } catch (error) {
      console.error("Error applying pulse preset data:", error);
      return false;
    }
  }

  // Save a preset with validation
  savePreset(presetName, data, protectedList = this.protectedPresets) {
    // Validate data before saving
    if (!data || !data.modulators) {
      console.error("Invalid data for saving preset");
      return false;
    }

    console.log(
      `Saving pulse preset: ${presetName} with ${data.modulators.length} modulators`
    );

    // Use the parent class method for actual saving
    return super.savePreset(presetName, data, protectedList);
  }

  loadPreset(presetName, ui) {
    return this.applyDataToUI(presetName, ui);
  }

  deletePreset(
    presetName,
    protectedList = this.protectedPresets,
    defaultPreset = this.defaultPreset
  ) {
    return super.deletePreset(presetName, protectedList, defaultPreset);
  }
}
