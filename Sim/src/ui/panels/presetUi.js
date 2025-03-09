import { BaseUi } from "./baseUi.js";
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
    this.presetControls = this.presetControls || {};

    // Work directly with the gui's DOM element instead of a folder
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in GUI");
      return;
    }

    // Clear existing elements
    containerElement.innerHTML = "";

    // Create preset dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList = "preset-select";
    presetSelect.style.padding = "5px";
    presetSelect.style.width = "100%";

    presetSelect.style.margin = "5px 0";

    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Preset selector changed to:", value);
      this.presetManager.loadPreset(PresetManager.TYPES.MASTER, value);
    });

    this.presetControls.selector = presetSelect;

    // Create buttons for preset management
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px";
    actionsContainer.style.flexWrap = "wrap";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter preset name:");
      if (
        presetName &&
        this.presetManager.savePreset(PresetManager.TYPES.MASTER, presetName)
      ) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPreset(
          PresetManager.TYPES.MASTER
        );
        alert(`Preset "${presetName}" saved.`);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.style.margin = "0 2px";
    deleteButton.addEventListener("click", () => {
      const current = this.presetManager.getSelectedPreset(
        PresetManager.TYPES.MASTER
      );
      console.log("Attempting to delete preset:", current);
      if (
        this.presetManager.deletePreset(PresetManager.TYPES.MASTER, current)
      ) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPreset(
          PresetManager.TYPES.MASTER
        );
        alert(`Preset "${current}" deleted.`);
      }
    });

    const exportButton = document.createElement("button");
    exportButton.textContent = "Export All";
    exportButton.style.flex = "1";
    exportButton.style.margin = "0 2px";
    exportButton.addEventListener("click", () => {
      if (typeof this.presetManager.exportPresets === "function") {
        this.presetManager.exportPresets();
      } else {
        alert("Export functionality not available");
      }
    });

    const importButton = document.createElement("button");
    importButton.textContent = "Import";
    importButton.style.flex = "1";
    importButton.style.margin = "0 2px";
    importButton.addEventListener("click", () => {
      if (typeof this.presetManager.importPresets !== "function") {
        alert("Import functionality not available");
        return;
      }

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

    // Keep the navigation buttons
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.justifyContent = "space-between";
    navContainer.style.margin = "5px 0";

    const prevButton = document.createElement("button");
    prevButton.textContent = "← Prev";
    prevButton.style.flex = "1";
    prevButton.style.marginRight = "5px";
    prevButton.addEventListener("click", () => this.navigatePreset(-1));

    // Add Play button
    const playButton = document.createElement("button");
    playButton.textContent = "▶ Play";
    playButton.style.flex = "1";
    playButton.style.margin = "0 5px";
    playButton.addEventListener("click", () => this.toggleAutoPlay(playButton));
    this.presetControls.playButton = playButton;

    const nextButton = document.createElement("button");
    nextButton.textContent = "Next →";
    nextButton.style.flex = "1";
    nextButton.style.marginLeft = "5px";
    nextButton.addEventListener("click", () => this.navigatePreset(1));

    navContainer.appendChild(prevButton);
    navContainer.appendChild(playButton);
    navContainer.appendChild(nextButton);

    // Create speed slider container (initially hidden)
    const speedContainer = document.createElement("div");
    speedContainer.style.margin = "5px 0";
    speedContainer.style.display = "none";

    const speedLabel = document.createElement("div");
    speedLabel.textContent = `Speed: ${(this.autoPlaySpeed / 1000).toFixed(
      1
    )}s`;
    speedLabel.style.marginBottom = "5px";
    speedLabel.style.textAlign = "center";

    const speedSlider = document.createElement("input");
    speedSlider.type = "range";
    speedSlider.min = "500";
    speedSlider.max = "10000";
    speedSlider.step = "500";
    speedSlider.value = this.autoPlaySpeed.toString();
    speedSlider.style.width = "100%";

    speedSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.autoPlaySpeed = value;
      speedLabel.textContent = `Speed: ${(value / 1000).toFixed(1)}s`;

      // If autoplay is active, restart it with new speed
      if (this.autoPlayActive) {
        this.stopAutoPlay();
        this.startAutoPlay();
      }
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(speedSlider);
    this.presetControls.speedContainer = speedContainer;

    // Add elements to container in correct order
    containerElement.appendChild(actionsContainer);
    containerElement.appendChild(presetSelect);
    containerElement.appendChild(navContainer);
    containerElement.appendChild(speedContainer);
  }

  toggleAutoPlay(playButton) {
    if (this.autoPlayActive) {
      this.stopAutoPlay();
      playButton.textContent = "▶ Play";
      this.presetControls.speedContainer.style.display = "none";
    } else {
      this.startAutoPlay();
      playButton.textContent = "⏹ Stop";
      this.presetControls.speedContainer.style.display = "block";
    }
  }

  startAutoPlay() {
    this.autoPlayActive = true;
    this.autoPlayInterval = setInterval(() => {
      this.navigatePreset(1);
    }, this.autoPlaySpeed);
    console.log(`Auto-play started with ${this.autoPlaySpeed}ms interval`);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    this.autoPlayActive = false;
    console.log("Auto-play stopped");
  }

  navigatePreset(direction) {
    const options = this._getPresetOptions();
    if (!options || options.length <= 1) return;

    const currentPreset = this.presetManager.getSelectedPreset(
      PresetManager.TYPES.MASTER
    );
    let currentIndex = options.indexOf(currentPreset);

    if (currentIndex === -1) currentIndex = 0;

    // Calculate new index with wrapping
    let newIndex = (currentIndex + direction + options.length) % options.length;
    const newPreset = options[newIndex];

    // Load the new preset
    console.log(`Navigating from "${currentPreset}" to "${newPreset}"`);
    this.presetManager.loadPreset(PresetManager.TYPES.MASTER, newPreset);

    // Update the dropdown display
    if (this.presetControls.selector) {
      this.presetControls.selector.value = newPreset;
    }
  }

  updatePresetDropdown(selectElement) {
    const options = this._getPresetOptions();
    console.log("Updating preset dropdown with options:", options);

    // Clear existing options
    if (!selectElement) return;
    selectElement.innerHTML = "";

    // Add new options
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Set current value
    const currentPreset = this.presetManager.getSelectedPreset(
      PresetManager.TYPES.MASTER
    );
    if (currentPreset) {
      selectElement.value = currentPreset;
    }
  }

  _getPresetOptions() {
    // Get preset options with safety measures
    let presetOptions = [];

    if (
      this.presetManager &&
      typeof this.presetManager.getPresetOptions === "function"
    ) {
      try {
        presetOptions =
          this.presetManager.getPresetOptions(PresetManager.TYPES.MASTER) || [];
      } catch (error) {
        console.error("Error getting master preset options:", error);
      }
    }

    // Make sure we have at least one option
    if (!presetOptions || presetOptions.length === 0) {
      presetOptions = ["Default"];
    }

    return presetOptions;
  }
}
