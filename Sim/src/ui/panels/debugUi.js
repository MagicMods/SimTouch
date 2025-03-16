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

    // Directly add turbulence and voronoi controls (no folder)
    this.controls.showTurbulenceField = this.gui
      .add(debugRenderer, 'showTurbulenceField')
      .name("Show Turbulence")
      .disable(!debugRenderer.enabled);

    this.controls.showVoronoiField = this.gui
      .add(debugRenderer, 'showVoronoiField')
      .name("Show Voronoi")
      .disable(!debugRenderer.enabled);

    // Keep opacity control
    this.controls.turbulenceOpacity = this.gui
      .add(debugRenderer, 'turbulenceOpacity', 0, 1)
      .name("Visualization Opacity")
      .disable(!debugRenderer.enabled);

    // Only keep velocity field and particle info from old debug options
    this.controls.showVelocityField = this.gui
      .add(debugRenderer, 'showVelocityField')
      .name("Show Velocity Field")
      .disable(!debugRenderer.enabled);

    this.controls.showParticlesInfo = this.gui
      .add(debugRenderer, 'showParticlesInfo')
      .name("Show Particle Stats")
      .disable(!debugRenderer.enabled);

    // Initialize visibility
    this.updateDebugVisibility(debugRenderer.enabled);
  }

  updateDebugVisibility(enabled) {
    // Enable/disable all debug visualization controls
    for (const key in this.controls) {
      if (key !== 'debugEnabled') {
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
