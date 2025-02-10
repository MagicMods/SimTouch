import { FluidSolver } from "./fluidSolver.js";
import { GridRenderer } from "../renderer/gridRenderer.js";
import { ParticleRenderer } from "../renderer/particleRenderer.js";
import { ShaderManager } from "../shaders/shaderManager.js";

class FluidSim {
  constructor(gl, width, height) {
    if (!gl || typeof gl.createBuffer !== "function") {
      throw new Error("Valid WebGL context required");
    }

    this.gl = gl;
    this.width = width;
    this.height = height;

    // Initialize solver with numeric values
    this.solver = new FluidSolver({
      width: Number(width),
      height: Number(height),
      timeStep: 1 / 60,
    });

    // Initialize renderers with validated context
    this.gridRenderer = new GridRenderer(this.gl, this.width, this.height);
    this.particleRenderer = new ParticleRenderer(
      this.gl,
      this.width,
      this.height
    );

    // Initialize shader manager
    this.shaderManager = new ShaderManager(this.gl);

    // Start shader initialization
    this.initialize();

    console.log("FluidSim initialized");
  }

  async initialize() {
    try {
      // Initialize shaders
      this.programInfo = await this.shaderManager.init();
      if (!this.programInfo) {
        throw new Error("Failed to initialize shaders");
      }
      console.log("Shader initialization complete");

      // Start animation
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

        // Calculate and apply force
        const dx = this.mouse.x - this.mouse.prevX;
        const dy = this.mouse.y - this.mouse.prevY;
        this.solver.applyForce(this.mouse.x, this.mouse.y, dx, dy);
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
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * this.width;
    this.mouse.y = ((e.clientY - rect.top) / rect.height) * this.height;
  }

  start() {
    requestAnimationFrame(() => this.animate());
    console.log("Animation started");
  }

  stop() {
    this.running = false;
    console.log("Simulation stopped");
  }

  animate() {
    this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.solver.step();

    if (this.programInfo) {
      this.gl.useProgram(this.programInfo.program);
      this.gridRenderer.boundaryRadius = this.solver.boundaryRadius;
      this.gridRenderer.draw(this.programInfo);
      this.particleRenderer.drawParticles(
        this.solver.particles,
        this.programInfo
      );
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
