import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class PresetUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = {};
    this.autoPlayActive = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 3000; // Default: 3 seconds

    // Change the GUI title
    this.gui.title("Presets");
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.initPresetControls();
  }

  initPresetControls() {
    if (!this.presetManager) {
      console.warn("PresetManager not set, can't initialize preset controls");
      return;
    }

    // Work directly with the gui's DOM element instead of a folder
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) {
      console.warn("Could not find children container in GUI");
      return;
    }

    // Clear existing elements
    containerElement.innerHTML = "";

    // Create elements in the correct order:
    // 1. Action buttons (Save/Delete/Export/Import)
    // 2. Preset selector
    // 3. Navigation buttons (Prev/Play/Next)

    // 1. Create buttons for preset management
    const actionsContainer = this._createActionButtons(containerElement);

    // 2. Create a custom preset selector
    const presetSelect = this._createPresetSelector(containerElement);

    // 3. Create navigation controls
    const navContainer = this._createNavigationControls(containerElement);

    // Store references for later access
    this.presetControls = {
      selector: presetSelect,
      playButton: navContainer.playButton,
      saveButton: actionsContainer.saveButton,
      deleteButton: actionsContainer.deleteButton,
      exportButton: actionsContainer.exportButton,
      importButton: actionsContainer.importButton,
      prevButton: navContainer.prevButton,
      nextButton: navContainer.nextButton,
    };
  }

  /**
   * Create action buttons (Save/Delete/Export/Import)
   */
  _createActionButtons(containerElement) {
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    // actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px 0";
    // actionsContainer.style.flexWrap = "wrap";

    const saveButton = this._createButton("Save", () => {
      const name = prompt("Enter preset name:");
      if (name) {
        this.presetManager.savePreset(PresetManager.TYPES.MASTER, name);
        this.updatePresetDropdown(this.presetControls.selector);
      }
    });

    const deleteButton = this._createButton("Delete", () => {
      const current = this.presetControls.selector.value;
      if (confirm(`Delete preset "${current}"?`)) {
        this.presetManager.deletePreset(PresetManager.TYPES.MASTER, current);
        this.updatePresetDropdown(this.presetControls.selector);
      }
    });

    const exportButton = this._createButton("Export", () => {
      this.presetManager.exportPresets();
    });

    const importButton = this._createButton("Import", () => {
      // Create a file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const importCount = this.presetManager.importPresets(
            event.target.result
          );
          if (importCount > 0) {
            alert(`Successfully imported ${importCount} presets`);
            this.updatePresetDropdown(this.presetControls.selector);
          } else {
            alert("No presets were imported");
          }
        };
        reader.readAsText(file);

        // Remove the file input after use
        document.body.removeChild(fileInput);
      });

      fileInput.click();
    });

    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);
    actionsContainer.appendChild(exportButton);
    actionsContainer.appendChild(importButton);
    containerElement.appendChild(actionsContainer);

    return {
      saveButton,
      deleteButton,
      exportButton,
      importButton,
    };
  }

  /**
   * Create preset selector dropdown
   */
  _createPresetSelector(containerElement) {
    const presetSelect = document.createElement("select");
    presetSelect.classList = "preset-select";
    presetSelect.style.padding = "5px";
    presetSelect.style.width = "100%";
    presetSelect.style.margin = "10px 0";
    presetSelect.style.display = "block"; // Ensure it's a block element

    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      console.log(`Selected preset: ${selected}`);
      this.presetManager.loadPreset(PresetManager.TYPES.MASTER, selected);
    });

    containerElement.appendChild(presetSelect);
    return presetSelect;
  }

  /**
   * Create navigation controls (Prev/Play/Next)
   */
  _createNavigationControls(containerElement) {
    const navContainer = document.createElement("div");
    // navContainer.style.classList = "preset-control-button";
    navContainer.style.display = "flex";
    navContainer.style.justifyContent = "space-between";
    navContainer.style.margin = "10px 0 5px 0";

    const prevButton = this._createButton("← Prev", () => {
      this.navigatePreset(-1);
      this.updatePresetDropdown(this.presetControls.selector);
    });

    const playButton = this._createButton("▶ Play", () => {
      this.toggleAutoPlay(playButton);
    });

    const nextButton = this._createButton("Next →", () => {
      this.navigatePreset(1);
      this.updatePresetDropdown(this.presetControls.selector);
    });

    navContainer.appendChild(prevButton);
    navContainer.appendChild(playButton);
    navContainer.appendChild(nextButton);

    containerElement.appendChild(navContainer);

    return {
      prevButton,
      playButton,
      nextButton,
    };
  }

  /**
   * Helper to create a button with consistent styling
   */
  _createButton(text, clickHandler) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.flex = "1";
    button.style.margin = "0 2px";
    // button.style.padding = "4px";
    button.addEventListener("click", clickHandler);
    return button;
  }

  toggleAutoPlay(playButton) {
    this.autoPlayActive = !this.autoPlayActive;

    if (this.autoPlayActive) {
      playButton.textContent = "⏹ Stop";
      this.startAutoPlay();
    } else {
      playButton.textContent = "▶ Auto Play";
      this.stopAutoPlay();
    }
  }

  startAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }

    this.autoPlayInterval = setInterval(() => {
      this.navigatePreset(1);
      this.updatePresetDropdown(this.presetControls.selector);
    }, this.autoPlaySpeed);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  navigatePreset(direction) {
    if (!this.presetManager) return;

    const options = this.presetManager.getPresetOptions(
      PresetManager.TYPES.MASTER
    );
    if (!options || options.length <= 1) return;

    const currentPreset = this.presetManager.getSelectedPreset(
      PresetManager.TYPES.MASTER
    );
    let currentIndex = options.indexOf(currentPreset);

    if (currentIndex === -1) currentIndex = 0;

    // Calculate next index with wrap-around
    let nextIndex =
      (currentIndex + direction + options.length) % options.length;

    // Load the next preset
    this.presetManager.loadPreset(
      PresetManager.TYPES.MASTER,
      options[nextIndex]
    );
  }

  updatePresetDropdown(selectElement) {
    if (!selectElement || !this.presetManager) return;

    const options = this.presetManager.getPresetOptions(
      PresetManager.TYPES.MASTER
    );

    // Clear existing options
    selectElement.innerHTML = "";

    // Add all available presets
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Set current selection
    const currentPreset = this.presetManager.getSelectedPreset(
      PresetManager.TYPES.MASTER
    );
    if (currentPreset) {
      selectElement.value = currentPreset;
    }
  }
}
