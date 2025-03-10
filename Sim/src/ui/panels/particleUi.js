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
      .add(particles, "numParticles", 1, 2000, 10)
      .name("Count")
      .onFinishChange((value) => {
        particles.reinitializeParticles(value);
      });

    this.particleSizeController = this.gui
      .add(particles, "particleRadius", 0.005, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        particles.collisionSystem.particleRadius = value * 2;
        // Reset all particles to new base radius before turbulence affects them
        particles.particleRadii.fill(value);
      });

    this.particleOpacityController = this.gui
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    this.particleColorController = this.gui
      .addColor(this.main.particleRenderer.config, "color")
      .name("Color");
  }
  //#endregion

  getControlTargets() {
    const targets = {};
    // // Particle controllers
    if (this.particleCountController)
      targets["Particle Count"] = this.particleCountController;
    if (this.particleSizeController)
      targets["Particle Size"] = this.particleSizeController;
    if (this.particleOpacityController)
      targets["Particle Opacity"] = this.particleOpacityController;
    return targets;
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
