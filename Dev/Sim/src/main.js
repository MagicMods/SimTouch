import { FluidSim } from "./simulation/fluidSim.js";
import { ParticleSystem } from "./simulation/particleSystem.js";
import { UI } from "./ui/ui.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    const gl = this.canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");

    // Colors for different systems
    this.colors = {
      reference: [0.2, 0.4, 1.0, 0.8], // Blue
      test: [1.0, 0.4, 0.2, 0.8], // Orange
    };

    // Keep reference system
    this.simulation = new FluidSim(gl, this.canvas, 29, 14);

    // Add test system (in normalized space)
    this.particleSystem = new ParticleSystem({
      particleCount: 100,
      timeStep: 1 / 60,
      gravity: 9.81,
    });

    console.log("Main constructor complete");
  }

  async init() {
    try {
      await this.simulation.initialize();
      this.ui = new UI(this.simulation);

      // Start our custom animation loop instead of simulation.start()
      this.animate();
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  animate() {
    // Update reference system's physics
    this.simulation.updateParticlePhysics();

    // Update test system
    this.particleSystem.step();

    // Clear and setup frame
    this.simulation.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.simulation.gl.clear(this.simulation.gl.COLOR_BUFFER_BIT);

    // Draw grid
    this.simulation.gridRenderer.draw();

    // Draw reference particles (blue)
    this.simulation.particleRenderer.draw(
      this.simulation.particles,
      this.colors.reference
    );

    // Draw test particles (orange)
    const testParticles = this.particleSystem.getParticles();
    this.simulation.particleRenderer.draw(testParticles, this.colors.test);

    // Continue animation
    requestAnimationFrame(() => this.animate());
  }

  static async create() {
    const main = new Main();
    await main.init();
    return main;
  }
}

window.onload = () => Main.create().catch(console.error);

export { Main };
