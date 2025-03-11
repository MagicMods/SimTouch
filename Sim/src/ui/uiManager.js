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

import Stats from "../util/statsModule.js";

export class UiManager {
  constructor(main) {
    if (!main) return;
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");

    this.pulseModContainer = this.createContainer("left-middle");
    this.presetContainer = this.createContainer("left-center");
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
    this.networkUi = new NetworkUi(main, this.networkContainer);
    this.inputModUi = new InputModulationUi(main, this.inputModContainer);
    this.presetUi = new PresetUi(main, this.presetContainer);

    this.turbulenceUi = new TurbulenceUi(main, this.rightContainer);
    this.voronoiUi = new VoronoiUi(main, this.rightContainer);
    this.organicUi = new OrganicUi(main, this.rightContainer);
    this.gridUi = new GridUi(main, this.rightContainer);

    this.initializeUiComponents();
    this.stats = new Stats();
    this.initStats();
    this.allTargets = {};

    this.initializePresetManager();
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
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }

  initializeUiComponents() {
    // Set up event listeners for changes in grid render modes
    if (this.main.gridRenderer && this.organicUi) {
      this.main.gridRenderer.renderModes.onModeChange = (mode) => {
        this.organicUi.updateOrganicFolders(mode);
      };
    }

    // Initialize ModulatorManager with all separate components
    this.initializeModulatorManager();
  }

  initializeModulatorManager() {
    if (this.main.modulatorManager) {
      console.log("Initializing ModulatorManager with UI components");

      // Pass ModulatorManager to UI components
      this.pulseModUi.setModulatorManager(this.main.modulatorManager);
      this.inputModUi.setModulatorManager(this.main.modulatorManager);

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
        // You can add other UI components as needed
      };

      // Register UI components instead of controller targets
      this.main.modulatorManager.registerUiComponents(uiComponents);
    } else {
      console.warn("ModulatorManager not available in main!");
    }
  }

  // Add this method to UiManager to properly initialize preset management
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
      gridUi: this.gridUi,
    };

    // Create the preset manager with all components
    this.presetManager = new PresetManager(presetComponents);

    // Initialize each UI component with the preset manager
    // Simple presets
    if (this.turbulenceUi)
      this.turbulenceUi.initWithPresetManager(this.presetManager);
    if (this.voronoiUi)
      this.voronoiUi.initWithPresetManager(this.presetManager);

    // Complex presets (modulators)
    if (this.pulseModUi)
      this.pulseModUi.initWithPresetManager(this.presetManager);
    if (this.inputModUi)
      this.inputModUi.initWithPresetManager(this.presetManager);

    // Initialize the preset UI
    if (this.presetUi) this.presetUi.initWithPresetManager(this.presetManager);
  }
}
