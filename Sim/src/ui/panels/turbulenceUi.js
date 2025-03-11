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
    this.initTurbulenceControls();

    // Open GUI by default
    this.gui.open();
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;

    // Create standardized preset controls for turbulence
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
  }

  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

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
    });

    // Add buttons to container
    buttonContainer.appendChild(posButton);
    buttonContainer.appendChild(fieldButton);
    buttonContainer.appendChild(scaleButton);

    // Add the button container to the GUI children
    const guiChildren = this.gui.domElement.querySelector(".children");
    if (guiChildren) {
      guiChildren.insertBefore(buttonContainer, guiChildren.firstChild);
    }

    // Store references for later updating
    this.positionButton = posButton;
    this.fieldButton = fieldButton;
    this.scaleButton = scaleButton;

    // Store these key controllers that will be targeted by modulators
    this.turbulenceStrengthController = this.gui
      .add(turbulence, "strength", 0, 10)
      .name("Strength");

    this.turbulenceScaleController = this.gui
      .add(turbulence, "scale", 0.1, 10)
      .name("Scale");

    this.turbulenceSpeedController = this.gui
      .add(turbulence, "speed", 0, 20)
      .name("Speed");

    // Add min/max scale controls
    const scaleRangeFolder = this.gui.addFolder("Scale Range");

    this.turbulenceScaleStrengthController = scaleRangeFolder
      .add(turbulence, "scaleStrength", 0, 1)
      .name("Scale Strength");

    this.turbulenceMinScaleController = scaleRangeFolder
      .add(turbulence, "minScale", 0.1, 1.0)
      .name("Min Scale");

    this.turbulenceMaxScaleController = scaleRangeFolder
      .add(turbulence, "maxScale", 1.0, 4.0)
      .name("Max Scale");

    const advancedFolder = this.gui.addFolder("Advanced");

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

    const biasFolder = this.gui.addFolder("Direction Bias");

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
    // Update button states
    const turbulence = this.main.turbulenceField;
    if (turbulence) {
      if (this.positionButton) {
        this.positionButton.classList.toggle(
          "active",
          turbulence.affectPosition
        );
      }
      if (this.fieldButton) {
        this.fieldButton.classList.toggle("active", turbulence.scaleField);
      }
      if (this.scaleButton) {
        this.scaleButton.classList.toggle("active", turbulence.affectScale);
      }
    }

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
    safeUpdateDisplay(this.turbulenceMinScaleController);
    safeUpdateDisplay(this.turbulenceMaxScaleController);
    safeUpdateDisplay(this.turbulenceOctavesController);
    safeUpdateDisplay(this.turbulencePersistenceController);
    safeUpdateDisplay(this.turbulenceRotationController);
    safeUpdateDisplay(this.turbulenceRotationSpeedController);
    safeUpdateDisplay(this.turbulenceBiasXController);
    safeUpdateDisplay(this.turbulenceBiasYController);
  }

  // Add this method to the TurbulenceUi class
  loadPresetData(preset) {
    if (!preset || !preset.controllers) {
      console.warn("Invalid turbulence preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Apply values from preset
      for (const key in preset.controllers) {
        if (targets.hasOwnProperty(key)) {
          targets[key] = preset.controllers[key];
        }
      }

      // Update UI
      this.updateControllerDisplays();

      // Important: Update the actual turbulence field with new values
      if (this.main && this.main.turbulenceField) {
        this.main.turbulenceField.setParameters(targets);
      }

      return true;
    } catch (error) {
      console.error("Error applying turbulence preset data:", error);
      return false;
    }
  }

  // Standard data extraction method - implement in all UI components
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

  // Standard data application method - implement in all UI components
  setData(data) {
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

      // Update UI display
      this.updateControllerDisplays();

      // Update the field directly if needed
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
