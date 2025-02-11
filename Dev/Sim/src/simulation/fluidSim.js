import { FluidSolver } from "./fluidSolver.js";
import { GridRenderer } from "../renderer/gridRenderer.js";
import { ParticleRenderer } from "../renderer/particleRenderer.js";
import { ShaderManager } from "../shaders/shaderManager.js";
import { StateManager } from "../util/stateManager.js";

class FluidSim {
  constructor(gl, canvas, numX, numY) {
    if (!gl || typeof gl.createBuffer !== "function") {
      throw new Error("Valid WebGL context required");
    }

    this.gl = gl;
    this.canvas = canvas;
    this.width = Math.floor(Number(numX));
    this.height = Math.floor(Number(numY));

    if (this.width <= 0 || this.height <= 0) {
      throw new Error("Invalid dimensions");
    }

    // Physics parameters
    this.physics = {
      gravity: -9.81,
      timeStep: 1 / 60,
      damping: 0.98,
      bounds: {
        radius: 0.95, // Slightly smaller than render boundary
      },
    };

    // Initialize arrays
    this.particleCount = 100;
    this.particles = [];

    // Initialize mouse state
    this.mouse = {
      down: false,
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
    };

    // Add state manager
    this.stateManager = new StateManager();
  }

  async initialize() {
    try {
      // Initialize shader manager
      this.shaderManager = new ShaderManager(this.gl);
      await this.shaderManager.init();

      // Create renderers
      this.gridRenderer = new GridRenderer(this.gl, this.shaderManager);
      this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);

      // Initialize fluid solver with config object
      this.fluidSolver = new FluidSolver({
        width: this.width,
        height: this.height,
        timeStep: 1 / 60,
      });

      // Add initial particles
      this.addInitialParticles();

      console.log("FluidSim initialized");
      return true;
    } catch (error) {
      console.error("FluidSim initialization failed:", error);
      throw error;
    }
  }

  addInitialParticles() {
    const spacing = 0.1;
    const startX = -0.4;
    const startY = 0.4; // Start from top

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const x = startX + i * spacing;
        const y = startY - j * spacing;
        this.particles.push({
          x: x,
          y: y,
          vx: 0,
          vy: 0,
        });
      }
    }
    console.log(
      `Created ${this.particles.length} initial particles in grid pattern`
    );
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
    if (!this.gridRenderer || !this.particleRenderer) {
      console.error("Renderers not initialized - Call initialize() first");
      return false;
    }
    console.log("Animation starting with initialized renderers");
    this.animate();
    return true;
  }

  stop() {
    this.running = false;
    console.log("Simulation stopped");
  }

  animate() {
    this.stateManager.startFrame();

    // Update physics
    this.updateParticlePhysics();

    // Clear and setup frame
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Draw grid and boundary
    this.gridRenderer.draw();

    // Draw particles
    if (this.particles && this.particles.length > 0) {
      this.particleRenderer.draw(this.particles);
    }

    this.stateManager.endFrame();
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

  updateParticlePhysics() {
    for (let particle of this.particles) {
      // Add velocity if not exists
      if (!particle.vx) particle.vx = 0;
      if (!particle.vy) particle.vy = 0;

      // Apply gravity
      particle.vy += this.physics.gravity * this.physics.timeStep;

      // Update position
      particle.x += particle.vx * this.physics.timeStep;
      particle.y += particle.vy * this.physics.timeStep;

      // Check boundary collision
      const distanceFromCenter = Math.sqrt(
        particle.x * particle.x + particle.y * particle.y
      );
      if (distanceFromCenter > this.physics.bounds.radius) {
        // Calculate normal vector
        const nx = particle.x / distanceFromCenter;
        const ny = particle.y / distanceFromCenter;

        // Place on boundary
        particle.x = nx * this.physics.bounds.radius;
        particle.y = ny * this.physics.bounds.radius;

        // Reflect velocity
        const dot = particle.vx * nx + particle.vy * ny;
        particle.vx = (particle.vx - 2 * dot * nx) * this.physics.damping;
        particle.vy = (particle.vy - 2 * dot * ny) * this.physics.damping;
      }
    }
  }
}

export { FluidSim };
