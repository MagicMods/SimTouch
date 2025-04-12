import { BaseUi } from "../baseUi.js";
import { eventBus } from '../../util/eventManager.js';

export class ParticleUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.controls = {};
    this.gui.title("Particles");
    this.initParticleControls();

    // Track the last regenerated particle count
    this.lastRegeneratedCount = this.main.particleSystem?.numParticles || 0;
  }

  //#region Particle
  initParticleControls() {
    // Store controllers as class properties with clear naming
    this.particleCountController = this.gui
      .add(this.main.simParams.simulation, "particleCount", 0, 1500, 1)
      .name("P-Count")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'simulation.particleCount', value });
      });

    this.particleSizeController = this.gui
      .add(this.main.simParams.simulation, "particleRadius", 0.002, 0.03, 0.001)
      .name("P-Size")
      .onChange((value) => {
        eventBus.emit('uiControlChanged', { paramPath: 'simulation.particleRadius', value });
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
    if (this.particleCountController)
      targets["P-Count"] = this.particleCountController;
    if (this.particleSizeController)
      targets["P-Size"] = this.particleSizeController;
    if (this.particleOpacityController)
      targets["P-Opacity"] = this.particleOpacityController;
    return targets;
  }

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
      const particles = this.main.particleSystem;

      // Check if preset has a higher particle count than current
      let needsReinitialize = false;
      const newCount = data.controllers["P-Count"];

      if (newCount !== undefined && particles) {
        if (newCount > this.lastRegeneratedCount) {
          this.lastRegeneratedCount = newCount;
          needsReinitialize = true;
        }
      }

      // Apply values from preset to controllers
      for (const [key, value] of Object.entries(data.controllers)) {
        if (targets[key] && typeof targets[key].setValue === "function") {
          targets[key].setValue(value);
        }
      }

      // Reinitialize particles if needed (higher count in preset)
      if (needsReinitialize && particles) {
        particles.reinitializeParticles(newCount);
      }

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

    safeUpdateDisplay(this.particleSizeController);
    safeUpdateDisplay(this.particleCountController);
    safeUpdateDisplay(this.particleOpacityController);
    safeUpdateDisplay(this.particleColorController);
  }
}
