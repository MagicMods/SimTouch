import { BaseRenderer } from "../renderer/baseRenderer.js";
import { Grid } from "./grid.js";
import { ShaderManager } from "../shaders/shaderManager.js";
import { ReactiveGrid } from "./reactiveGrid.js";
import { PresetManager } from "./presetManager.js"; // Add this import

class SimulationManager {
  constructor(canvas) {
    // Initialize WebGL context first
    this.canvas = document.getElementById("glCanvas");
    this.renderer = new BaseRenderer(this.canvas);
    console.log("Renderer initialized");

    // Initialize preset manager
    this.presetManager = new PresetManager(this);

    // Create shader program using new ShaderManager
    this.shaderManager = new ShaderManager(this.renderer.gl);
    this.shaderManager.init().then(() => {
      this.programInfo = this.shaderManager.getProgram("basic");
      console.log("Shader program created");
      this.initializeSimulation();
    });
  }

  async initializeSimulation() {
    // Wait for shader initialization
    await this.renderer.initShaders();

    this.grid = new Grid(
      this.renderer.gl,
      this.canvas.width,
      this.canvas.height
    );
    console.log("Grids initialized");

    // Initialize preset manager after grid setup
    this.presetManager = new PresetManager(this);
    await this.presetManager.loadPresets();
    console.log("PresetManager initialized");

    // Set up event handlers
    this.setupEventHandlers();
    console.log("Event handlers initialized");

    // Test draw after everything is initialized
    this.renderer.drawTestRectangle();
  }

  update() {
    if (!this.grid || !this.reactiveGrid) return;

    if (!this.isPaused) {
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 1 / 30);
      this.lastTime = now;

      // Clear the canvas
      const gl = this.renderer.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Enable blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Update and draw both simulations
      this.grid.simulate(dt);
      this.reactiveGrid.simulate(dt);

      // Draw original grid first
      this.grid.draw(this.programInfo);

      // Draw reactive grid on top with transparency
      this.reactiveGrid.draw(this.programInfo);
    }
  }

  simulate(dt) {
    if (this.grid) {
      this.grid.simulate(dt);
    }
  }

  draw() {
    if (this.grid) {
      this.grid.draw(this.programInfo);
    }
  }

  reset() {
    if (this.grid) {
      this.grid.reset();
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  initializeEventHandlers() {
    // Mouse interaction
    this.isDragging = false;

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.updateObstaclePosition(e);
      }
    });

    this.canvas.addEventListener("mouseup", () => {
      this.isDragging = false;
      // Disable obstacles for both grids
      this.grid.isObstacleActive = false;
      this.grid.particleSystem.isObstacleActive = false;
      this.reactiveGrid.isObstacleActive = false;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        this.updateObstaclePosition(e);
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.isDragging = false;
      // Disable obstacles for both grids
      this.grid.isObstacleActive = false;
      this.grid.particleSystem.isObstacleActive = false;
      this.reactiveGrid.isObstacleActive = false;
    });
  }

  updateObstaclePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Update original grid
    this.grid.isObstacleActive = true;
    this.grid.particleSystem.isObstacleActive = true;
    this.grid.circleCenter = { x, y };
    this.grid.particleSystem.circleCenter = { x, y };

    // Update reactive grid
    this.reactiveGrid.isObstacleActive = true;
    this.reactiveGrid.circleCenter = { x, y };

    // Debug: Log obstacle position
    console.debug("Obstacle position:", x, y);
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.grid.setCellAtPosition(x, y, 1);
  }

  animate() {
    // Clear and draw
    this.grid.draw();

    // Request next frame
    requestAnimationFrame(this.animate.bind(this));
  }

  setupEventHandlers() {
    // Mouse event handlers
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));

    // Window resize handler
    window.addEventListener("resize", () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.renderer.resize(width, height);
    });

    // Prevent context menu on canvas
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  handleMouseMove(event) {
    if (this.grid?.isMouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.grid?.handleMouseMove(x, y);
    }
  }

  handleMouseUp() {
    this.grid?.handleMouseUp();
  }
}

// Create simulation manager when window loads
window.onload = () => {
  new SimulationManager();
};

export { SimulationManager };

const sim = new SimulationManager();
