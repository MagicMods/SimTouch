import { BaseUi } from "./baseUi.js";

export class PresetUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = {};

    // Change the GUI title
    this.gui.title("Presets");

    // No need for initFolders() anymore
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.initPresetControls();
  }

  // Remove the initFolders method since we don't need it anymore

  initPresetControls() {
    this.presetControls = this.presetControls || {};

    // Work directly with the gui's DOM element instead of a folder
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in GUI");
      return;
    }

    // Clear existing elements
    containerElement.innerHTML = "";

    const presetSelect = document.createElement("select");
    presetSelect.classList = "preset-select";
    presetSelect.style.padding = "4px";
    presetSelect.style.width = "100%";

    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Preset selector changed to:", value);
      this.presetManager.loadPreset(value);
    });

    this.presetControls.selector = presetSelect;

    // Keep the navigation buttons
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.justifyContent = "space-between";
    navContainer.style.margin = "5px 5px";
    navContainer.style.width = "100%";

    const prevButton = document.createElement("button");
    prevButton.textContent = "← Prev";
    prevButton.style.flex = "1";
    prevButton.style.marginRight = "5px";
    prevButton.addEventListener("click", () => this.navigatePreset(-1));

    const nextButton = document.createElement("button");
    nextButton.textContent = "Next →";
    nextButton.style.flex = "1";
    nextButton.style.marginLeft = "5px";
    nextButton.addEventListener("click", () => this.navigatePreset(1));

    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);

    // Create buttons for preset management
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px 5px";
    actionsContainer.style.width = "100%";
    actionsContainer.style.flexWrap = "wrap";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter preset name:");
      if (this.presetManager.savePreset(presetName)) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPreset();
        alert(`Preset "${presetName}" saved.`);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.style.margin = "0 2px";
    deleteButton.addEventListener("click", () => {
      const current = this.presetManager.getSelectedPreset();
      console.log("Attempting to delete preset:", current);
      if (this.presetManager.deletePreset(current)) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPreset();
        alert(`Preset "${current}" deleted.`);
      }
    });

    const exportButton = document.createElement("button");
    exportButton.textContent = "Export All";
    exportButton.style.flex = "1";
    exportButton.style.margin = "0 2px";
    exportButton.addEventListener("click", () => {
      this.presetManager.exportPresets();
    });

    const importButton = document.createElement("button");
    importButton.textContent = "Import";
    importButton.style.flex = "1";
    importButton.style.margin = "0 2px";
    importButton.addEventListener("click", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);

      fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const importCount = this.presetManager.importPresets(e.target.result);
          if (importCount) {
            this.updatePresetDropdown(presetSelect);
            alert(`Successfully imported ${importCount} presets.`);
          } else {
            alert("Failed to import presets. Check console for details.");
          }
        };
        reader.readAsText(file);
        document.body.removeChild(fileInput);
      });

      fileInput.click();
    });

    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);
    actionsContainer.appendChild(exportButton);
    actionsContainer.appendChild(importButton);

    containerElement.appendChild(actionsContainer);
    containerElement.appendChild(presetSelect);
    containerElement.appendChild(navContainer);
  }

  // The rest of the methods remain unchanged
  navigatePreset(direction) {
    const options = this.presetManager.getPresetOptions();
    const currentPreset = this.presetManager.getSelectedPreset();
    let currentIndex = options.indexOf(currentPreset);

    // Calculate new index with wrapping
    let newIndex = (currentIndex + direction + options.length) % options.length;
    const newPreset = options[newIndex];

    // Load the new preset
    console.log(`Navigating from "${currentPreset}" to "${newPreset}"`);
    this.presetManager.loadPreset(newPreset);

    // Update the dropdown display
    this.presetControls.selector.value = newPreset;
  }

  updatePresetDropdown(selectElement) {
    const options = this.presetManager.getPresetOptions();
    console.log("Updating preset dropdown with options:", options);

    // Clear existing options
    selectElement.innerHTML = "";

    // Add new options
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Set current value
    selectElement.value = this.presetManager.getSelectedPreset();
  }
}
