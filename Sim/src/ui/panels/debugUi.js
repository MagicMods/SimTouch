import { BaseUi } from "../baseUi.js";

export class DebugUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.controls = {};
    this.gui.title("Debug");
    this.initDebugControls();
  }

  initDebugControls() {
    if (!this.main || !this.main.debugRenderer) return;

    const debugRenderer = this.main.debugRenderer;

    // Add master toggle for debug visualizations
    this.controls.debugEnabled = this.gui
      .add(debugRenderer, 'enabled')
      .name("Enable Debug Visualizations")
      .onChange(value => this.updateDebugVisibility(value));

    // Create a debug visualizations folder
    const debugFolder = this.gui.addFolder("Debug Visualizations");

    // Add toggles for each visualization type
    this.controls.showGrid = debugFolder
      .add(debugRenderer, 'showGrid')
      .name("Show Grid")
      .disable(!debugRenderer.enabled);

    this.controls.showVelocityField = debugFolder
      .add(debugRenderer, 'showVelocityField')
      .name("Show Velocity Vectors")
      .disable(!debugRenderer.enabled);

    this.controls.showBoundary = debugFolder
      .add(debugRenderer, 'showBoundary')
      .name("Show Boundary")
      .disable(!debugRenderer.enabled);

    this.controls.showNoiseField = debugFolder
      .add(debugRenderer, 'showNoiseField')
      .name("Show Noise Fields")
      .disable(!debugRenderer.enabled);

    this.controls.showParticlesInfo = debugFolder
      .add(debugRenderer, 'showParticlesInfo')
      .name("Show Particle Stats")
      .disable(!debugRenderer.enabled);

    // Create a noise fields folder for detailed control
    const noiseFolder = this.gui.addFolder("Noise Fields");

    this.controls.showTurbulenceField = noiseFolder
      .add(debugRenderer, 'showTurbulenceField')
      .name("Show Turbulence")
      .disable(!debugRenderer.enabled || !debugRenderer.showNoiseField);

    this.controls.showVoronoiField = noiseFolder
      .add(debugRenderer, 'showVoronoiField')
      .name("Show Voronoi")
      .disable(!debugRenderer.enabled || !debugRenderer.showNoiseField);

    // Single opacity control for both fields
    this.controls.turbulenceOpacity = noiseFolder
      .add(debugRenderer, 'turbulenceOpacity', 0, 1)
      .name("Noise Opacity")
      .disable(!debugRenderer.enabled || !debugRenderer.showNoiseField);

    // Open the folders by default
    debugFolder.open();
    noiseFolder.open();

    // Add buttons for quick toggles
    this.controls.debugShowAll = this.gui
      .add({
        showAll: () => {
          const show = true;
          debugRenderer.showGrid = show;
          debugRenderer.showVelocityField = show;
          debugRenderer.showBoundary = show;
          debugRenderer.showNoiseField = show;
          debugRenderer.showTurbulenceField = show;
          debugRenderer.showVoronoiField = show;
          debugRenderer.showParticlesInfo = show;
          this.updateDebugControllers();
        }
      }, 'showAll')
      .name("Show All Visualizations");

    this.controls.debugHideAll = this.gui
      .add({
        hideAll: () => {
          const show = false;
          debugRenderer.showGrid = show;
          debugRenderer.showVelocityField = show;
          debugRenderer.showBoundary = show;
          debugRenderer.showNoiseField = show;
          debugRenderer.showTurbulenceField = show;
          debugRenderer.showVoronoiField = show;
          debugRenderer.showParticlesInfo = show;
          this.updateDebugControllers();
        }
      }, 'hideAll')
      .name("Hide All Visualizations");

    // Link noise field visibility to sub-controls
    this.controls.showNoiseField.onChange(value => {
      this.controls.showTurbulenceField.enable(value && debugRenderer.enabled);
      this.controls.turbulenceOpacity.enable(value && debugRenderer.enabled);
      this.controls.showVoronoiField.enable(value && debugRenderer.enabled);
    });

    // Initialize visibility
    this.updateDebugVisibility(debugRenderer.enabled);
  }

  updateDebugVisibility(enabled) {
    // Enable/disable all debug visualization controls
    for (const key in this.controls) {
      if (key !== 'debugEnabled' && key !== 'debugShowAll' && key !== 'debugHideAll') {
        // Special handling for noise field sub-controls
        if (key === 'showTurbulenceField' || key === 'turbulenceOpacity' ||
          key === 'showVoronoiField') {
          this.controls[key].enable(enabled && this.main.debugRenderer.showNoiseField);
        } else {
          this.controls[key].enable(enabled);
        }
      }
    }

    // Update controllers to reflect current state
    this.updateDebugControllers();
  }

  updateDebugControllers() {
    // Force UI to update to reflect current state
    for (const key in this.controls) {
      if (this.controls[key].updateDisplay) {
        this.controls[key].updateDisplay();
      }
    }
  }
}
