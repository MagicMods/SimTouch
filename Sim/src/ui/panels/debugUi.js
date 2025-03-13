import { BaseUi } from "../baseUi.js";

export class DebugUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Debug");
    this.initDebugControls();
  }

  initDebugControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Create a debug display object that will store our debug properties
    const debugDisplay = {
      showDebug:
        this.main.showDebug !== undefined ? this.main.showDebug : false,
      fps: this.main.fps !== undefined ? this.main.fps : 0,
    };

    // Toggle debug display only if property exists
    if (this.main.showDebug !== undefined) {
      this.debugDisplayController = this.gui
        .add(this.main, "showDebug")
        .name("Show Debug");
    } else {
      // Add a dummy control if property doesn't exist
      this.debugDisplayController = this.gui
        .add(debugDisplay, "showDebug")
        .name("Show Debug");
    }

    // // Display FPS if property exists
    // if (this.main.fps !== undefined) {
    //   this.debugFpsController = this.gui
    //     .add(this.main, "fps")
    //     .name("FPS")
    //     .listen();
    // } else {
    //   // Add a dummy FPS display
    //   this.debugFpsController = this.gui.add(debugDisplay, "fps").name("FPS");
    // }

    // Toggle velocity display if present
    if (
      this.main.particleRenderer &&
      this.main.particleRenderer.showVelocity !== undefined
    ) {
      this.debugVelocityController = this.gui
        .add(this.main.particleRenderer, "showVelocity")
        .name("Show Velocity");
    }

    // Toggle showing grid if present
    if (
      this.main.gridRenderer &&
      this.main.gridRenderer.showGrid !== undefined
    ) {
      this.debugShowGridController = this.gui
        .add(this.main.gridRenderer, "showGrid")
        .name("Show Grid");
    }
  }
}
