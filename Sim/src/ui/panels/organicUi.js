import { BaseUi } from "../baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";
import { PresetManager } from "../../presets/presetManager.js";
export class OrganicUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.gui.title("Organic Behavior");
    this.initOrganicControls();
    this.gui.open();
  }

  initWithPresetManager(presetManager) {
    this.presetManager = presetManager;

    const organicContainer = this.gui.domElement.querySelector(".children");
    if (organicContainer) {
      this.presetControls = this.presetManager.createPresetControls(
        PresetManager.TYPES.ORGANIC,
        organicContainer,
        { insertFirst: true }
      );

      // Add the button controls after the preset controls
      if (this.buttonContainer) {
        const presetElement =
          organicContainer.querySelector(".preset-controls");
        if (presetElement && presetElement.nextSibling) {
          organicContainer.insertBefore(
            this.buttonContainer,
            presetElement.nextSibling
          );
        } else {
          organicContainer.insertBefore(
            this.buttonContainer,
            organicContainer.firstChild.nextSibling
          );
        }
      }
    }

    // if (this.main && this.main.turbulenceField && this.presetManager) {
    //   this.presetManager.setTurbulenceField(this.main.turbulenceField);
    // }
  }

  initOrganicControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior) return;

    const behaviorControl = {
      behavior: particles.organicBehavior.currentBehavior,
    };

    this.behaviorTypeController = this.gui
      .add(behaviorControl, "behavior", Object.values(Behaviors))
      .name("Behavior")
      .onChange((value) => {
        console.log("Behavior changed to:", value);
        particles.organicBehavior.currentBehavior = value;

        this.updateOrganicFolders(value);

        this.behaviorTypeController.updateDisplay();
      });

    this.behaviorTypeController.domElement.classList.add("full-width");
    this.addGlobalForceControl();

    this.fluidFolder = this.gui.addFolder("Fluid Parameters");
    this.swarmFolder = this.gui.addFolder("Swarm Parameters");
    this.automataFolder = this.gui.addFolder("Automata Parameters");

    this.initFluidControls();
    this.initSwarmControls();
    this.initAutomataControls();

    this.updateOrganicFolders(this.main.gridRenderer.renderModes.currentMode);
  }

  addGlobalForceControl() {
    const behavior = this.main.particleSystem?.organicBehavior;
    if (!behavior?.forceScales) return;

    const forceTypes = ["Fluid", "Swarm", "Automata"];
    const defaultForce = 5.0;

    this.globalForceControl = { force: defaultForce };

    forceTypes.forEach((type) => { if (behavior.forceScales[type]) { behavior.forceScales[type].base = defaultForce; } });

    this.globalForceController = this.gui.add(this.globalForceControl, "force", 0, 5).name("Force")
      .onChange((value) => {
        forceTypes.forEach((type) => {
          if (behavior.forceScales[type]) {
            behavior.forceScales[type].base = value;
          }
        });
      });
  }

  initFluidControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior?.params?.Fluid) return;

    const fluid = particles.organicBehavior.params.Fluid;
    this.fluidRadiusController = this.fluidFolder.add(fluid, "radius", 5, 50).name("F-Radius");
    this.fluidSurfaceTensionController = this.fluidFolder.add(fluid, "surfaceTension", 0, 1).name("F-SurfaceT");
    this.fluidViscosityController = this.fluidFolder.add(fluid, "viscosity", 0, 1).name("F-Visco");
    this.fluidDampingController = this.fluidFolder.add(fluid, "damping", 0, 1).name("F-Damp");
  }

  initSwarmControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior?.params?.Swarm) return;

    const swarm = particles.organicBehavior.params.Swarm;
    this.swarmRadiusController = this.swarmFolder.add(swarm, "radius", 5, 50).name("S-Radius");
    this.swarmCohesionController = this.swarmFolder.add(swarm, "cohesion", 0, 2).name("S-Cohesion");
    this.swarmAlignmentController = this.swarmFolder.add(swarm, "alignment", 0, 2).name("S-Align");
    this.swarmSeparationController = this.swarmFolder.add(swarm, "separation", 0, 2).name("S-Separation");
    this.swarmMaxSpeedController = this.swarmFolder.add(swarm, "maxSpeed", 0, 1).name("S-MaxSpeed");
  }

  initAutomataControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior?.params?.Automata) return;

    const automata = particles.organicBehavior.params.Automata;
    this.automataRadiusController = this.automataFolder.add(automata, "radius", 5, 200).name("A-Radius");
    this.automataRepulsionController = this.automataFolder.add(automata, "repulsion", 0, 2).name("A-Repulse");
    this.automataAttractionController = this.automataFolder.add(automata, "attraction", 0, 10).name("A-Attract");
    this.automataThresholdController = this.automataFolder.add(automata, "threshold", 0, 1).name("A-Threshold");
  }

  updateOrganicFolders(mode) {
    const fluidEnabled = mode === "Fluid";
    const swarmEnabled = mode === "Swarm";
    const automataEnabled = mode === "Automata";
    console.log(`Updating organic folders for mode: ${mode}`);

    const enableControllers = (folder, enabled) => {
      if (!folder?.controllers) return;
      folder.controllers.forEach((controller) => {
        if (controller.enable) controller.enable(enabled);
      });
    };

    // enableControllers(this.fluidFolder, fluidEnabled);
    // enableControllers(this.swarmFolder, swarmEnabled);
    // enableControllers(this.automataFolder, automataEnabled);

    if (fluidEnabled) {
      this.fluidFolder.open();
      this.swarmFolder.close();
      this.automataFolder.close();
    } else if (swarmEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.open();
      this.automataFolder.close();
    } else if (automataEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.close();
      this.automataFolder.open();
    }
    else {
      this.fluidFolder.open();
      this.swarmFolder.open();
      this.automataFolder.open();
    }

    // Update the organic behavior mode
    if (this.main.particleSystem?.organicBehavior) {
      this.main.particleSystem.organicBehavior.currentBehavior = mode;
    }
  }

  getControlTargets() {
    const targets = {};

    if (this.globalForceController) targets["O-Force"] = this.globalForceController;

    if (this.fluidRadiusController) targets["F-Radius"] = this.fluidRadiusController;
    if (this.fluidSurfaceTensionController) targets["F-SurfaceT"] = this.fluidSurfaceTensionController;
    if (this.fluidViscosityController) targets["F-Visco"] = this.fluidViscosityController;
    if (this.fluidDampingController) targets["F-Damp"] = this.fluidDampingController;

    if (this.swarmRadiusController) targets["S-Radius"] = this.swarmRadiusController;
    if (this.swarmCohesionController) targets["S-Cohesion"] = this.swarmCohesionController;
    if (this.swarmAlignmentController) targets["S-Align"] = this.swarmAlignmentController;
    if (this.swarmSeparationController) targets["S-Separation"] = this.swarmSeparationController;
    if (this.swarmMaxSpeedController) targets["S-MaxSpeed"] = this.swarmMaxSpeedController;

    if (this.automataRadiusController) targets["A-Radius"] = this.automataRadiusController;
    if (this.automataRepulsionController) targets["A-Repulse"] = this.automataRepulsionController;
    if (this.automataAttractionController) targets["A-Attract"] = this.automataAttractionController;
    if (this.automataThresholdController) targets["A-Threshold"] = this.automataThresholdController;

    return targets;
  }

  getData() {
    const controllers = {};
    const targets = this.getControlTargets();
    for (const [key, controller] of Object.entries(targets)) {
      if (controller && typeof controller.getValue === "function") {
        controllers[key] = controller.getValue();
      }
    }
    return { controllers };
  }

  setData(data) {
    if (!data || !data.controllers) {
      console.warn("Invalid Organics preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();
      for (const [key, value] of Object.entries(data.controllers)) {
        if (targets[key] && typeof targets[key].setValue === "function") {
          targets[key].setValue(value);
        }
      }
      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying Organics preset:", error);
      return false;
    }
  }

  updateControllerDisplays() {
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };


    safeUpdateDisplay(this.globalForceController);

    safeUpdateDisplay(this.fluidRadiusController);
    safeUpdateDisplay(this.fluidSurfaceTensionController);
    safeUpdateDisplay(this.fluidViscosityController);
    safeUpdateDisplay(this.fluidDampingController);

    safeUpdateDisplay(this.swarmRadiusController);
    safeUpdateDisplay(this.swarmCohesionController);
    safeUpdateDisplay(this.swarmAlignmentController);
    safeUpdateDisplay(this.swarmSeparationController);
    safeUpdateDisplay(this.swarmMaxSpeedController);

    safeUpdateDisplay(this.automataRadiusController);
    safeUpdateDisplay(this.automataRepulsionController);
    safeUpdateDisplay(this.automataAttractionController);
    safeUpdateDisplay(this.automataThresholdController);
  }
}
