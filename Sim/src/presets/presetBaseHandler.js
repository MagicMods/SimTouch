import { debugManager } from '../util/debugManager.js';
import { defaultPresets as factoryDefaultPresetsData } from './default/defaultPresets.js';
const factoryDefaultPresets = factoryDefaultPresetsData.presets;

// Helper function to extract type from storage key (e.g., "savedTurbulencePresets" -> "turbulence")
function getTypeFromStorageKey(key) {
  if (!key) return null;
  const match = key.match(/^saved([A-Z][a-zA-Z]*)Presets$/);
  return match && match[1] ? match[1].toLowerCase() : null;
}

export class PresetBaseHandler {
  constructor(storageKey, minimalDefaultPresets, protectedPresets) {
    this.storageKey = storageKey;
    this.type = getTypeFromStorageKey(storageKey); // Added: derive type
    this.minimalDefaults = { ...minimalDefaultPresets }; // Renamed and copied
    this.protectedPresets = protectedPresets || [];
    this.presets = {}; // Initialize empty
    this.selectedPreset = null;
    this._initializePresets(); // Changed: call new init method
  }

  get db() {
    return debugManager.get('presets');
  }

  _initializePresets() {
    let loadedPresets = null;
    const storedPresetsRaw = localStorage.getItem(this.storageKey);

    if (storedPresetsRaw) {
      try {
        loadedPresets = JSON.parse(storedPresetsRaw);
        if (typeof loadedPresets !== 'object' || loadedPresets === null || Object.keys(loadedPresets).length === 0) {
          loadedPresets = null; // Treat invalid or empty object as null
        }
      } catch (e) {
        console.error(`Error parsing stored presets for ${this.storageKey}:`, e);
        loadedPresets = null; // Treat parse error as empty storage
      }
    }

    if (!loadedPresets) {
      // Storage is empty or invalid - load ALL initial presets for this type
      if (this.type && factoryDefaultPresets[this.type]) {
        if (this.db) console.log(`Storage empty/invalid for ${this.storageKey}, loading factory defaults.`);
        // Deep copy is crucial
        this.presets = JSON.parse(JSON.stringify(factoryDefaultPresets[this.type]));
      } else {
        console.warn(`No factory defaults found for type: ${this.type}. Using minimal defaults.`);
        this.presets = JSON.parse(JSON.stringify(this.minimalDefaults));
      }

      // Ensure minimalDefaults are present (merge underneath factory)
      this.presets = { ...this.minimalDefaults, ...this.presets };

      this.saveToStorage(); // Save the full set to storage for next time
    } else {
      // Storage has data - use it
      if (this.db) console.log(`Loading presets from storage for ${this.storageKey}.`);
      this.presets = loadedPresets;

      // Ensure minimal/protected presets exist even if loaded from storage
      // Merge minimal defaults underneath existing ones
      this.presets = { ...this.minimalDefaults, ...this.presets };
    }

    // Set initial selection (first protected or first overall)
    this.selectedPreset = this.protectedPresets.find(name => this.presets[name]) || Object.keys(this.presets)[0] || null;

  }

  saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
  }

  getPreset(presetName) {
    return this.presets[presetName] || null;
  }

  savePreset(presetName, data) {
    // if (this.protectedPresets.includes(presetName)) {
    //   console.warn(`Cannot overwrite protected preset: ${presetName}`);
    //   return false;
    // }
    this.presets[presetName] = data;
    this.saveToStorage();
    return true;
  }

  deletePreset(presetName) {
    // Check if preset exists
    if (!this.presets[presetName]) {
      console.warn(`Preset "${presetName}" not found`);
      return false;
    }

    // Check if preset is protected
    if (this.protectedPresets.includes(presetName)) {
      console.warn(`Cannot delete protected preset: ${presetName}`);
      return false;
    }

    // Delete the preset
    delete this.presets[presetName];

    // If the deleted preset was selected, clear selection
    if (this.selectedPreset === presetName) {
      this.selectedPreset = null;
    }

    // Save updated presets to storage
    this.saveToStorage();

    return true;
  }

  getPresetOptions() {
    return Object.keys(this.presets);
  }

  getSelectedPreset() {
    return this.selectedPreset;
  }
}