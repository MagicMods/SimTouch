import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class RandomizerUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.intensity = 0.1;
    this.includeCheckboxes = true;
    this.useExclusions = true;

    this.exclusions = [
      "Time Step",
      "Boundary Size",
      "Particle Opacity",
      "Color",
      "T-PatternStyle",
      "Mode",
    ];

    this.controllers = {};
    this.gui.title("Randomizer");
    const titleElement = this.gui.domElement.querySelector(".title");
    titleElement.style.textAlign = "center";

    this.createRandomizeButton();

    this.intensityController = this.gui
      .add(this, "intensity", 0, 1)
      .name("Intensity")
      .onChange(() => this.updateButtonStyle());
    this.paramFolder = this.gui.addFolder("Parameters");

    this.paramFolder.close();
    this.gui.open(false);
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.presetControls = this.presetManager.createPresetControls(
      PresetManager.TYPES.RANDOMIZER,
      this.paramFolder.domElement,
      { insertFirst: true }
    );
  }

  setModulatorManager(modulatorManager) {
    this.modulatorManager = modulatorManager;
    // console.log("RandomizerUi initialized with preset manager");

    if (this.presetManager && Object.keys(this.controllers).length === 0) {
      this.initParameterTargets();
    }
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
    for (const targetName in this.controllers) {
      const controller = this.findControllerByName(targetName);
      controller.updateDisplay();
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
      componentFolder.open(true);

      for (const targetName of categorizedTargets[category]) {
        // All parameters start unchecked
        this.controllers[targetName] = false;

        // Add controller to the folder
        componentFolder.add(this.controllers, targetName).name(targetName);
      }
    }

    // Log how many parameters were excluded
    const excludedCount = targetNames.length - filteredTargetNames.length;
    if (excludedCount > 0) {
      console.log(`RandomizerUI: Excluded ${excludedCount} parameters from randomization`);
    }

    // Apply flex layout after creating all parameters
    setTimeout(() => this.applyFlexLayoutToParameters(), 0);
  }

  categorizeTargets(targetNames) {
    const categorizedTargets = {};

    const getComponentName = (targetName) => {
      if (/^(Density|FadInSpd|FadOutSpd|Time Step|SimSpeed|VeloDamp|MaxVelocity|PicFlipRatio|Boundary)$/i.test(targetName)) return "Simulation";
      if (/^P-(Count|Size|Opacity|Color)$/i.test(targetName)) return "Particles";
      if (/^G-(X|Y)$/i.test(targetName)) return "Gravity";
      if (/^J-(X|Y|G-Strength|T-BiasStrength|SpringStrength)$/i.test(targetName)) return "Joystick";
      if (/^C-(Repulse|Bounce|Damping|RestState)$/i.test(targetName)) return "Collision";
      if (/^B-(Repulse|Friction|Size|Bounce)$/i.test(targetName)) return "Boundary";
      if (/^T-(AfPosition|AfScaleF|AfScale|Strength|Scale|Speed|Octaves|Persist|Rot|RotSpd|Pull|PullMMode|Pull Mode|Decay|ScaleS|MinScale|MaxScale|X|Y|DomWarp|DomWarpSp|PatternStyle|Freq|PhaseSp|Phase|Sym|Blur|BiasX|BiasY|DirX|DirY|OffsetX|OffsetY|Bias Friction)$/i.test(targetName)) return "Turbulence";
      if (/^V-(Strength|EdgeWidth|Attract|PullMode|Pull Mode|Cell(Count|Speed)|Decay|ForceBlend)$/i.test(targetName)) return "Voronoi";
      if (/^F-(Radius|SurfaceT|Visco|Damp)$/i.test(targetName)) return "Organic Fluid";
      if (/^S-(Radius|Cohesion|Align|Separation|MaxSpeed)$/i.test(targetName)) return "Organic Swarm";
      if (/^A-(Radius|Repulse|Attract|Threshold)$/i.test(targetName)) return "Organic Automata";
      if (/^Ch-(LinkDist|LinkStr|Align|Branch|MaxLinks|MaxLen|Repel)$/i.test(targetName)) return "Organic Chain";
      if (/^RS-(VeloTH|PosTH)$/i.test(targetName)) return "Rest State";
      if (/^O-(Force|Radius)$/i.test(targetName)) return "Organic";
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

  randomizeAll() {
    if (!this.modulatorManager) {
      console.error("RandomizerUI: Cannot randomize, ModulatorManager not set");
      return { success: false, totalChanged: 0 };
    }

    let totalChanged = 0;
    const targets = this.modulatorManager.targets;

    for (const targetName in this.controllers) {
      // Skip if parameter isn't selected
      if (!this.controllers[targetName]) {
        continue;
      }

      // In case the exclusions list changed after initialization
      if (this.useExclusions && this.exclusions.includes(targetName)) {
        continue;
      }

      const target = targets[targetName];
      if (!target || !target.controller) {
        continue;
      }

      const controller = target.controller;

      // Special case for Boundary parameter
      if (targetName === "Boundary") {
        if (Math.random() < this.intensity) {
          try {
            // Get the current value
            const currentValue = controller.getValue();
            // Toggle between "BOUNCE" and "WARP"
            const newValue = currentValue === "BOUNCE" ? "WARP" : "BOUNCE";
            controller.setValue(newValue);
            console.log(`Randomized Boundary: ${currentValue} -> ${newValue}`);
            totalChanged++;
          } catch (err) {
            console.warn("Error randomizing Boundary:", err);
          }
        }
        continue;
      }

      // Special handling for slider-type controllers
      if (this._isSlider(controller)) {
        // Skip if it's a pattern style or other special case
        if (targetName === "T-PatternStyle") {
          continue;
        }

        const success = this._randomizeController(controller, target);
        if (success) {
          totalChanged++;
        }
      }
      // For boolean/checkbox type controllers
      else if (
        this.includeCheckboxes &&
        this._isCheckbox(controller)
      ) {
        if (Math.random() < this.intensity) {
          const currentValue = controller.getValue();
          controller.setValue(!currentValue);
          totalChanged++;
        }
      }
      // For dropdown/select controllers
      else if (this._isDropdown(controller)) {
        if (Math.random() < this.intensity) { // Use intensity as probability
          const success = this._randomizeDropdownController(controller);
          if (success) {
            totalChanged++;
          }
        }
      }
      // Skip other controller types
      else {
        console.log(`Skipping randomization for non-supported controller type: ${targetName}`);
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

  _isDropdown(controller) {
    if (!controller || typeof controller.getValue !== "function") {
      return false;
    }

    // Check if controller has options property or is a select type
    return controller.options !== undefined ||
      (typeof controller.getValue() === "string" &&
        controller.__select !== undefined);
  }

  _randomizeDropdownController(controller) {
    try {
      // Get available options either from controller.options or __select options
      let options;
      if (controller.options) {
        options = Object.values(controller.options);
      } else if (controller.__select) {
        options = Array.from(controller.__select.options).map(opt => opt.value);
      } else {
        return false;
      }

      if (options.length < 2) return false; // Need at least 2 options to randomize

      // Pick a random option
      const randomIndex = Math.floor(Math.random() * options.length);
      const newValue = options[randomIndex];

      // Set the new value
      controller.setValue(newValue);

      // Update display
      if (typeof controller.updateDisplay === "function") {
        controller.updateDisplay();
      }

      return true;
    } catch (err) {
      console.warn(`Error randomizing dropdown: ${err}`);
      return false;
    }
  }

  _randomizeController(controller, target) {
    try {
      const currentValue = controller.getValue();
      const targetName = target.name;

      // Special case for pattern style - already excluded in constructor
      if (targetName === "T-PatternStyle") {
        console.log("Pattern Style randomization skipped - use presets instead");
        return false;
      }

      // Get range from target info
      let min = target.min !== undefined ? target.min : 0;
      let max = target.max !== undefined ? target.max : 1;

      // Calculate range
      const range = max - min;

      // Calculate random offset based on intensity
      const randomFactor = (Math.random() * 2 - 1) * this.intensity;
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
    const intensity = this.intensity;

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
    // We need to return the actual controllers, not just the boolean values
    const targets = {};

    // Search through all parameter folders to find controllers
    for (const folder of this.paramFolder.folders) {
      for (const controller of folder.controllers) {
        // The property name will match the parameter name
        const paramName = controller.property;

        // Only include controllers for parameters in our controllers
        if (this.controllers.hasOwnProperty(paramName)) {
          targets[paramName] = controller;
        }
      }
    }

    return targets;
  }

  setData(data) {
    console.warn("RandomizerUI: Setting data", data);
    if (!data || data === "None") {
      for (const key in this.controllers) {
        this.controllers[key] = false;
        console.log(`Setting ${key} to false`);
      }
      this.updateParameterAvailability();
      setTimeout(() => this.applyFlexLayoutToParameters(), 0);
      return true;
    }

    if (data === "All") {
      // Set all parameters to true
      console.warn("Setting all parameters to true");
      for (const key in this.controllers) {
        this.controllers[key] = true;
        console.log(`Setting ${key} to true`);
      }
      this.updateParameterAvailability();
      setTimeout(() => this.applyFlexLayoutToParameters(), 0);
      return true;
    }

    // Normal case handling with object containing controllers
    try {
      if (data.controllers) {
        // Reset all to false first
        for (const key in this.controllers) {
          this.controllers[key] = false;
        }
        // Apply the ones from the preset
        Object.assign(this.controllers, data.controllers);
      } else {
        console.warn("RandomizerUI: No controllers found in preset data");
      }

      this.updateParameterAvailability();
      setTimeout(() => this.applyFlexLayoutToParameters(), 0);
      return true;
    } catch (error) {
      console.error("Error applying Randomizer preset:", error);
      return false;
    }
  }

  getData() {
    return {
      controllers: this.controllers
    }
  }

  updateControllerDisplays() {
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
    this.updateButtonStyle();

    for (const folder of this.paramFolder.folders) {
      for (const controller of folder.controllers) {
        safeUpdateDisplay(controller);
      }
    }
  }

  clearParameterUI() {
    // Remove all folders from paramFolder
    while (this.paramFolder.folders.length > 0) {
      this.paramFolder.removeFolder(this.paramFolder.folders[0]);
    }
    this.controllers = {};
  }

  applyFlexLayoutToParameters() {
    // Apply flex layout to each category folder
    this.paramFolder.folders.forEach(folder => {
      const containerEl = folder.domElement.querySelector('.children');
      if (!containerEl) return;

      containerEl.classList.add('parameter-flex-container');

      const controllerEls = containerEl.querySelectorAll('.controller');
      controllerEls.forEach(el => {
        el.classList.add('parameter-checkbox-item');
      });
      // console.log(`Applied flex layout to folder ${folder.title}, found ${controllerEls.length} controllers`);
    });
  }
}