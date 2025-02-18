import { ShaderManager } from "./shaders/shaderManager.js";
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { UI } from "./ui/ui.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { GridRenderer } from "./renderer/gridRenderer.js"; // Import GridRenderer
import { DebugRenderer } from "./renderer/debugRenderer.js"; // Import DebugRenderer
import { TurbulenceField } from "./simulation/forces/turbulenceField.js";
import { CircularBoundary } from "./simulation/boundary/circularBoundary.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    // Create GL context and store it locally
    this.gl = this.canvas.getContext("webgl2");
    if (!this.gl) throw new Error("WebGL2 not supported");

    // Initialize our shared ShaderManager
    this.shaderManager = new ShaderManager(this.gl);

    this.boundary = new CircularBoundary();

    // Create turbulence with boundary reference
    this.turbulenceField = new TurbulenceField({ boundary: this.boundary });

    // Create particle system with dependencies
    this.particleSystem = new ParticleSystem({
      turbulence: this.turbulenceField,
    });

    // Create renderer for particles
    this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);

    // Create GridRenderer instance (restores grid rendering lost with FluidSim)
    this.gridRenderer = new GridRenderer(this.gl, this.shaderManager);

    // NEW: Create DebugRenderer instance
    this.debugRenderer = new DebugRenderer(this.gl);

    // Frame counter for logging
    this.frame = 0;

    // Add state for continuous force application
    this.activeForcePos = null;
    this.activeForceMode = null;

    // Set up mouse interaction
    this.particleSystem.mouseForces.setupMouseInteraction(
      this.canvas,
      this.particleSystem
    );
  }

  async init() {
    try {
      await this.shaderManager.init();
      // Initialize UI with main instance
      this.ui = new UI(this);

      this.animate();
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  animate() {
    // Update simulation
    this.particleSystem.step();

    // Update stats
    this.ui.updateStats();

    // Render
    this.render();

    // Request next frame
    requestAnimationFrame(() => this.animate());
  }

  render() {
    this.frame++;

    // Clear frame
    // this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Update turbulence before particle step
    this.turbulenceField.update(this.particleSystem.timeStep); // Use fixed timestep or this.particleSystem.timeStep
    // Update mouse forces
    this.particleSystem.mouseForces.update(this.particleSystem);
    // Step particle simulation
    this.particleSystem.step();
    // Update grid with particle system reference
    this.gridRenderer.draw(this.particleSystem);

    // Draw boundary using shader manager
    this.particleSystem.boundary.drawCircularBoundary(
      this.gl,
      this.shaderManager
    );

    // Draw particles
    this.particleRenderer.draw(this.particleSystem.getParticles());
  }

  static async create() {
    const main = new Main();
    await main.init();
    return main;
  }
}

window.onload = () => Main.create().catch(console.error);

export { Main };
