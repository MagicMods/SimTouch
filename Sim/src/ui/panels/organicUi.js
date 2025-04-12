import { BaseUi } from "../baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";
import { PresetManager } from "../../presets/presetManager.js";
import { eventBus } from '../../util/eventManager.js';

export class OrganicUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.gui.title("Organic Behavior");
    this.initOrganicControls();
    this.gui.open(false);
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
    const organicParams = this.main.simParams.organic;
    const organicBehavior = this.main.particleSystem.organicBehavior;

    this.behaviorTypeController = this.gui
      .add(organicParams, "behavior", Object.values(Behaviors))
      .name("Behavior")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'organic.behavior', value });
        this.updateOrganicFolders(value);
      });

    this.behaviorTypeController.domElement.classList.add("full-width");
    this.addGlobalForceControl();

    this.fluidFolder = this.gui.addFolder("Fluid Parameters");
    this.swarmFolder = this.gui.addFolder("Swarm Parameters");
    this.automataFolder = this.gui.addFolder("Automata Parameters");
    this.chainFolder = this.gui.addFolder("Chain Parameters");

    this.initFluidControls();
    this.initSwarmControls();
    this.initAutomataControls();
    this.initChainControls();

    this.updateOrganicFolders(organicParams.behavior);
  }

  addGlobalForceControl() {
    const organicParams = this.main.simParams.organic;

    this.globalForceController = this.gui.add(organicParams, "globalForce", 0, 5).name("O-Force")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'organic.globalForce', value });
      });

    this.globalRadiusController = this.gui.add(organicParams, "globalRadius", 5, 100).name("O-Radius")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'organic.globalRadius', value });
      });
  }

  initFluidControls() {
    const organicParams = this.main.simParams.organic;
    if (!organicParams || !organicParams.Fluid) return;
    const fluidParams = organicParams.Fluid;

    this.fluidSurfaceTensionController = this.fluidFolder.add(fluidParams, "surfaceTension", 0, 1).name("F-SurfaceT")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Fluid.surfaceTension', value }));
    this.fluidViscosityController = this.fluidFolder.add(fluidParams, "viscosity", 0, 1).name("F-Visco")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Fluid.viscosity', value }));
    this.fluidDampingController = this.fluidFolder.add(fluidParams, "damping", 0, 1).name("F-Damp")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Fluid.damping', value }));
  }

  initSwarmControls() {
    const organicParams = this.main.simParams.organic;
    if (!organicParams || !organicParams.Swarm) return;
    const swarmParams = organicParams.Swarm;

    this.swarmCohesionController = this.swarmFolder.add(swarmParams, "cohesion", 0, 2).name("S-Cohesion")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Swarm.cohesion', value }));
    this.swarmAlignmentController = this.swarmFolder.add(swarmParams, "alignment", 0, 2).name("S-Align")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Swarm.alignment', value }));
    this.swarmSeparationController = this.swarmFolder.add(swarmParams, "separation", 0, 2).name("S-Separation")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Swarm.separation', value }));
    this.swarmMaxSpeedController = this.swarmFolder.add(swarmParams, "maxSpeed", 0, 1).name("S-MaxSpeed")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Swarm.maxSpeed', value }));
  }

  initAutomataControls() {
    const organicParams = this.main.simParams.organic;
    if (!organicParams || !organicParams.Automata) return;
    const automataParams = organicParams.Automata;

    this.automataRepulsionController = this.automataFolder.add(automataParams, "repulsion", 0, 2).name("A-Repulse")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Automata.repulsion', value }));
    this.automataAttractionController = this.automataFolder.add(automataParams, "attraction", 0, 10).name("A-Attract")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Automata.attraction', value }));
    this.automataThresholdController = this.automataFolder.add(automataParams, "threshold", 0, 1).name("A-Threshold")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Automata.threshold', value }));
  }

  initChainControls() {
    const organicParams = this.main.simParams.organic;
    if (!organicParams || !organicParams.Chain) return;
    const chainParams = organicParams.Chain;

    this.chainLinkDistController = this.chainFolder.add(chainParams, "linkDistance", 0.01, 50, 0.1).name("Ch-LinkDist")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Chain.linkDistance', value }));
    this.chainLinkStrengthController = this.chainFolder.add(chainParams, "linkStrength", 0, 10).name("Ch-LinkStr")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Chain.linkStrength', value }));
    this.chainAlignController = this.chainFolder.add(chainParams, "alignment", 0, 10, 0.1).name("Ch-Align")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Chain.alignment', value }));
    this.chainBranchController = this.chainFolder.add(chainParams, "branchProb", 0, 10, 1).name("Ch-Branch")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Chain.branchProb', value }));
    this.chainMaxLinksController = this.chainFolder.add(chainParams, "maxLinks", 2, 100, 1).name("Ch-MaxLen")
      .onChange(value => eventBus.emit('uiControlChanged', { paramPath: 'organic.Chain.maxLinks', value }));
  }

  updateOrganicFolders(mode) {
    const fluidEnabled = mode === "Fluid";
    const swarmEnabled = mode === "Swarm";
    const automataEnabled = mode === "Automata";
    const chainEnabled = mode === "Chain";
    console.log(`Updating organic folders for mode: ${mode}`);

    const enableControllers = (folder, enabled) => {
      if (!folder || !folder.controllers) {
        return;
      }

      folder.controllers.forEach((controller) => {
        if (controller.enable) controller.enable(enabled);
      });
    };

    // Set folder visibility based on active mode
    if (fluidEnabled) {
      this.fluidFolder.open();
      this.swarmFolder.close();
      this.automataFolder.close();
      this.chainFolder.close();
    } else if (swarmEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.open();
      this.automataFolder.close();
      this.chainFolder.close();
    } else if (automataEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.close();
      this.automataFolder.open();
      this.chainFolder.close();
    } else if (chainEnabled) {
      this.fluidFolder.close();
      this.swarmFolder.close();
      this.automataFolder.close();
      this.chainFolder.open();
    } else {
      this.fluidFolder.open();
      this.swarmFolder.open();
      this.automataFolder.open();
      this.chainFolder.open();
    }

    // Update the organic behavior mode
    if (this.main.particleSystem && this.main.particleSystem.organicBehavior) {
      this.main.particleSystem.organicBehavior.currentBehavior = mode;
    }
  }

  getControlTargets() {
    const targets = {};

    if (this.globalForceController) targets["O-Force"] = this.globalForceController;
    if (this.globalRadiusController) targets["O-Radius"] = this.globalRadiusController;

    if (this.fluidSurfaceTensionController) targets["F-SurfaceT"] = this.fluidSurfaceTensionController;
    if (this.fluidViscosityController) targets["F-Visco"] = this.fluidViscosityController;
    if (this.fluidDampingController) targets["F-Damp"] = this.fluidDampingController;

    if (this.swarmCohesionController) targets["S-Cohesion"] = this.swarmCohesionController;
    if (this.swarmAlignmentController) targets["S-Align"] = this.swarmAlignmentController;
    if (this.swarmSeparationController) targets["S-Separation"] = this.swarmSeparationController;
    if (this.swarmMaxSpeedController) targets["S-MaxSpeed"] = this.swarmMaxSpeedController;

    if (this.automataRepulsionController) targets["A-Repulse"] = this.automataRepulsionController;
    if (this.automataAttractionController) targets["A-Attract"] = this.automataAttractionController;
    if (this.automataThresholdController) targets["A-Threshold"] = this.automataThresholdController;

    // Add chain controllers
    if (this.chainLinkDistController) targets["Ch-LinkDist"] = this.chainLinkDistController;
    if (this.chainLinkStrengthController) targets["Ch-LinkStr"] = this.chainLinkStrengthController;
    if (this.chainAlignController) targets["Ch-Align"] = this.chainAlignController;
    if (this.chainBranchController) targets["Ch-Branch"] = this.chainBranchController;
    if (this.chainMaxLinksController) targets["Ch-MaxLinks"] = this.chainMaxLinksController;
    if (this.chainRepelController) targets["Ch-Repel"] = this.chainRepelController; // Add this controller

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
    safeUpdateDisplay(this.globalRadiusController);

    safeUpdateDisplay(this.fluidSurfaceTensionController);
    safeUpdateDisplay(this.fluidViscosityController);
    safeUpdateDisplay(this.fluidDampingController);

    safeUpdateDisplay(this.swarmCohesionController);
    safeUpdateDisplay(this.swarmAlignmentController);
    safeUpdateDisplay(this.swarmSeparationController);
    safeUpdateDisplay(this.swarmMaxSpeedController);

    safeUpdateDisplay(this.automataRepulsionController);
    safeUpdateDisplay(this.automataAttractionController);
    safeUpdateDisplay(this.automataThresholdController);

    safeUpdateDisplay(this.chainLinkDistController);
    safeUpdateDisplay(this.chainLinkStrengthController);
    safeUpdateDisplay(this.chainAlignController);
    safeUpdateDisplay(this.chainBranchController);
    safeUpdateDisplay(this.chainMaxLinksController);
    safeUpdateDisplay(this.chainRepelController);
  }
}
