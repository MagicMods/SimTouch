import { BaseUi } from "./baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

class RightUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.initFolders();
    this.gui.title("Turbulences Fx");
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.initTurbulencePresetControls();
    this.initVoronoiPresetControls(); // Add voronoi presets
  }

  async initFolders() {
    this.initTurbulenceControls();
    this.voronoiFolder = this.createFolder("Voronoi Field"); // Add voronoi folder
    this.organicFolder = this.createFolder("Organic Behavior");
    this.gridFolder = this.createFolder("Grid");

    this.initVoronoiControls(); // Initialize voronoi controls
    this.initOrganicControls();
    this.initGridControls();

    this.gui.open();
    this.voronoiFolder.open();
    this.organicFolder.open(true);
    this.gridFolder.open(false);
  }

  //#region Turbulence

  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    // Store controllers as class properties
    this.turbulenceAffectPositionController = this.gui
      .add(turbulence, "affectPosition")
      .name("Affect Position");
    this.turbulenceScaleFieldController = this.gui
      .add(turbulence, "scaleField")
      .name("Affect Scale Field");
    this.turbulenceAffectScaleController = this.gui
      .add(turbulence, "affectScale")
      .name("Affect Scale Particles");

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
  //#endregion

  initTurbulencePresetControls() {
    // Find the correct container in dat.GUI's structure
    const containerElement = this.gui.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in turbulence folder");
      return;
    }

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";

    presetSelect.style.margin = "5px";

    this.updateTurbPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Turbulence preset selector changed to:", value);
      this.presetManager.loadTurbPreset(value, this.gui);
    });

    this.turbPresetControls = { selector: presetSelect };

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px";

    actionsContainer.style.flexWrap = "wrap"; // Allow wrapping if needed

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter turbulence preset name:");
      if (this.presetManager.saveTurbPreset(presetName, this.gui)) {
        this.updateTurbPresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedTurbPreset();
        alert(`Turbulence preset "${presetName}" saved.`);
      }
    });

    // DELETE BUTTON
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.style.margin = "0 2px";
    deleteButton.addEventListener("click", () => {
      const current = this.presetManager.getSelectedTurbPreset();
      console.log("Attempting to delete turbulence preset:", current);
      if (this.presetManager.deleteTurbPreset(current)) {
        this.updateTurbPresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedTurbPreset();
        alert(`Turbulence preset "${current}" deleted.`);
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Insert elements at the beginning of the folder
    this.gui.domElement.insertBefore(
      actionsContainer,
      this.gui.domElement.querySelector(".children")
    );

    this.gui.domElement.insertBefore(
      presetSelect,
      this.gui.domElement.querySelector(".children")
    );

    // Remove old dat.GUI controls if they exist
    const oldSaveControls = this.gui.controllers.filter(
      (c) => c.property === "save"
    );
    const oldDeleteControls = this.gui.controllers.filter(
      (c) => c.property === "delete"
    );

    // Remove old controls
    oldSaveControls.forEach((c) => this.gui.remove(c));
    oldDeleteControls.forEach((c) => this.gui.remove(c));
  }

  updateTurbPresetDropdown(selectElement) {
    const options = this.presetManager.getTurbPresetOptions();
    console.log("Updating turbulence preset dropdown with options:", options);

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.presetManager.getSelectedTurbPreset();
  }

  //#region Voronoi
  initVoronoiControls() {
    const voronoi = this.main.voronoiField;
    if (!voronoi) return;

    // Basic voronoi controls - store as class properties
    this.voronoiStrengthController = this.voronoiFolder
      .add(voronoi, "strength", 0, 10)
      .name("Strength");

    this.voronoiEdgeWidthController = this.voronoiFolder
      .add(voronoi, "edgeWidth", 0.1, 50)
      .name("Edge Width");

    this.voronoiAttractionController = this.voronoiFolder
      .add(voronoi, "attractionFactor", 0, 8)
      .name("Attraction");

    this.voronoiCellCountController = this.voronoiFolder
      .add(voronoi, "cellCount", 1, 10, 1)
      .name("Cell Count")
      .onChange(() => voronoi.regenerateCells());

    this.voronoiSpeedController = this.voronoiFolder
      .add(voronoi, "cellMovementSpeed", 0, 4)
      .name("Cell Speed");

    this.voronoiDecayRateController = this.voronoiFolder
      .add(voronoi, "decayRate", 0.9, 1)
      .name("Decay Rate");

    // Store reference to voronoiField for preset management
    if (this.main && this.main.voronoiField) {
      // Store reference directly in the folder
      this.voronoiFolder.object = this.voronoiFolder.object || {};
      this.voronoiFolder.object.voronoiField = this.main.voronoiField;

      // Also store in a property controllers can access
      if (
        this.voronoiFolder.controllers &&
        this.voronoiFolder.controllers.length > 0
      ) {
        const firstController = this.voronoiFolder.controllers[0];
        if (firstController && firstController.object) {
          firstController.object.__voronoiField = this.main.voronoiField;
        }
      }

      // If we have a preset manager, update its reference too
      if (this.presetManager) {
        this.presetManager.setVoronoiField(this.main.voronoiField);
      }
    }
  }

  /**
   * Initialize the Voronoi preset controls
   */
  initVoronoiPresetControls() {
    if (!this.presetManager) {
      console.warn("No preset manager available for voronoi presets");
      return;
    }

    // Create select dropdown
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("preset-select");
    presetSelect.style.padding = "4px";
    presetSelect.style.margin = "5px 0";
    presetSelect.style.width = "100%";

    this.updateVoronoiPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log(`Voronoi preset selector changed to: ${value}`);

      // Load the selected preset - regeneration happens in the PresetManager
      this.presetManager.loadVoronoiPreset(value, this.voronoiFolder);

      // No need to duplicate the regeneration logic here since it's in the PresetManager
    });

    this.voronoiPresetSelect = presetSelect;

    // Create action buttons container
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px 0";
    actionsContainer.style.width = "100%";

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.marginRight = "5px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter voronoi preset name:");
      if (presetName) {
        console.log(`Saving voronoi preset: ${presetName}`);
        if (
          this.presetManager.saveVoronoiPreset(presetName, this.voronoiFolder)
        ) {
          this.updateVoronoiPresetDropdown(presetSelect);
          presetSelect.value = presetName;
          alert(`Voronoi preset "${presetName}" saved.`);
        }
      }
    });

    // DELETE BUTTON
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.addEventListener("click", () => {
      const selectedPreset = presetSelect.value;
      if (selectedPreset && !["None", "Default"].includes(selectedPreset)) {
        const confirmed = confirm(`Delete voronoi preset "${selectedPreset}"?`);
        if (confirmed) {
          console.log(`Deleting voronoi preset: ${selectedPreset}`);
          if (this.presetManager.deleteVoronoiPreset(selectedPreset)) {
            this.updateVoronoiPresetDropdown(presetSelect);
            alert(`Voronoi preset "${selectedPreset}" deleted.`);
          }
        }
      } else {
        alert("Cannot delete protected presets.");
      }
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);

    // Insert controls at the top of the voronoi folder
    if (this.voronoiFolder && this.voronoiFolder.domElement) {
      const folderElement = this.voronoiFolder.domElement;

      // Insert dropdown and buttons
      folderElement.insertBefore(
        actionsContainer,
        folderElement.querySelector(".children")
      );

      folderElement.insertBefore(
        presetSelect,
        folderElement.querySelector(".children")
      );
    }
  }

  /**
   * Update the voronoi preset dropdown
   */
  updateVoronoiPresetDropdown(selectElement) {
    if (!selectElement || !this.presetManager) return;

    // Clear existing options
    selectElement.innerHTML = "";

    // Get preset options
    const options = this.presetManager.getVoronoiPresetOptions() || [];
    console.log(`Updating voronoi preset dropdown with options:`, options);

    // Add options to dropdown
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Select current preset
    const currentPreset =
      this.presetManager.getSelectedVoronoiPreset() || "None";
    selectElement.value = currentPreset;
  }
  //#endregion

  //#region Organic Behavior
  initOrganicControls() {
    const particles = this.main.particleSystem;
    if (!particles.organicBehavior) return;

    // Add global force control to the organic folder root
    this.addGlobalForceControl(this.organicFolder, particles.organicBehavior);

    // Store folder references for later use
    this.fluidFolder = this.organicFolder.addFolder("Fluid Parameters");
    this.swarmFolder = this.organicFolder.addFolder("Swarm Parameters");
    this.automataFolder = this.organicFolder.addFolder("Automata Parameters");

    // Add parameters without their individual force controls
    this.initFluidControls(this.fluidFolder, particles);
    this.initSwarmControls(this.swarmFolder, particles);
    this.initAutomataControls(this.automataFolder, particles);

    // Initial state
    this.updateOrganicFolders(this.main.gridRenderer.renderModes.currentMode);
    this.fluidFolder.open(false);
    this.swarmFolder.open(false);
    this.automataFolder.open(false);
  }

  // Add new method for global force control
  addGlobalForceControl(folder, behavior) {
    if (!behavior?.forceScales) return;

    // Set default force to 5.0 instead of calculating average
    const forceTypes = ["Fluid", "Swarm", "Automata"];
    const defaultForce = 5.0;

    // Create control object with fixed default force
    this.globalForceControl = {
      force: defaultForce,
    };

    // Apply the default force to all behavior types immediately
    forceTypes.forEach((type) => {
      if (behavior.forceScales[type]) {
        behavior.forceScales[type].base = defaultForce;
      }
    });

    // Create controller
    this.globalForceController = folder
      .add(this.globalForceControl, "force", 0, 5)
      .name("Force")
      .onChange((value) => {
        // Apply the same force value to all types
        forceTypes.forEach((type) => {
          if (behavior.forceScales[type]) {
            behavior.forceScales[type].base = value;
          }
        });
      });
  }
  updateOrganicFolders(mode) {
    const fluidEnabled = mode === "Fluid";
    const swarmEnabled = mode === "Swarm";
    const automataEnabled = mode === "Automata";
    console.log("updateOrganicFolders");

    // Enable/disable each folder based on current mode
    this.fluidFolder?.controllers.forEach((controller) =>
      controller.enable(fluidEnabled)
    );
    this.swarmFolder?.controllers.forEach((controller) =>
      controller.enable(swarmEnabled)
    );
    this.automataFolder?.controllers.forEach((controller) =>
      controller.enable(automataEnabled)
    );

    // Show/hide folders based on current mode
    if (fluidEnabled) {
      this.fluidFolder.open();
      this.swarmFolder.close();
      this.automataFolder.close();
    }
    if (swarmEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.open();
      this.automataFolder.close();
    }
    if (automataEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.close();
      this.automataFolder.open();
    }
    if (mode == "None") {
      this.fluidFolder.close();
      this.swarmFolder.close();
      this.automataFolder.close();
    }

    // Update the organic behavior mode
    if (this.main.particleSystem?.organicBehavior) {
      this.main.particleSystem.organicBehavior.currentBehavior = mode;
    }
  }
  //#endregion

  //#region Fluid
  initFluidControls(folder, particles) {
    // Add fluid parameters as class properties
    this.fluidRadiusController = folder
      .add(particles.organicBehavior.params.Fluid, "radius", 5, 50)
      .name("Radius");

    this.fluidSurfaceTensionController = folder
      .add(particles.organicBehavior.params.Fluid, "surfaceTension", 0, 1)
      .name("Surface Tension");

    this.fluidViscosityController = folder
      .add(particles.organicBehavior.params.Fluid, "viscosity", 0, 1)
      .name("Viscosity");

    this.fluidDampingController = folder
      .add(particles.organicBehavior.params.Fluid, "damping", 0, 1)
      .name("Damping");
  }

  // Modify other init methods similarly to remove individual force controls
  initSwarmControls(folder, particles) {
    // Add swarm parameters as class properties
    this.swarmRadiusController = folder
      .add(particles.organicBehavior.params.Swarm, "radius", 5, 50)
      .name("Radius");

    this.swarmCohesionController = folder
      .add(particles.organicBehavior.params.Swarm, "cohesion", 0, 2)
      .name("Cohesion");

    this.swarmAlignmentController = folder
      .add(particles.organicBehavior.params.Swarm, "alignment", 0, 2)
      .name("Alignment");

    this.swarmSeparationController = folder
      .add(particles.organicBehavior.params.Swarm, "separation", 0, 2)
      .name("Separation");

    this.swarmMaxSpeedController = folder
      .add(particles.organicBehavior.params.Swarm, "maxSpeed", 0, 1)
      .name("Max Speed");
  }

  initAutomataControls(folder, particles) {
    // Add automata parameters as class properties
    this.automataRadiusController = folder
      .add(particles.organicBehavior.params.Automata, "radius", 5, 200)
      .name("Radius");

    this.automataRepulsionController = folder
      .add(particles.organicBehavior.params.Automata, "repulsion", 0, 2)
      .name("Repulsion");

    this.automataAttractionController = folder
      .add(particles.organicBehavior.params.Automata, "attraction", 0, 10)
      .name("Attraction");

    this.automataThresholdController = folder
      .add(particles.organicBehavior.params.Automata, "threshold", 0, 1)
      .name("Threshold");
  }

  //#region Grid

  initGridControls() {
    const gridRenderer = this.main.gridRenderer;
    if (!gridRenderer) return;

    this.gridFolder.open();

    // Grid parameters
    if (gridRenderer.gridParams) {
      const gridParamFolder = this.gridFolder.addFolder("Parameters");

      this.gridTargetCellsController = gridParamFolder
        .add(gridRenderer.gridParams, "target", 1, 800, 1)
        .name("Target Cells")
        .onChange(() => gridRenderer.updateGrid());

      this.gridGapController = gridParamFolder
        .add(gridRenderer.gridParams, "gap", 0, 20, 1)
        .name("Gap (px)")
        .onChange(() => gridRenderer.updateGrid());

      this.gridAspectRatioController = gridParamFolder
        .add(gridRenderer.gridParams, "aspectRatio", 0.5, 4, 0.01)
        .name("Cell Ratio")
        .onChange(() => gridRenderer.updateGrid());

      this.gridScaleController = gridParamFolder
        .add(gridRenderer.gridParams, "scale", 0.1, 1, 0.01)
        .name("Grid Scale")
        .onChange(() => gridRenderer.updateGrid());

      // Grid Stats
      const stats = gridParamFolder.addFolder("Stats");
      stats.add(gridRenderer.gridParams, "cols").name("Columns").listen();
      stats.add(gridRenderer.gridParams, "rows").name("Rows").listen();
      stats.add(gridRenderer.gridParams, "width").name("Rect Width").listen();
      stats.add(gridRenderer.gridParams, "height").name("Rect Height").listen();
    }

    // Gradient controls - store in arrays if needed
    const gradientFolder = this.gridFolder.addFolder("Gradient");
    gradientFolder.open(false);
    const gradientPoints = this.main.gridRenderer.gradient.points;

    this.gradientPointControllers = [];

    gradientPoints.forEach((point, index) => {
      const pointFolder = gradientFolder.addFolder(`Point ${index + 1}`);
      const posController = pointFolder
        .add(point, "pos", 0, 100, 1)
        .name("Position")
        .onChange(() => this.main.gridRenderer.gradient.update());

      const colorController = pointFolder
        .addColor(point, "color")
        .name("Color")
        .onChange(() => this.main.gridRenderer.gradient.update());

      this.gradientPointControllers.push({
        position: posController,
        color: colorController,
      });
    });

    this.gridFolder.open(false);
  } //#endregion

  /**
   * Get controllers that can be targeted by pulse modulators
   * @returns {Object} Map of target names to controllers
   */
  getControlTargets() {
    const targets = {};

    // Turbulence controls
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

    // Voronoi controls
    if (this.voronoiStrengthController)
      targets["Voronoi Strength"] = this.voronoiStrengthController;
    if (this.voronoiSpeedController)
      targets["Cell Speed"] = this.voronoiSpeedController;
    if (this.voronoiEdgeWidthController)
      targets["Edge Width"] = this.voronoiEdgeWidthController;
    if (this.voronoiAttractionController)
      targets["Attraction"] = this.voronoiAttractionController;
    if (this.voronoiCellCountController)
      targets["Cell Count"] = this.voronoiCellCountController;

    // Organic controls
    if (this.globalForceController)
      targets["Force"] = this.globalForceController;

    // Fluid controls
    if (this.fluidRadiusController)
      targets["Fluid Radius"] = this.fluidRadiusController;
    if (this.fluidSurfaceTensionController)
      targets["Surface Tension"] = this.fluidSurfaceTensionController;
    if (this.fluidViscosityController)
      targets["Viscosity"] = this.fluidViscosityController;

    // Grid controls
    if (this.gridTargetCellsController)
      targets["Target Cells"] = this.gridTargetCellsController;
    if (this.gridGapController) targets["Grid Gap"] = this.gridGapController;
    if (this.gridScaleController)
      targets["Grid Scale"] = this.gridScaleController;

    return targets;
  }

  updateControllerDisplays() {
    // Update all turbulence controllers
    if (this.turbulenceStrengthController)
      this.turbulenceStrengthController.updateDisplay();
    if (this.turbulenceScaleController)
      this.turbulenceScaleController.updateDisplay();
    if (this.turbulenceSpeedController)
      this.turbulenceSpeedController.updateDisplay();
    if (this.turbulenceScaleStrengthController)
      this.turbulenceScaleStrengthController.updateDisplay();
    if (this.turbulenceInwardFactorController)
      this.turbulenceInwardFactorController.updateDisplay();
    if (this.turbulenceDecayRateController)
      this.turbulenceDecayRateController.updateDisplay();

    // Update all voronoi controllers
    if (this.voronoiStrengthController)
      this.voronoiStrengthController.updateDisplay();
    if (this.voronoiEdgeWidthController)
      this.voronoiEdgeWidthController.updateDisplay();
    if (this.voronoiAttractionController)
      this.voronoiAttractionController.updateDisplay();
    if (this.voronoiSpeedController)
      this.voronoiSpeedController.updateDisplay();
    if (this.voronoiCellCountController)
      this.voronoiCellCountController.updateDisplay();

    // Update organic behavior controllers
    if (this.globalForceController) this.globalForceController.updateDisplay();

    // Update fluid controllers
    if (this.fluidRadiusController) this.fluidRadiusController.updateDisplay();
    if (this.fluidSurfaceTensionController)
      this.fluidSurfaceTensionController.updateDisplay();
    if (this.fluidViscosityController)
      this.fluidViscosityController.updateDisplay();
    if (this.fluidDampingController)
      this.fluidDampingController.updateDisplay();

    // Update swarm controllers
    if (this.swarmRadiusController) this.swarmRadiusController.updateDisplay();
    if (this.swarmCohesionController)
      this.swarmCohesionController.updateDisplay();
    if (this.swarmAlignmentController)
      this.swarmAlignmentController.updateDisplay();
    if (this.swarmSeparationController)
      this.swarmSeparationController.updateDisplay();
    if (this.swarmMaxSpeedController)
      this.swarmMaxSpeedController.updateDisplay();

    // Update automata controllers
    if (this.automataRadiusController)
      this.automataRadiusController.updateDisplay();
    if (this.automataRepulsionController)
      this.automataRepulsionController.updateDisplay();
    if (this.automataAttractionController)
      this.automataAttractionController.updateDisplay();
    if (this.automataThresholdController)
      this.automataThresholdController.updateDisplay();

    // Update grid controllers
    if (this.gridTargetCellsController)
      this.gridTargetCellsController.updateDisplay();
    if (this.gridGapController) this.gridGapController.updateDisplay();
    if (this.gridAspectRatioController)
      this.gridAspectRatioController.updateDisplay();
    if (this.gridScaleController) this.gridScaleController.updateDisplay();
  }
}
export { RightUi };
