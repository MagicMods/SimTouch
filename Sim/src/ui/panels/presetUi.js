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
    if (this.gui) {
      this.gui.title("Presets");
    }
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.initPresetControls();
  }

  //#region UI Controls Initialization

  initPresetControls() {
    this._clearExistingControls();
    this._setupPresetSelector();
    this._setupSavePresetControls();
    this._setupDeletePresetControls();
    this._setupNavigationControls();
  }

  _clearExistingControls() {
    // Clear any existing controllers
    if (this.gui && this.gui.__controllers) {
      while (this.gui.__controllers.length > 0) {
        this.gui.remove(this.gui.__controllers[0]);
      }
    }
  }

  _setupPresetSelector() {
    // Get preset options with safety measures
    const presetOptions = this._getPresetOptions();

    // Create preset dropdown
    const preset = { value: presetOptions[0] };
    this.presetControls.selector = this.gui
      .add(preset, "value", presetOptions)
      .name("Select Preset")
      .onChange((value) => {
        if (value && value !== "Default") {
          try {
            this.presetManager.loadPreset(PresetManager.TYPES.MASTER, value);
          } catch (error) {
            console.error("Error loading preset:", error);
          }
        }
      });
  }

  _setupSavePresetControls() {
    // Save preset controls
    const saveObj = { name: "" };
    this.presetControls.name = this.gui
      .add(saveObj, "name")
      .name("Preset Name");

    // Create save button
    const saveButton = {
      save: () => {
        const name = saveObj.name;
        if (name && name.trim() !== "") {
          try {
            this.presetManager.savePreset(PresetManager.TYPES.MASTER, name);
            this.updatePresetDropdown();
          } catch (error) {
            console.error("Error saving preset:", error);
          }
        } else {
          console.warn("Please enter a preset name");
        }
      },
    };

    this.presetControls.save = this.gui
      .add(saveButton, "save")
      .name("Save Preset");
  }

  _setupDeletePresetControls() {
    // Delete preset button
    const deleteButton = {
      delete: () => {
        const selectedPreset = this.presetControls.selector.getValue();
        if (selectedPreset && selectedPreset !== "Default") {
          try {
            this.presetManager.deletePreset(
              PresetManager.TYPES.MASTER,
              selectedPreset
            );
            this.updatePresetDropdown();
          } catch (error) {
            console.error("Error deleting preset:", error);
          }
        } else {
          console.warn("Cannot delete Default preset");
        }
      },
    };

    this.presetControls.delete = this.gui
      .add(deleteButton, "delete")
      .name("Delete Preset");
  }

  _setupNavigationControls() {
    // Navigation controls
    const navFolder = this.gui.addFolder("Navigation");

    // Previous and next buttons
    const navObj = {
      prev: () => this.navigatePreset(-1),
      next: () => this.navigatePreset(1),
      autoPlay: this.autoPlayActive,
      speed: this.autoPlaySpeed,
    };

    this.presetControls.prev = navFolder
      .add(navObj, "prev")
      .name("⬅️ Previous");
    this.presetControls.next = navFolder.add(navObj, "next").name("Next ➡️");

    // Auto-play control
    this.presetControls.autoPlay = navFolder
      .add(navObj, "autoPlay")
      .name("Auto Play")
      .onChange((value) => this.toggleAutoPlay(value));

    this.presetControls.speed = navFolder
      .add(navObj, "speed", 500, 10000)
      .name("Speed (ms)")
      .onChange((value) => {
        this.autoPlaySpeed = value;
        if (this.autoPlayActive) {
          this.stopAutoPlay();
          this.startAutoPlay();
        }
      });

    navFolder.open();
  }

  _getPresetOptions() {
    // Get preset options with safety measures
    let presetOptions = [];

    if (
      this.presetManager &&
      typeof this.presetManager.getPresetOptions === "function"
    ) {
      try {
        const masterType = PresetManager.TYPES.MASTER;
        presetOptions = this.presetManager.getPresetOptions(masterType) || [];
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

  //#endregion

  //#region Auto Play Management

  toggleAutoPlay(value) {
    if (value) {
      this.startAutoPlay();
    } else {
      this.stopAutoPlay();
    }
  }

  startAutoPlay() {
    if (!this.autoPlayInterval) {
      this.autoPlayActive = true;
      this.autoPlayInterval = setInterval(() => {
        this.navigatePreset(1);
      }, this.autoPlaySpeed);

      if (this.presetControls.autoPlay) {
        this.presetControls.autoPlay.setValue(true);
      }
    }
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
      this.autoPlayActive = false;

      if (this.presetControls.autoPlay) {
        this.presetControls.autoPlay.setValue(false);
      }
    }
  }

  //#endregion

  //#region Preset Navigation

  navigatePreset(direction) {
    try {
      const options = this._getPresetOptions();
      if (options.length <= 1) return;

      const currentPreset = this.presetControls.selector.getValue();
      const currentIndex = options.indexOf(currentPreset);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex + direction;

      // Loop around if we go past the end or beginning
      if (nextIndex >= options.length) nextIndex = 0;
      if (nextIndex < 0) nextIndex = options.length - 1;

      const nextPreset = options[nextIndex];
      if (nextPreset) {
        this.presetControls.selector.setValue(nextPreset);
      }
    } catch (error) {
      console.error("Error navigating presets:", error);
    }
  }

  updatePresetDropdown(selectElement) {
    try {
      // Use the provided select element or the stored one
      const dropdown = selectElement || this.presetControls.selector;
      if (dropdown) {
        const options = this._getPresetOptions();
        dropdown.options(options);
      }
    } catch (error) {
      console.error("Error updating preset dropdown:", error);
    }
  }

  //#endregion
}
