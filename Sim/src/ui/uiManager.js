import { TurbulenceUi } from "./panels/turbulenceUi.js";
import { VoronoiUi } from "./panels/voronoiUi.js";
import { OrganicUi } from "./panels/organicUi.js";
import { GridUi } from "./panels/gridUi.js";
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
import { RestStateUi } from "./panels/restStateUi.js";
import { RandomizerUi } from "./panels/randomizerUi.js";

import Stats from "../util/statsModule.js";

export class UiManager {
  constructor(main) {
    if (!main) return;
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");

    this.pulseModContainer = this.createContainer("left-middle");
    this.presetContainer = this.createContainer("center");
    this.networkContainer = this.createContainer("right-center");
    this.inputModContainer = this.createContainer("right-middle");

    //Left UI
    this.paramUi = new ParamUi(main, this.leftContainer);
    this.particleUi = new ParticleUi(main, this.leftContainer);
    this.gravityUi = new GravityUi(main, this.leftContainer);
    this.collisionUi = new CollisionUi(main, this.leftContainer);
    this.boundaryUi = new BoundaryUi(main, this.leftContainer);
    this.restStateUi = new RestStateUi(main, this.leftContainer);
    this.inputsUi = new InputsUi(main, this.leftContainer);
    this.debugUi = new DebugUi(main, this.leftContainer);

    // Right UI
    this.pulseModUi = new PulseModulationUi(main, this.pulseModContainer);
    this.networkUi = new NetworkUi(main, this.leftContainer);
    this.inputModUi = new InputModulationUi(main, this.inputModContainer);
    this.presetUi = new PresetUi(main, this.presetContainer);

    this.turbulenceUi = new TurbulenceUi(main, this.rightContainer);
    this.voronoiUi = new VoronoiUi(main, this.rightContainer);
    this.organicUi = new OrganicUi(main, this.rightContainer);
    this.gridUi = new GridUi(main, this.rightContainer);

    if (this.main.gridRenderer && this.organicUi) {
      this.main.gridRenderer.renderModes.onModeChange = (mode) => {
        this.organicUi.updateOrganicFolders(mode);
      };
    }

    this.randomizerUi = new RandomizerUi(main, this.presetContainer);

    this.initializeModulatorManager();

    this.stats = new Stats();
    this.initStats();
    this.allTargets = {};

    this.initializePresetManager();

    // Initialize RandomizerUi

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

  dispose() {
    // Dispose all UI components
    this.paramUi.dispose();
    this.particleUi.dispose();
    this.gravityUi.dispose();
    this.collisionUi.dispose();
    this.boundaryUi.dispose();
    this.restStateUi.dispose();
    this.inputsUi.dispose();
    this.debugUi.dispose();
    this.turbulenceUi.dispose();
    this.voronoiUi.dispose();
    this.organicUi.dispose();
    this.gridUi.dispose();
    this.pulseModUi.dispose();
    this.inputModUi.dispose();
    this.networkUi.dispose();
    this.presetUi.dispose();
    this.randomizerUi.dispose();
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }



  initializeModulatorManager() {
    if (this.main.modulatorManager) {
      console.log("Initializing ModulatorManager with UI components");

      // Pass ModulatorManager to UI components
      this.pulseModUi.setModulatorManager(this.main.modulatorManager);
      this.inputModUi.setModulatorManager(this.main.modulatorManager);
      this.randomizerUi.setModulatorManager(this.main.modulatorManager);

      // Register actual UI components with a meaningful name for each
      const uiComponents = {
        paramUi: this.paramUi,
        particleUi: this.particleUi,
        gravityUi: this.gravityUi,
        collisionUi: this.collisionUi,
        boundaryUi: this.boundaryUi,
        restStateUi: this.restStateUi,
        turbulenceUi: this.turbulenceUi,
        voronoiUi: this.voronoiUi,
        organicUi: this.organicUi,
        randomizerUi: this.randomizerUi,
      };

      // Register UI components instead of controller targets
      this.main.modulatorManager.registerUiComponents(uiComponents);
      this.randomizerUi.initParameterTargets();
    } else {
      console.warn("ModulatorManager not available in main!");
    }
  }


  initializePresetManager() {
    // Create a collection of all UI components that can have presets
    const presetComponents = {
      paramUi: this.paramUi,
      particleUi: this.particleUi,
      gravityUi: this.gravityUi,
      collisionUi: this.collisionUi,
      boundaryUi: this.boundaryUi,
      restStateUi: this.restStateUi,
      pulseModUi: this.pulseModUi,
      inputModUi: this.inputModUi,
      turbulenceUi: this.turbulenceUi,
      voronoiUi: this.voronoiUi,
      organicUi: this.organicUi,
    };

    // Create the preset manager with all components
    this.presetManager = new PresetManager(presetComponents);

    this.turbulenceUi.initWithPresetManager(this.presetManager);
    this.voronoiUi.initWithPresetManager(this.presetManager);

    this.pulseModUi.initWithPresetManager(this.presetManager);
    this.inputModUi.initWithPresetManager(this.presetManager);

    // Initialize the preset UI
    this.presetUi.initWithPresetManager(this.presetManager);
  }

  // Add update method to UiManager
  update(deltaTime) {
    // Update InputModulationUi to pass audio data to modulators
    if (this.inputModUi) {
      this.inputModUi.update(deltaTime);
    }
  }
}
