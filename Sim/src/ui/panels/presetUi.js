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

  initPresetControls() {
    // Clear any existing controllers
    if (this.gui && this.gui.__controllers) {
      while (this.gui.__controllers.length > 0) {
        this.gui.remove(this.gui.__controllers[0]);
      }
    }

    // SafeGet preset options
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
        presetOptions = ["Default"];
      }
    }

    // Make sure we have at least one option
    if (presetOptions.length === 0) {
      presetOptions = ["Default"];
    }

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

    // Save preset controls
    const saveObj = { name: "" };
    this.presetControls.name = this.gui
      .add(saveObj, "name")
      .name("Preset Name");

    // Use a basic button controller first
    const saveButton = { save: function () {} };
    this.presetControls.save = this.gui
      .add(saveButton, "save")
      .name("Save Preset");

    // Add the onClick handler if available, otherwise use onChange
    if (typeof this.presetControls.save.onClick === "function") {
      this.presetControls.save.onClick(() => {
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
      });
    } else {
      console.warn("onClick method not available, using alternative approach");

      // Alternative approach - replace the function directly
      saveButton.save = () => {
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
      };
    }

    // Delete preset similar approach
    const deleteButton = { delete: function () {} };
    this.presetControls.delete = this.gui
      .add(deleteButton, "delete")
      .name("Delete Preset");

    // Add handler with fallback
    if (typeof this.presetControls.delete.onClick === "function") {
      this.presetControls.delete.onClick(() => {
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
      });
    } else {
      deleteButton.delete = () => {
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
      };
    }

    // Rest of the method with similar pattern...
  }

  toggleAutoPlay(playButton) {
    if (this.autoPlayActive) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
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

  navigatePreset(direction) {
    const options = this.presetManager.getPresetOptions(
      PresetManager.TYPES.MASTER
    );
    if (!options || options.length === 0) return;

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
  }

  updatePresetDropdown(selectElement) {
    // Use the provided select element or the stored one
    const dropdown = selectElement || this.presetControls.selector;
    if (dropdown) {
      const options = this.presetManager.getPresetOptions(
        PresetManager.TYPES.MASTER
      );
      dropdown.options(options);
    }
  }
}
