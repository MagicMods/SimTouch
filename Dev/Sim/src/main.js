// import { FluidSim } from "./simulation/fluidSim.js";
import { ShaderManager } from "./shaders/shaderManager.js";
import { ParticleSystem } from "./simulation/particleSystem.js";
import { UI } from "./ui/ui.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { LineRenderer } from "./renderer/lineRenderer.js";
import { GridRenderer } from "./renderer/gridRenderer.js"; // Import GridRenderer

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    // Create GL context and store it locally
    this.gl = this.canvas.getContext("webgl2");
    if (!this.gl) throw new Error("WebGL2 not supported");

    // Initialize our shared ShaderManager
    this.shaderManager = new ShaderManager(this.gl);

    // Colors for different systems
    this.colors = {
      reference: [0.2, 0.4, 1.0, 0.8], // Blue
      test: [1.0, 0.4, 0.2, 0.8], // Orange
    };

    // Create simulation based on ParticleSystem alone
    this.particleSystem = new ParticleSystem({
      particleCount: 100,
      timeStep: 1 / 60,
      gravity: 9.81,
    });

    // Create renderer for particles
    this.particleRenderer = new ParticleRenderer(
      this.gl,
      this.shaderManager,
      "particles"
    );

    // Optionally create a line renderer for debug visualization
    this.lineRenderer = new LineRenderer(this.gl, this.shaderManager);

    // Create GridRenderer instance (restores grid rendering lost with FluidSim)
    this.gridRenderer = new GridRenderer(this.gl, this.shaderManager);

    // Frame counter for logging
    this.frame = 0;
  }

  setupMouseDebug() {
    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      console.table({
        "Mouse Click": {
          x: mouseX.toFixed(3),
          y: mouseY.toFixed(3),
        },
        "Relative to Center": {
          x: (mouseX - 0.5).toFixed(3),
          y: (mouseY - 0.5).toFixed(3),
        },
        "Canvas Pixels": {
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
        },
      });

      // Log boundary info from ParticleSystem, if available
      if (this.particleSystem.centerX && this.particleSystem.centerY) {
        console.log("Boundary:", {
          center: {
            x: this.particleSystem.centerX.toFixed(3),
            y: this.particleSystem.centerY.toFixed(3),
          },
          radius: this.particleSystem.radius.toFixed(3),
        });
      }
    });
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
    this.frame++;

    // Step particle simulation
    this.particleSystem.step();

    // Clear frame
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Draw grid
    this.gridRenderer.draw();

    // Optionally draw debug grid via line renderer if ParticleSystem provides one
    if (this.particleSystem.debugEnabled) {
      this.particleSystem.drawDebugGrid(this.lineRenderer);
    }

    // Draw particles
    this.particleRenderer.draw(
      this.particleSystem.getParticles(),
      this.colors.test
    );

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
