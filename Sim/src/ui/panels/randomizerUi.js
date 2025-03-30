import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class RandomizerUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.intensity = 0.1;
    this.includeCheckboxes = true;
    this.useExclusions = true;
    this.targetSelectionMode = false;

    this.exclusions = [
      "Time Step",
      "Boundary Size",
      "Particle Opacity",
      "Color",
    ];

    this.controllers = {};
    this.gui.title("Randomizer");
    const titleElement = this.gui.domElement.querySelector(".title");
    titleElement.style.textAlign = "center";

    this.createRandomizeButton();
    this.createTargetSelectionButton();

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

    // Ensure we don't try to load presets before controllers are initialized
    this.presetManager.on('presetSelected', (presetName) => {
      if (Object.keys(this.controllers).length === 0 && this.modulatorManager) {
        console.log(`RandomizerUI: Initializing controllers before loading preset "${presetName}"`);
        this.initParameterTargets();
      }
    });
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

  createTargetSelectionButton() {
    // Create a container for the button
    const buttonContainer = document.createElement("div");
    buttonContainer.style.width = "100%";
    buttonContainer.style.padding = "5px 0";
    buttonContainer.style.textAlign = "center";

    // Create the button
    const targetSelectionButton = document.createElement("button");
    targetSelectionButton.textContent = "Select Targets";
    targetSelectionButton.id = "target-selection-button";
    targetSelectionButton.style.width = "100%";
    targetSelectionButton.style.fontSize = "12px";
    targetSelectionButton.style.backgroundColor = "#555";
    targetSelectionButton.style.color = "white";
    targetSelectionButton.style.border = "none";
    targetSelectionButton.style.borderRadius = "4px";
    targetSelectionButton.style.cursor = "pointer";
    targetSelectionButton.style.transition = "background-color 0.3s";
    targetSelectionButton.style.marginBottom = "10px";

    // Add hover effects
    targetSelectionButton.addEventListener("mouseenter", () => {
      targetSelectionButton.style.backgroundColor = "#777";
    });

    targetSelectionButton.addEventListener("mouseleave", () => {
      targetSelectionButton.style.backgroundColor = this.targetSelectionMode ? "#ff4444" : "#555";
    });

    // Add click handler
    targetSelectionButton.addEventListener("click", () => {
      this.toggleTargetSelectionMode();
    });

    // Add to container
    buttonContainer.appendChild(targetSelectionButton);

    // Add container to the GUI
    const guiContainer = this.gui.domElement.querySelector(".children");
    if (guiContainer) {
      // Insert after the randomize button
      const randomizeButton = guiContainer.querySelector("#randomize-all-button");
      if (randomizeButton) {
        const randomizeContainer = randomizeButton.closest("div");
        if (randomizeContainer) {
          guiContainer.insertBefore(buttonContainer, randomizeContainer.nextSibling);
        } else {
          guiContainer.insertBefore(buttonContainer, guiContainer.firstChild.nextSibling);
        }
      } else {
        guiContainer.insertBefore(buttonContainer, guiContainer.firstChild);
      }
    }

    // Store reference
    this.targetSelectionButton = targetSelectionButton;

    // Add CSS for target selection mode if not already present
    if (!document.getElementById("randomizer-target-selection-styles")) {
      const style = document.createElement("style");
      style.id = "randomizer-target-selection-styles";
      style.textContent = `
        /* General styles for target selection mode */
        body.randomizer-target-selection-mode .controller {
          opacity: 0.5;
          pointer-events: none;
        }
        
        /* Style for selectable targets */
        body.randomizer-target-selection-mode [data-is-target="true"] {
          opacity: 1;
          pointer-events: auto;
          position: relative;
          transition: background-color 0.2s, transform 0.1s;
        }
        
        /* Hover effect for selectable targets */
        body.randomizer-target-selection-mode [data-is-target="true"]:hover {
          background-color: rgba(255, 255, 100, 0.2);
          transform: scale(1.02);
        }
        
        /* Style for already selected targets */
        body.randomizer-target-selection-mode [data-is-selected="true"] {
          background-color: rgba(100, 255, 100, 0.2);
        }
        
        /* Prevent selection mode affecting randomizer UI itself */
        body.randomizer-target-selection-mode .randomizer-ui .controller {
          opacity: 1;
          pointer-events: auto;
        }
      `;
      document.head.appendChild(style);
    }
  }

  updateParameterAvailability() {
    for (const targetName in this.controllers) {
      const controller = this.findControllerByName(targetName);
      if (!controller) {
        console.warn(`RandomizerUI: Controller not found for parameter "${targetName}"`);
        continue;
      }
      controller.updateDisplay();
    }
  }

  findControllerByName(name) {
    for (const folder of this.paramFolder.folders) {
      for (const controller of folder.controllers) {
        if (controller.property === name) {
          return controller;
        }
      }
    }
    console.warn(`RandomizerUI: Controller not found with name "${name}"`);
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
      if (/^(Density|FadInSpd|FadOutSpd|Time Step|SimSpeed|VeloDamp|MaxVelocity|PicFlipRatio|Boundary|Mode)$/i.test(targetName)) return "Simulation";
      if (/^P-(Count|Size|Opacity|Color)$/i.test(targetName)) return "Particles";
      if (/^G-(X|Y)$/i.test(targetName)) return "Gravity";
      if (/^J-(X|Y|G-Strength|T-BiasStrength|SpringStrength)$/i.test(targetName)) return "Joystick";
      if (/^C-(Repulse|Bounce|Damping|RestState)$/i.test(targetName)) return "Collision";
      if (/^B-(Repulse|Friction|Size|Bounce)$/i.test(targetName)) return "Boundary";
      if (/^T-(AfPosition|AfScaleF|AfScale|Strength|Scale|Speed|Octaves|Persist|Rot|RotSpd|Pull|PullMMode|Pull Mode|Decay|ScaleS|Min Size|Max Size|X|Y|DomWarp|DomWarpSp|PatternStyle|Freq|PhaseSp|Phase|Symmetry|Blur|BiasX|BiasY|DirX|DirY|OffsetX|OffsetY|Bias Friction)$/i.test(targetName)) return "Turbulence";
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

      // Special case for Mode parameter
      if (targetName === "Mode") {
        if (Math.random() < this.intensity) {
          try {
            // Get available modes from GridField in gridRenderModes.js
            const possibleModes = [
              "--- NOISE ---",
              "Proximity",
              "ProximityB",
              "Density",
              "Velocity",
              "Pressure",
              "Vorticity",
              "Collision",
              "Overlap"
            ];

            // Get the current value
            const currentValue = controller.getValue();
            // Select a random different mode
            let newValue;
            do {
              const randomIndex = Math.floor(Math.random() * possibleModes.length);
              newValue = possibleModes[randomIndex];
            } while (newValue === currentValue && possibleModes.length > 1);

            controller.setValue(newValue);
            console.log(`Randomized Mode: ${currentValue} -> ${newValue}`);
            totalChanged++;
          } catch (err) {
            console.warn("Error randomizing Mode:", err);
          }
        }
        continue;
      }

      // Special case for T-PatternStyle parameter
      if (targetName === "T-PatternStyle") {
        if (Math.random() < this.intensity) {
          try {
            // Get available pattern styles
            const patternStyles = [
              "checkerboard", "waves", "spiral", "grid", "circles",
              "diamonds", "ripples", "dots", "voronoi", "cells",
              "fractal", "vortex", "bubbles", "water", "classicdrop"
            ];

            // Get the current value
            const currentValue = controller.getValue();

            // Select a random different style
            let newValue;
            do {
              const randomIndex = Math.floor(Math.random() * patternStyles.length);
              newValue = patternStyles[randomIndex];
            } while (newValue === currentValue && patternStyles.length > 1);

            controller.setValue(newValue);
            console.log(`Randomized T-PatternStyle: ${currentValue} -> ${newValue}`);
            totalChanged++;
          } catch (err) {
            console.warn("Error randomizing T-PatternStyle:", err);
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
    console.log("RandomizerUI: Setting data", data);

    // Initialize controllers if they don't exist yet
    if (Object.keys(this.controllers).length === 0 && this.modulatorManager) {
      console.log("RandomizerUI: Controllers not initialized yet, initializing now");
      this.initParameterTargets();
    }

    if (!data || data === "None") {
      // console.log("RandomizerUI: Setting all controllers to false");
      for (const key in this.controllers) {
        this.controllers[key] = false;
      }
      this.updateParameterAvailability();
      setTimeout(() => this.applyFlexLayoutToParameters(), 0);
      return true;
    }

    if (data === "All") {
      // console.log("RandomizerUI: Setting all controllers to true");
      for (const key in this.controllers) {
        this.controllers[key] = true;
      }
      this.updateParameterAvailability();
      setTimeout(() => this.applyFlexLayoutToParameters(), 0);
      return true;
    }

    // Normal case handling with object containing controllers
    try {
      if (!data.controllers) {
        console.error("RandomizerUI: No controllers found in preset data", data);
        return false;
      }

      // Reset all to false first
      for (const key in this.controllers) {
        this.controllers[key] = false;
      }

      // Track what we're applying
      let appliedCount = 0;
      let missingCount = 0;

      // Apply the ones from the preset
      for (const key in data.controllers) {
        if (this.controllers.hasOwnProperty(key)) {
          this.controllers[key] = data.controllers[key];
          // console.log(`RandomizerUI: Applied preset value for "${key}": ${data.controllers[key]}`);
          appliedCount++;
        } else {
          // console.warn(`RandomizerUI: Preset contains controller "${key}" that doesn't exist in current setup`);
          missingCount++;
        }
      }

      console.log(`RandomizerUI: Applied ${appliedCount} controller values, ${missingCount} were missing`);

      this.updateParameterAvailability();
      setTimeout(() => this.applyFlexLayoutToParameters(), 0);
      return true;
    } catch (error) {
      console.error("Error applying Randomizer preset:", error);
      return false;
    }
  }

  getData() {
    console.log("RandomizerUI: Getting data from controllers");

    // Make sure we're capturing the actual state
    const controllerState = {};

    // Loop through all our controller references
    for (const targetName in this.controllers) {
      controllerState[targetName] = this.controllers[targetName];
      // console.log(`RandomizerUI: Saving state for "${targetName}": ${this.controllers[targetName]}`);
    }

    return {
      controllers: controllerState
    };
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

  toggleTargetSelectionMode() {
    this.targetSelectionMode = !this.targetSelectionMode;

    // Update button appearance
    const button = this.targetSelectionButton;
    if (button) {
      button.textContent = this.targetSelectionMode ? "Confirm Selection" : "Select Targets";
      button.style.backgroundColor = this.targetSelectionMode ? "#ff4444" : "#555";
    }

    // Toggle the body class for styling
    if (this.targetSelectionMode) {
      console.log("Entering target selection mode");
      this.markRandomizerControls();
      document.body.classList.add('randomizer-target-selection-mode');
      this.highlightValidTargets();

      // Add click listener with capture phase
      document.removeEventListener('click', this.handleTargetSelection, true);
      document.addEventListener('click', this.handleTargetSelection, true);
    } else {
      console.log("Exiting target selection mode");
      document.body.classList.remove('randomizer-target-selection-mode');
      this.clearTargetHighlights();

      // Remove click listener
      document.removeEventListener('click', this.handleTargetSelection, true);
    }
  }

  markRandomizerControls() {
    // Mark the randomizer UI to prevent it from being affected by selection mode
    const randomizerElements = document.querySelectorAll('.lil-gui');
    randomizerElements.forEach(element => {
      if (element.contains(this.gui.domElement)) {
        element.classList.add('randomizer-ui');
      }
    });
  }

  highlightValidTargets() {
    // Get all registered target names
    const validTargetNames = this.modulatorManager ? this.modulatorManager.getTargetNames() : [];

    // Skip excluded parameters
    const effectiveTargetNames = validTargetNames.filter(name => !this.exclusions.includes(name));

    // For each controller, add highlight only if it's a valid target
    const controllers = document.querySelectorAll('.controller:not(.randomizer-ui .controller)');
    controllers.forEach(controller => {
      const nameElement = controller.querySelector('.name');
      if (nameElement) {
        const controllerName = nameElement.textContent.trim();
        const isValidTarget = effectiveTargetNames.includes(controllerName);

        // Add data attributes for targeting CSS
        controller.setAttribute('data-is-target', isValidTarget ? 'true' : 'false');

        // Mark already selected parameters
        if (isValidTarget && this.controllers[controllerName]) {
          controller.setAttribute('data-is-selected', 'true');
        } else {
          controller.setAttribute('data-is-selected', 'false');
        }
      }
    });

    console.log(`Highlighted ${effectiveTargetNames.length} valid targets for selection`);
  }

  clearTargetHighlights() {
    // Remove all data attributes we added
    const controllers = document.querySelectorAll('[data-is-target], [data-is-selected]');
    controllers.forEach(controller => {
      controller.removeAttribute('data-is-target');
      controller.removeAttribute('data-is-selected');
    });
  }

  handleTargetSelection = (e) => {
    if (!this.targetSelectionMode) return;

    // Find the clicked element
    let element = e.target;

    // Ignore clicks on the selection button itself
    if (element === this.targetSelectionButton) {
      return;
    }

    // Find the controller element
    while (element && !element.classList.contains('controller')) {
      element = element.parentElement;
    }

    if (!element) return;

    // Check if this is a valid target
    if (element.getAttribute('data-is-target') !== 'true') {
      return;
    }

    // Find the target name
    const nameElement = element.querySelector('.name');
    if (!nameElement) return;

    const targetName = nameElement.textContent.trim();
    if (!targetName) return;

    // Toggle selection state
    const isCurrentlySelected = element.getAttribute('data-is-selected') === 'true';
    const newState = !isCurrentlySelected;

    console.log(`${newState ? 'Selected' : 'Deselected'} target: ${targetName}`);

    // Update visual state
    element.setAttribute('data-is-selected', newState ? 'true' : 'false');

    // Update internal state
    this.controllers[targetName] = newState;

    // Find and update the checkbox in the parameters folder
    for (const folder of this.paramFolder.folders) {
      for (const controller of folder.controllers) {
        if (controller.property === targetName) {
          controller.setValue(newState);
          break;
        }
      }
    }

    // Stop event propagation to prevent other click handlers
    e.stopPropagation();
  }
}