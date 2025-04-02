import { SimplePresetHandler } from "./simplePresetHandler.js";

export class PresetManager {
  static TYPES = {
    GRID: "grid",
  };

  constructor(uiComponents) {
    this.uiComponents = uiComponents;
    this.presetControls = {};
    this.eventListeners = {};

    this.handlers = {
      [PresetManager.TYPES.GRID]: new SimplePresetHandler(
        "savedGridPresets",
        {
          "Default": {
            controllers: {
              // Physical dimensions
              "Screen Width": 240,
              "Screen Height": 240,
              "Screen Shape": "circular",
              "Center X Offset": 0,
              "Center Y Offset": 0,

              // Grid parameters
              "Target Cells": 341,
              "Grid Gap": 1,
              "Cell Ratio": 1,
              "Grid Scale": 0.986,
              "Allow Cut": 3,

              // Display options
              "Show Centers": false,
              "Show Indices": false,
              "Display Mode": "masked"
            }
          },
          "240x240_Circular_341": {
            controllers: {
              "Screen Width": 240,
              "Screen Height": 240,
              "Screen Shape": "circular",
              "Center X Offset": 0,
              "Center Y Offset": 0,
              "Target Cells": 341,
              "Grid Gap": 1,
              "Cell Ratio": 1,
              "Grid Scale": 0.986,
              "Allow Cut": 3,
              "Show Centers": false,
              "Show Indices": false,
              "Display Mode": "masked"
            }
          },
          "480x480_Circular_341": {
            controllers: {
              "Screen Width": 480,
              "Screen Height": 480,
              "Screen Shape": "circular",
              "Center X Offset": 0,
              "Center Y Offset": 0,
              "Target Cells": 341,
              "Grid Gap": 2,
              "Cell Ratio": 1,
              "Grid Scale": 0.986,
              "Allow Cut": 1,
              "Show Centers": false,
              "Show Indices": false,
              "Display Mode": "masked"
            }
          },
          "240x280_Rectangular_300": {
            controllers: {
              "Screen Width": 240,
              "Screen Height": 280,
              "Screen Shape": "rectangular",
              "Center X Offset": 0,
              "Center Y Offset": 0,
              "Target Cells": 300,
              "Grid Gap": 1,
              "Cell Ratio": 1,
              "Grid Scale": 0.986,
              "Allow Cut": 1,
              "Show Centers": false,
              "Show Indices": false,
              "Display Mode": "masked"
            }
          },
          "268x448_Rectangular_325": {
            controllers: {
              "Screen Width": 268,
              "Screen Height": 448,
              "Screen Shape": "rectangular",
              "Center X Offset": 0,
              "Center Y Offset": 0,
              "Target Cells": 325,
              "Grid Gap": 1,
              "Cell Ratio": 1,
              "Grid Scale": 0.986,
              "Allow Cut": 1,
              "Show Centers": false,
              "Show Indices": false,
              "Display Mode": "masked"
            }
          },
          "170x320_Rectangular_280": {
            controllers: {
              "Screen Width": 170,
              "Screen Height": 320,
              "Screen Shape": "rectangular",
              "Center X Offset": 0,
              "Center Y Offset": 0,
              "Target Cells": 280,
              "Grid Gap": 1,
              "Cell Ratio": 1,
              "Grid Scale": 0.986,
              "Allow Cut": 1,
              "Show Centers": false,
              "Show Indices": false,
              "Display Mode": "masked"
            }
          }
        },
        ["None"]
      ),
    };
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
    if (!parentElement || !presetType || !this.handlers[presetType]) {
      console.error(`Cannot create preset controls: Invalid parameters`);
      return null;
    }

    console.log(`Creating preset controls for type: ${presetType}`, this.handlers[presetType]);

    const controlId = `${presetType}-${Date.now()}`;

    const container = document.createElement("div");
    container.classList.add("preset-controls-container");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginTop = "8px";
    container.style.marginBottom = "8px";
    // container.style.width = "100%";

    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.flex = "2";
    presetSelect.style.margin = "0 4px";
    presetSelect.style.padding = "3px";

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
    console.log(`Save requested for presetType: "${presetType}"`,
      `Handler:`, this.handlers[presetType] ? "exists" : "missing");

    // Get current preset name to pre-populate the prompt
    const currentPreset = this.getSelectedPreset(presetType);
    console.log(`Current preset for ${presetType}:`, currentPreset);

    // Only use the current preset name as default if it's not "Default"
    const defaultValue = (currentPreset && currentPreset !== "Default") ? currentPreset : "";

    // If it's a grid preset, suggest a name based on physical dimensions and cell count
    let suggestedName = defaultValue;
    if (presetType === PresetManager.TYPES.GRID) {
      const uiComponent = this.getUIComponent(presetType);
      if (uiComponent && uiComponent.main && uiComponent.main.params) {
        const params = uiComponent.main.params;
        suggestedName = `${params.physicalWidth}x${params.physicalHeight}_${params.boundaryType}_${params.target}`;
      }
    }

    const presetName = prompt(`Enter ${presetType} preset name:`, suggestedName);

    console.log(`User entered name: "${presetName}"`);
    if (!presetName) return;

    const uiComponent = this.getUIComponent(presetType);
    console.log(`UI component for ${presetType}:`, uiComponent ? "found" : "missing");

    const success = this.savePreset(presetType, presetName);
    console.log(`Save result for ${presetType} "${presetName}": ${success}`);

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
      case PresetManager.TYPES.GRID:
        return this.uiComponents.gridUi;
      default:
        return null;
    }
  }

  savePreset(type, presetName) {
    const handler = this.handlers[type];
    if (!handler) return false;

    const uiComponent = this.getUIComponent(type);

    if (uiComponent) {
      return handler.savePresetFromUI(presetName, uiComponent);
    }

    return false;
  }

  loadPreset(type, presetName) {
    const handler = this.handlers[type];
    if (!handler) return false;

    const uiComponent = this.getUIComponent(type);

    if (uiComponent) {
      return handler.applyPreset(presetName, uiComponent);
    }

    return false;
  }

  deletePreset(type, presetName) {
    const handler = this.handlers[type];
    if (!handler) return false;

    return handler.deletePreset(presetName);
  }
}
