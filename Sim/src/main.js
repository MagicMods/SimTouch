import { ShaderManager } from "./shaders/shaderManager.js";
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { UiManager } from "./ui/uiManager.js"; // Replace UI import
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { GridRenderer } from "./renderer/gridRenderer.js"; // Import GridRenderer
import { DebugRenderer } from "./renderer/debugRenderer.js"; // Import DebugRenderer
import { TurbulenceField } from "./simulation/forces/turbulenceField.js";
import { VoronoiField } from "./simulation/forces/voronoiField.js"; // Import VoronoiField
import { CircularBoundary } from "./simulation/boundary/circularBoundary.js";
import { socketManager } from "./network/socketManager.js"; // Import socketManager
import { MouseForces } from "./simulation/forces/mouseForces.js"; // Import MouseForces
import { ExternalInputConnector } from "./input/externalInputConnector.js"; // Import ExternalInputConnector

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
    this.voronoiField = new VoronoiField({ boundary: this.boundary }); // Create VoronoiField instance
    this.particleSystem = new ParticleSystem({
      turbulence: this.turbulenceField,
      voronoi: this.voronoiField, // Add voronoi to particleSystem
    });
    this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);
    this.gridRenderer = new GridRenderer(this.gl, this.shaderManager);
    this.debugRenderer = new DebugRenderer(this.gl);
    this.frame = 0;
    this.mouseForces = new MouseForces();
    this.mouseForces.setupMouseInteraction(this.canvas, this.particleSystem);

    // IMPORTANT: Attach it to particleSystem so render() can find it
    this.particleSystem.mouseForces = this.mouseForces;
    this.externalInput = new ExternalInputConnector(this.mouseForces)
      .enable()
      .setSensitivity(0.002); // Set up external input
    this.paused = false;

    // Set up socket connection
    socketManager.enable = true; // Enable the socket manager!
    socketManager.connect();

    // this.setupMouseDebug();
  }

  async init() {
    try {
      await this.shaderManager.init();
      this.ui = new UiManager(this); // Use UiManager instead of UI
      this.animate();
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  animate() {
    // this.particleSystem.step();
    this.ui.updateStats();

    if (!this.paused) {
      this.render();
    }
    // Request next frame
    requestAnimationFrame(() => this.animate());
  }

  render() {
    this.frame++;
    // this.gridRenderer.drawGridTest();
    this.particleSystem.mouseForces.update(this.particleSystem);
    this.turbulenceField.update(this.particleSystem.timeStep);
    this.voronoiField.update(this.particleSystem.timeStep); // Update voronoiField

    this.particleSystem.step();
    this.gridRenderer.draw(this.particleSystem);

    // Draw particles
    this.particleRenderer.draw(this.particleSystem.getParticles());
    // this.gridRenderer.drawDebugIndexes();
  }

  static async create() {
    const main = new Main();
    await main.init();
    return main;
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
}

window.onload = () => Main.create().catch(console.error);

export { Main };
