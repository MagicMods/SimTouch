import { PresetMasterHandler } from "./presetMasterHandler.js";
import { PresetTurbulenceHandler } from "./presetTurbulenceHandler.js";
import { PresetVoronoiHandler } from "./presetVoronoiHandler.js";
import { PresetPulseHandler } from "./presetPulseHandler.js";
import { PresetMicHandler } from "./presetMicHandler.js";

class PresetManager {
  static TYPES = {
    MASTER: "master",
    TURBULENCE: "turb",
    VORONOI: "voronoi",
    PULSE: "pulse",
    MIC: "mic",
  };

  constructor(
    leftUi,
    pulseModUi,
    inputModUi,
    turbulenceUi,
    voronoiUi,
    organicUi,
    gridUi
  ) {
    this.leftUi = leftUi;
    this.pulseModUi = pulseModUi;
    this.inputModUi = inputModUi;
    this.turbulenceUi = turbulenceUi;
    this.voronoiUi = voronoiUi;
    this.organicUi = organicUi;
    this.gridUi = gridUi;
    this.presetControls = {};

    this.handlers = {
      [PresetManager.TYPES.MASTER]: new PresetMasterHandler(
        leftUi,
        pulseModUi,
        inputModUi,
        turbulenceUi,
        voronoiUi,
        organicUi,
        gridUi
      ),
      [PresetManager.TYPES.TURBULENCE]: new PresetTurbulenceHandler(),
      [PresetManager.TYPES.VORONOI]: new PresetVoronoiHandler(),
      [PresetManager.TYPES.PULSE]: new PresetPulseHandler(),
      [PresetManager.TYPES.MIC]: new PresetMicHandler(),
    };
  }

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

  getHandler(type) {
    return this.handlers[type] || null;
  }

  // Update this method to work with individual components
  getUIComponent(type) {
    switch (type) {
      case PresetManager.TYPES.MASTER:
        return this.leftUi;
      case PresetManager.TYPES.TURBULENCE:
        return this.turbulenceUi;
      case PresetManager.TYPES.VORONOI:
        return this.voronoiUi;
      case PresetManager.TYPES.PULSE:
        return this.pulseModUi;
      case PresetManager.TYPES.MIC:
        return this.inputModUi;
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

  savePreset(type, presetName, uiComponent = null) {
    if (!presetName) {
      console.warn("No preset name provided to save");
      return false;
    }

    try {
      // Get the correct component based on type
      const component = uiComponent || this.getUIComponent(type);

      // TEMPORARY DEBUG CHECK - REMOVE IN PRODUCTION
      if (!component) {
        console.error(`Cannot save ${type} preset: UI component not found`);
        return false;
      }

      // Get the correct handler
      const handler = this.getHandler(type);

      // TEMPORARY DEBUG CHECK - REMOVE IN PRODUCTION
      if (typeof handler?.savePreset !== "function") {
        console.error(
          `Cannot save ${type} preset: handler.savePreset is not a function`
        );
        return false;
      }

      switch (type) {
        case PresetManager.TYPES.MASTER:
          // Handle master presets...
          break;

        case PresetManager.TYPES.TURBULENCE:
          // Handle turbulence presets...
          break;

        case PresetManager.TYPES.VORONOI:
          // Handle voronoi presets...
          break;

        case PresetManager.TYPES.PULSE:
          console.log(
            "Save pulse preset:",
            presetName,
            "UI instance type:",
            component ? component.constructor.name : "missing"
          );
          return handler.savePreset(presetName, component);

        case PresetManager.TYPES.MIC:
          console.log(
            "Save mic preset:",
            presetName,
            "UI instance type:",
            component ? component.constructor.name : "missing"
          );
          return handler.savePreset(presetName, component);

        default:
          console.warn(`Unknown preset type: ${type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error saving ${type} preset:`, error);
      return false;
    }
  }

  deletePreset(type, presetName) {
    const handler = this.getHandler(type);
    if (!handler) return false;

    return handler.deletePreset(presetName);
  }

  loadPreset(type, presetName, uiComponent = null) {
    const handler = this.getHandler(type);
    if (!handler) return false;

    const component = uiComponent || this.getUIComponent(type);
    return handler.applyDataToUI(presetName, component);
  }

  setDebug(enabled) {
    Object.values(this.handlers).forEach((handler) => {
      if (typeof handler.setDebug === "function") {
        handler.setDebug(enabled);
      }
    });
  }

  setVoronoiField(voronoiField) {
    this.voronoiField = voronoiField;
  }

  setTurbulenceField(turbulenceField) {
    this.turbulenceField = turbulenceField;
  }

  exportPresets() {
    try {
      const masterHandler = this.getHandler(PresetManager.TYPES.MASTER);
      if (!masterHandler) {
        console.error("Master preset handler not found");
        return false;
      }

      const presets = masterHandler.presets;
      if (!presets || Object.keys(presets).length === 0) {
        console.warn("No presets to export");
        return false;
      }

      const dataStr = JSON.stringify(presets, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileName =
        "svibe_presets_" + new Date().toISOString().slice(0, 10) + ".json";

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileName);
      linkElement.style.display = "none";
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      console.log(`Exported ${Object.keys(presets).length} presets`);
      return true;
    } catch (error) {
      console.error("Error exporting presets:", error);
      return false;
    }
  }

  importPresets(jsonData) {
    try {
      let importedPresets;
      try {
        importedPresets = JSON.parse(jsonData);
      } catch (e) {
        console.error("Failed to parse imported JSON:", e);
        return 0;
      }

      if (!importedPresets || typeof importedPresets !== "object") {
        console.error("Invalid imported preset format");
        return 0;
      }

      const masterHandler = this.getHandler(PresetManager.TYPES.MASTER);
      if (!masterHandler) {
        console.error("Master preset handler not found");
        return 0;
      }

      let importCount = 0;

      for (const presetName in importedPresets) {
        if (masterHandler.protectedPresets.includes(presetName)) {
          console.log(`Skipping protected preset: ${presetName}`);
          continue;
        }

        if (
          masterHandler.importPreset(presetName, importedPresets[presetName])
        ) {
          importCount++;
        }
      }

      console.log(`Successfully imported ${importCount} presets`);
      return importCount;
    } catch (error) {
      console.error("Error importing presets:", error);
      return 0;
    }
  }
}

export { PresetManager };
