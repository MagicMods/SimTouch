import { BaseUi } from "../baseUi.js";

export class ParticleUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    // Initialize controls collection to store references
    this.controls = {};
    // Change the GUI title
    this.gui.title("Particles");

    // Initialize folders and controllers
    this.initParticleControls();
  }

  //#region Particle
  initParticleControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Store controllers as class properties with clear naming
    this.particleCountController = this.gui
      .add(particles, "numParticles", 0, 1000, 1)
      .name("P-Count")
      .onFinishChange((value) => {
        particles.reinitializeParticles(value);
      });

    this.particleSizeController = this.gui
      .add(particles, "particleRadius", 0.01, 0.04, 0.001)
      .name("P-Size")
      .onChange((value) => {
        particles.collisionSystem.particleRadius = value * 2;
        // Reset all particles to new base radius before turbulence affects them
        particles.particleRadii.fill(value);
      });

    this.particleOpacityController = this.gui
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("P-Opacity");

    this.particleColorController = this.gui
      .addColor(this.main.particleRenderer.config, "color")
      .name("P-Color");
  }
  //#endregion

  getControlTargets() {
    const targets = {};
    // // Particle controllers
    if (this.particleCountController)
      targets["P-Count"] = this.particleCountController;
    if (this.particleSizeController)
      targets["P-Size"] = this.particleSizeController;
    if (this.particleOpacityController)
      targets["P-Opacity"] = this.particleOpacityController;
    return targets;
  }

  // Add to ParamUi class
  getData() {
    const controllers = {};
    const targets = this.getControlTargets();

    // Extract values from controllers to create a serializable object
    for (const [key, controller] of Object.entries(targets)) {
      if (controller && typeof controller.getValue === "function") {
        controllers[key] = controller.getValue();
      }
    }

    return { controllers };
  }

  setData(data) {
    if (!data || !data.controllers) {
      console.warn("Invalid Particle preset data");
      return false;
    }

    try {
      const targets = this.getControlTargets();

      // Apply values from preset to controllers
      for (const [key, value] of Object.entries(data.controllers)) {
        if (targets[key] && typeof targets[key].setValue === "function") {
          targets[key].setValue(value);
        }
      }

      // Update UI display
      this.updateControllerDisplays();
      return true;
    } catch (error) {
      console.error("Error applying Particle preset:", error);
      return false;
    }
  }

  updateControllerDisplays() {
    // Helper function to safely update a controller's display
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", e);
        }
      }
    };

    // Update particle controllers
    safeUpdateDisplay(this.particleSizeController);
    safeUpdateDisplay(this.particleCountController);
    safeUpdateDisplay(this.particleOpacityController);
    safeUpdateDisplay(this.particleColorController);
  }
}
