import { MasterPresetHandler } from "./masterPresetHandler.js";
import { SimplePresetHandler } from "./simplePresetHandler.js";
import { ModulatorPresetHandler } from "./modulatorPresetHandler.js";
import { RandomizerPresetHandler } from "./randomizerPresetHandler.js";

export class PresetManager {
  static TYPES = {
    MASTER: "master",
    TURBULENCE: "turbulence",
    VORONOI: "voronoi",
    ORGANIC: "organic",
    PULSE: "pulse",
    INPUT: "input",
    RANDOMIZER: "randomizer",
  };

  constructor(uiComponents, debugFlags) {

    this.debug = debugFlags;

    this.uiComponents = uiComponents;
    this.presetControls = {};
    this.eventListeners = {};

    this.handlers = {
      [PresetManager.TYPES.TURBULENCE]: new SimplePresetHandler(
        "savedTurbulencePresets",
        {
          Default: { controllers: {} },
        },
        ["None"],
        this.debug.presets
      ),
      [PresetManager.TYPES.VORONOI]: new SimplePresetHandler(
        "savedVoronoiPresets",
        {
          Default: { controllers: {} },
        },
        ["None"],
        this.debug.presets
      ),
      [PresetManager.TYPES.ORGANIC]: new SimplePresetHandler(
        "savedOrganicPresets",
        {
          Default: { controllers: {} },
        },
        ["None"],
        this.debug.presets
      ),
      [PresetManager.TYPES.PULSE]: new ModulatorPresetHandler(
        "savedPulsePresets",
        {
          None: { modulators: [] },
        },
        ["None"],
        this.debug.presets
      ),
      [PresetManager.TYPES.INPUT]: new ModulatorPresetHandler(
        "savedMicPresets",
        {
          None: { modulators: [] },
        },
        ["None"],
        this.debug.presets
      ),
      [PresetManager.TYPES.RANDOMIZER]: new RandomizerPresetHandler(
        "savedRandomizerPresets",
        {
          None: { paramTargets: {} },
          All: { paramTargets: {} }
        },
        ["None", "All"],
        this.debug.presets
      ),

      [PresetManager.TYPES.MASTER]: new MasterPresetHandler(
        "savedPresets",
        { Default: {} },
        ["Default"],
        this.debug.presets
      ),
    };

    this.handlers[PresetManager.TYPES.MASTER].setComponents(uiComponents);
  }

  // Event system
  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }

  emit(eventName, ...args) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => callback(...args));
    }
  }

  createPresetControls(presetType, parentElement, options = {}) {
    if (this.debug.presets) console.log(`Creating preset controls for type: ${presetType}`, this.handlers[presetType]);
    if (!parentElement || !presetType || !this.handlers[presetType]) {
      console.error(`Cannot create preset controls: Invalid parameters`);
      return null;
    }

    const controlId = `${presetType}-${Date.now()}`;

    const container = document.createElement("div");
    container.classList.add("preset-controls-container");


    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");


    // Capture presetType in a closure to ensure it's preserved
    const boundHandleSave = () => {
      this._handleSave(presetType);
    };

    const saveButton = this._createButton("Save", boundHandleSave);

    const deleteButton = this._createButton("Delete", () =>
      this._handleDelete(presetType, presetSelect)
    );

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.debug.presets) console.log(`Preset selector for ${presetType} changed to:`, value);
      this.loadPreset(presetType, value);
    });

    this._updatePresetDropdown(presetType, presetSelect);

    container.appendChild(saveButton);
    container.appendChild(presetSelect);
    container.appendChild(deleteButton);

    if (options.title) {
      const titleElement = document.createElement("div");
      titleElement.textContent = options.title;

      if (options.insertFirst) {
        parentElement.insertBefore(titleElement, parentElement.firstChild);
        parentElement.insertBefore(container, titleElement.nextSibling);
      } else {
        parentElement.appendChild(titleElement);
        parentElement.appendChild(container);
      }
    } else {
      if (options.insertFirst) {
        parentElement.insertBefore(container, parentElement.firstChild);
      } else {
        parentElement.appendChild(container);
      }
    }

    this.presetControls[controlId] = {
      type: presetType,
      container,
      select: presetSelect,
    };

    return {
      id: controlId,
      container,
      select: presetSelect,
      saveButton,
      deleteButton,
      update: () => this._updatePresetDropdown(presetType, presetSelect),
    };
  }

  _createButton(text, clickHandler) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.flex = "1";
    button.addEventListener("click", clickHandler);
    return button;
  }

  _handleSave(presetType) {
    if (this.debug.presets) console.log(`Save requested for presetType: "${presetType}"`,
      `Handler:`, this.handlers[presetType] ? "exists" : "missing");

    // Get current preset name to pre-populate the prompt
    const currentPreset = this.getSelectedPreset(presetType);
    if (this.debug.presets) console.log(`Current preset for ${presetType}:`, currentPreset);

    // Only use the current preset name as default if it's not "Default"
    const defaultValue = (currentPreset && currentPreset !== "Default") ? currentPreset : "";
    const presetName = prompt(`Enter ${presetType} preset name:`, defaultValue);

    if (this.debug.presets) console.log(`User entered name: "${presetName}"`);
    if (!presetName) return;

    const uiComponent = this.getUIComponent(presetType);
    if (this.debug.presets) console.log(`UI component for ${presetType}:`, uiComponent ? "found" : "missing");

    const success = this.savePreset(presetType, presetName);
    if (this.debug.presets) console.log(`Save result for ${presetType} "${presetName}": ${success}`);

    if (success) {
      this._updateAllPresetDropdowns(presetType);
      alert(`Preset "${presetName}" saved.`);
    } else {
      alert("Failed to save preset.");
    }
  }

  _handleDelete(presetType, selectElement) {
    const current = selectElement.value;

    const handler = this.getHandler(presetType);
    if (handler?.protectedPresets?.includes(current)) {
      alert(`Cannot delete protected preset: ${current}`);
      return;
    }

    if (
      confirm(`Delete preset "${current}"?`) &&
      this.deletePreset(presetType, current)
    ) {
      this._updateAllPresetDropdowns(presetType);
      alert(`Preset "${current}" deleted.`);
    }
  }

  _updatePresetDropdown(presetType, selectElement) {
    if (!selectElement || !this.handlers[presetType]) return;

    const options = this.getPresetOptions(presetType);

    selectElement.innerHTML = "";

    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    const currentPreset = this.getSelectedPreset(presetType);
    if (currentPreset && options.includes(currentPreset)) {
      selectElement.value = currentPreset;
    }
  }

  _updateAllPresetDropdowns(presetType) {
    Object.values(this.presetControls)
      .filter((control) => control.type === presetType)
      .forEach((control) => {
        this._updatePresetDropdown(presetType, control.select);
      });
  }

  getHandler(type) {
    return this.handlers[type] || null;
  }

  getPresetOptions(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getPresetOptions() : [];
  }

  getSelectedPreset(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getSelectedPreset() : null;
  }

  getUIComponent(type) {
    switch (type) {
      case PresetManager.TYPES.PULSE:
        return this.uiComponents.pulseModUi;
      case PresetManager.TYPES.INPUT:
        return this.uiComponents.inputModUi;
      case PresetManager.TYPES.TURBULENCE:
        return this.uiComponents.turbulenceUi;
      case PresetManager.TYPES.VORONOI:
        return this.uiComponents.voronoiUi;
      case PresetManager.TYPES.ORGANIC:
        return this.uiComponents.organicUi;
      case PresetManager.TYPES.RANDOMIZER:
        return this.uiComponents.randomizerUi;
      case PresetManager.TYPES.MASTER:
        return this.uiComponents;
      default:
        return null;
    }
  }

  savePreset(type, presetName) {
    const handler = this.handlers[type];
    if (!handler) return false;

    const uiComponent = this.getUIComponent(type);

    if (type === PresetManager.TYPES.MASTER) {
      return handler.savePresetFromUI(presetName);
    }
    else if (uiComponent) {
      return handler.savePresetFromUI(presetName, uiComponent);
    }

    return false;
  }

  loadPreset(type, presetName) {
    if (this.debug.presets) console.log(`Loading ${type} preset: ${presetName}`);
    const handler = this.getHandler(type);
    if (!handler) {
      console.warn(`No handler found for preset type ${type}`);
      return false;
    }

    // Emit presetSelected event before applying
    this.emit('presetSelected', presetName);

    const component = this.getUIComponent(type);
    const success = handler.applyPreset(presetName, component);

    if (success) {
      // Emit presetLoaded event after successful loading
      this.emit('presetLoaded', type, presetName);
    }

    return success;
  }

  extractMasterPresetData() {
    const data = {
      param: {},
      particle: {},
      gravity: {},
      collision: {},
      boundary: {},
      restState: {},
      turbulence: {},
      voronoi: {},
      organic: {},
      pulseModulation: null,
      inputModulation: null,
      _meta: {
        timestamp: Date.now(),
        version: "1.0",
      },
    };

    [
      "param",
      "particle",
      "gravity",
      "collision",
      "boundary",
      "restState",
      "turbulence",
      "voronoi",
      "organic",
    ].forEach((key) => {
      const uiProp = `${key}Ui`;
      if (
        this.uiComponents[uiProp] &&
        typeof this.uiComponents[uiProp].getControlTargets === "function"
      ) {
        data[key] = this.uiComponents[uiProp].getControlTargets();
      }
    });

    if (
      this.uiComponents.pulseModUi &&
      typeof this.uiComponents.pulseModUi.getModulatorsData === "function"
    ) {
      data.pulseModulation = this.uiComponents.pulseModUi.getModulatorsData();
    }

    if (
      this.uiComponents.inputModUi &&
      typeof this.uiComponents.inputModUi.getModulatorsData === "function"
    ) {
      data.inputModulation = this.uiComponents.inputModUi.getModulatorsData();
    }

    return data;
  }

  deletePreset(type, presetName) {
    const handler = this.getHandler(type);
    if (!handler) {
      console.warn(`No handler for preset type: ${type}`);
      return false;
    }
    return handler.deletePreset(presetName);
  }

  exportPresets() {
    const exportData = {
      _meta: {
        version: "1.0",
        exportDate: new Date().toISOString(),
        appName: "Svibe_FlipSim",
      },
      presets: {},
    };

    for (const type in this.handlers) {
      const handler = this.handlers[type];
      if (handler) {
        exportData.presets[type] = handler.presets;
      }
    }

    return JSON.stringify(exportData, null, 2);
  }

  importPresets(jsonData, options = { merge: false }) {
    try {
      const data = JSON.parse(jsonData);

      if (!this._validateImportData(data)) {
        console.error("Invalid preset data format");
        return { success: false, error: "Invalid data format", count: 0 };
      }

      const presetData = data.presets || data;
      let importCount = 0;
      const importedTypes = [];

      for (const type in presetData) {
        const handler = this.handlers[type];
        if (handler) {
          if (!presetData[type] || typeof presetData[type] !== "object") {
            console.warn(`Invalid preset data for type: ${type}`);
            continue;
          }

          if (options.merge) {
            const existingPresets = handler.presets;
            handler.presets = { ...existingPresets, ...presetData[type] };

            handler.protectedPresets.forEach((name) => {
              if (existingPresets[name]) {
                handler.presets[name] = existingPresets[name];
              }
            });
          } else {
            const protectedData = {};
            handler.protectedPresets.forEach((name) => {
              if (handler.presets[name]) {
                protectedData[name] = handler.presets[name];
              }
            });
            handler.presets = { ...presetData[type], ...protectedData };
          }

          handler.saveToStorage();
          this._updateAllPresetDropdowns(type);
          importCount++;
          importedTypes.push(type);
        }
      }

      return {
        success: importCount > 0,
        count: importCount,
        types: importedTypes,
      };
    } catch (error) {
      console.error("Error importing presets:", error);
      return {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }

  _validateImportData(data) {
    if (data._meta) {
      return typeof data.presets === "object" && data.presets !== null;
    } else {
      return typeof data === "object" && data !== null;
    }
  }


  setVoronoiField(voronoiField) {
    const handler = this.getHandler(PresetManager.TYPES.VORONOI);
    if (handler && typeof handler.setVoronoiField === "function") {
      handler.setVoronoiField(voronoiField);
    }
  }

  setTurbulenceField(turbulenceField) {
    const handler = this.getHandler(PresetManager.TYPES.TURBULENCE);
    if (handler && typeof handler.setTurbulenceField === "function") {
      handler.setTurbulenceField(turbulenceField);
    }
  }
}
