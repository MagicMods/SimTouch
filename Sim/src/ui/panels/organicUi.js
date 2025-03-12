import { BaseUi } from "../baseUi.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

export class OrganicUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Change the GUI title
    this.gui.title("Organic Behavior");

    // Create the main folder
    this.initOrganicControls();

    // Open GUI by default
    this.gui.open();
  }

  initOrganicControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior) return;

    const behaviorControl = {
      behavior: particles.organicBehavior.currentBehavior,
    };

    // Store as class property instead of in this.controls
    this.behaviorTypeController = this.gui
      .add(behaviorControl, "behavior", Object.values(Behaviors))
      .name("Behavior")
      .onChange((value) => {
        console.log("Behavior changed to:", value);
        particles.organicBehavior.currentBehavior = value;

        if (this.main.ui?.organicUi?.updateOrganicFolders) {
          this.main.ui.organicUi.updateOrganicFolders(value);
        }

        this.behaviorTypeController.updateDisplay();
      });

    this.behaviorTypeController.domElement.classList.add("full-width");

    // Add global force control to the organic folder root
    this.addGlobalForceControl();

    // Store folder references for later use
    this.fluidFolder = this.gui.addFolder("Fluid Parameters");
    this.swarmFolder = this.gui.addFolder("Swarm Parameters");
    this.automataFolder = this.gui.addFolder("Automata Parameters");

    // Add parameters without their individual force controls
    this.initFluidControls();
    this.initSwarmControls();
    this.initAutomataControls();

    // Initial state
    this.updateOrganicFolders(this.main.gridRenderer.renderModes.currentMode);
  }

  addGlobalForceControl() {
    const behavior = this.main.particleSystem?.organicBehavior;
    if (!behavior?.forceScales) return;

    // Set default force to 5.0
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
    this.globalForceController = this.gui
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

  initFluidControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior?.params?.Fluid) return;

    const fluid = particles.organicBehavior.params.Fluid;

    // Add fluid parameters as class properties
    this.fluidRadiusController = this.fluidFolder
      .add(fluid, "radius", 5, 50)
      .name("Radius");

    this.fluidSurfaceTensionController = this.fluidFolder
      .add(fluid, "surfaceTension", 0, 1)
      .name("Surface Tension");

    this.fluidViscosityController = this.fluidFolder
      .add(fluid, "viscosity", 0, 1)
      .name("Viscosity");

    this.fluidDampingController = this.fluidFolder
      .add(fluid, "damping", 0, 1)
      .name("Damping");
  }

  initSwarmControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior?.params?.Swarm) return;

    const swarm = particles.organicBehavior.params.Swarm;

    // Add swarm parameters as class properties
    this.swarmRadiusController = this.swarmFolder
      .add(swarm, "radius", 5, 50)
      .name("Radius");

    this.swarmCohesionController = this.swarmFolder
      .add(swarm, "cohesion", 0, 2)
      .name("Cohesion");

    this.swarmAlignmentController = this.swarmFolder
      .add(swarm, "alignment", 0, 2)
      .name("Alignment");

    this.swarmSeparationController = this.swarmFolder
      .add(swarm, "separation", 0, 2)
      .name("Separation");

    this.swarmMaxSpeedController = this.swarmFolder
      .add(swarm, "maxSpeed", 0, 1)
      .name("Max Speed");
  }

  initAutomataControls() {
    const particles = this.main.particleSystem;
    if (!particles?.organicBehavior?.params?.Automata) return;

    const automata = particles.organicBehavior.params.Automata;

    // Add automata parameters as class properties
    this.automataRadiusController = this.automataFolder
      .add(automata, "radius", 5, 200)
      .name("Radius");

    this.automataRepulsionController = this.automataFolder
      .add(automata, "repulsion", 0, 2)
      .name("Repulsion");

    this.automataAttractionController = this.automataFolder
      .add(automata, "attraction", 0, 10)
      .name("Attraction");

    this.automataThresholdController = this.automataFolder
      .add(automata, "threshold", 0, 1)
      .name("Threshold");
  }

  updateOrganicFolders(mode) {
    const fluidEnabled = mode === "Fluid";
    const swarmEnabled = mode === "Swarm";
    const automataEnabled = mode === "Automata";
    console.log(`Updating organic folders for mode: ${mode}`);

    // Enable/disable controllers based on current mode
    const enableControllers = (folder, enabled) => {
      if (!folder?.controllers) return;
      folder.controllers.forEach((controller) => {
        if (controller.enable) controller.enable(enabled);
      });
    };

    enableControllers(this.fluidFolder, fluidEnabled);
    enableControllers(this.swarmFolder, swarmEnabled);
    enableControllers(this.automataFolder, automataEnabled);

    // Show/hide folders based on current mode
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
    } else {
      this.fluidFolder.close();
      this.swarmFolder.close();
      this.automataFolder.close();
    }

    // Update the organic behavior mode
    if (this.main.particleSystem?.organicBehavior) {
      this.main.particleSystem.organicBehavior.currentBehavior = mode;
    }
  }

  getControlTargets() {
    const targets = {};

    // Organic controls (already included)
    if (this.globalForceController)
      targets["Force"] = this.globalForceController;

    // Fluid controls (partially included)
    if (this.fluidRadiusController)
      targets["Fluid Radius"] = this.fluidRadiusController;
    if (this.fluidSurfaceTensionController)
      targets["Surface Tension"] = this.fluidSurfaceTensionController;
    if (this.fluidViscosityController)
      targets["Viscosity"] = this.fluidViscosityController;
    // Missing fluid control
    if (this.fluidDampingController)
      targets["Damping"] = this.fluidDampingController;

    // Swarm controls (completely missing)
    if (this.swarmRadiusController)
      targets["Swarm Radius"] = this.swarmRadiusController;
    if (this.swarmCohesionController)
      targets["Cohesion"] = this.swarmCohesionController;
    if (this.swarmAlignmentController)
      targets["Alignment"] = this.swarmAlignmentController;
    if (this.swarmSeparationController)
      targets["Separation"] = this.swarmSeparationController;
    if (this.swarmMaxSpeedController)
      targets["Max Speed"] = this.swarmMaxSpeedController;

    // Automata controls (completely missing)
    if (this.automataRadiusController)
      targets["Automata Radius"] = this.automataRadiusController;
    if (this.automataRepulsionController)
      targets["Repulsion"] = this.automataRepulsionController;
    if (this.automataAttractionController)
      targets["Attraction"] = this.automataAttractionController;
    if (this.automataThresholdController)
      targets["Threshold"] = this.automataThresholdController;

    return targets;
  }
  // Add to ParamUi class
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
    if (!data || !data.controllers) {
      console.warn("Invalid Organics preset data");
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
      return true;
    } catch (error) {
      console.error("Error applying Organics preset:", error);
      return false;
    }
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

    // Update organic behavior controllers
    safeUpdateDisplay(this.globalForceController);

    // Update fluid controllers
    safeUpdateDisplay(this.fluidRadiusController);
    safeUpdateDisplay(this.fluidSurfaceTensionController);
    safeUpdateDisplay(this.fluidViscosityController);
    safeUpdateDisplay(this.fluidDampingController);

    // Update swarm controllers
    safeUpdateDisplay(this.swarmRadiusController);
    safeUpdateDisplay(this.swarmCohesionController);
    safeUpdateDisplay(this.swarmAlignmentController);
    safeUpdateDisplay(this.swarmSeparationController);
    safeUpdateDisplay(this.swarmMaxSpeedController);

    // Update automata controllers
    safeUpdateDisplay(this.automataRadiusController);
    safeUpdateDisplay(this.automataRepulsionController);
    safeUpdateDisplay(this.automataAttractionController);
    safeUpdateDisplay(this.automataThresholdController);
  }
}
