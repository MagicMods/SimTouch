import { BaseUi } from "./baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

class RightUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.initFolders();
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.initTurbulencePresetControls();
    this.initVoronoiPresetControls(); // Add voronoi presets
  }

  async initFolders() {
    this.turbulenceFolder = this.createFolder("Turbulence");
    this.voronoiFolder = this.createFolder("Voronoi Field"); // Add voronoi folder
    this.organicFolder = this.createFolder("Organic Behavior");
    this.gridFolder = this.createFolder("Grid");

    this.initTurbulenceControls();
    this.initVoronoiControls(); // Initialize voronoi controls
    this.initOrganicControls();
    this.initGridControls();

    this.turbulenceFolder.open();
    this.voronoiFolder.open();
    this.organicFolder.open(true);
    this.gridFolder.open(false);
  }

  //#region Turbulence
  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    this.turbulenceFolder
      .add(turbulence, "affectPosition")
      .name("Affect Position");
    this.turbulenceFolder
      .add(turbulence, "scaleField")
      .name("Affect Scale Field");
    this.turbulenceFolder
      .add(turbulence, "affectScale")
      .name("Affect Scale Particles");

    // Defer preset controls to setPresetManager
    this.turbulenceFolder.add(turbulence, "strength", 0, 10).name("Strength");
    this.turbulenceFolder.add(turbulence, "scale", 0.1, 10).name("Scale");
    this.turbulenceFolder.add(turbulence, "speed", 0, 20).name("Speed");

    // Add min/max scale controls
    const scaleRangeFolder = this.turbulenceFolder.addFolder("Scale Range");
    scaleRangeFolder
      .add(turbulence, "scaleStrength", 0, 1)
      .name("Scale Strength");
    scaleRangeFolder.add(turbulence, "minScale", 0.1, 1.0).name("Min Scale");
    scaleRangeFolder.add(turbulence, "maxScale", 1.0, 4.0).name("Max Scale");

    const advancedFolder = this.turbulenceFolder.addFolder("Advanced");
    advancedFolder.add(turbulence, "octaves", 1, 8, 1).name("Octaves");
    advancedFolder.add(turbulence, "persistence", 0, 1).name("Persistence");
    advancedFolder.add(turbulence, "rotation", 0, Math.PI * 2).name("Rotation");
    advancedFolder.add(turbulence, "inwardFactor", 0, 5).name("Inward Pull");
    advancedFolder.add(turbulence, "decayRate", 0.9, 1).name("Decay Rate");

    const biasFolder = this.turbulenceFolder.addFolder("Direction Bias");
    biasFolder.add(turbulence.directionBias, "0", -1, 1).name("X Bias");
    biasFolder.add(turbulence.directionBias, "1", -1, 1).name("Y Bias");
  }
  //#endregion

  initTurbulencePresetControls() {
    const presetSelect = document.createElement("select");
    presetSelect.classList.add("turb-preset-select");

    this.updateTurbPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Turbulence preset selector changed to:", value);
      this.presetManager.loadTurbPreset(value, this.gui);
    });

    this.turbPresetControls = { selector: presetSelect };

    this.turbulenceFolder
      .add(
        {
          save: () => {
            const presetName = prompt("Enter turbulence preset name:");
            if (this.presetManager.saveTurbPreset(presetName, this.gui)) {
              this.updateTurbPresetDropdown(presetSelect);
              presetSelect.value = this.presetManager.getSelectedTurbPreset();
              alert(`Turbulence preset "${presetName}" saved.`);
            }
          },
        },
        "save"
      )
      .name("Save Preset");

    this.turbulenceFolder
      .add(
        {
          delete: () => {
            const current = this.presetManager.getSelectedTurbPreset();
            console.log("Attempting to delete turbulence preset:", current);
            if (this.presetManager.deleteTurbPreset(current)) {
              this.updateTurbPresetDropdown(presetSelect);
              presetSelect.value = this.presetManager.getSelectedTurbPreset();
              alert(`Turbulence preset "${current}" deleted.`);
            }
          },
        },
        "delete"
      )
      .name("Delete Preset");

    this.turbulenceFolder.domElement.insertBefore(
      presetSelect,
      this.turbulenceFolder.domElement.querySelector(".children")
    );
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

    // Basic voronoi controls
    this.voronoiFolder.add(voronoi, "strength", 0, 10).name("Strength");
    this.voronoiFolder.add(voronoi, "edgeWidth", 0.1, 50).name("Edge Width");
    this.voronoiFolder
      .add(voronoi, "attractionFactor", 0, 8)
      .name("Attraction");
    this.voronoiFolder
      .add(voronoi, "cellCount", 1, 50, 1)
      .name("Cell Count")
      .onChange(() => voronoi.regenerateCells());
    this.voronoiFolder
      .add(voronoi, "cellMovementSpeed", 0, 4)
      .name("Cell Speed");
    this.voronoiFolder.add(voronoi, "decayRate", 0.9, 1).name("Decay Rate");
  }

  initVoronoiPresetControls() {
    if (!this.presetManager) return;

    const presetSelect = document.createElement("select");
    presetSelect.classList.add("turb-preset-select");

    this.updateVoronoiPresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Voronoi preset selector changed to:", value);
      this.presetManager.loadVoronoiPreset(value, this.voronoiFolder);
    });

    this.voronoiPresetControls = { selector: presetSelect };

    const saveButton = this.voronoiFolder.add(
      {
        save: () => {
          const presetName = prompt("Enter voronoi preset name:");
          if (
            this.presetManager.saveVoronoiPreset(presetName, this.voronoiFolder)
          ) {
            this.updateVoronoiPresetDropdown(presetSelect);
            presetSelect.value = this.presetManager.getSelectedVoronoiPreset();
            alert(`Voronoi preset "${presetName}" saved.`);
          }
        },
      },
      "save"
    );
    saveButton.name("Save Preset");

    const deleteButton = this.voronoiFolder.add(
      {
        delete: () => {
          const current = this.presetManager.getSelectedVoronoiPreset();
          console.log("Attempting to delete voronoi preset:", current);
          if (this.presetManager.deleteVoronoiPreset(current)) {
            this.updateVoronoiPresetDropdown(presetSelect);
            presetSelect.value = this.presetManager.getSelectedVoronoiPreset();
            alert(`Voronoi preset "${current}" deleted.`);
          }
        },
      },
      "delete"
    );
    deleteButton.name("Delete Preset");

    this.voronoiFolder.domElement.insertBefore(
      presetSelect,
      this.voronoiFolder.domElement.querySelector(".children")
    );
  }

  updateVoronoiPresetDropdown(selectElement) {
    const options = this.presetManager.getVoronoiPresetOptions();
    console.log("Updating voronoi preset dropdown with options:", options);

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.presetManager.getSelectedVoronoiPreset();
  }
  //#endregion

  //#region Organic Behavior
  initOrganicControls() {
    const particles = this.main.particleSystem;
    if (!particles.organicBehavior) return;

    // Store folder references for later use
    this.fluidFolder = this.organicFolder.addFolder("Fluid Parameters");
    this.swarmFolder = this.organicFolder.addFolder("Swarm Parameters");
    this.automataFolder = this.organicFolder.addFolder("Automata Parameters");

    // Add parameters with their respective force controls
    this.initFluidControls(this.fluidFolder, particles);
    this.initSwarmControls(this.swarmFolder, particles);
    this.initAutomataControls(this.automataFolder, particles);

    // Initial state
    this.updateOrganicFolders(this.main.gridRenderer.renderModes.currentMode);
    this.fluidFolder.open(false);
    this.swarmFolder.open(false);
    this.automataFolder.open(false);
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
    // Force controls are always enabled
    this.forceFolder?.controllers.forEach((controller) =>
      controller.enable(true)
    );
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
      this.automataFolder;
    }
  }
  //#endregion

  //#region Fluid
  initFluidControls(folder, particles) {
    // Add fluid parameters
    folder
      .add(particles.organicBehavior.params.Fluid, "radius", 5, 50)
      .name("Radius");
    folder
      .add(particles.organicBehavior.params.Fluid, "surfaceTension", 0, 1)
      .name("Surface Tension");
    folder
      .add(particles.organicBehavior.params.Fluid, "viscosity", 0, 1)
      .name("Viscosity");
    folder
      .add(particles.organicBehavior.params.Fluid, "damping", 0, 1)
      .name("Damping");

    this.addForceControl(folder, particles.organicBehavior, "Fluid");
  }

  initSwarmControls(folder, particles) {
    // Add swarm parameters
    folder
      .add(particles.organicBehavior.params.Swarm, "radius", 5, 50)
      .name("Radius");
    folder
      .add(particles.organicBehavior.params.Swarm, "cohesion", 0, 2)
      .name("Cohesion");
    folder
      .add(particles.organicBehavior.params.Swarm, "alignment", 0, 2)
      .name("Alignment");
    folder
      .add(particles.organicBehavior.params.Swarm, "separation", 0, 2)
      .name("Separation");
    folder
      .add(particles.organicBehavior.params.Swarm, "maxSpeed", 0, 1)
      .name("Max Speed");

    this.addForceControl(folder, particles.organicBehavior, "Swarm");
  }

  initAutomataControls(folder, particles) {
    // Add automata parameters
    folder
      .add(particles.organicBehavior.params.Automata, "radius", 5, 200)
      .name("Radius");
    folder
      .add(particles.organicBehavior.params.Automata, "repulsion", 0, 2)
      .name("Repulsion");
    folder
      .add(particles.organicBehavior.params.Automata, "attraction", 0, 10)
      .name("Attraction");
    folder
      .add(particles.organicBehavior.params.Automata, "threshold", 0, 1)
      .name("Threshold");

    this.addForceControl(folder, particles.organicBehavior, "Automata");
  }

  addForceControl(folder, behavior, type) {
    if (!behavior?.forceScales?.[type]) return;

    const control = { force: behavior.forceScales[type].base || 1.0 };
    folder
      .add(control, "force", 0, 5)
      .name(`${type} Force`)
      .onChange((value) => {
        behavior.forceScales[type].base = value;
      });
  }
  //#endregion

  //#region Grid

  initGridControls() {
    const gridRenderer = this.main.gridRenderer;
    if (!gridRenderer) return;

    this.gridFolder.open();

    // Grid parameters
    if (gridRenderer.gridParams) {
      const gridParamFolder = this.gridFolder.addFolder("Parameters");

      gridParamFolder
        .add(gridRenderer.gridParams, "target", 1, 800, 1)
        .name("Target Cells")
        .onChange(() => gridRenderer.updateGrid());

      gridParamFolder
        .add(gridRenderer.gridParams, "gap", 0, 20, 1)
        .name("Gap (px)")
        .onChange(() => gridRenderer.updateGrid());

      gridParamFolder
        .add(gridRenderer.gridParams, "aspectRatio", 0.5, 4, 0.01)
        .name("Cell Ratio")
        .onChange(() => gridRenderer.updateGrid());

      gridParamFolder
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

    // Gradient controls
    const gradientFolder = this.gridFolder.addFolder("Gradient");
    gradientFolder.open(false);
    const gradientPoints = this.main.gridRenderer.gradient.points;

    gradientPoints.forEach((point, index) => {
      const pointFolder = gradientFolder.addFolder(`Point ${index + 1}`);
      pointFolder
        .add(point, "pos", 0, 100, 1)
        .name("Position")
        .onChange(() => this.main.gridRenderer.gradient.update());
      pointFolder
        .addColor(point, "color")
        .name("Color")
        .onChange(() => this.main.gridRenderer.gradient.update());
    });

    this.gridFolder.open(false);
  } //#endregion
}
export { RightUi };
