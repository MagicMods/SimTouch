import { BaseUi } from "../baseUi.js";

export class RandomizerUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Store reference to main
    this.main = main;

    console.log("RandomizerUi constructor - this.main:", this.main);

    // Settings with defaults
    this.settings = {
      intensity: 0.5,
      includeCheckboxes: false,
    };

    // Tracking which parameter targets to randomize (will be populated later)
    this.paramTargets = {};

    // Initialize UI
    this.gui.title("Randomizer");

    // Delay initialization since we're created inside UiManager constructor
    // and need UiManager to be fully constructed before we access it
    setTimeout(() => {
      // Get a reference to UiManager or ModulatorManager
      const uiManager = this.getUiManager();
      console.log("RandomizerUi delayed init - uiManager found:", !!uiManager);

      if (uiManager) {
        this.initRandomizerControls(uiManager);
      } else {
        console.error("RandomizerUi: Failed to find UiManager after delay");

        // Add error message to GUI
        const errorDiv = document.createElement("div");
        errorDiv.textContent =
          "Error: UiManager not found. Randomizer may not work properly.";
        errorDiv.style.padding = "10px";
        errorDiv.style.color = "red";

        const guiContainer = this.gui.domElement.querySelector(".children");
        if (guiContainer) {
          guiContainer.appendChild(errorDiv);
        }
      }
    }, 1000);

    // Open GUI by default
    this.gui.open();
  }

  /**
   * Try different methods to get access to the UiManager
   */
  getUiManager() {
    // First try the standard approach - it might be assigned by now
    if (this.main.uiManager) {
      return this.main.uiManager;
    }

    // Next, make an educated guess - 'this' is created by the UiManager,
    // so the UiManager should be in the closure scope for events
    try {
      // The UiManager instance that created us should be accessible
      // as "this" in the parent scope
      const thisObj = this;

      // Find the UiManager from the constructor's context
      if (thisObj && thisObj.__proto__ && thisObj.__proto__.constructor) {
        const constructorName = thisObj.__proto__.constructor.name;
        console.log("Constructor name:", constructorName);
      }

      // Another approach: look for UiManager properties in main
      for (const key in this.main) {
        const value = this.main[key];
        if (
          value &&
          value.constructor &&
          value.constructor.name === "UiManager"
        ) {
          console.log("Found UiManager at main." + key);
          return value;
        }
      }
    } catch (e) {
      console.log("Error trying to find UiManager:", e);
    }

    return null;
  }

  /**
   * Initialize controls with UiManager reference
   */
  initRandomizerControls(uiManager) {
    // Store reference to UiManager
    this.uiManager = uiManager;

    // Create the main randomize button directly in the UI
    this.createRandomizeButton();

    // Settings folder for global settings
    const settingsFolder = this.gui.addFolder("Settings");

    // Intensity slider
    this.intensityController = settingsFolder
      .add(this.settings, "intensity", 0, 1)
      .name("Intensity")
      .onChange(() => this.updateButtonStyle());

    this.includeCheckboxesController = settingsFolder
      .add(this.settings, "includeCheckboxes")
      .name("Include Toggles");

    // Initialize Parameters folder with all available targets
    this.initParameterTargets();
  }

  /**
   * Create main randomize button directly in the GUI root
   */
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

  /**
   * Initialize parameter targets directly from ModulatorManager
   */
  initParameterTargets() {
    console.log("RandomizerUi: Initializing parameter targets");

    // Create the parameters folder
    const paramFolder = this.gui.addFolder("Parameters");
    paramFolder.close(); // Closed by default as it can be large

    // Try to get ModulatorManager from main
    const modulatorManager = this.main.modulatorManager;
    if (!modulatorManager) {
      console.error("RandomizerUI: ModulatorManager not found");
      return;
    }

    // Get all available targets from the ModulatorManager
    const targets = modulatorManager.targets;
    if (!targets || Object.keys(targets).length === 0) {
      console.warn("RandomizerUI: No targets found in ModulatorManager");
      return;
    }

    console.log("RandomizerUI: Found targets:", Object.keys(targets));

    // Group targets by component for better organization
    const categorizedTargets = {};

    // Function to extract component name from target name
    const getComponentName = (targetName) => {
      // Try to identify component from target name using pattern matching
      if (/Particle|Size|Opacity/i.test(targetName)) return "Particles";
      if (/Gravity|Force/i.test(targetName)) return "Gravity";
      if (/Collision|Repulsion|Bounce/i.test(targetName)) return "Collision";
      if (/Boundary|Wall/i.test(targetName)) return "Boundary";
      if (/Turbulence|Scale|Octave|Noise/i.test(targetName))
        return "Turbulence";
      if (/Voronoi|Cell|Edge/i.test(targetName)) return "Voronoi";
      if (/Organic|Fluid|Swarm|Automata/i.test(targetName)) return "Organic";
      if (/Velocity|Time|Speed|Animation/i.test(targetName))
        return "Simulation";
      return "Other";
    };

    // Categorize all targets
    for (const targetName in targets) {
      const component = getComponentName(targetName);
      if (!categorizedTargets[component]) {
        categorizedTargets[component] = {};
      }
      // Initialize all targets as selected (true)
      this.paramTargets[targetName] = true;
      // Store in categorized structure for UI organization
      categorizedTargets[component][targetName] = true;
    }

    // Create a subfolder for each component
    for (const component in categorizedTargets) {
      const componentFolder = paramFolder.addFolder(component);
      componentFolder.close(); // Closed by default

      // Add checkbox for each parameter in this component
      for (const paramName in categorizedTargets[component]) {
        componentFolder.add(this.paramTargets, paramName).name(paramName);
      }
    }
  }

  /**
   * Randomize all selected parameters
   */
  randomizeAll() {
    console.log("RandomizerUI: Starting randomization");

    // Get ModulatorManager
    const modulatorManager = this.main.modulatorManager;
    if (!modulatorManager) {
      console.error(
        "RandomizerUI: Cannot randomize, ModulatorManager not found"
      );
      return { success: false, totalChanged: 0 };
    }

    let totalChanged = 0;

    // Get all available targets from the ModulatorManager
    const targets = modulatorManager.targets;

    // Randomize all selected targets
    for (const targetName in this.paramTargets) {
      // Skip if target is not selected for randomization
      if (!this.paramTargets[targetName]) {
        continue;
      }

      // Get target info
      const target = targets[targetName];
      if (!target || !target.controller) {
        continue;
      }

      // Randomize this controller if it's a slider
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
        // Randomize checkboxes if that option is enabled
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

  /**
   * Check if a controller is a slider
   * @private
   */
  _isSlider(controller) {
    if (!controller || typeof controller.getValue !== "function") {
      return false;
    }

    // Check if it has a numeric value
    const value = controller.getValue();
    return typeof value === "number";
  }

  /**
   * Check if a controller is a checkbox
   * @private
   */
  _isCheckbox(controller) {
    if (!controller || typeof controller.getValue !== "function") {
      return false;
    }

    // Check if it has a boolean value
    const value = controller.getValue();
    return typeof value === "boolean";
  }

  /**
   * Randomize a specific controller
   * @private
   */
  _randomizeController(controller, target) {
    try {
      // Get current value
      const currentValue = controller.getValue();

      // Get range from target info
      let min = target.min !== undefined ? target.min : 0;
      let max = target.max !== undefined ? target.max : 1;

      // If min/max aren't available, try to get them from controller
      if (controller.__min !== undefined) min = controller.__min;
      if (controller.__max !== undefined) max = controller.__max;

      // Calculate range
      const range = max - min;

      // Calculate random offset based on intensity
      const randomFactor = (Math.random() * 2 - 1) * this.settings.intensity;
      let offset = range * randomFactor;

      // Apply offset to current value
      let newValue = currentValue + offset;

      newValue = Math.max(min, Math.min(max, newValue));

      // If the value is likely an integer (based on current value or property name)
      if (
        Number.isInteger(currentValue) ||
        /count|particles|octaves/i.test(target.name)
      ) {
        newValue = Math.round(newValue);
      }

      // Update the controller
      controller.setValue(newValue);

      // Make sure display is updated
      if (typeof controller.updateDisplay === "function") {
        controller.updateDisplay();
      }

      console.log(`Randomized ${target.name}: ${currentValue} → ${newValue}`);
      return true;
    } catch (err) {
      console.warn(`Error randomizing ${target?.name || "unknown"}:`, err);
      return false;
    }
  }

  /**
   * Update the button style based on intensity
   */
  updateButtonStyle() {
    if (!this.randomizeButton) return;

    this.randomizeButton.style.backgroundColor = this.getButtonColor();
  }

  /**
   * Get button color based on intensity
   */
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

  /**
   * Add flash effect to button
   */
  flashButton(button) {
    button.classList.add("randomizer-flash");
    setTimeout(() => button.classList.remove("randomizer-flash"), 300);
  }

  /**
   * Standard method for getting control targets - implements BaseUI interface
   */
  getControlTargets() {
    const targets = {};

    return targets;
  }

  /**
   * Standard method for data extraction - implements BaseUI interface
   */
  getData() {
    return {
      settings: { ...this.settings },
      paramTargets: { ...this.paramTargets },
    };
  }

  /**
   * Standard method for data application - implements BaseUI interface
   */
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

      // Update UI
      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying Randomizer preset:", error);
      return false;
    }
  }

  /**
   * Standard method for updating controller displays - implements BaseUI interface
   */
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

    // Update button color based on intensity
    this.updateButtonStyle();
  }
}
