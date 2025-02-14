// import { FluidSim } from "./simulation/fluidSim.js";
import { ShaderManager } from "./shaders/shaderManager.js";
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { UI } from "./ui/ui.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { LineRenderer } from "./renderer/lineRenderer.js";
import { GridRenderer } from "./renderer/gridRenderer.js"; // Import GridRenderer
import { DebugRenderer } from "./renderer/debugRenderer.js"; // Import DebugRenderer
import { TurbulenceField } from "./simulation/forces/turbulenceField.js";

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

    // Create turbulence field first
    this.turbulenceField = new TurbulenceField({
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.475,
      enabled: true, // Make sure this is defined
      strength: 0.5,
      scale: 4.0,
    });

    // Create particle system with turbulence reference
    this.particleSystem = new ParticleSystem({
      particleCount: 500,
      timeStep: 1 / 60,
      gravity: 0,
      turbulence: this.turbulenceField, // Pass reference
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
    this.setupMouseInteraction();
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

  setupMouseInteraction() {
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.canvas.addEventListener("mousedown", (e) => {
      const pos = this.getMouseSimulationCoords(e);
      this.mouseButton = e.button;
      this.lastMousePos = pos;

      // Update mouse force state
      this.particleSystem.mouseForces.setMouseState(
        pos.x,
        pos.y,
        true,
        e.button
      );
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const pos = this.getMouseSimulationCoords(e);

      if (
        this.mouseButton === 0 &&
        !this.particleSystem.mouseForces.mouseAttractor
      ) {
        // Normal mode: left mouse drag
        if (this.lastMousePos) {
          const dx = pos.x - this.lastMousePos.x;
          const dy = pos.y - this.lastMousePos.y;
          this.particleSystem.applyDragImpulse(pos.x, pos.y, dx, dy);
        }
      }

      // Update position for continuous force application
      if (this.mouseButton !== null) {
        this.particleSystem.mouseForces.setMouseState(
          pos.x,
          pos.y,
          true,
          this.mouseButton
        );
      }

      this.lastMousePos = pos;
    });

    const clearMouseState = () => {
      this.mouseButton = null;
      this.lastMousePos = null;
      this.particleSystem.mouseForces.setMouseState(0, 0, false);
    };

    this.canvas.addEventListener("mouseup", clearMouseState);
    this.canvas.addEventListener("mouseleave", clearMouseState);
  }

  getMouseSimulationCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height, // Flip Y coordinate
    };
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

    // Step particle simulation
    this.particleSystem.step();

    // Clear frame
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Draw grid
    this.gridRenderer.draw();

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

    // Draw particles
    this.particleRenderer.draw(
      this.particleSystem.getParticles(),
      this.colors.test
    );

    // Update mouse forces
    this.particleSystem.mouseForces.update(this.particleSystem);

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
