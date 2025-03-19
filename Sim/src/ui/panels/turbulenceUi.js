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

    // Add geometric pattern controls folder
    const noiseFolder = this.gui.addFolder("Noise");
    this.noiseFolder = noiseFolder;

    // Create Previews folder
    const previewsFolder = noiseFolder.addFolder("Previews");
    this.previewsFolder = previewsFolder;

    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pattern-preview-container';
    previewContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
    `;
    // Add the preview container to the folder's content area
    const previewsContent = previewsFolder.domElement.querySelector('.children');
    if (previewsContent) {
      previewsContent.appendChild(previewContainer);
    }

    // Create Pattern Control folder
    const patternControlsFolder = noiseFolder.addFolder("Pattern Control");
    this.patternControlsFolder = patternControlsFolder;

    // Pattern style selector
    this.turbulencePatternStyleController = patternControlsFolder.add(turbulence, "patternStyle")
      .name("T-PatternStyle")
      .options({
        "Checkerboard": "checkerboard",
        "Waves": "waves",
        "Spiral": "spiral",
        "Grid": "grid",
        "Circles": "circles",
        "Maze": "maze",
        "Ripples": "ripples",
        "Starfield": "starfield",
        "Voronoi": "voronoi",
        "Fractal": "fractal",
        "Vortex": "vortex",
        "Bubbles": "bubbles"
      })
      .onChange((value) => {
        selectedThumbnailValue = value;
        refreshThumbnails(true);  // Start animation when pattern changes
      });
    this.turbulencePatternStyleController.domElement.classList.add("full-width");

    // Add rotation controls to pattern control folder
    this.turbulenceRotationController = patternControlsFolder.add(turbulence, "rotation", 0, Math.PI * 2).name("T-Rot");
    this.turbulenceRotationSpeedController = patternControlsFolder.add(turbulence, "rotationSpeed", 0, 1).name("T-RotSpd");
    this.turbulenceDecayRateController = patternControlsFolder.add(turbulence, "decayRate", 0.9, 1).name("T-Decay");

    // Add Pattern Offset folder
    const patternOffsetFolder = patternControlsFolder.addFolder("Pattern Offset");
    this.patternOffsetFolder = patternOffsetFolder;

    // Add offset X and Y controls
    this.turbulenceOffsetXController = patternOffsetFolder.add(turbulence, "patternOffsetX", -1, 1, 0.01).name("T-OffsetX");
    this.turbulenceOffsetYController = patternOffsetFolder.add(turbulence, "patternOffsetY", -1, 1, 0.01).name("T-OffsetY");

    // Add Bias Speed folder
    const biasSpeedFolder = patternOffsetFolder.addFolder("Bias Speed");
    this.biasSpeedFolder = biasSpeedFolder;

    // Add bias speed controls
    this.turbulenceBiasXController = biasSpeedFolder.add(turbulence, "biasSpeedX", -1, 1, 0.01).name("T-BiasX");
    this.turbulenceBiasYController = biasSpeedFolder.add(turbulence, "biasSpeedY", -1, 1, 0.01).name("T-BiasY");
    this.turbulenceBiasSpeedController = biasSpeedFolder.add(turbulence, "biasSpeed", 0, 2, 0.01).name("T-BiasSp");

    // Make sure folders are open by default
    patternOffsetFolder.open();

    let currentAnimationCleanup = null;
    let selectedThumbnailValue = null;
    let thumbnailAnimationCleanups = new Map();
    const previewSize = 76;  // Define previewSize here

    // Function to refresh all thumbnails
    const refreshThumbnails = (animate = false) => {
      // Clean up any existing animations first
      thumbnailAnimationCleanups.forEach(cleanup => cleanup());
      thumbnailAnimationCleanups.clear();

      const thumbnails = previewContainer.querySelectorAll('.pattern-preview img');
      thumbnails.forEach((thumbnail, index) => {
        const patternValue = Object.values(patternStyles)[index];
        if (animate && patternValue === selectedThumbnailValue) {
          // Start animation for selected thumbnail
          const cleanup = turbulence.generateAnimatedPreview(previewSize, previewSize, patternValue, (dataUrl) => {
            thumbnail.src = dataUrl;
          });
          thumbnailAnimationCleanups.set(patternValue, cleanup);
        } else {
          // Static preview for others
          thumbnail.src = turbulence.generatePatternPreview(previewSize, previewSize, patternValue);
        }
      });
    };

    // Create preview thumbnails
    const patternStyles = {
      "Checkerboard": "checkerboard",
      "Waves": "waves",
      "Spiral": "spiral",
      "Grid": "grid",
      "Circles": "circles",
      "Maze": "maze",
      "Ripples": "ripples",
      "Starfield": "starfield",
      "Voronoi": "voronoi",
      "Fractal": "fractal",
      "Vortex": "vortex",
      "Bubbles": "bubbles"
    };

    // Create preview thumbnails
    Object.entries(patternStyles).forEach(([name, value]) => {
      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'pattern-preview';
      previewWrapper.setAttribute('data-pattern', value);  // Add data-pattern attribute
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

      // Add title first
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

      // Generate initial preview
      previewImg.src = turbulence.generatePatternPreview(previewSize, previewSize, value);
      previewWrapper.appendChild(previewImg);

      // Add hover effect
      previewWrapper.addEventListener('mouseover', () => {
        if (value !== selectedThumbnailValue) {
          previewWrapper.style.borderColor = '#fff';
        }
      });
      previewWrapper.addEventListener('mouseout', () => {
        if (value !== selectedThumbnailValue) {
          previewWrapper.style.borderColor = '#666';
        }
      });

      // Add click handler
      let isThisThumbnailAnimating = true;  // Start with animation enabled
      previewWrapper.addEventListener('click', () => {
        if (selectedThumbnailValue !== value) {
          // Stop any existing animations
          thumbnailAnimationCleanups.forEach(cleanup => cleanup());
          thumbnailAnimationCleanups.clear();

          // Update pattern
          turbulence.patternStyle = value;
          selectedThumbnailValue = value;
          if (this.turbulencePatternStyleController) {
            this.turbulencePatternStyleController.setValue(value);
          }
          isThisThumbnailAnimating = true;  // Keep animation active
          refreshThumbnails(true);

          // Update title visibility - show for all, hide for selected
          previewContainer.querySelectorAll('.pattern-preview').forEach(thumb => {
            thumb.querySelector('div').style.display = 'block';  // Show title for unselected
          });
          previewWrapper.querySelector('div').style.display = 'none';  // Hide title for selected
        } else {
          // Toggle animation
          isThisThumbnailAnimating = !isThisThumbnailAnimating;
          refreshThumbnails(isThisThumbnailAnimating);
        }
      });

      previewContainer.appendChild(previewWrapper);
    });

    // Store preview container reference
    this.patternPreviewContainer = previewContainer;

    // Set initial selected pattern and start animation
    selectedThumbnailValue = turbulence.patternStyle;

    // Hide title for selected pattern
    const selectedThumbnail = previewContainer.querySelector(`.pattern-preview[data-pattern="${turbulence.patternStyle}"]`);
    if (selectedThumbnail) {
      selectedThumbnail.querySelector('div').style.display = 'none';
    }

    // Start animation for selected pattern
    refreshThumbnails(true);

    // Create button group container for time influence controls
    const timeInfluenceContainer = document.createElement("div");
    timeInfluenceContainer.className = "time-influence-toggle-buttons";
    timeInfluenceContainer.style.cssText = `
      display: flex;
      gap: 5px;
      margin-bottom: 10px;
    `;

    // Domain warp control
    this.turbulenceDomainWarpController = patternControlsFolder.add(turbulence, "domainWarp", 0, 1)
      .name("T-DomWarp")
      .onChange(() => {
        refreshThumbnails(true);  // Keep animation when warp changes
      });

    // Add domain warp speed control
    this.turbulenceDomainWarpSpeedController = patternControlsFolder.add(turbulence, "domainWarpSpeed", 0, 2, 0.1)
      .name("T-DomWarpSp")
      .onChange(() => {
        refreshThumbnails(true);
      });

    // Add symmetry amount control
    this.turbulenceSymmetryController = patternControlsFolder.add(turbulence, "symmetryAmount", 0, 1, 0.01)
      .name("T-Sym")
      .onChange(() => {
        refreshThumbnails(true);
      });

    // Pattern frequency control (always visible)
    this.turbulencePatternFrequencyController = patternControlsFolder.add(turbulence, "patternFrequency", 0.01, 4, 0.01)
      .name("T-Freq")
      .onChange(() => {
        refreshThumbnails(true);  // Keep animation when frequency changes
      });

    // Add static phase control
    this.turbulenceStaticPhaseController = patternControlsFolder.add(turbulence, "phase", 0, 1, 0.01)
      .name("T-Phase")
      .onChange(() => {
        refreshThumbnails(true);
      });

    // Add phase speed control
    this.turbulencePhaseController = patternControlsFolder.add(turbulence, "phaseSpeed", -1, 1, 0.1)
      .name("T-PhaseSp")
      .onChange(() => {
        refreshThumbnails(true);
      });

    // Add Pattern Contrast and Separation folder
    const contrastFolder = patternControlsFolder.addFolder("Contrast & Separation");
    this.contrastFolder = contrastFolder;

    // Add contrast controls
    this.turbulenceContrastController = contrastFolder.add(turbulence, "contrast", 0, 1, 0.01)
      .name("T-Contrast")
      .onChange(() => {
        refreshThumbnails(true);
      });

    this.turbulenceContrastSpeedController = contrastFolder.add(turbulence, "contrastSpeed", 0, 1, 0.01)
      .name("T-ContSp")
      .onChange(() => {
        refreshThumbnails(true);
      });

    // Add separation control 
    this.turbulenceSeparationController = contrastFolder.add(turbulence, "separation", 0, 1, 0.01)
      .name("T-Separation")
      .onChange(() => {
        refreshThumbnails(true);
      });

    // Make contrast folder open by default
    contrastFolder.open();

    // Add listener for T-Speed changes to update control behavior
    this.turbulenceSpeedController.onChange(() => {
      refreshThumbnails(true);
    });

    // Restore XY bias controllers
    const biasFolder = this.gui.addFolder("Direction Bias");
    this.turbulenceDirectionBiasXController = biasFolder.add(turbulence.directionBias, "0", -1, 1).name("T-DirX");
    this.turbulenceDirectionBiasYController = biasFolder.add(turbulence.directionBias, "1", -1, 1).name("T-DirY");

    // Add listeners for other parameters that affect the preview
    const previewAffectingControllers = [
      this.turbulencePatternFrequencyController,
      this.turbulenceSpeedController,
      this.turbulenceScaleController,
      this.turbulenceRotationController,
      this.turbulenceRotationSpeedController,
      this.turbulenceDomainWarpController,
      this.turbulenceDomainWarpSpeedController,
      this.turbulencePhaseController,
      this.turbulenceStaticPhaseController,
      this.turbulenceSymmetryController,
      // New controllers
      this.turbulenceOffsetXController,
      this.turbulenceOffsetYController,
      this.turbulenceBiasXController,
      this.turbulenceBiasYController,
      this.turbulenceBiasSpeedController,
      this.turbulenceContrastController,
      this.turbulenceContrastSpeedController,
      this.turbulenceSeparationController,
      // Direction bias for particles
      this.turbulenceDirectionBiasXController,
      this.turbulenceDirectionBiasYController
    ];

    previewAffectingControllers.forEach(controller => {
      if (controller) {
        controller.onChange(() => {
          refreshThumbnails(true);  // Keep animation when parameters change
        });
      }
    });

    // Clean up animation when folder is closed
    previewsFolder.domElement.addEventListener('click', (e) => {
      if (e.target.closest('.title')) {
        if (currentAnimationCleanup) {
          currentAnimationCleanup();
          currentAnimationCleanup = null;
        }
        thumbnailAnimationCleanups.forEach(cleanup => cleanup());
        thumbnailAnimationCleanups.clear();
        selectedThumbnailValue = null;
        refreshThumbnails(false);
      }
    });
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

    if (this.turbulenceRotationController) targets["T-Rot"] = this.turbulenceRotationController;
    if (this.turbulenceRotationSpeedController) targets["T-RotSpd"] = this.turbulenceRotationSpeedController;
    if (this.turbulenceDecayRateController) targets["T-Decay"] = this.turbulenceDecayRateController;

    // Direction bias controllers (for particle movement)
    if (this.turbulenceDirectionBiasXController) targets["T-DirX"] = this.turbulenceDirectionBiasXController;
    if (this.turbulenceDirectionBiasYController) targets["T-DirY"] = this.turbulenceDirectionBiasYController;

    // Add domain warp controller
    if (this.turbulenceDomainWarpController) targets["T-DomWarp"] = this.turbulenceDomainWarpController;
    if (this.turbulenceDomainWarpSpeedController) targets["T-DomWarpSp"] = this.turbulenceDomainWarpSpeedController;

    // Add pull mode controller
    if (this.turbulencePullFactorController) targets["T-Pull Mode"] = this.turbulencePullFactorController;

    // Add pattern control targets
    if (this.turbulencePatternStyleController) targets["T-PatternStyle"] = this.turbulencePatternStyleController;
    if (this.turbulencePatternFrequencyController) targets["T-Freq"] = this.turbulencePatternFrequencyController;
    if (this.turbulencePhaseController) targets["T-PhaseSp"] = this.turbulencePhaseController;
    if (this.turbulenceStaticPhaseController) targets["T-Phase"] = this.turbulenceStaticPhaseController;
    if (this.turbulenceSymmetryController) targets["T-Sym"] = this.turbulenceSymmetryController;

    // Add new pattern offset controllers
    if (this.turbulenceOffsetXController) targets["T-OffsetX"] = this.turbulenceOffsetXController;
    if (this.turbulenceOffsetYController) targets["T-OffsetY"] = this.turbulenceOffsetYController;

    // Add new bias speed controllers
    if (this.turbulenceBiasXController) targets["T-BiasX"] = this.turbulenceBiasXController;
    if (this.turbulenceBiasYController) targets["T-BiasY"] = this.turbulenceBiasYController;
    if (this.turbulenceBiasSpeedController) targets["T-BiasSp"] = this.turbulenceBiasSpeedController;

    // Add new contrast and separation controllers
    if (this.turbulenceContrastController) targets["T-Contrast"] = this.turbulenceContrastController;
    if (this.turbulenceContrastSpeedController) targets["T-ContSp"] = this.turbulenceContrastSpeedController;
    if (this.turbulenceSeparationController) targets["T-Separation"] = this.turbulenceSeparationController;

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
    safeUpdateDisplay(this.turbulenceRotationController);
    safeUpdateDisplay(this.turbulenceRotationSpeedController);
    safeUpdateDisplay(this.turbulenceDecayRateController);
    safeUpdateDisplay(this.turbulenceDirectionBiasXController);
    safeUpdateDisplay(this.turbulenceDirectionBiasYController);
    safeUpdateDisplay(this.turbulenceDomainWarpController);
    safeUpdateDisplay(this.turbulenceDomainWarpSpeedController);
    safeUpdateDisplay(this.turbulencePullFactorController);
    safeUpdateDisplay(this.turbulencePatternStyleController);
    safeUpdateDisplay(this.turbulencePatternFrequencyController);
    safeUpdateDisplay(this.turbulencePhaseController);
    safeUpdateDisplay(this.turbulenceStaticPhaseController);
    safeUpdateDisplay(this.turbulenceSymmetryController);

    // Update new controller displays
    safeUpdateDisplay(this.turbulenceOffsetXController);
    safeUpdateDisplay(this.turbulenceOffsetYController);
    safeUpdateDisplay(this.turbulenceBiasXController);
    safeUpdateDisplay(this.turbulenceBiasYController);
    safeUpdateDisplay(this.turbulenceBiasSpeedController);
    safeUpdateDisplay(this.turbulenceContrastController);
    safeUpdateDisplay(this.turbulenceContrastSpeedController);
    safeUpdateDisplay(this.turbulenceSeparationController);
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
      if (targets["T-DirX"]) targets["T-DirX"].setValue(0);
      if (targets["T-DirY"]) targets["T-DirY"].setValue(0);

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
