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
      .disable();

    this.controls.showVelocityField = debugFolder
      .add(debugRenderer, 'showVelocityField')
      .name("Show Velocity Vectors")
      .disable();

    this.controls.showBoundary = debugFolder
      .add(debugRenderer, 'showBoundary')
      .name("Show Boundary")
      .disable();

    this.controls.showNoiseField = debugFolder
      .add(debugRenderer, 'showNoiseField')
      .name("Show Noise Field")
      .disable();

    this.controls.showParticlesInfo = debugFolder
      .add(debugRenderer, 'showParticlesInfo')
      .name("Show Particle Stats")
      .disable();

    // Open the folder by default
    debugFolder.open();

    // Add a button to toggle all visualizations at once
    this.controls.debugShowAll = this.gui
      .add({
        showAll: () => {
          const show = true;
          debugRenderer.showGrid = show;
          debugRenderer.showVelocityField = show;
          debugRenderer.showBoundary = show;
          debugRenderer.showNoiseField = show;
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
          debugRenderer.showParticlesInfo = show;
          this.updateDebugControllers();
        }
      }, 'hideAll')
      .name("Hide All Visualizations");

    // Initially hide/disable the debugHideAll button if debug is off
    this.updateDebugVisibility(debugRenderer.enabled);
  }

  updateDebugVisibility(enabled) {
    // Enable/disable all debug visualization controls
    for (const key in this.controls) {
      if (key !== 'debugEnabled' && key !== 'debugShowAll' && key !== 'debugHideAll') {
        this.controls[key].enable(enabled);
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
