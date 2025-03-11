import {
  SimplePresetHandler,
  ModulatorPresetHandler,
  MasterPresetHandler,
} from "./presetHandlers.js";

export class PresetManager {
  static TYPES = {
    MASTER: "master",
    TURBULENCE: "turb",
    VORONOI: "voronoi",
    PULSE: "pulse",
    INPUT: "input",
  };

  constructor(uiComponents) {
    // Store UI component references
    this.uiComponents = uiComponents;
    this.presetControls = {};

    // Initialize handlers with appropriate types
    this.handlers = {
      [PresetManager.TYPES.TURBULENCE]: new SimplePresetHandler(
        "savedTurbPresets",
        { None: { controllers: { "Turbulence Strength": 0 } } },
        ["None"]
      ),
      [PresetManager.TYPES.VORONOI]: new SimplePresetHandler(
        "savedVoronoiPresets",
        { None: { controllers: { "Voronoi Strength": 0 } } },
        ["None"]
      ),
      [PresetManager.TYPES.PULSE]: new ModulatorPresetHandler(
        "savedPulsePresets",
        { None: { modulators: [] } },
        ["None"]
      ),
      [PresetManager.TYPES.INPUT]: new ModulatorPresetHandler(
        "savedMicPresets",
        { None: { modulators: [] } },
        ["None"]
      ),
      [PresetManager.TYPES.MASTER]: new MasterPresetHandler(
        "savedPresets",
        { Default: {} },
        ["Default"]
      ),
    };

    // Set components for master handler
    this.handlers[PresetManager.TYPES.MASTER].setComponents(uiComponents);
  }

  //#region Ui

  createPresetControls(presetType, parentElement, options = {}) {
    if (!parentElement || !presetType || !this.handlers[presetType]) {
      console.error(`Cannot create preset controls: Invalid parameters`);
      return null;
    }

    const controlId = `${presetType}-${Date.now()}`;

    const container = document.createElement("div");
    container.classList.add("preset-controls-container");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginTop = "8px";
    container.style.marginBottom = "8px";
    container.style.width = "100%";

    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.flex = "2";
    presetSelect.style.margin = "0 4px";
    presetSelect.style.padding = "3px";

    const saveButton = this._createButton("Save", () =>
      this._handleSave(presetType)
    );
    const deleteButton = this._createButton("Delete", () =>
      this._handleDelete(presetType, presetSelect)
    );

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log(`Preset selector for ${presetType} changed to:`, value);
      this.loadPreset(presetType, value);
    });

    this._updatePresetDropdown(presetType, presetSelect);

    container.appendChild(saveButton);
    container.appendChild(presetSelect);
    container.appendChild(deleteButton);

    if (options.title) {
      const titleElement = document.createElement("div");
      titleElement.textContent = options.title;
      titleElement.style.fontWeight = "bold";
      titleElement.style.marginBottom = "4px";

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
    const presetName = prompt(`Enter ${presetType} preset name:`);
    if (!presetName) return;

    if (this.savePreset(presetType, presetName)) {
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

  //#endregion

  //#region Getter

  getHandler(type) {
    return this.handlers[type] || null;
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
      case PresetManager.TYPES.MASTER:
        // Master handler would be handled separately
        return null;
      default:
        return null;
    }
  }

  getPresetOptions(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getPresetOptions() : [];
  }

  getSelectedPreset(type) {
    const handler = this.getHandler(type);
    return handler ? handler.getSelectedPreset() : null;
  }
  //#endregion

  //#region Presets

  // Save preset - standardized version
  savePreset(type, presetName) {
    const handler = this.handlers[type];
    if (!handler) return false;

    const uiComponent = this.getUIComponent(type);

    if (type === PresetManager.TYPES.MASTER) {
      return handler.savePresetFromUI(presetName);
    } else if (uiComponent) {
      return handler.savePresetFromUI(presetName, uiComponent);
    }

    return false;
  }

  // Load preset - standardized version
  loadPreset(type, presetName) {
    const handler = this.handlers[type];
    if (!handler) return false;

    if (type === PresetManager.TYPES.MASTER) {
      return handler.applyPreset(presetName);
    } else {
      const uiComponent = this.getUIComponent(type);
      if (uiComponent) {
        return handler.applyPreset(presetName, uiComponent);
      }
    }

    return false;
  }

  // Helper method to extract data for master presets
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

    // Extract data from each UI component that supports getControlTargets
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
        this[uiProp] &&
        typeof this[uiProp].getControlTargets === "function"
      ) {
        data[key] = this[uiProp].getControlTargets();
      }
    });

    // Get modulator data
    if (
      this.pulseModUi &&
      typeof this.pulseModUi.getModulatorsData === "function"
    ) {
      data.pulseModulation = this.pulseModUi.getModulatorsData();
    }

    if (
      this.inputModUi &&
      typeof this.inputModUi.getModulatorsData === "function"
    ) {
      data.inputModulation = this.inputModUi.getModulatorsData();
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
    const exportData = {};

    for (const type in this.handlers) {
      const handler = this.handlers[type];
      if (handler) {
        exportData[type] = handler.presets;
      }
    }

    return JSON.stringify(exportData, null, 2);
  }

  importPresets(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      let successCount = 0;

      for (const type in data) {
        const handler = this.handlers[type];
        if (handler) {
          handler.presets = data[type];
          handler.saveToStorage();
          this._updateAllPresetDropdowns(type);
          successCount++;
        }
      }

      return successCount > 0;
    } catch (error) {
      console.error("Error importing presets:", error);
      return false;
    }
  }

  //#endregion

  setDebug(enabled) {
    this.debug = !!enabled;

    // Set debug on all handlers
    for (const type in this.handlers) {
      if (
        this.handlers[type] &&
        typeof this.handlers[type].setDebug === "function"
      ) {
        this.handlers[type].setDebug(enabled);
      }
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
