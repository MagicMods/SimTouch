import { BaseUi } from "../baseUi.js";

export class RandomizerUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Settings with defaults
    this.settings = {
      intensity: 0.5,
      includeCheckboxes: false,
      useExclusions: true,  // Enable exclusions by default
    };

    // List of parameters to exclude from randomization
    this.exclusions = [
      "Particle Count",      // Exclude particle count to prevent performance issues
      "Cell Count",          // Excluding cell count prevents regenerating voronoi cells too often
      "Time Step",           // Time step can cause stability issues when randomized
      "Boundary Size",       // Boundary size changes can be disruptive
      "Particle Opacity",             // Keep existing exclusions
      "Color"                // Keep existing exclusions
    ];

    this.paramTargets = {};
    this.gui.title("Randomizer");
    this.createRandomizeButton();

    const settingsFolder = this.gui.addFolder("Settings");
    this.intensityController = settingsFolder
      .add(this.settings, "intensity", 0, 1)
      .name("Intensity")
      .onChange(() => this.updateButtonStyle());

    this.paramFolder = this.gui.addFolder("Parameters");
    this.paramFolder.close();

    this.gui.open();
  }

  setModulatorManager(modulatorManager) {
    this.modulatorManager = modulatorManager;
    console.log("RandomizerUi initialized with preset manager");
  }

  createRandomizeButton() {
    // Create a custom HTML button
    const buttonContainer = document.createElement("div");
    buttonContainer.style.width = "100%";
    buttonContainer.style.padding = "10px 0";
    buttonContainer.style.textAlign = "center";

    const randomizeButton = document.createElement("button");
    randomizeButton.textContent = "RANDOMIZE";
    randomizeButton.id = "randomize-all-button";
    randomizeButton.style.width = "100%";
    randomizeButton.style.fontSize = "12px";
    randomizeButton.style.fontWeight = "bold";
    randomizeButton.style.backgroundColor = this.getButtonColor();
    randomizeButton.style.color = "white";
    randomizeButton.style.border = "none";
    randomizeButton.style.borderRadius = "4px";
    randomizeButton.style.cursor = "pointer";
    randomizeButton.style.transition = "background-color 0.3s";

    // Mouse hover effects
    randomizeButton.addEventListener("mouseenter", () => {
      randomizeButton.style.backgroundColor = this.getButtonColor(true);
    });

    randomizeButton.addEventListener("mouseleave", () => {
      randomizeButton.style.backgroundColor = this.getButtonColor();
    });

    // Click handler
    randomizeButton.addEventListener("click", () => {
      this.randomizeAll();
      this.flashButton(randomizeButton);
    });

    // Add to container
    buttonContainer.appendChild(randomizeButton);

    // Add button container to the GUI's main element
    const guiContainer = this.gui.domElement.querySelector(".children");
    if (guiContainer) {
      guiContainer.insertBefore(buttonContainer, guiContainer.firstChild);
    }

    // Store reference
    this.randomizeButton = randomizeButton;

    // Add style for flash animation if not already present
    if (!document.getElementById("randomizer-styles")) {
      const style = document.createElement("style");
      style.id = "randomizer-styles";
      style.textContent = `
        @keyframes randomizer-flash {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .randomizer-flash {
          animation: randomizer-flash 0.3s;
        }
      `;
      document.head.appendChild(style);
    }
  }

  updateParameterAvailability() {
    if (!this.paramTargets) return;

    for (const targetName in this.paramTargets) {
      const controller = this.findControllerByName(targetName);
      if (!controller) continue;

      // If exclusions are enabled and this parameter is in the exclusion list
      if (this.exclusions.includes(targetName)) {
        // Disable the checkbox
        controller.disable();
        // Uncheck it
        this.paramTargets[targetName] = false;
        controller.updateDisplay();
      } else {
        // Otherwise enable it
        controller.enable();
      }
    }
  }

  findControllerByName(name) {
    // Look through all folders in paramFolder
    for (const folder of this.paramFolder.folders) {
      for (const controller of folder.controllers) {
        if (controller.property === name) {
          return controller;
        }
      }
    }
    return null;
  }

  initParameterTargets() {
    if (!this.modulatorManager) {
      console.warn("RandomizerUI: ModulatorManager not set");
      return;
    }

    const targetNames = this.modulatorManager.getTargetNames();

    if (targetNames.length === 0) {
      console.warn("RandomizerUI: No targets found in ModulatorManager");
      return;
    }

    // Filter out excluded parameters before categorizing
    const filteredTargetNames = targetNames.filter(name => !this.exclusions.includes(name));

    const categorizedTargets = this.categorizeTargets(filteredTargetNames);

    for (const category in categorizedTargets) {
      const componentFolder = this.paramFolder.addFolder(category);
      componentFolder.open(false);

      for (const targetName of categorizedTargets[category]) {
        // All parameters start unchecked
        this.paramTargets[targetName] = false;

        // Add controller to the folder
        componentFolder.add(this.paramTargets, targetName).name(targetName);
      }
    }

    // Log how many parameters were excluded
    const excludedCount = targetNames.length - filteredTargetNames.length;
    if (excludedCount > 0) {
      console.log(`RandomizerUI: Excluded ${excludedCount} parameters from randomization`);
    }
  }

  categorizeTargets(targetNames) {
    const categorizedTargets = {};

    const getComponentName = (targetName) => {

      if (/^Particle (Count|Size|Opacity|Color)$/i.test(targetName)) return "Particles";
      if (/^Gravity (Strength|X|Y)$/i.test(targetName)) return "Gravity";
      if (/^(CRepulsion|CBounce|CDamping)$/i.test(targetName)) return "Collision";
      if (/^(Boundary (Size|Bounce)|Wall (Repulsion|Friction))$/i.test(targetName)) return "Boundary";
      if (/^(Turbulence |)(Strength|Scale|Speed|Octaves|Persistence|Rotation|Rotation Speed|Inward Pull|Decay Rate|Scale Strength|Min Scale|Max Scale|X Bias|Y Bias)$/i.test(targetName)) return "Turbulence";
      if (/^(Voronoi |)(Strength|Edge Width|Attraction|Cell (Count|Speed)|Decay Rate|Force Blend)$/i.test(targetName)) return "Voronoi";
      if (/^(Force|Radius|Surface Tension|Viscosity|Damping|Cohesion|Alignment|Separation|Max Speed|Repulsion|Attraction|Threshold)$/i.test(targetName)) return "Organic";
      if (/^(Max Density|FIn Speed|FOut Speed|Time Step|Speed|VeloDamping)$/i.test(targetName)) return "Simulation";
      if (/^(Rest Density|Gas Constant|Velocity Threshold|Position Threshold)$/i.test(targetName)) return "Rest State";
      if (/^(Target Cells|Grid Gap|Grid Scale)$/i.test(targetName)) return "Grid";


      return "Other";
    };


    for (const targetName of targetNames) {
      const component = getComponentName(targetName);
      if (!categorizedTargets[component]) {
        categorizedTargets[component] = [];
      }
      categorizedTargets[component].push(targetName);
    }

    return categorizedTargets;
  }

  // Update randomizeAll to respect exclusions
  randomizeAll() {
    if (!this.modulatorManager) {
      console.error("RandomizerUI: Cannot randomize, ModulatorManager not set");
      return { success: false, totalChanged: 0 };
    }

    let totalChanged = 0;
    const targets = this.modulatorManager.targets;

    for (const targetName in this.paramTargets) {
      // Skip if parameter isn't selected
      if (!this.paramTargets[targetName]) {
        continue;
      }

      // In case the exclusions list changed after initialization
      if (this.settings.useExclusions && this.exclusions.includes(targetName)) {
        continue;
      }

      const target = targets[targetName];
      if (!target || !target.controller) {
        continue;
      }

      const controller = target.controller;
      if (this._isSlider(controller)) {
        const success = this._randomizeController(controller, target);
        if (success) {
          totalChanged++;
        }
      } else if (
        this.settings.includeCheckboxes &&
        this._isCheckbox(controller)
      ) {
        if (Math.random() < this.settings.intensity) {
          const currentValue = controller.getValue();
          controller.setValue(!currentValue);
          totalChanged++;
        }
      }
    }

    console.log(`RandomizerUI: Randomized ${totalChanged} parameters`);
    return { success: true, totalChanged };
  }

  _isSlider(controller) {
    if (!controller || typeof controller.getValue !== "function") {
      return false;
    }

    const value = controller.getValue();
    return typeof value === "number";
  }

  _isCheckbox(controller) {
    if (!controller || typeof controller.getValue !== "function") {
      return false;
    }

    const value = controller.getValue();
    return typeof value === "boolean";
  }

  _randomizeController(controller, target) {
    try {

      const currentValue = controller.getValue();

      // Get range from target info
      let min = target.min !== undefined ? target.min : 0;
      let max = target.max !== undefined ? target.max : 1;

      // Calculate range
      const range = max - min;

      // Calculate random offset based on intensity
      const randomFactor = (Math.random() * 2 - 1) * this.settings.intensity;
      let offset = range * randomFactor;

      // Apply offset to current value
      let newValue = currentValue + offset;

      // Clamp to range
      newValue = Math.max(min, Math.min(max, newValue));

      // Round to integer if appropriate
      if (Number.isInteger(currentValue) || /count|particles|octaves/i.test(target.name)) {
        newValue = Math.round(newValue);
      }

      // Update the controller
      controller.setValue(newValue);

      // Make sure display is updated
      if (typeof controller.updateDisplay === "function") {
        controller.updateDisplay();
      }

      return true;
    } catch (err) {
      console.warn(`Error randomizing ${target?.name || "unknown"}:`, err);
      return false;
    }
  }

  updateButtonStyle() {
    if (!this.randomizeButton) return;
    this.randomizeButton.style.backgroundColor = this.getButtonColor();
  }

  getButtonColor(hover = false) {
    // Color ranges from blue (low intensity) to red (high intensity)
    const intensity = this.settings.intensity;

    // Base colors
    const lowColor = [65, 105, 225]; // Royal Blue
    const midColor = [50, 150, 50]; // Green
    const highColor = [220, 50, 50]; // Red

    let r, g, b;

    if (intensity < 0.5) {
      // Blend from low to mid
      const t = intensity * 2;
      r = Math.round(lowColor[0] * (1 - t) + midColor[0] * t);
      g = Math.round(lowColor[1] * (1 - t) + midColor[1] * t);
      b = Math.round(lowColor[2] * (1 - t) + midColor[2] * t);
    } else {
      // Blend from mid to high
      const t = (intensity - 0.5) * 2;
      r = Math.round(midColor[0] * (1 - t) + highColor[0] * t);
      g = Math.round(midColor[1] * (1 - t) + highColor[1] * t);
      b = Math.round(midColor[2] * (1 - t) + highColor[2] * t);
    }

    // Adjust for hover state
    if (hover) {
      r = Math.min(255, r + 20);
      g = Math.min(255, g + 20);
      b = Math.min(255, b + 20);
    }

    return `rgb(${r}, ${g}, ${b})`;
  }

  flashButton(button) {
    button.classList.add("randomizer-flash");
    setTimeout(() => button.classList.remove("randomizer-flash"), 300);
  }

  getControlTargets() {
    // Return empty object as RandomizerUi doesn't provide targets to other components
    return {};
  }

  // Don't forget to update getData and setData to include the new settings
  getData() {
    return {
      settings: { ...this.settings },
      paramTargets: { ...this.paramTargets },
      exclusions: [...this.exclusions]
    };
  }

  setData(data) {
    if (!data) return false;

    try {
      // Apply settings if present
      if (data.settings) {
        Object.assign(this.settings, data.settings);
      }

      // Apply parameter targets if present
      if (data.paramTargets) {
        // Reset all current targets to true first
        for (const key in this.paramTargets) {
          this.paramTargets[key] = true;
        }

        // Apply the ones from the preset
        Object.assign(this.paramTargets, data.paramTargets);
      }

      // Apply exclusions if present
      if (data.exclusions) {
        this.exclusions = [...data.exclusions];
      }

      // Update UI
      this.updateControllerDisplays();
      this.updateParameterAvailability();
      return true;
    } catch (error) {
      console.error("Error applying Randomizer preset:", error);
      return false;
    }
  }

  updateControllerDisplays() {
    // Helper function to safely update a controller's display
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };

    safeUpdateDisplay(this.intensityController);
    safeUpdateDisplay(this.includeCheckboxesController);
    safeUpdateDisplay(this.useExclusionsController);

    // Update button color based on intensity
    this.updateButtonStyle();
  }

  // Add this helper method to clear existing parameters UI
  clearParameterUI() {
    // Remove all folders from paramFolder
    while (this.paramFolder.folders.length > 0) {
      this.paramFolder.removeFolder(this.paramFolder.folders[0]);
    }

    // Reset paramTargets object
    this.paramTargets = {};
  }
}