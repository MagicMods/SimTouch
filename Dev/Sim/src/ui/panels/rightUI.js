import { BaseUi } from "./baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

class RightUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.initFolders();
  }

  initFolders() {
    this.turbulenceFolder = this.createFolder("Turbulence");
    this.organicFolder = this.createFolder("Organic Behavior");
    this.gridFolder = this.createFolder("Grid");

    this.initTurbulenceControls();
    this.initOrganicControls();
    this.initGridControls();
  }

  initTurbulenceControls() {
    const turbulence = this.main.turbulenceField;

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

    // Fluid behavior
    const fluidFolder = this.organicFolder.addFolder("Fluid Parameters");
    fluidFolder
      .add(particles.organicBehavior.params.Fluid, "radius", 5, 50)
      .name("Radius");
    fluidFolder
      .add(particles.organicBehavior.params.Fluid, "surfaceTension", 0, 1)
      .name("Surface Tension");
    fluidFolder
      .add(particles.organicBehavior.params.Fluid, "viscosity", 0, 1)
      .name("Viscosity");
    fluidFolder
      .add(particles.organicBehavior.params.Fluid, "damping", 0.5, 1)
      .name("Damping");

    // Swarm behavior
    const swarmFolder = this.organicFolder.addFolder("Swarm Parameters");
    this.initSwarmControls(swarmFolder, particles);

    // Automata behavior
    const automataFolder = this.organicFolder.addFolder("Automata Parameters");
    this.initAutomataControls(automataFolder, particles);

    // Force scales
    const forceFolder = this.organicFolder.addFolder("Force");
    this.initForceControls(forceFolder, particles);
  }

  initSwarmControls(swarmFolder, particles) {
    swarmFolder
      .add(particles.organicBehavior.params.Swarm, "radius", 5, 50)
      .name("Radius");
    swarmFolder
      .add(particles.organicBehavior.params.Swarm, "cohesion", 0, 2)
      .name("Cohesion");
    swarmFolder
      .add(particles.organicBehavior.params.Swarm, "alignment", 0, 2)
      .name("Alignment");
    swarmFolder
      .add(particles.organicBehavior.params.Swarm, "separation", 0, 2)
      .name("Separation");
    swarmFolder
      .add(particles.organicBehavior.params.Swarm, "maxSpeed", 0, 2)
      .name("Max Speed");
  }

  initAutomataControls(automataFolder, particles) {
    automataFolder
      .add(particles.organicBehavior.params.Automata, "radius", 5, 50)
      .name("Radius");
    automataFolder
      .add(particles.organicBehavior.params.Automata, "repulsion", 0, 2)
      .name("Repulsion");
    automataFolder
      .add(particles.organicBehavior.params.Automata, "attraction", 0, 2)
      .name("Attraction");
    automataFolder
      .add(particles.organicBehavior.params.Automata, "threshold", 0, 1)
      .name("Threshold");
  }

  initForceControls(forceFolder, particles) {
    const behavior = particles.organicBehavior;
    if (!behavior || !behavior.forceScales) return;

    // Access force scales base values
    const controls = {
      fluid: behavior.forceScales.Fluid?.base || 1.0,
      swarm: behavior.forceScales.Swarm?.base || 1.0,
      automata: behavior.forceScales.Automata?.base || 1.0,
    };

    forceFolder
      .add(controls, "fluid", 0, 2)
      .name("Fluid Force")
      .onChange((value) => {
        if (behavior.forceScales.Fluid) behavior.forceScales.Fluid.base = value;
      });

    forceFolder
      .add(controls, "swarm", 0, 2)
      .name("Swarm Force")
      .onChange((value) => {
        if (behavior.forceScales.Swarm) behavior.forceScales.Swarm.base = value;
      });

    forceFolder
      .add(controls, "automata", 0, 2)
      .name("Automata Force")
      .onChange((value) => {
        if (behavior.forceScales.Automata)
          behavior.forceScales.Automata.base = value;
      });
  }

  initGridControls() {
    const gridRenderer = this.main.gridRenderer;
    if (!gridRenderer) return;

    this.gridFolder.open();

    // Grid parameters
    if (gridRenderer.gridParams) {
      const paramFolder = this.gridFolder.addFolder("Parameters");
      paramFolder
        .add(gridRenderer.gridParams, "target", 1, 800, 1)
        .name("Target Cells")
        .onChange(() => gridRenderer.updateGrid());
      paramFolder
        .add(gridRenderer.gridParams, "gap", 0, 20, 1)
        .name("Gap (px)")
        .onChange(() => gridRenderer.updateGrid());
    }

    // Gradient controls
    const gradientFolder = this.gridFolder.addFolder("Gradient");
    gradientFolder.open(false);
    const gradientPoints = this.main.gridRenderer.gradient.points;

    gradientPoints.forEach((point, index) => {
      gradientFolder.addColor(point, "color").name(`Color ${index + 1}`);
      if (index > 0) {
        gradientFolder.add(point, "pos", 0, 1).name(`Position ${index + 1}`);
      }
    });
  }
}
export { RightUi };
