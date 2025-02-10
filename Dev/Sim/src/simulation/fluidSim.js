import { FluidSolver } from "./fluidSolver.js";
import { GridRenderer } from "../renderer/gridRenderer.js";
import { ParticleRenderer } from "../renderer/particleRenderer.js";
import { ShaderManager } from "../shaders/shaderManager.js";

class FluidSim {
  constructor(gl, canvas, width, height) {
    if (!gl || typeof gl.createBuffer !== "function") {
      throw new Error("Valid WebGL context required");
    }

    this.gl = gl;
    this.canvas = canvas;
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

    // Initialize mouse state
    this.mouse = { down: false, x: 0, y: 0, prevX: 0, prevY: 0 };
    this.canvas = canvas;
    this.setupMouseHandlers();

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
    if (!this.canvas) {
      throw new Error("Canvas reference required for mouse handlers");
    }

    this.canvas.addEventListener("mousedown", (e) => {
      const pos = this.getMousePosition(e);
      this.mouse.down = true;
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.prevX = pos.x;
      this.mouse.prevY = pos.y;
      console.log("Mouse down:", pos);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.mouse.down) return;

      const pos = this.getMousePosition(e);
      const dx = pos.x - this.mouse.prevX;
      const dy = pos.y - this.mouse.prevY;

      if (dx !== 0 || dy !== 0) {
        console.log("Mouse force:", { x: pos.x, y: pos.y, dx, dy });
        this.solver.applyForce(pos.x, pos.y, dx, dy);
      }

      this.mouse.prevX = pos.x;
      this.mouse.prevY = pos.y;
    });

    this.canvas.addEventListener("mouseup", () => {
      console.log("Mouse up");
      this.mouse.down = false;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.mouse.down = false;
    });

    console.log("Mouse handlers initialized");
  }

  getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.width;
    const y = ((e.clientY - rect.top) / rect.height) * this.height;
    return { x, y };
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
