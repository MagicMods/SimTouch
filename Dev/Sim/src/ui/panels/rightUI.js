import { BaseUi } from "./baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

class RightUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.initFolders();
  }

  async initFolders() {
    // Create folders first
    this.turbulenceFolder = this.createFolder("Turbulence");
    this.organicFolder = this.createFolder("Organic Behavior");
    this.gridFolder = this.createFolder("Grid");

    // Initialize controls immediately
    this.initTurbulenceControls(); // Remove async/await and presetManager dependency
    this.initOrganicControls();
    this.initGridControls();

    // Set default states
    this.turbulenceFolder.open();
    this.organicFolder.open();
    this.gridFolder.open(false);
  }

  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;
    if (!turbulence) return;

    // Main controls first
    this.turbulenceFolder.add(turbulence, "strength", 0, 2).name("Strength");
    this.turbulenceFolder.add(turbulence, "scale", 0.1, 10).name("Scale");
    this.turbulenceFolder.add(turbulence, "speed", 0, 5).name("Speed");

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
  }

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
      .add(particles.organicBehavior.params.Automata, "radius", 5, 50)
      .name("Radius");
    folder
      .add(particles.organicBehavior.params.Automata, "repulsion", 0, 2)
      .name("Repulsion");
    folder
      .add(particles.organicBehavior.params.Automata, "attraction", 0, 2)
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
      .add(control, "force", 0, 2)
      .name(`${type} Force`)
      .onChange((value) => {
        behavior.forceScales[type].base = value;
      });
  }

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
  }
}
export { RightUi };
