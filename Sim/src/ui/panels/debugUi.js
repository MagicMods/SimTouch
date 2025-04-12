import { BaseUi } from "../baseUi.js";

export class DebugUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.controls = {};
    this.gui.title("Debug");
    this.initDebugControls();

    // Set initial state - folder closed by default (debug hidden)
    if (this.main.debugRenderer) {
      this.main.debugRenderer.enabled = false;
    }

    this.setupFolderObserver();
  }

  initDebugControls() {
    if (!this.main || !this.main.debugRenderer) return;

    const debugRenderer = this.main.debugRenderer;

    // Directly add voronoi control (no folder)
    this.controls.showVoronoiField = this.gui
      .add(debugRenderer, 'showVoronoiField')
      .name("Show Voronoi");

    // Removed control for showVelocityField as it's moved to ParticleRenderer
    // this.controls.showVelocityField = this.gui
    //   .add(debugRenderer, 'showVelocityField')
    //   .name("Show Velocity Field");

    // Keep opacity control - moved below Velocity Field
    this.controls.turbulenceOpacity = this.gui
      .add(debugRenderer, 'turbulenceOpacity', 0, 1)
      .name("Visualization Opacity");
  }

  setupFolderObserver() {
    // Get the folder DOM element
    const folderElement = this.gui.domElement;

    // Set up a MutationObserver to watch for class changes on the folder
    const folderObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Check if folder is closed by looking for the 'closed' class
          const isClosed = folderElement.classList.contains('closed');

          // Update debug visibility based on folder state
          if (this.main.debugRenderer) {
            this.main.debugRenderer.enabled = !isClosed;
            this.updateDebugVisibility(!isClosed);
          }
        }
      });
    });

    // Start observing the folder element
    folderObserver.observe(folderElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also handle the initial folder state when UI is first created
    // We need to use a small delay to ensure the DOM is ready
    setTimeout(() => {
      // Get the initial state (closed or open)
      const isClosed = folderElement.classList.contains('closed');

      // Set debug visibility based on initial folder state
      if (this.main.debugRenderer) {
        this.main.debugRenderer.enabled = !isClosed;
        this.updateDebugVisibility(!isClosed);
      }
    }, 100);

    // Keep folder closed by default (debug hidden)
    this.gui.close();
  }

  updateDebugVisibility(enabled) {
    if (!this.main.debugRenderer) return;

    this.main.debugRenderer.enabled = enabled;

    // No need to disable/enable controls anymore since they're always enabled
    // Just update controllers to reflect current state
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
