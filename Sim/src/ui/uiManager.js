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
import Stats from "../util/statsModule.js";

export class UiManager {
  constructor(main) {
    if (!main) return;
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.pulseModContainer = this.createContainer("left-top");
    this.presetContainer = this.createContainer("left-second");
    this.networkContainer = this.createContainer("center-top");
    this.inputContainer = this.createContainer("right-top");
    this.turbulenceContainer = this.createContainer("right-1");
    this.voronoiContainer = this.createContainer("right-2");
    this.organicContainer = this.createContainer("right-3");
    this.gridContainer = this.createContainer("right-4");

    // Initialize UI components
    this.leftUi = new LeftUi(main, this.leftContainer);

    // Create specialized UI components instead of RightUi
    this.pulseModUi = new PulseModulationUi(main, this.pulseModContainer);
    this.networkUi = new NetworkUi(main, this.networkContainer);
    this.inputModUi = new InputModulationUi(main, this.inputContainer);
    this.presetUi = new PresetUi(main, this.presetContainer);

    this.turbulenceUi = new TurbulenceUi(main, this.turbulenceContainer);
    this.voronoiUi = new VoronoiUi(main, this.voronoiContainer);
    this.organicUi = new OrganicUi(main, this.organicContainer);
    this.gridUi = new GridUi(main, this.gridContainer);

    // Create preset manager with ALL UI components
    this.presetManager = new PresetManager(
      this.leftUi,
      this.pulseModUi,
      this.inputModUi,
      this.turbulenceUi,
      this.voronoiUi,
      this.organicUi
    );

    // Set up preset manager for the UI components
    this.inputModUi.initWithPresetManager(this.presetManager);
    this.pulseModUi.initWithPresetManager(this.presetManager);
    this.turbulenceUi.setPresetManager(this.presetManager);
    this.voronoiUi.setPresetManager(this.presetManager);
    this.presetUi.setPresetManager(this.presetManager);

    this.initializeUiComponents();
    this.stats = new Stats();
    this.initStats();

    // Make sure right panels are correctly positioned
    // Use a slight delay to allow panels to render first
    setTimeout(() => this.updateRightPanelsPositions(), 100);
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
    this.leftUi?.update?.();
    this.turbulenceUi?.updateControllerDisplays?.();
    this.voronoiUi?.updateControllerDisplays?.();
    this.organicUi?.updateControllerDisplays?.();
    this.gridUi?.updateControllerDisplays?.();
    this.pulseModUi?.update?.();
    this.inputModUi?.update?.();
    this.networkUi?.update?.();
    this.presetUi?.update?.();

    // Update stats if available
    if (this.stats) {
      this.updateStats();
    }

    // Update panel positions periodically (can be optimized with a flag or event)
    this.updateRightPanelsPositions();
  }

  dispose() {
    // Dispose all UI components
    this.leftUi?.dispose?.();
    this.turbulenceUi?.dispose?.();
    this.voronoiUi?.dispose?.();
    this.organicUi?.dispose?.();
    this.gridUi?.dispose?.();
    this.pulseModUi?.dispose?.();
    this.inputModUi?.dispose?.();
    this.networkUi?.dispose?.();
    this.presetUi?.dispose?.();
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
    if (this.main.modulatorManager) {
      this.pulseModUi.setModulatorManager(this.main.modulatorManager);
      this.inputModUi.setModulatorManager(this.main.modulatorManager);

      // Store all UI components for target registration
      this.main.modulatorManager.storeComponentsForAutoRegistration(
        this.leftUi,
        {
          turbulence: this.turbulenceUi,
          voronoi: this.voronoiUi,
          organic: this.organicUi,
          grid: this.gridUi,
        }
      );
    }
  }

  initializeCrossReferences() {
    // Set up connections between UI components if needed
    if (this.inputModUi) {
      // Get control targets from all UIs that support it
      const turbulenceTargets = this.turbulenceUi?.getControlTargets?.() || {};
      const voronoiTargets = this.voronoiUi?.getControlTargets?.() || {};
      const organicTargets = this.organicUi?.getControlTargets?.() || {};
      const gridTargets = this.gridUi?.getControlTargets?.() || {};

      // Combine all targets
      const allTargets = {
        ...turbulenceTargets,
        ...voronoiTargets,
        ...organicTargets,
        ...gridTargets,
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
        grid: this.gridUi,
      });
    }

    if (this.inputModUi) {
      this.inputModUi.initializeWithComponents(this.leftUi, {
        turbulence: this.turbulenceUi,
        voronoi: this.voronoiUi,
        organic: this.organicUi,
        grid: this.gridUi,
      });
    }
  }

  // Add this method to UiManager
  updateRightPanelsPositions() {
    // The order of panels from top to bottom
    const panels = [
      this.turbulenceContainer,
      this.voronoiContainer,
      this.organicContainer,
      this.gridContainer,
    ];

    let currentTop = 0; // Start 10px from the top

    // Position each panel below the previous one
    panels.forEach((container) => {
      if (container) {
        container.style.top = `${currentTop}px`;
        // Add height + margin for next panel
        currentTop += container.offsetHeight + 0;
      }
    });
  }
}
