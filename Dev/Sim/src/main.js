import { ShaderManager } from "./shaders/shaderManager.js";
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { UI } from "./ui/ui.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { LineRenderer } from "./renderer/lineRenderer.js";
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

    // Colors for different systems
    this.colors = {
      reference: [0.2, 0.4, 1.0, 0.8], // Blue
      test: [1.0, 0.4, 0.2, 0.8], // Orange
    };

    // Create boundary first
    this.boundary = new CircularBoundary({
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.475,
      restitution: 0.8,
      damping: 0.95,
    });

    // Create turbulence with boundary reference
    this.turbulenceField = new TurbulenceField({
      boundary: this.boundary,
      enabled: true,
      strength: 0.5,
      scale: 4.0,
    });

    // Create particle system with dependencies
    this.particleSystem = new ParticleSystem({
      particleCount: 680,
      timeStep: 1 / 60,
      gravity: 0,
      turbulence: this.turbulenceField,
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

    // NEW: Create DebugRenderer instance
    this.debugRenderer = new DebugRenderer(this.gl);

    // Frame counter for logging
    this.frame = 0;

    // Add mouse state tracking
    this.isMouseDown = false;
    this.mouseButton = null;
    this.lastMousePos = null;

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

    // Update turbulence before particle step
    this.turbulenceField.update(this.particleSystem.timeStep); // Use fixed timestep or this.particleSystem.timeStep

    // Apply continuous force if active
    if (this.activeForcePos && this.activeForceMode) {
      this.particleSystem.applyImpulseAt(
        this.activeForcePos.x,
        this.activeForcePos.y,
        this.activeForceMode
      );
    }

    // Update mouse forces
    this.particleSystem.mouseForces.update(this.particleSystem);
    // Step particle simulation
    this.particleSystem.step();

    // Clear frame
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Update grid with particle system reference
    this.gridRenderer.draw(this.particleSystem);

    // Optionally draw debug grid via line renderer
    if (
      this.particleSystem.debugEnabled &&
      typeof this.particleSystem.drawDebugGrid === "function"
    ) {
      this.particleSystem.drawDebugGrid(this.lineRenderer);
    }

    // NEW: Draw debug overlays if debug is enabled
    if (this.particleSystem.debugEnabled) {
      const debugProgram = this.shaderManager.getProgram("lines");
      if (debugProgram) {
        this.debugRenderer.drawDebugOverlay(this.particleSystem, debugProgram);
      } else {
        console.error("Debug shader program 'lines' not found.");
      }
    }

    // Draw boundary using shader manager
    this.particleSystem.boundary.draw(this.gl, this.shaderManager);

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
