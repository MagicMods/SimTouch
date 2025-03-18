import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class TurbulenceUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = null;
    this.gui.title("Turbulence");
    this.initTurbulenceControls();
    this.gui.open();
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;

    const turbulenceContainer = this.gui.domElement.querySelector(".children");
    if (turbulenceContainer) {
      this.presetControls = this.presetManager.createPresetControls(
        PresetManager.TYPES.TURBULENCE,
        turbulenceContainer,
        { insertFirst: true }
      );

      // Add the button controls after the preset controls
      if (this.buttonContainer) {
        const presetElement =
          turbulenceContainer.querySelector(".preset-controls");
        if (presetElement && presetElement.nextSibling) {
          turbulenceContainer.insertBefore(
            this.buttonContainer,
            presetElement.nextSibling
          );
        } else {
          turbulenceContainer.insertBefore(
            this.buttonContainer,
            turbulenceContainer.firstChild.nextSibling
          );
        }
      }
    }

    if (this.main && this.main.turbulenceField && this.presetManager) {
      this.presetManager.setTurbulenceField(this.main.turbulenceField);
    }
  }

  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    // Initialize pullFactor if it doesn't exist (backward compatibility)
    if (turbulence.pullFactor === undefined) {
      // Convert from old format if possible
      if (turbulence.pullMode === true) {
        turbulence.pullFactor = 1.0; // Full pull mode
      } else {
        turbulence.pullFactor = 0.0; // Default to push mode
      }
    }

    // Create button group container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "turbulence-toggle-buttons";

    // Store reference to the button container
    this.buttonContainer = buttonContainer;

    // Create position button
    const posButton = document.createElement("button");
    posButton.textContent = "Position";
    posButton.className = "toggle-button";
    if (turbulence.affectPosition) posButton.classList.add("active");
    posButton.addEventListener("click", () => {
      turbulence.affectPosition = !turbulence.affectPosition;
      posButton.classList.toggle("active", turbulence.affectPosition);
    });

    // Create field button
    const fieldButton = document.createElement("button");
    fieldButton.textContent = "Scale Field";
    fieldButton.className = "toggle-button";
    if (turbulence.scaleField) fieldButton.classList.add("active");
    fieldButton.addEventListener("click", () => {
      turbulence.scaleField = !turbulence.scaleField;
      fieldButton.classList.toggle("active", turbulence.scaleField);
    });

    // Create scale button
    const scaleButton = document.createElement("button");
    scaleButton.textContent = "Scale";
    scaleButton.className = "toggle-button";
    if (turbulence.affectScale) scaleButton.classList.add("active");
    scaleButton.addEventListener("click", () => {
      turbulence.affectScale = !turbulence.affectScale;
      scaleButton.classList.toggle("active", turbulence.affectScale);

      // Toggle Scale Range folder visibility
      if (this.scaleRangeFolder) {
        if (turbulence.affectScale) {
          this.scaleRangeFolder.open();
        } else {
          this.scaleRangeFolder.close();
        }
      }
    });

    // Add buttons to container
    buttonContainer.appendChild(posButton);
    buttonContainer.appendChild(fieldButton);
    buttonContainer.appendChild(scaleButton);

    // Add the button container to the GUI children
    const guiChildren = this.gui.domElement.querySelector(".children");
    if (guiChildren) { guiChildren.insertBefore(buttonContainer, guiChildren.firstChild); }

    this.positionButton = posButton;
    this.fieldButton = fieldButton;
    this.scaleButton = scaleButton;

    this.turbulenceStrengthController = this.gui.add(turbulence, "strength", 0, 10).name("T-Strength");
    this.turbulenceScaleController = this.gui.add(turbulence, "scale", 0.01, 10, 0.01).name("T-Scale");
    this.turbulenceSpeedController = this.gui.add(turbulence, "speed", 0, 2).name("T-Speed");

    // COMBINED: Replace both controls with a single pullFactor slider from -1 to 1
    this.turbulencePullFactorController = this.gui.add(turbulence, "pullFactor", -1, 1)
      .name("T-Pull Mode")
      .onChange((value) => {
        // Optional: Add tooltip or indicator that shows the current mode
        const mode = value > 0 ? "Peak Attraction" : "Flow Following";
        // Could update a UI element here if needed
      });

    const scaleRangeFolder = this.gui.addFolder("Scale Range");
    this.scaleRangeFolder = scaleRangeFolder; // Store reference

    // Initial state of folder based on affectScale
    if (turbulence.affectScale) {
      scaleRangeFolder.open();
    } else {
      scaleRangeFolder.close();
    }

    this.turbulenceScaleStrengthController = scaleRangeFolder.add(turbulence, "scaleStrength", 0, 1).name("T-ScaleS");
    this.turbulenceMinScaleController = scaleRangeFolder.add(turbulence, "minScale", 0.1, 1.0).name("T-MinScale");
    this.turbulenceMaxScaleController = scaleRangeFolder.add(turbulence, "maxScale", 1.0, 4.0).name("T-MaxScale");

    const advancedFolder = this.gui.addFolder("Advanced");
    this.turbulenceOctavesController = advancedFolder.add(turbulence, "octaves", 1, 8, 1).name("T-Octaves");
    this.turbulencePersistenceController = advancedFolder.add(turbulence, "persistence", 0, 1).name("T-Persist");
    this.turbulenceRotationController = advancedFolder.add(turbulence, "rotation", 0, Math.PI * 2).name("T-Rot");
    this.turbulenceRotationSpeedController = advancedFolder.add(turbulence, "rotationSpeed", 0, 1).name("T-RotSpd");
    this.turbulenceDecayRateController = advancedFolder.add(turbulence, "decayRate", 0.9, 1).name("T-Decay");

    // Add geometric pattern controls folder
    const patternControlsFolder = this.gui.addFolder("Pattern Controls");
    this.patternControlsFolder = patternControlsFolder;

    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pattern-preview-container';
    previewContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
    `;
    patternControlsFolder.domElement.insertBefore(previewContainer, patternControlsFolder.domElement.firstChild);

    // Add selected pattern preview
    const selectedPreviewContainer = document.createElement('div');
    selectedPreviewContainer.className = 'selected-pattern-preview';
    selectedPreviewContainer.style.cssText = `
      width: 260px;
      height: 260px;
      border: 2px solid #666;
      margin-bottom: 10px;
      position: relative;
      cursor: pointer;
      transition: border-color 0.2s;
      padding: 20px;
    `;
    patternControlsFolder.domElement.insertBefore(selectedPreviewContainer, previewContainer);

    const selectedPreviewImg = document.createElement('img');
    selectedPreviewImg.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    selectedPreviewContainer.appendChild(selectedPreviewImg);

    // // Add play/pause indicator
    // const playIndicator = document.createElement('div');
    // playIndicator.style.cssText = `
    //   position: absolute;
    //   top: 10px;
    //   right: 10px;
    //   width: 20px;
    //   height: 20px;
    //   border-radius: 50%;
    //   background: rgba(0, 0, 0, 0.5);
    //   display: none;
    //   align-items: center;
    //   justify-content: center;
    //   color: white;
    //   /* font-size: 12px; */
    // `;
    // playIndicator.innerHTML = '▶';
    // selectedPreviewContainer.appendChild(playIndicator);

    let currentAnimationCleanup = null;
    let isPreviewAnimating = false;

    // Function to update selected preview
    const updateSelectedPreview = (animate = false) => {
      // Clean up existing animation if any
      if (currentAnimationCleanup) {
        currentAnimationCleanup();
        currentAnimationCleanup = null;
      }

      if (animate) {
        // Start animation
        currentAnimationCleanup = turbulence.generateAnimatedPreview(200, 200, turbulence.patternStyle, (dataUrl) => {
          selectedPreviewImg.src = dataUrl;
        });
        // playIndicator.style.display = 'flex';
        // playIndicator.innerHTML = '⏸';
        isPreviewAnimating = true;
      } else {
        // Just show static preview
        selectedPreviewImg.src = turbulence.generatePatternPreview(200, 200, turbulence.patternStyle);
        // playIndicator.style.display = 'flex';
        // playIndicator.innerHTML = '▶';
        isPreviewAnimating = false;
      }
    };

    // Add click handler to toggle animation
    selectedPreviewContainer.addEventListener('click', () => {
      updateSelectedPreview(!isPreviewAnimating);
    });

    // Add hover effect for preview container
    selectedPreviewContainer.addEventListener('mouseover', () => {
      selectedPreviewContainer.style.borderColor = '#fff';
    });
    selectedPreviewContainer.addEventListener('mouseout', () => {
      selectedPreviewContainer.style.borderColor = '#666';
    });

    // Pattern style selector
    this.turbulencePatternStyleController = patternControlsFolder.add(turbulence, "patternStyle")
      .name("T-PatternStyle")
      .options({
        "Organic": "",
        "Checkerboard": "checkerboard",
        "Waves": "waves",
        "Spiral": "spiral",
        "Grid": "grid",
        "Circles": "circles",
        "Maze": "maze",
        "Ripples": "ripples",
        "Starfield": "starfield"
      })
      .onChange((value) => {
        // Set organic/geometric mode based on pattern selection
        const isOrganic = value === "";
        turbulence.useOrganicNoise = isOrganic;

        // Update visibility of pattern frequency control
        if (this.turbulencePatternFrequencyController) {
          this.turbulencePatternFrequencyController.domElement.style.display = isOrganic ? "none" : "block";
        }

        // Reset parameters based on mode
        if (isOrganic) {
          if (this.turbulenceOctavesController) {
            this.turbulenceOctavesController.setValue(3);
          }
        } else {
          if (this.turbulencePatternFrequencyController) {
            this.turbulencePatternFrequencyController.setValue(6.0);
          }
        }
        // Update preview (static by default)
        updateSelectedPreview(isPreviewAnimating);
      });

    // Create preview thumbnails
    const previewSize = 80;
    const patternStyles = {
      "Organic": "",
      "Checkerboard": "checkerboard",
      "Waves": "waves",
      "Spiral": "spiral",
      "Grid": "grid",
      "Circles": "circles",
      "Maze": "maze",
      "Ripples": "ripples",
      "Starfield": "starfield"
    };

    // Create preview thumbnails
    Object.entries(patternStyles).forEach(([name, value]) => {
      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'pattern-preview';
      previewWrapper.style.cssText = `
        width: ${previewSize}px;
        height: ${previewSize}px;
        border: 1px solid #666;
        cursor: pointer;
        transition: border-color 0.2s;
        position: relative;
      `;

      const previewImg = document.createElement('img');
      previewImg.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;

      // Add title
      const title = document.createElement('div');
      title.textContent = name;
      title.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-size: 12px;
        padding: 2px;
        text-align: center;
      `;
      previewWrapper.appendChild(title);

      // Generate static preview
      previewImg.src = turbulence.generatePatternPreview(previewSize, previewSize, value);
      previewWrapper.appendChild(previewImg);

      // Add hover effect
      previewWrapper.addEventListener('mouseover', () => {
        previewWrapper.style.borderColor = '#fff';
      });
      previewWrapper.addEventListener('mouseout', () => {
        previewWrapper.style.borderColor = '#666';
      });

      // Add click handler
      previewWrapper.addEventListener('click', () => {
        turbulence.patternStyle = value;
        if (this.turbulencePatternStyleController) {
          this.turbulencePatternStyleController.setValue(value);
        }
        // Update selected preview
        updateSelectedPreview(isPreviewAnimating);
      });

      previewContainer.appendChild(previewWrapper);
    });

    // Store preview container reference
    this.patternPreviewContainer = previewContainer;

    // Pattern frequency control
    this.turbulencePatternFrequencyController = patternControlsFolder.add(turbulence, "patternFrequency", 0.1, 20)
      .name("T-PatternFreq")
      .onChange(() => {
        // Update selected preview
        updateSelectedPreview(isPreviewAnimating);
      });

    // Domain warp control - moved to pattern controls folder and always visible
    this.turbulenceDomainWarpController = patternControlsFolder.add(turbulence, "domainWarp", 0, 1)
      .name("T-DomainWarp")
      .onChange(() => {
        updateSelectedPreview(isPreviewAnimating);
      });

    // Time influence selector
    this.turbulenceTimeInfluenceController = patternControlsFolder.add(turbulence, "timeInfluence")
      .name("T-TimeInfluence")
      .options({
        "Phase": "phase",
        "Amplitude": "amplitude",
        "Frequency": "frequency"
      });

    // Hide pattern frequency control initially if in organic mode
    if (turbulence.useOrganicNoise) {
      this.turbulencePatternFrequencyController.domElement.style.display = "none";
    }

    // Restore XY bias controllers
    const biasFolder = this.gui.addFolder("Direction Bias");
    this.turbulenceBiasXController = biasFolder.add(turbulence.directionBias, "0", -1, 1).name("T-X");
    this.turbulenceBiasYController = biasFolder.add(turbulence.directionBias, "1", -1, 1).name("T-Y");

    // Add listeners for other parameters that affect the preview
    const previewAffectingControllers = [
      this.turbulencePatternFrequencyController,
      this.turbulenceSpeedController,
      this.turbulenceScaleController,
      this.turbulenceOctavesController,
      this.turbulencePersistenceController,
      this.turbulenceRotationController,
      this.turbulenceRotationSpeedController,
      this.turbulenceTimeInfluenceController,
      this.turbulenceDomainWarpController  // Add domain warp to preview-affecting controllers
    ];

    previewAffectingControllers.forEach(controller => {
      if (controller) {
        controller.onChange(() => {
          updateSelectedPreview(isPreviewAnimating);
        });
      }
    });

    // Clean up animation when folder is closed
    patternControlsFolder.domElement.addEventListener('click', (e) => {
      // Check if the click is on the folder header (which toggles the folder)
      if (e.target.closest('.folder')) {
        if (currentAnimationCleanup) {
          currentAnimationCleanup();
          currentAnimationCleanup = null;
          isPreviewAnimating = false;
          playIndicator.style.display = 'none';
        }
      }
    });

    // Initial preview (static)
    updateSelectedPreview(false);
  }

  getControlTargets() {
    const targets = {};
    const turbulence = this.main.turbulenceField;

    // Add toggle button wrappers that mimic controller interface
    if (turbulence) {
      // Position toggle wrapper
      targets["T-AfPosition"] = {
        getValue: () => turbulence.affectPosition,
        setValue: (value) => {
          turbulence.affectPosition = Boolean(value);
          if (this.positionButton) {
            this.positionButton.classList.toggle("active", turbulence.affectPosition);
          }
        }
      };

      // Scale Field toggle wrapper
      targets["T-AfScaleF"] = {
        getValue: () => turbulence.scaleField,
        setValue: (value) => {
          turbulence.scaleField = Boolean(value);
          if (this.fieldButton) {
            this.fieldButton.classList.toggle("active", turbulence.scaleField);
          }
        }
      };

      // Scale toggle wrapper
      targets["T-AfScale"] = {
        getValue: () => turbulence.affectScale,
        setValue: (value) => {
          turbulence.affectScale = Boolean(value);
          if (this.scaleButton) {
            this.scaleButton.classList.toggle("active", turbulence.affectScale);
          }

          // Update folder visibility when value changes
          if (this.scaleRangeFolder) {
            if (turbulence.affectScale) {
              this.scaleRangeFolder.open();
            } else {
              this.scaleRangeFolder.close();
            }
          }
        }
      };
    }

    // Add regular controllers
    if (this.turbulenceStrengthController) targets["T-Strength"] = this.turbulenceStrengthController;
    if (this.turbulenceScaleController) targets["T-Scale"] = this.turbulenceScaleController;
    if (this.turbulenceSpeedController) targets["T-Speed"] = this.turbulenceSpeedController;
    if (this.turbulenceScaleStrengthController) targets["T-ScaleS"] = this.turbulenceScaleStrengthController;
    if (this.turbulenceMinScaleController) targets["T-MinScale"] = this.turbulenceMinScaleController;
    if (this.turbulenceMaxScaleController) targets["T-MaxScale"] = this.turbulenceMaxScaleController;

    if (this.turbulenceOctavesController) targets["T-Octaves"] = this.turbulenceOctavesController;
    if (this.turbulencePersistenceController) targets["T-Persist"] = this.turbulencePersistenceController;
    if (this.turbulenceRotationController) targets["T-Rot"] = this.turbulenceRotationController;
    if (this.turbulenceRotationSpeedController) targets["T-RotSpd"] = this.turbulenceRotationSpeedController;
    if (this.turbulenceDecayRateController) targets["T-Decay"] = this.turbulenceDecayRateController;

    if (this.turbulenceBiasXController) targets["T-X"] = this.turbulenceBiasXController;
    if (this.turbulenceBiasYController) targets["T-Y"] = this.turbulenceBiasYController;

    // Add domain warp controller
    if (this.turbulenceDomainWarpController) targets["T-DomainWarp"] = this.turbulenceDomainWarpController;

    // Add pull mode controller
    if (this.turbulencePullFactorController) targets["T-Pull Mode"] = this.turbulencePullFactorController;

    // Add pattern control targets
    if (this.turbulencePatternStyleController) targets["T-PatternStyle"] = this.turbulencePatternStyleController;
    if (this.turbulencePatternFrequencyController) targets["T-PatternFreq"] = this.turbulencePatternFrequencyController;
    if (this.turbulenceTimeInfluenceController) targets["T-TimeInfluence"] = this.turbulenceTimeInfluenceController;

    return targets;
  }

  updateControllerDisplays() {

    const turbulence = this.main.turbulenceField;
    if (turbulence) {
      if (this.positionButton) { this.positionButton.classList.toggle("active", turbulence.affectPosition); }
      if (this.fieldButton) { this.fieldButton.classList.toggle("active", turbulence.scaleField); }
      if (this.scaleButton) { this.scaleButton.classList.toggle("active", turbulence.affectScale); }
    }

    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };

    safeUpdateDisplay(this.turbulenceStrengthController);
    safeUpdateDisplay(this.turbulenceScaleController);
    safeUpdateDisplay(this.turbulenceSpeedController);
    safeUpdateDisplay(this.turbulenceScaleStrengthController);
    safeUpdateDisplay(this.turbulenceMinScaleController);
    safeUpdateDisplay(this.turbulenceMaxScaleController);
    safeUpdateDisplay(this.turbulenceOctavesController);
    safeUpdateDisplay(this.turbulencePersistenceController);
    safeUpdateDisplay(this.turbulenceRotationController);
    safeUpdateDisplay(this.turbulenceRotationSpeedController);
    safeUpdateDisplay(this.turbulenceDecayRateController);
    safeUpdateDisplay(this.turbulenceBiasXController);
    safeUpdateDisplay(this.turbulenceBiasYController);
    safeUpdateDisplay(this.turbulenceDomainWarpController);
    safeUpdateDisplay(this.turbulencePullFactorController);
    safeUpdateDisplay(this.turbulencePatternStyleController);
    safeUpdateDisplay(this.turbulencePatternFrequencyController);
    safeUpdateDisplay(this.turbulenceTimeInfluenceController);
  }

  getData() {
    const controllers = {};
    const targets = this.getControlTargets();

    // Extract values from controllers to create a serializable object
    for (const [key, controller] of Object.entries(targets)) {
      if (controller && typeof controller.getValue === "function") {
        controllers[key] = controller.getValue();
      }
    }

    return { controllers };
  }

  setData(data) {
    if (!data || data === "None") {
      // console.log("Resetting turbulence to None preset");
      const targets = this.getControlTargets();

      // Reset all numerical values
      if (targets["T-Strength"]) targets["T-Strength"].setValue(0);
      if (targets["T-ScaleS"]) targets["T-ScaleS"].setValue(0);
      if (targets["T-X"]) targets["T-X"].setValue(0);
      if (targets["T-Y"]) targets["T-Y"].setValue(0);

      // Reset toggle buttons
      if (targets["T-AfPosition"]) targets["T-AfPosition"].setValue(false);
      if (targets["T-AfScaleF"]) targets["T-AfScaleF"].setValue(false);
      if (targets["T-AfScale"]) targets["T-AfScale"].setValue(false);

      this.updateControllerDisplays();
      return true;
    }

    // Regular preset handling
    if (!data || !data.controllers) {
      console.warn("Invalid turbulence preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Apply values from preset to controllers
      for (const [key, value] of Object.entries(data.controllers)) {
        if (targets[key] && typeof targets[key].setValue === "function") {
          targets[key].setValue(value);
        }
      }

      this.updateControllerDisplays();

      if (this.main && this.main.turbulenceField) {
        this.main.turbulenceField.setParameters(targets);
      }

      return true;
    } catch (error) {
      console.error("Error applying turbulence preset:", error);
      return false;
    }
  }
}
