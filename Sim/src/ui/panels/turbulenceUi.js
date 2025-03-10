import { BaseUi } from "../baseUi.js";
import { PresetManager } from "../../presets/presetManager.js";

export class TurbulenceUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.presetControls = null;

    // Change the GUI title
    this.gui.title("Turbulence");

    // Create the main folder
    this.turbFolder = this.createFolder("Turbulence Controls");
    this.initTurbulenceControls();

    // Open GUI by default
    this.gui.open();
    this.turbFolder.open();
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;

    // Create standardized preset controls for turbulence
    const turbulenceContainer = this.gui.domElement.querySelector(".children");
    if (turbulenceContainer) {
      this.presetControls = this.presetManager.createPresetControls(
        PresetManager.TYPES.TURBULENCE,
        turbulenceContainer,
        { insertFirst: true }
      );
    }
  }

  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    // Store controllers as class properties
    this.turbulenceAffectPositionController = this.turbFolder
      .add(turbulence, "affectPosition")
      .name("Affect Position");

    this.turbulenceScaleFieldController = this.turbFolder
      .add(turbulence, "scaleField")
      .name("Affect Scale Field");

    this.turbulenceAffectScaleController = this.turbFolder
      .add(turbulence, "affectScale")
      .name("Affect Scale Particles");

    // Store these key controllers that will be targeted by modulators
    this.turbulenceStrengthController = this.turbFolder
      .add(turbulence, "strength", 0, 10)
      .name("Strength");

    this.turbulenceScaleController = this.turbFolder
      .add(turbulence, "scale", 0.1, 10)
      .name("Scale");

    this.turbulenceSpeedController = this.turbFolder
      .add(turbulence, "speed", 0, 20)
      .name("Speed");

    // Add min/max scale controls
    const scaleRangeFolder = this.turbFolder.addFolder("Scale Range");

    this.turbulenceScaleStrengthController = scaleRangeFolder
      .add(turbulence, "scaleStrength", 0, 1)
      .name("Scale Strength");

    this.turbulenceMinScaleController = scaleRangeFolder
      .add(turbulence, "minScale", 0.1, 1.0)
      .name("Min Scale");

    this.turbulenceMaxScaleController = scaleRangeFolder
      .add(turbulence, "maxScale", 1.0, 4.0)
      .name("Max Scale");

    const advancedFolder = this.turbFolder.addFolder("Advanced");

    this.turbulenceOctavesController = advancedFolder
      .add(turbulence, "octaves", 1, 8, 1)
      .name("Octaves");

    this.turbulencePersistenceController = advancedFolder
      .add(turbulence, "persistence", 0, 1)
      .name("Persistence");

    this.turbulenceRotationController = advancedFolder
      .add(turbulence, "rotation", 0, Math.PI * 2)
      .name("Rotation");

    this.turbulenceRotationSpeedController = advancedFolder
      .add(turbulence, "rotationSpeed", 0, 1)
      .name("Rotation Speed");

    this.turbulenceInwardFactorController = advancedFolder
      .add(turbulence, "inwardFactor", 0, 5)
      .name("Inward Pull");

    this.turbulenceDecayRateController = advancedFolder
      .add(turbulence, "decayRate", 0.9, 1)
      .name("Decay Rate");

    const biasFolder = this.turbFolder.addFolder("Direction Bias");

    this.turbulenceBiasXController = biasFolder
      .add(turbulence.directionBias, "0", -1, 1)
      .name("X Bias");

    this.turbulenceBiasYController = biasFolder
      .add(turbulence.directionBias, "1", -1, 1)
      .name("Y Bias");
  }

  getControlTargets() {
    const targets = {};

    if (this.turbulenceStrengthController)
      targets["Turbulence Strength"] = this.turbulenceStrengthController;
    if (this.turbulenceScaleController)
      targets["Turbulence Scale"] = this.turbulenceScaleController;
    if (this.turbulenceSpeedController)
      targets["Turbulence Speed"] = this.turbulenceSpeedController;
    if (this.turbulenceScaleStrengthController)
      targets["Scale Strength"] = this.turbulenceScaleStrengthController;
    if (this.turbulenceInwardFactorController)
      targets["Inward Pull"] = this.turbulenceInwardFactorController;
    if (this.turbulenceDecayRateController)
      targets["Turbulence Decay"] = this.turbulenceDecayRateController;

    return targets;
  }

  updateControllerDisplays() {
    // Helper function to safely update controllers
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };

    // Update all turbulence controllers
    safeUpdateDisplay(this.turbulenceStrengthController);
    safeUpdateDisplay(this.turbulenceScaleController);
    safeUpdateDisplay(this.turbulenceSpeedController);
    safeUpdateDisplay(this.turbulenceScaleStrengthController);
    safeUpdateDisplay(this.turbulenceInwardFactorController);
    safeUpdateDisplay(this.turbulenceDecayRateController);
    safeUpdateDisplay(this.turbulenceAffectPositionController);
    safeUpdateDisplay(this.turbulenceScaleFieldController);
    safeUpdateDisplay(this.turbulenceAffectScaleController);
    safeUpdateDisplay(this.turbulenceMinScaleController);
    safeUpdateDisplay(this.turbulenceMaxScaleController);
    safeUpdateDisplay(this.turbulenceOctavesController);
    safeUpdateDisplay(this.turbulencePersistenceController);
    safeUpdateDisplay(this.turbulenceRotationController);
    safeUpdateDisplay(this.turbulenceRotationSpeedController);
    safeUpdateDisplay(this.turbulenceBiasXController);
    safeUpdateDisplay(this.turbulenceBiasYController);
  }
}
