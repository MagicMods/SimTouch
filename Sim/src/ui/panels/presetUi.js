import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class PresetUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = {};
    this.autoPlayActive = false;
    this.autoPlayInterval = null;
    this.autoPlaySpeed = 3000;
    this.gui.title("Presets");
  }

  initWithPresetManager(presetManager) {
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

    const actionsContainer = this._createActionButtons(containerElement);
    const presetSelect = this._createPresetSelector(containerElement);
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
      speedContainer: navContainer.speedContainer,
    };
  }

  _createActionButtons(containerElement) {
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.margin = "8px 4px";

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
      try {
        const exportData = this.presetManager.exportPresets();

        // Create a data URL for the JSON file
        const blob = new Blob([exportData], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Create a temporary link to download the file
        const link = document.createElement("a");
        link.href = url;
        link.download = `svibe_presets_${new Date()
          .toISOString()
          .slice(0, 10)}.json`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);
      } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed: " + error.message);
      }
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
          // Create import options dialog
          const shouldMerge = confirm(
            "Would you like to merge with existing presets?\n\n" +
            "• Click OK to merge (keep existing presets)\n" +
            "• Click Cancel to replace all presets"
          );

          const result = this.presetManager.importPresets(event.target.result, {
            merge: shouldMerge,
          });

          if (result.success) {
            alert(
              `Successfully imported presets:\n` +
              `• ${result.count} preset type(s) updated\n` +
              `• Types: ${result.types.join(", ")}`
            );
            this.updatePresetDropdown(this.presetControls.selector);
          } else {
            alert(`Import failed: ${result.error || "Unknown error"}`);
          }
        };

        reader.onerror = (error) => {
          console.error("File reading error:", error);
          alert("Failed to read file");
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

  _createPresetSelector(containerElement) {
    const presetSelect = document.createElement("select");
    presetSelect.classList = "preset-select";


    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      console.log(`Selected preset: ${selected}`);
      this.presetManager.loadPreset(PresetManager.TYPES.MASTER, selected);
    });

    containerElement.appendChild(presetSelect);
    return presetSelect;
  }

  _createNavigationControls(containerElement) {
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.justifyContent = "space-between";
    navContainer.style.margin = "8px 4px";

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

    // ADD THIS: Create speed control container
    const speedContainer = document.createElement("div");
    speedContainer.style.margin = "8px 0";
    speedContainer.style.display = "none"; // Hidden initially

    const speedLabel = document.createElement("div");
    speedLabel.textContent = `Speed: ${(this.autoPlaySpeed / 1000).toFixed(
      1
    )}s`;
    speedLabel.style.textAlign = "center";
    speedLabel.style.fontSize = "0.85em";
    speedLabel.style.marginBottom = "3px";

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

      // Restart autoplay with new speed if active
      if (this.autoPlayActive) {
        this.stopAutoPlay();
        this.startAutoPlay();
      }
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(speedSlider);
    containerElement.appendChild(speedContainer);

    return {
      prevButton,
      playButton,
      nextButton,
      speedContainer,
    };
  }

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
      // Show speed control when playing
      if (this.presetControls.speedContainer) {
        this.presetControls.speedContainer.style.display = "block";
      }
      this.startAutoPlay();
    } else {
      playButton.textContent = "▶ Auto Play";
      // Hide speed control when stopped
      if (this.presetControls.speedContainer) {
        this.presetControls.speedContainer.style.display = "none";
      }
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
