import { TurbulenceUi } from "./panels/turbulenceUi.js";
import { VoronoiUi } from "./panels/voronoiUi.js";
import { OrganicUi } from "./panels/organicUi.js";
import { PulseModulationUi } from "./panels/pulseModulationUi.js";
import { NetworkUi } from "./panels/networkUi.js";
import { InputModulationUi } from "./panels/inputModulationUi.js";
import { PresetUi } from "./panels/presetUi.js";
import { PresetManager } from "../presets/presetManager.js";
import { InputsUi } from "./panels/inputsUi.js";
import { DebugUi } from "./panels/debugUi.js";
import { ParamUi } from "./panels/paramUi.js";
import { ParticleUi } from "./panels/particleUi.js";
import { GravityUi } from "./panels/gravityUi.js";
import { CollisionUi } from "./panels/collisionUi.js";
import { BoundaryUi } from "./panels/boundaryUi.js";
import { RandomizerUi } from "./panels/randomizerUi.js";
import { NewGridUi } from "./panels/newGridUi.js";

import Stats from "../util/statsModule.js";
import { eventBus } from "../util/eventManager.js";

export class UiManager {
  constructor(main) {
    if (!main) {
      throw new Error("Main reference is required for UiManager");
    }

    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");
    this.pulseModContainer = this.createContainer("left-middle");
    this.presetContainer = this.createContainer("center");
    this.networkContainer = this.createContainer("right-center");
    this.inputModContainer = this.createContainer("right-middle");

    this.initializeUIComponents();

    this.stats = new Stats();
    this.initStats();
    this.allTargets = {};

    this.initializeModulatorManager();
    this.initializePresetManager();

    eventBus.on('uiControlChanged', ({ paramPath, value }) => {
      if (paramPath === 'rendering.gridMode') {
        this.organicUi.updateOrganicFolders(value);
      }
    });
  }

  initializeUIComponents() {
    //Left UI
    this.paramUi = new ParamUi(this.main, this.leftContainer);
    this.particleUi = new ParticleUi(this.main, this.leftContainer);
    this.gravityUi = new GravityUi(this.main, this.leftContainer);
    this.collisionUi = new CollisionUi(this.main, this.leftContainer);
    this.boundaryUi = new BoundaryUi(this.main, this.leftContainer);
    this.inputsUi = new InputsUi(this.main, this.leftContainer);
    this.networkUi = new NetworkUi(this.main, this.leftContainer);
    this.debugUi = new DebugUi(this.main, this.leftContainer);

    // Right UI
    this.pulseModUi = new PulseModulationUi(this.main, this.pulseModContainer);
    this.inputModUi = new InputModulationUi(this.main, this.inputModContainer);
    this.presetUi = new PresetUi(this.main, this.presetContainer);

    this.turbulenceUi = new TurbulenceUi(this.main, this.rightContainer);
    this.voronoiUi = new VoronoiUi(this.main, this.rightContainer);
    this.organicUi = new OrganicUi(this.main, this.rightContainer);
    this.newGridUi = new NewGridUi(this.main, this.rightContainer);


    this.randomizerUi = new RandomizerUi(this.main, this.presetContainer);
  }


  createContainer(position) {
    const container = document.createElement("div");
    container.className = `gui-container-${position}`;
    document.body.appendChild(container);
    return container;
  }

  initStats() {
    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";
    statsContainer.appendChild(this.stats.dom);
    document.body.appendChild(statsContainer);
  }

  initializeModulatorManager() {
    if (!this.main.modulatorManager) {
      throw new Error("ModulatorManager is required in main for UiManager");
    }

    // Pass ModulatorManager to UI components
    this.pulseModUi.setModulatorManager(this.main.modulatorManager);
    this.inputModUi.setModulatorManager(this.main.modulatorManager);
    this.randomizerUi.setModulatorManager(this.main.modulatorManager);

    // Register UI components with a meaningful name for each
    const uiComponents = {
      paramUi: this.paramUi,
      particleUi: this.particleUi,
      gravityUi: this.gravityUi,
      collisionUi: this.collisionUi,
      boundaryUi: this.boundaryUi,
      turbulenceUi: this.turbulenceUi,
      voronoiUi: this.voronoiUi,
      organicUi: this.organicUi,
      randomizerUi: this.randomizerUi,
      inputsUi: this.inputsUi,
    };

    // Register UI components to the modulator manager
    this.main.modulatorManager.registerUiComponents(uiComponents);
    this.randomizerUi.initParameterTargets();
  }

  initializePresetManager() {
    // Create a collection of all UI components that can have presets
    const presetComponents = {
      paramUi: this.paramUi,
      particleUi: this.particleUi,
      gravityUi: this.gravityUi,
      collisionUi: this.collisionUi,
      boundaryUi: this.boundaryUi,
      pulseModUi: this.pulseModUi,
      inputModUi: this.inputModUi,
      turbulenceUi: this.turbulenceUi,
      voronoiUi: this.voronoiUi,
      organicUi: this.organicUi,
      randomizerUi: this.randomizerUi,
    };

    // Create the preset manager with all components
    this.presetManager = new PresetManager(presetComponents);

    // Initialize UI components with preset manager
    this.turbulenceUi.initWithPresetManager(this.presetManager);
    this.voronoiUi.initWithPresetManager(this.presetManager);
    this.organicUi.initWithPresetManager(this.presetManager);
    this.pulseModUi.initWithPresetManager(this.presetManager);
    this.inputModUi.initWithPresetManager(this.presetManager);
    this.presetUi.initWithPresetManager(this.presetManager);
    this.randomizerUi.initWithPresetManager(this.presetManager);
  }

  // Update method for UiManager
  update(deltaTime) {
    // Update UI components with time step
    this.inputModUi.update(deltaTime);
    this.stats.update();
  }

  dispose() {
    // Dispose all UI components
    this.paramUi.dispose();
    this.particleUi.dispose();
    this.gravityUi.dispose();
    this.collisionUi.dispose();
    this.boundaryUi.dispose();
    this.inputsUi.dispose();
    this.debugUi.dispose();
    this.turbulenceUi.dispose();
    this.voronoiUi.dispose();
    this.organicUi.dispose();
    this.pulseModUi.dispose();
    this.inputModUi.dispose();
    this.networkUi.dispose();
    this.presetUi.dispose();
    this.randomizerUi.dispose();

    this.stats.dom.remove();
    this.stats = null;
  }
}
