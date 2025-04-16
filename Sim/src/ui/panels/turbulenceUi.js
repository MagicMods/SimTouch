import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";
import { NoisePreviewManager } from "../../util/noisePreviewManager.js";
import { eventBus } from '../../util/eventManager.js';

export class TurbulenceUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.debug = this.main.debugFlags;
    // Validate required dependencies
    if (!main.turbulenceField) {
      throw new Error("TurbulenceField is required in main for TurbulenceUi");
    }

    this.presetManager = null;
    this.presetControls = null;
    this.gui.title("Turbulence");
    this.initTurbulenceControls();
    this.gui.open(false);

    // Track folder states
    this.isTurbulenceFolderOpen = true;
    this.isNoiseFolderOpen = true;
    this.isPreviewsFolderOpen = true;

    // Set up folder state observers
    this.setupFolderStateObservers();
  }

  initWithPresetManager(presetManager) {
    if (!presetManager) {
      throw new Error("PresetManager is required for initWithPresetManager");
    }

    this.presetManager = presetManager;

    const turbulenceContainer = this.gui.domElement.querySelector(".children");
    if (!turbulenceContainer) {
      throw new Error("Turbulence container not found in GUI");
    }

    this.presetControls = this.presetManager.createPresetControls(
      PresetManager.TYPES.TURBULENCE,
      turbulenceContainer,
      { insertFirst: true }
    );

    // Add the button controls after the preset controls
    if (this.buttonContainer) {
      const presetElement = turbulenceContainer.querySelector(".preset-controls");
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

    // Set the turbulence field in the preset manager
    this.presetManager.setTurbulenceField(this.main.turbulenceField);
  }

  initTurbulenceControls() {
    // Use simParams instead of direct turbulence object reference
    const turbulenceParams = this.main.simParams.turbulence;
    // Keep direct reference for methods not yet moved to event system (e.g., resetParticleSizes, applyPatternSpecificOffset)
    const turbulenceField = this.main.turbulenceField;

    // Setup display properties for uninverted acceleration values
    // These need to remain on the turbulenceField object for lil-gui binding
    if (!turbulenceField._displayBiasAccelX) {
      Object.defineProperties(turbulenceField, {
        "_displayBiasAccelX": {
          get: function () { return -this._biasAccelX; },
          set: function (value) {
            this._biasAccelX = -value;
            // Emit event when display property is set
            eventBus.emit('uiControlChanged', { paramPath: 'turbulence._displayBiasAccelX', value });
          }
        },
        "_displayBiasAccelY": {
          get: function () { return this._biasAccelY; },
          set: function (value) {
            this._biasAccelY = value;
            // Emit event when display property is set
            eventBus.emit('uiControlChanged', { paramPath: 'turbulence._displayBiasAccelY', value });
          }
        }
      });
    }

    // Initialize pullFactor if it doesn't exist (backward compatibility) - Read from simParams
    if (turbulenceParams.pullFactor === undefined) {
      // Convert from old format if possible - THIS LOGIC MIGHT BE FAULTY without direct turbulence field access
      // We assume simParams is correctly initialized now.
      turbulenceParams.pullFactor = 0.0; // Default to push mode
    }

    // Create button group container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "turbulence-toggle-buttons";

    // Store reference to the button container
    this.buttonContainer = buttonContainer;

    // Create position button - Emit event onClick
    const posButton = document.createElement("button");
    posButton.textContent = "Position";
    posButton.className = "toggle-button";
    if (turbulenceParams.affectPosition) posButton.classList.add("active");
    posButton.addEventListener("click", () => {
      const newValue = !turbulenceParams.affectPosition;
      // Update button state immediately for responsiveness
      posButton.classList.toggle("active", newValue);
      // Emit event
      eventBus.emit('uiControlChanged', { paramPath: 'turbulence.affectPosition', value: newValue });
    });

    // Create field button - Emit event onClick
    const fieldButton = document.createElement("button");
    fieldButton.textContent = "Scale Field";
    fieldButton.className = "toggle-button";
    if (turbulenceParams.scaleField) fieldButton.classList.add("active");
    fieldButton.addEventListener("click", () => {
      const newValue = !turbulenceParams.scaleField;
      fieldButton.classList.toggle("active", newValue);
      eventBus.emit('uiControlChanged', { paramPath: 'turbulence.scaleField', value: newValue });
    });

    // Create scale button - Emit event onClick
    const scaleButton = document.createElement("button");
    scaleButton.textContent = "Size";
    scaleButton.className = "toggle-button";
    if (turbulenceParams.affectScale) scaleButton.classList.add("active");
    scaleButton.addEventListener("click", () => {
      const newValue = !turbulenceParams.affectScale;
      scaleButton.classList.toggle("active", newValue);
      eventBus.emit('uiControlChanged', { paramPath: 'turbulence.affectScale', value: newValue });

      // Keep reset particle sizes logic for now, triggered directly
      if (!newValue) {
        turbulenceField.resetParticleSizes(this.main.particleSystem);
      }

      // Keep scale range folder toggle logic
      if (this.scaleRangeFolder) {
        if (newValue) {
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
    if (!guiChildren) {
      throw new Error("GUI children container not found");
    }

    guiChildren.insertBefore(buttonContainer, guiChildren.firstChild);

    this.positionButton = posButton;
    this.fieldButton = fieldButton;
    this.scaleButton = scaleButton;

    // Bind lil-gui controls to simParams and emit events
    this.turbulenceStrengthController = this.gui.add(turbulenceParams, "strength", 0, 10).name("T-Strength")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.strength', value }));

    this.turbulenceScaleController = this.gui.add(turbulenceParams, "scale", 0.1, 10, 0.01).name("T-Scale")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.scale', value }));

    this.turbulenceSpeedController = this.gui.add(turbulenceParams, "speed", 0, 2).name("T-Speed")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.speed', value }));

    this.turbulencePullFactorController = this.gui.add(turbulenceParams, "pullFactor", -1, 1)
      .name("T-Pull Mode")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'turbulence.pullFactor', value });
        // Keep mode indicator update logic
        let mode;
        if (value > 0) {
          const whitePercent = Math.round(value * 100);
          mode = `White: +${whitePercent}%`;
        } else if (value < 0) {
          const blackPercent = Math.round(Math.abs(value) * 100);
          mode = `Black: -${blackPercent}%`;
        } else {
          mode = "Neutral (0%)";
        }
        if (this.modeIndicator) {
          this.modeIndicator.textContent = mode;
        } else if (this.turbulencePullFactorController.domElement) {
          // ... (mode indicator creation remains same) ...
        }
      });

    const scaleRangeFolder = this.gui.addFolder("Particle Size Range");
    this.scaleRangeFolder = scaleRangeFolder; // Store reference

    // Initial state of folder based on simParams
    if (turbulenceParams.affectScale) {
      scaleRangeFolder.open();
    } else {
      scaleRangeFolder.close();
    }

    this.turbulenceMinScaleController = scaleRangeFolder.add(turbulenceParams, "minScale", 0.005, 0.015, 0.001).name("T-Min Size")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.minScale', value }));

    this.turbulenceMaxScaleController = scaleRangeFolder.add(turbulenceParams, "maxScale", 0.015, 0.03, 0.001).name("T-Max Size")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.maxScale', value }));

    // Add geometric pattern controls folder
    const noiseFolder = this.gui.addFolder("Noise");
    this.noiseFolder = noiseFolder;

    // Create Previews folder
    const previewsFolder = noiseFolder.addFolder("Previews");
    this.previewsFolder = previewsFolder;

    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pattern-preview-container';

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
      "Water": "water",
      "Classic Drop": "classicdrop"
    };

    // Pattern style selector - bind to simParams
    this.turbulencePatternStyleController = patternControlsFolder.add(turbulenceParams, "patternStyle")
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
        "Water": "water",
        "Classic Drop": "classicdrop"
      })
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'turbulence.patternStyle', value });
        // Keep preview manager update
        if (this.previewManager) {
          this.previewManager.setSelectedPattern(value);
        }
        // Keep direct call for pattern offset update for now
        if (turbulenceField.applyPatternSpecificOffset) {
          turbulenceField.applyPatternSpecificOffset();
          // Update offset controllers (need refactoring later)
          if (this.turbulenceOffsetXController) this.turbulenceOffsetXController.updateDisplay();
          if (this.turbulenceOffsetYController) this.turbulenceOffsetYController.updateDisplay();
        }
      });
    this.turbulencePatternStyleController.domElement.classList.add("full-width");
    this.turbulencePatternStyleController.setValue("checkerboard");

    // Bind rotation controls to simParams
    this.turbulenceRotationController = patternControlsFolder.add(turbulenceParams, "rotation", 0, Math.PI * 2).name("T-Rot")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.rotation', value }));

    this.turbulenceRotationSpeedController = patternControlsFolder.add(turbulenceParams, "rotationSpeed", 0, 1).name("T-RotSpd")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.rotationSpeed', value }));

    this.turbulenceDecayRateController = patternControlsFolder.add(turbulenceParams, "decayRate", 0.9, 1).name("T-Decay")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.decayRate', value }));

    // Restore XY bias controllers
    const biasFolder = this.gui.addFolder("Bias Controls");
    biasFolder.open(false); // Keep it open by default

    // Bind bias direction controls to simParams
    this.turbulenceDirectionBiasXController = biasFolder.add(turbulenceParams, "directionBiasX", -1, 1).name("T-DirX")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.directionBiasX', value }));

    this.turbulenceDirectionBiasYController = biasFolder.add(turbulenceParams, "directionBiasY", -1, 1).name("T-DirY")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.directionBiasY', value }));

    // Bind bias speed/acceleration using the display properties on turbulenceField
    this.turbulenceBiasSpeedXController = biasFolder.add(turbulenceField, "_displayBiasAccelX", -0.5, 0.5).name("T-BiasX Spd");
    this.turbulenceBiasSpeedYController = biasFolder.add(turbulenceField, "_displayBiasAccelY", -0.5, 0.5).name("T-BiasY Spd");

    // Bind bias strength to simParams
    this.turbulenceBiasStrengthController = biasFolder.add(turbulenceParams, "biasStrength", 0, 2).name("T-Bias Amt")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.biasStrength', value }));

    // Bind contrast to simParams
    this.turbulenceContrastController = patternControlsFolder.add(turbulenceParams, "contrast", 0, 1).name("T-Contrast")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.contrast', value }));

    // Bind separation (quantization) to simParams
    this.turbulenceSeparationController = patternControlsFolder.add(turbulenceParams, "separation", 0, 1).name("T-Quantize")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.separation', value }));

    // Bind domainWarp (distortionScale) to simParams
    this.turbulenceDomainWarpController = patternControlsFolder.add(turbulenceParams, "domainWarp", 0, 1).name("T-Distort")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.domainWarp', value }));

    // Bind patternFrequency to simParams
    this.turbulencePatternFrequencyController = patternControlsFolder.add(turbulenceParams, "patternFrequency", 0.1, 10).name("T-Freq")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'turbulence.patternFrequency', value }));

    // Move Pattern Offset folder under Direction Bias and close it
    const patternOffsetFolder = biasFolder.addFolder("Pattern Offset");
    this.patternOffsetFolder = patternOffsetFolder;

    // Add offset X and Y controls - now just for display purposes
    this.turbulenceOffsetXController = patternOffsetFolder.add(turbulenceField, "patternOffsetX", -1, 1, 0.01).name("T-OffsetX");
    this.turbulenceOffsetYController = patternOffsetFolder.add(turbulenceField, "patternOffsetY", -1, 1, 0.01).name("T-OffsetY");


    // Close the Pattern Offset folder by default
    patternOffsetFolder.close();

    const previewSize = 76;

    // Create preview thumbnails
    Object.entries(patternStyles).forEach(([name, value]) => {
      const previewWrapper = document.createElement('div');
      // Add both classes
      previewWrapper.className = 'pattern-preview noise-preview-element';
      previewWrapper.setAttribute('data-pattern', value);  // Add data-pattern attribute

      const previewImg = document.createElement('img');

      // Add title first
      const title = document.createElement('div');
      title.textContent = name;
      // Add class instead of inline styles
      title.className = 'pattern-title';
      previewWrapper.appendChild(title);

      // Generate initial static preview (now handled by PreviewManager)
      previewWrapper.appendChild(previewImg);

      // Add click handler
      previewWrapper.addEventListener('click', () => {
        if (turbulenceField.patternStyle !== value) {
          // Update pattern
          turbulenceField.patternStyle = value;
          // Apply pattern-specific offset immediately
          turbulenceField.applyPatternSpecificOffset();
          // Update controller
          if (this.turbulencePatternStyleController) {
            this.turbulencePatternStyleController.setValue(value);
          }
          // Update offset controllers
          if (this.turbulenceOffsetXController) {
            this.turbulenceOffsetXController.updateDisplay();
          }
          if (this.turbulenceOffsetYController) {
            this.turbulenceOffsetYController.updateDisplay();
          }
          // Explicitly update the preview manager with the new selected pattern
          if (this.previewManager) {
            this.previewManager.setSelectedPattern(value);
          }
        } else {
          // Clicking on already selected pattern toggles preview refreshing
          if (this.previewManager) {
            const isDisabled = this.previewManager.toggleRefreshingDisabled();
            // Optionally show a temporary status message
            const statusText = isDisabled ?
              'Preview animation disabled' :
              'Preview animation enabled';

            // Create or update status message
            this.showStatusMessage(statusText, 1500);
          }
        }
      });

      previewContainer.appendChild(previewWrapper);
    });

    // Store preview container reference
    this.patternPreviewContainer = previewContainer;

    // Initialize the NoisePreviewManager
    this.previewManager = new NoisePreviewManager(
      turbulenceField,
      previewSize,
      patternStyles,
      this.main.debugFlags
    );

    // Check if previews folder is open
    const isPreviewsFolderOpen = previewsFolder.domElement.classList.contains('closed') === false;

    // Initialize with container and folder state - forcing animation to start
    this.previewManager.initialize(previewContainer, isPreviewsFolderOpen);

    // Set the selected pattern immediately and force animation
    this.previewManager.setSelectedPattern(turbulenceField.patternStyle, true);

    // Force animation to start for the initial selected pattern
    // Make sure to stagger these calls to avoid race conditions
    // setTimeout(() => {
    if (this.previewManager) {
      // Force refresh the selected pattern
      this.previewManager.refreshSelectedPreview();

      // Make sure visibility is correctly detected
      this.previewManager.checkParentFolderVisibility();
      this.previewManager.ensureRefreshLoopStarted();
    }
    // }, 100);

    // Do another check slightly later in case anything was still initializing
    // setTimeout(() => {
    if (this.previewManager && this.previewManager.selectedPattern) {
      // Force it to refresh one more time
      this.previewManager.refreshSelectedPreview();

      // Force the animation loop to start if needed
      if (!this.previewManager.animationFrameId && this.previewManager.isVisible) {
        this.previewManager.startRefreshLoop();
      }
    }
    // }, 300);

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

    // Domain warp control
    this.turbulenceDomainWarpController = patternControlsFolder.add(turbulenceParams, "domainWarp", 0, 1)
      .name("T-DomWarp");

    // Add domain warp speed control
    this.turbulenceDomainWarpSpeedController = patternControlsFolder.add(turbulenceParams, "domainWarpSpeed", 0, 2, 0.1)
      .name("T-DomWarpSp");

    // Add symmetry amount control
    this.turbulenceSymmetryController = patternControlsFolder.add(turbulenceParams, "symmetryAmount", 0, 1, 0.01)
      .name("T-Symmetry");

    // Pattern frequency control (always visible)
    this.turbulencePatternFrequencyController = patternControlsFolder.add(turbulenceParams, "patternFrequency", 0.01, 4, 0.01)
      .name("T-Freq");

    // Add static phase control
    this.turbulenceStaticPhaseController = patternControlsFolder.add(turbulenceParams, "phase", 0, 1, 0.01)
      .name("T-Phase");

    // Add phase speed control
    this.turbulencePhaseController = patternControlsFolder.add(turbulenceParams, "phaseSpeed", -1, 1, 0.1)
      .name("T-PhaseSp");

    // Add blur control
    this.turbulenceBlurController = patternControlsFolder.add(turbulenceParams, "blurAmount", 0, 2, 0.01)
      .name("T-Blur")
      .onChange(() => {
        // Refresh preview when blur amount changes
        if (this.previewManager) {
          this.previewManager.refreshSelectedPreview();
        }
      });

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
          const boolValue = Boolean(value); // Ensure boolean for consistency
          if (this.positionButton) {
            this.positionButton.classList.toggle("active", boolValue);
          }
          // ADDED: Emit event
          eventBus.emit('uiControlChanged', { paramPath: 'turbulence.affectPosition', value: boolValue });
        }
      };

      targets["T-AfScaleF"] = {
        getValue: () => turbulence.scaleField,
        setValue: (value) => {
          const boolValue = Boolean(value); // Ensure boolean
          if (this.fieldButton) {
            this.fieldButton.classList.toggle("active", boolValue);
          }
          // ADDED: Emit event
          eventBus.emit('uiControlChanged', { paramPath: 'turbulence.scaleField', value: boolValue });
        }
      };

      // Scale toggle wrapper
      targets["T-AfScale"] = {
        getValue: () => turbulence.affectScale,
        setValue: (value) => {
          const boolValue = Boolean(value); // Ensure boolean
          if (this.scaleButton) {
            this.scaleButton.classList.toggle("active", boolValue);
          }
          // ADDED: Emit event
          eventBus.emit('uiControlChanged', { paramPath: 'turbulence.affectScale', value: boolValue });

          // Keep existing folder visibility logic
          if (this.scaleRangeFolder) {
            if (boolValue) { // Use consistent boolean value
              this.scaleRangeFolder.open();
            } else {
              this.scaleRangeFolder.close();
            }
          }
        }
      };
    }

    if (this.turbulenceStrengthController) targets["T-Strength"] = this.turbulenceStrengthController;
    if (this.turbulenceScaleController) targets["T-Scale"] = this.turbulenceScaleController;
    if (this.turbulenceSpeedController) targets["T-Speed"] = this.turbulenceSpeedController;
    if (this.turbulenceMinScaleController) targets["T-Min Size"] = this.turbulenceMinScaleController;
    if (this.turbulenceMaxScaleController) targets["T-Max Size"] = this.turbulenceMaxScaleController;

    if (this.turbulenceRotationController) targets["T-Rot"] = this.turbulenceRotationController;
    if (this.turbulenceRotationSpeedController) targets["T-RotSpd"] = this.turbulenceRotationSpeedController;
    if (this.turbulenceDecayRateController) targets["T-Decay"] = this.turbulenceDecayRateController;

    if (this.turbulenceDirectionBiasXController) targets["T-DirX"] = this.turbulenceDirectionBiasXController;
    if (this.turbulenceDirectionBiasYController) targets["T-DirY"] = this.turbulenceDirectionBiasYController;
    if (this.turbulenceDomainWarpController) targets["T-DomWarp"] = this.turbulenceDomainWarpController;
    if (this.turbulenceDomainWarpSpeedController) targets["T-DomWarpSp"] = this.turbulenceDomainWarpSpeedController;
    if (this.turbulencePullFactorController) targets["T-Pull Mode"] = this.turbulencePullFactorController;

    if (this.turbulencePatternStyleController) targets["T-PatternStyle"] = this.turbulencePatternStyleController;
    if (this.turbulencePatternFrequencyController) targets["T-Freq"] = this.turbulencePatternFrequencyController;
    if (this.turbulencePhaseController) targets["T-PhaseSp"] = this.turbulencePhaseController;
    if (this.turbulenceStaticPhaseController) targets["T-Phase"] = this.turbulenceStaticPhaseController;
    if (this.turbulenceSymmetryController) targets["T-Symmetry"] = this.turbulenceSymmetryController;
    if (this.turbulenceBlurController) targets["T-Blur"] = this.turbulenceBlurController;

    if (this.turbulenceOffsetXController) targets["T-OffsetX"] = this.turbulenceOffsetXController;
    if (this.turbulenceOffsetYController) targets["T-OffsetY"] = this.turbulenceOffsetYController;

    if (this.turbulenceBiasSpeedXController) targets["T-BiasX Spd"] = this.turbulenceBiasSpeedXController;
    if (this.turbulenceBiasSpeedYController) targets["T-BiasY Spd"] = this.turbulenceBiasSpeedYController;
    if (this.turbulenceBiasStrengthController) targets["T-Bias Amt"] = this.turbulenceBiasStrengthController;
    if (this.turbulenceContrastController) targets["T-Contrast"] = this.turbulenceContrastController;
    if (this.turbulenceSeparationController) targets["T-Quantize"] = this.turbulenceSeparationController;

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
      if (!controller) return;

      try {
        controller.updateDisplay();
      } catch (e) {
        console.warn("Error updating controller display:", e);
      }
    };

    safeUpdateDisplay(this.turbulenceStrengthController);
    safeUpdateDisplay(this.turbulenceScaleController);
    safeUpdateDisplay(this.turbulenceSpeedController);
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
    safeUpdateDisplay(this.turbulenceOffsetXController);
    safeUpdateDisplay(this.turbulenceOffsetYController);
    safeUpdateDisplay(this.turbulenceBiasSpeedXController);
    safeUpdateDisplay(this.turbulenceBiasSpeedYController);
    safeUpdateDisplay(this.turbulenceBiasStrengthController);
    safeUpdateDisplay(this.turbulenceContrastController);
    safeUpdateDisplay(this.turbulenceSeparationController);
    safeUpdateDisplay(this.turbulenceBlurController);
  }

  getData() {
    const controllers = {};
    const targets = this.getControlTargets();

    // Extract values from controllers to create a serializable object
    for (const [key, controller] of Object.entries(targets)) {
      if (!controller) continue;

      try {
        controllers[key] = controller.getValue();
      } catch (e) {
        console.warn(`Error getting value from controller ${key}:`, e);
      }
    }

    return { controllers };
  }

  setData(data) {
    if (!data || data === "None") {
      if (this.debug.turbulences) console.log("Resetting turbulence to None preset");
      const targets = this.getControlTargets();

      // Reset all numerical values
      if (targets["T-Strength"]) targets["T-Strength"].setValue(0);
      if (targets["T-DirX"]) targets["T-DirX"].setValue(0);
      if (targets["T-DirY"]) targets["T-DirY"].setValue(0);

      // Reset toggle buttons
      if (targets["T-AfPosition"]) targets["T-AfPosition"].setValue(false);
      if (targets["T-AfScaleF"]) targets["T-AfScaleF"].setValue(false);
      if (targets["T-AfScale"]) targets["T-AfScale"].setValue(false);

      this.updateControllerDisplays();
      // Reset bias when loading "None" preset
      this.resetBias();
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
        if (!targets[key]) continue;

        try {
          targets[key].setValue(value);
        } catch (e) {
          console.warn(`Error setting value for controller ${key}:`, e);
        }
      }

      this.updateControllerDisplays();

      if (this.main && this.main.turbulenceField) {
        this.main.turbulenceField.setParameters(targets);
      }

      // Always reset bias when loading any preset
      this.resetBias();

      return true;
    } catch (error) {
      console.error("Error applying turbulence preset:", error);
      return false;
    }
  }

  // Update method to allow external code to update specific controllers
  updateBiasControllers() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    // Update UI for bias X and Y acceleration controllers if they exist
    if (this.turbulenceBiasSpeedXController) {
      this.turbulenceBiasSpeedXController.setValue(turbulence._displayBiasAccelX);
    }

    if (this.turbulenceBiasSpeedYController) {
      this.turbulenceBiasSpeedYController.setValue(turbulence._displayBiasAccelY);
    }

    // Update friction controller if it exists
    if (this.turbulenceBiasStrengthController) {
      this.turbulenceBiasStrengthController.setValue(turbulence.biasStrength);
    }
  }

  resetBias() {
    if (!this.main || !this.main.turbulenceField) {
      throw new Error("TurbulenceField is required for resetBias");
    }

    const turbulence = this.main.turbulenceField;

    // Reset the bias position, velocity and acceleration
    turbulence.resetBias();

    // Reset direction bias
    turbulence.directionBias[0] = 0;
    turbulence.directionBias[1] = 0;

    // Update the UI
    this.updateControllerDisplays();
  }

  dispose() {
    if (this.previewFolderObserver) {
      this.previewFolderObserver.disconnect();
      this.previewFolderObserver = null;
    }

    if (this.noiseFolderObserver) {
      this.noiseFolderObserver.disconnect();
      this.noiseFolderObserver = null;
    }

    if (this.guiStateObserver) {
      this.guiStateObserver.disconnect();
      this.guiStateObserver = null;
    }

    if (this.previewManager) {
      this.previewManager.dispose();
      this.previewManager = null;
    }

    if (super.dispose) {
      super.dispose();
    }
  }

  showStatusMessage(message, duration = 2000) {
    // Remove any existing message
    const existingMessage = document.querySelector('.turbulence-status-message');
    if (existingMessage) {
      document.body.removeChild(existingMessage);
    }

    // Create and show new message
    const statusElement = document.createElement('div');
    statusElement.className = 'turbulence-status-message';
    statusElement.textContent = message;

    document.body.appendChild(statusElement);

    // Fade out and remove after duration
    setTimeout(() => {
      statusElement.classList.add('fade-out');
      // Remove the element after the transition completes
      setTimeout(() => {
        if (statusElement.parentNode) {
          document.body.removeChild(statusElement);
        }
      }, 300); // Match CSS transition duration
    }, duration);
  }

  setupFolderStateObservers() {
    // Initialize observers array
    this.folderObservers = [];

    // Observe the main turbulence folder
    const turbulenceObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const isOpen = !this.gui.domElement.classList.contains('closed');
          this.isTurbulenceFolderOpen = isOpen;
          if (this.previewManager) {
            // Update parent folder visibility since turbulence is a parent
            this.previewManager.checkParentFolderVisibility();
          }
          break;
        }
      }
    });

    turbulenceObserver.observe(this.gui.domElement, { attributes: true });
    this.folderObservers.push(turbulenceObserver);

    // Find and observe the noise folder
    const noiseFolder = this.gui.domElement.querySelector('.folder[data-name="Noise"]');
    if (noiseFolder) {
      const noiseObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'class') {
            const isOpen = !noiseFolder.classList.contains('closed');
            this.isNoiseFolderOpen = isOpen;
            if (this.previewManager) {
              // Update parent folder visibility since noise is a parent
              this.previewManager.checkParentFolderVisibility();
            }
            break;
          }
        }
      });

      noiseObserver.observe(noiseFolder, { attributes: true });
      this.folderObservers.push(noiseObserver);
    }

    // Find and observe the previews folder
    const previewsFolder = this.gui.domElement.querySelector('.folder[data-name="Previews"]');
    if (previewsFolder) {
      const previewsObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'class') {
            const isOpen = !previewsFolder.classList.contains('closed');
            this.isPreviewsFolderOpen = isOpen;
            if (this.previewManager) {
              // This is the actual previews folder, use setFolderOpen
              this.previewManager.setFolderOpen(isOpen);
            }
            break;
          }
        }
      });

      previewsObserver.observe(previewsFolder, { attributes: true });
      this.folderObservers.push(previewsObserver);
    }
  }

  destroy() {
    // Call super.dispose if it exists from BaseUi
    super.dispose && super.dispose();
  }
}
