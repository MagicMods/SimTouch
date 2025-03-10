import { LeftUi } from "./panels/leftUi.js";
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

    // Create preset manager with ALL UI components
    this.presetManager = new PresetManager(
      this.paramUi,
      this.particleUi,
      this.gravityUi,
      this.collisionUi,
      this.boundaryUi,
      this.restStateUi,
      this.pulseModUi,
      this.inputModUi,
      this.turbulenceUi,
      this.voronoiUi,
      this.organicUi
    );

    // Set up preset manager for the UI components
    // this.paramUi.initWithPresetManager(this.presetManager);
    // this.particleUi.initWithPresetManager(this.presetManager);
    // this.gravityUi.initWithPresetManager(this.presetManager);
    // this.collisionUi.initWithPresetManager(this.presetManager);
    // this.boundaryUi.initWithPresetManager(this.presetManager);
    // this.restStateUi.initWithPresetManager(this.presetManager);

    this.inputModUi.initWithPresetManager(this.presetManager);
    this.pulseModUi.initWithPresetManager(this.presetManager);
    this.turbulenceUi.initWithPresetManager(this.presetManager);
    this.voronoiUi.initWithPresetManager(this.presetManager);
    this.presetUi.initWithPresetManager(this.presetManager);

    this.initializeUiComponents();
    this.stats = new Stats();
    this.initStats();
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

  updateStats() {
    this.stats.update();
  }

  update() {
    // Update all UI components
    // this.paramUi.updateControllerDisplays();
    // this.particleUi.updateControllerDisplays();
    // this.gravityUi.updateControllerDisplays();
    // this.collisionUi.updateControllerDisplays();
    // this.boundaryUi.updateControllerDisplays();
    // this.turbulenceUi.updateControllerDisplays();
    // this.voronoiUi.updateControllerDisplays();
    // this.organicUi.updateControllerDisplays();
    // this.pulseModUi.updateControllerDisplays();
    // this.inputModUi.updateControllerDisplays();

    // this.pulseModUi.update();
    // this.inputModUi.update();

    // Update stats if available
    if (this.stats) {
      this.updateStats();
    }
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
    // Initialize cross-references between UI components
    this.initializeCrossReferences();

    // Set up event listeners for changes in grid render modes
    if (this.main.gridRenderer && this.organicUi) {
      this.main.gridRenderer.renderModes.onModeChange = (mode) => {
        this.organicUi.updateOrganicFolders(mode);
      };
    }

    // Initialize ModulatorManager with all separate components
    this.initializeModulatorManager();
  }

  initializeCrossReferences() {
    // Set up connections between UI components if needed
    if (this.inputModUi) {
      // Get control targets from all UIs that support it
      const turbulenceTargets = this.turbulenceUi?.getControlTargets?.() || {};
      const voronoiTargets = this.voronoiUi?.getControlTargets?.() || {};
      const organicTargets = this.organicUi?.getControlTargets?.() || {};
      // const gridTargets = this.gridUi?.getControlTargets?.() || {};

      // Combine all targets
      const allTargets = {
        ...turbulenceTargets,
        ...voronoiTargets,
        ...organicTargets,
        // ...gridTargets,
      };

      // Pass combined targets to input modulation UI
      this.inputModUi.setControlTargets?.(allTargets);
    }

    // Initialize UI panels references
    if (this.pulseModUi) {
      this.pulseModUi.initializeWithComponents(this.leftUi, {
        turbulence: this.turbulenceUi,
        voronoi: this.voronoiUi,
        organic: this.organicUi,
        // grid: this.gridUi,
      });
    }

    if (this.inputModUi) {
      this.inputModUi.initializeWithComponents(this.leftUi, {
        turbulence: this.turbulenceUi,
        voronoi: this.voronoiUi,
        organic: this.organicUi,
        // grid: this.gridUi,
      });
    }
  }

  initializeModulatorManager() {
    if (this.main.modulatorManager) {
      console.log("Initializing ModulatorManager with UI components");

      // Pass ModulatorManager to UI components
      this.pulseModUi.setModulatorManager(this.main.modulatorManager);
      this.inputModUi.setModulatorManager(this.main.modulatorManager);

      // Register ALL UI components with a meaningful name for each
      this.main.modulatorManager.registerUiComponents({
        leftUi: this.leftUi,
        turbulenceUi: this.turbulenceUi,
        voronoiUi: this.voronoiUi,
        organicUi: this.organicUi,
        // gridUi: this.gridUi,
        // Add any other components that have targets
      });
    } else {
      console.warn("ModulatorManager not available in main!");
    }
  }
}
