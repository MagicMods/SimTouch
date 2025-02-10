import { FluidSolver } from "./fluidSolver.js";
import { GridRenderer } from "../renderer/gridRenderer.js";
import { DebugRenderer } from "../renderer/debugRenderer.js";
import { ParticleRenderer } from "../renderer/particleRenderer.js";
import { ShaderManager } from "../shaders/shaderManager.js";

class FluidSim {
  constructor(canvas) {
    // Initialize WebGL context
    this.gl = canvas.getContext("webgl");
    if (!this.gl) {
      throw new Error("WebGL not supported");
    }

    // Initialize components
    this.solver = new FluidSolver(29, 14);
    this.canvas = canvas;
    this.running = false;

    // Initialize particles in grid
    this.solver.initializeParticles(100); // Add initial particles

    // Create renderers
    this.gridRenderer = new GridRenderer(canvas);
    this.particleRenderer = new ParticleRenderer(
      canvas,
      this.solver.width,
      this.solver.height
    );

    console.log("FluidSim initialized");
  }

  async initialize() {
    try {
      // Initialize shaders
      this.programInfo = await this.shaderManager.init();
      if (!this.programInfo) {
        throw new Error("Failed to initialize shaders");
      }
      console.log("Shader initialization complete:", this.programInfo);

      // Start simulation
      this.start();
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  }

  setupMouseHandlers() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.mouse.down = true;
      this.updateMousePosition(e);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.mouse.down) {
        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
        this.updateMousePosition(e);

        // Calculate velocity from mouse movement
        const velocityX = (this.mouse.x - this.mouse.prevX) * 0.5;
        const velocityY = (this.mouse.y - this.mouse.prevY) * 0.5;

        // Apply force to fluid
        this.solver.applyForce(
          this.mouse.x,
          this.mouse.y,
          velocityX,
          velocityY
        );
      }
    });

    this.canvas.addEventListener("mouseup", () => {
      this.mouse.down = false;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.mouse.down = false;
    });
  }

  updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Convert to simulation space (0 to 1)
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * this.solver.width;
    this.mouse.y = ((e.clientY - rect.top) / rect.height) * this.solver.height;
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.animate();
      console.log("Simulation started");
    }
  }

  stop() {
    this.running = false;
    console.log("Simulation stopped");
  }

  animate() {
    if (!this.running) return;

    // Clear canvas
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Draw grid
    this.gridRenderer.draw(this.programInfo);

    // Update simulation
    this.solver.step();

    // Draw particles
    if (this.solver.particles && this.solver.particles.length > 0) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.particleRenderer.drawParticles(
        this.solver.particles,
        this.programInfo
      );
      this.gl.disable(this.gl.BLEND);
    }

    requestAnimationFrame(() => this.animate());
  }

  checkSimulationState(state) {
    if (
      !state.velocityBounds ||
      !state.pressureBounds ||
      !state.boundaryConditions
    ) {
      return false;
    }
    return true;
  }

  updateDebugInfo() {
    const debug = this.solver.getDebugInfo();
    console.log("Simulation Stats:", {
      maxVelocity: Math.max(debug.stats.maxVelocityU, debug.stats.maxVelocityV),
      maxPressure: debug.stats.maxPressure,
      solidCells: debug.stats.solidCells,
    });
  }

  // Debug control methods
  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
    console.log(`Debug mode ${this.debugEnabled ? "enabled" : "disabled"}`);
  }

  getSimulationState() {
    return {
      running: this.running,
      debug: this.debugEnabled,
      solver: this.solver.getDebugInfo(),
    };
  }
}

export { FluidSim };
