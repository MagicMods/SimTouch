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

    this.shaderManager = new ShaderManager(this.gl);
    this.boundary = new CircularBoundary();
    this.turbulenceField = new TurbulenceField({ boundary: this.boundary });
    this.particleSystem = new ParticleSystem({
      turbulence: this.turbulenceField,
    });
    this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);
    this.gridRenderer = new GridRenderer(this.gl, this.shaderManager);
    this.debugRenderer = new DebugRenderer(this.gl);
    this.frame = 0;
    this.particleSystem.mouseForces.setupMouseInteraction(
      this.canvas,
      this.particleSystem
    );
  }

  async init() {
    try {
      await this.shaderManager.init();
      this.ui = new UI(this);
      this.animate();
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  animate() {
    this.particleSystem.step();
    this.ui.updateStats();
    this.render();
    // Request next frame
    requestAnimationFrame(() => this.animate());
  }

  render() {
    this.frame++;
    this.gridRenderer.drawGridTest();
    this.turbulenceField.update(this.particleSystem.timeStep);
    this.particleSystem.mouseForces.update(this.particleSystem);
    this.particleSystem.step();
    this.gridRenderer.draw(this.particleSystem);

    // Draw boundary using shader manager
    this.particleSystem.boundary.drawCircularBoundary(
      this.gl,
      this.shaderManager
    );
    // this.gridRenderer.drawRectangle(120, 120, 90, 20, [1.0, 1.0, 1.0, 0.5]);
    // this.gridRenderer.drawCircle(120, 120, 120, [0.5, 0.5, 0.5, 0.5]);

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
