import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";
import { NoisePreviewManager } from "../../util/noisePreviewManager.js";

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
        // Update tooltip or indicator that shows the current mode
        let mode;
        if (value > 0) {
          // In white mode, particles are attracted to peaks and white areas are enhanced
          const whitePercent = Math.round(value * 100);
          mode = `White: +${whitePercent}%`;
        } else if (value < 0) {
          // In black mode, pattern is inverted and particles are pushed by the field
          const blackPercent = Math.round(Math.abs(value) * 100);
          mode = `Black: -${blackPercent}%`;
        } else {
          mode = "Neutral (0%)";
        }

        // Optional: Display mode indicator
        if (this.modeIndicator) {
          this.modeIndicator.textContent = mode;
        } else if (this.turbulencePullFactorController.domElement) {
          // Create a mode indicator if it doesn't exist
          const controlElement = this.turbulencePullFactorController.domElement;
          const container = controlElement.parentElement;

          if (container && !this.modeIndicator) {
            this.modeIndicator = document.createElement('div');
            this.modeIndicator.className = 'mode-indicator';
            this.modeIndicator.style.cssText = `
              font-size: 11px;
              color: #aaa;
              margin-top: -5px;
              margin-bottom: 5px;
              padding-left: 30%;
            `;
            this.modeIndicator.textContent = mode;
            container.appendChild(this.modeIndicator);
          }
        }
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

    // Pattern styles for preview thumbnails
    const patternStyles = {
      "Checkerboard": "checkerboard",
      "Waves": "waves",
      "Spiral": "spiral",
      "Grid": "grid",
      "Circles": "circles",
      "Diamonds": "diamonds",
      "Ripples": "ripples",
      "Dots": "dots",
      "Voronoi": "voronoi",
      "Cells": "cells",
      "Fractal": "fractal",
      "Vortex": "vortex",
      "Bubbles": "bubbles",
      "Strings": "strings"
    };

    // Pattern style selector
    this.turbulencePatternStyleController = patternControlsFolder.add(turbulence, "patternStyle")
      .name("T-PatternStyle")
      .options({
        "Checkerboard": "checkerboard",
        "Waves": "waves",
        "Spiral": "spiral",
        "Grid": "grid",
        "Circles": "circles",
        "Diamonds": "diamonds",
        "Ripples": "ripples",
        "Dots": "dots",
        "Voronoi": "voronoi",
        "Cells": "cells",
        "Fractal": "fractal",
        "Vortex": "vortex",
        "Bubbles": "bubbles",
        "Strings": "strings"
      })
      .onChange((value) => {
        if (this.previewManager) {
          this.previewManager.setSelectedPattern(value);
        }
      });
    this.turbulencePatternStyleController.domElement.classList.add("full-width");
    this.turbulencePatternStyleController.setValue("checkerboard");

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

    // Add new bias smoothing control
    this.turbulenceBiasSmoothing = biasSpeedFolder.add(turbulence, "biasSmoothing", 0, 0.99, 0.01)
      .name("T-BiasSmooth");

    // Make sure folders are open by default
    patternOffsetFolder.open();

    const previewSize = 76;

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

      // Generate initial static preview (now handled by PreviewManager)
      previewWrapper.appendChild(previewImg);

      // Add hover effect
      previewWrapper.addEventListener('mouseover', () => {
        if (value !== turbulence.patternStyle) {
          previewWrapper.style.borderColor = '#fff';
        }
      });
      previewWrapper.addEventListener('mouseout', () => {
        if (value !== turbulence.patternStyle) {
          previewWrapper.style.borderColor = '#666';
        }
      });

      // Add click handler
      previewWrapper.addEventListener('click', () => {
        if (turbulence.patternStyle !== value) {
          // Update pattern
          turbulence.patternStyle = value;
          // Update controller
          if (this.turbulencePatternStyleController) {
            this.turbulencePatternStyleController.setValue(value);
          }
          // Explicitly update the preview manager with the new selected pattern
          if (this.previewManager) {
            this.previewManager.setSelectedPattern(value);
          }
        }
      });

      previewContainer.appendChild(previewWrapper);
    });

    // Store preview container reference
    this.patternPreviewContainer = previewContainer;

    // Initialize the NoisePreviewManager
    this.previewManager = new NoisePreviewManager(
      turbulence,
      previewSize,
      patternStyles
    );

    // Check if previews folder is open
    const isPreviewsFolderOpen = previewsFolder.domElement.classList.contains('closed') === false;

    // Initialize with container and folder state - forcing animation to start
    this.previewManager.initialize(previewContainer, isPreviewsFolderOpen);

    // Set the selected pattern immediately and force animation
    this.previewManager.setSelectedPattern(turbulence.patternStyle, true);

    // Force animation to start for the initial selected pattern
    // Make sure to stagger these calls to avoid race conditions
    setTimeout(() => {
      if (this.previewManager) {
        // Force refresh the selected pattern
        this.previewManager.refreshSelectedPreview();

        // Make sure visibility is correctly detected
        this.previewManager.checkParentFolderVisibility();
        this.previewManager.ensureRefreshLoopStarted();
      }
    }, 100);

    // Do another check slightly later in case anything was still initializing
    setTimeout(() => {
      if (this.previewManager && this.previewManager.selectedPattern) {
        // Force it to refresh one more time
        this.previewManager.refreshSelectedPreview();

        // Force the animation loop to start if needed
        if (!this.previewManager.animationFrameId && this.previewManager.isVisible) {
          this.previewManager.startRefreshLoop();
        }
      }
    }, 300);

    // Set performance profile based on estimated device capability
    // This is a simple heuristic and could be improved
    const estimateDevicePerformance = () => {
      // Check if we're on a mobile device (generally lower performance)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Use hardware concurrency as a rough estimate of CPU power
      const cpuCores = navigator.hardwareConcurrency || 4;

      if (isMobile && cpuCores <= 4) {
        return 'low';
      } else if (isMobile || cpuCores <= 6) {
        return 'medium';
      } else if (cpuCores >= 12) {
        return 'ultra';
      } else {
        return 'high';
      }
    };

    // Apply the performance profile
    this.previewManager.setPerformanceProfile(estimateDevicePerformance());

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
      .name("T-DomWarp");

    // Add domain warp speed control
    this.turbulenceDomainWarpSpeedController = patternControlsFolder.add(turbulence, "domainWarpSpeed", 0, 2, 0.1)
      .name("T-DomWarpSp");

    // Add symmetry amount control
    this.turbulenceSymmetryController = patternControlsFolder.add(turbulence, "symmetryAmount", 0, 1, 0.01)
      .name("T-Sym");

    // Pattern frequency control (always visible)
    this.turbulencePatternFrequencyController = patternControlsFolder.add(turbulence, "patternFrequency", 0.01, 4, 0.01)
      .name("T-Freq");

    // Add static phase control
    this.turbulenceStaticPhaseController = patternControlsFolder.add(turbulence, "phase", 0, 1, 0.01)
      .name("T-Phase");

    // Add phase speed control
    this.turbulencePhaseController = patternControlsFolder.add(turbulence, "phaseSpeed", -1, 1, 0.1)
      .name("T-PhaseSp");

    // Add blur control
    this.turbulenceBlurController = patternControlsFolder.add(turbulence, "blurAmount", 0, 2, 0.01)
      .name("T-Blur");

    // Restore XY bias controllers
    const biasFolder = this.gui.addFolder("Direction Bias");
    this.turbulenceDirectionBiasXController = biasFolder.add(turbulence.directionBias, "0", -1, 1).name("T-DirX");
    this.turbulenceDirectionBiasYController = biasFolder.add(turbulence.directionBias, "1", -1, 1).name("T-DirY");

    // Handle folder open/close events
    previewsFolder.domElement.addEventListener('click', (e) => {
      if (e.target.closest('.title')) {
        // Use setTimeout to let the DOM update before checking state
        setTimeout(() => {
          const isOpen = !previewsFolder.domElement.classList.contains('closed');
          if (this.previewManager) {
            this.previewManager.setFolderOpen(isOpen);
          }
        }, 0);
      }
    });

    // Also observe folder state in case it's changed by other means
    // (like programmatically or by closing parent folders)
    const folderObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const isOpen = !previewsFolder.domElement.classList.contains('closed');
          if (this.previewManager) {
            this.previewManager.setFolderOpen(isOpen);
          }
          break;
        }
      }
    });

    folderObserver.observe(previewsFolder.domElement, { attributes: true });

    // Store observer for cleanup
    this.previewFolderObserver = folderObserver;

    // Monitor parent folder (Noise folder) visibility
    if (noiseFolder) {
      noiseFolder.domElement.addEventListener('click', (e) => {
        if (e.target.closest('.title')) {
          // Use setTimeout to let the DOM update before checking state
          setTimeout(() => {
            if (this.previewManager) {
              // Run the full check to detect all parent folders
              this.previewManager.checkParentFolderVisibility();
            }
          }, 0);
        }
      });

      // Observe the parent folder class changes
      const noiseFolderObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'class') {
            if (this.previewManager) {
              // Run the full check to detect all parent folders
              this.previewManager.checkParentFolderVisibility();
            }
            break;
          }
        }
      });

      noiseFolderObserver.observe(noiseFolder.domElement, { attributes: true });
      this.noiseFolderObserver = noiseFolderObserver;
    }

    // Monitor pattern controls folder visibility
    if (patternControlsFolder) {
      patternControlsFolder.domElement.addEventListener('click', (e) => {
        if (e.target.closest('.title')) {
          setTimeout(() => {
            if (this.previewManager) {
              this.previewManager.checkParentFolderVisibility();
            }
          }, 0);
        }
      });
    }

    // Observe any GUI state changes (expanding/collapsing any folders)
    if (this.gui && this.gui.domElement) {
      const guiStateObserver = new MutationObserver((mutations) => {
        // Check if any relevant folders have changed
        const shouldCheck = mutations.some(mutation => {
          return mutation.target &&
            mutation.target.classList &&
            mutation.target.classList.contains('folder') &&
            mutation.attributeName === 'class';
        });

        if (shouldCheck && this.previewManager) {
          this.previewManager.checkParentFolderVisibility();
        }
      });

      guiStateObserver.observe(this.gui.domElement, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true
      });

      this.guiStateObserver = guiStateObserver;
    }

    // Add string pattern controls folder
    const stringControlsFolder = patternControlsFolder.addFolder("String Controls");
    this.stringControlsFolder = stringControlsFolder;

    // Add string-specific controls
    this.turbulenceStringDensityController = stringControlsFolder.add(turbulence, "stringDensity", 1, 8, 0.1)
      .name("T-StrDensity");
    this.turbulenceStringThicknessController = stringControlsFolder.add(turbulence, "stringThickness", 0.1, 2, 0.1)
      .name("T-StrThick");
    this.turbulenceStringWaveSpeedController = stringControlsFolder.add(turbulence, "stringWaveSpeed", 0, 2, 0.1)
      .name("T-StrWaveSp");
    this.turbulenceStringWaveAmplitudeController = stringControlsFolder.add(turbulence, "stringWaveAmplitude", 0, 0.5, 0.05)
      .name("T-StrWaveAmp");
    this.turbulenceStringWaveFrequencyController = stringControlsFolder.add(turbulence, "stringWaveFrequency", 0.1, 4, 0.1)
      .name("T-StrWaveFreq");
    this.turbulenceStringWeaveOffsetController = stringControlsFolder.add(turbulence, "stringWeaveOffset", 0, 1, 0.1)
      .name("T-StrWeave");

    // Make string controls folder initially closed
    stringControlsFolder.close();

    // Add pattern style change handler to show/hide string controls
    this.turbulencePatternStyleController.onChange((value) => {
      if (value === "strings") {
        stringControlsFolder.open();
      } else {
        stringControlsFolder.close();
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

    // Add new bias smoothing controller to control targets
    if (this.turbulenceBiasSmoothing) targets["T-BiasSmooth"] = this.turbulenceBiasSmoothing;

    // Add blur controller to control targets
    if (this.turbulenceBlurController) targets["T-Blur"] = this.turbulenceBlurController;

    // Add string controllers to control targets
    if (this.turbulenceStringDensityController) targets["T-StrDensity"] = this.turbulenceStringDensityController;
    if (this.turbulenceStringThicknessController) targets["T-StrThick"] = this.turbulenceStringThicknessController;
    if (this.turbulenceStringWaveSpeedController) targets["T-StrWaveSp"] = this.turbulenceStringWaveSpeedController;
    if (this.turbulenceStringWaveAmplitudeController) targets["T-StrWaveAmp"] = this.turbulenceStringWaveAmplitudeController;
    if (this.turbulenceStringWaveFrequencyController) targets["T-StrWaveFreq"] = this.turbulenceStringWaveFrequencyController;
    if (this.turbulenceStringWeaveOffsetController) targets["T-StrWeave"] = this.turbulenceStringWeaveOffsetController;

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
    safeUpdateDisplay(this.turbulenceBiasSmoothing);
    safeUpdateDisplay(this.turbulenceBlurController);

    // Update string controller displays
    safeUpdateDisplay(this.turbulenceStringDensityController);
    safeUpdateDisplay(this.turbulenceStringThicknessController);
    safeUpdateDisplay(this.turbulenceStringWaveSpeedController);
    safeUpdateDisplay(this.turbulenceStringWaveAmplitudeController);
    safeUpdateDisplay(this.turbulenceStringWaveFrequencyController);
    safeUpdateDisplay(this.turbulenceStringWeaveOffsetController);
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

  // Add method to allow external code to update specific controllers
  updateBiasControllers() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    // Update UI for bias X and Y controllers if they exist
    if (this.turbulenceBiasXController) {
      this.turbulenceBiasXController.setValue(turbulence.biasSpeedX);
    }

    if (this.turbulenceBiasYController) {
      this.turbulenceBiasYController.setValue(turbulence.biasSpeedY);
    }
  }

  // Add this method to the TurbulenceUi class
  dispose() {
    // Clean up the MutationObserver
    if (this.previewFolderObserver) {
      this.previewFolderObserver.disconnect();
      this.previewFolderObserver = null;
    }

    // Clean up the additional observers
    if (this.noiseFolderObserver) {
      this.noiseFolderObserver.disconnect();
      this.noiseFolderObserver = null;
    }

    if (this.guiStateObserver) {
      this.guiStateObserver.disconnect();
      this.guiStateObserver = null;
    }

    // Clean up the NoisePreviewManager
    if (this.previewManager) {
      this.previewManager.dispose();
      this.previewManager = null;
    }

    // Call the parent class dispose method if it exists
    if (super.dispose) {
      super.dispose();
    }
  }
}
