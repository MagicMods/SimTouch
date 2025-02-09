import { Grid } from "./grid.js";
import { Renderer } from "./renderer.js";
import { createShaderProgram } from "./shaders.js"; // Add this import
import { PresetManager } from "./presetManager.js";

class FluidSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl");

    // Create program after gl context
    const program = createShaderProgram(this.gl);
    this.programInfo = {
      program: program,
      uniformLocations: {
        color: this.gl.getUniformLocation(program, "uColor"),
        resolution: this.gl.getUniformLocation(program, "uResolution"),
      },
    };

    this.grid = new Grid(this.gl, canvas.width, canvas.height);
    this.renderer = new Renderer(canvas);

    this.renderer = new Renderer(canvas);
    this.canvas = canvas; // Store canvas reference
    this.lastTime = performance.now(); // Initialize lastTime
    this.dt = 1 / 60; // Fixed timestep for stability

    // Initialize particles immediately
    this.grid.particleSystem.setupParticles();

    // Debug draw call
    console.log("Starting render loop");

    // Initialize PresetManager with this instance
    this.presetManager = new PresetManager(this);
  }

  update() {
    const currentTime = performance.now();
    this.grid.simulate(this.dt);

    // Draw both renderer and grid
    this.renderer.draw(this.grid);
    this.grid.draw(this.programInfo);

    this.lastTime = currentTime;
  }

  start() {
    const animate = () => {
      this.update();
      requestAnimationFrame(animate);
    };
    animate();
  }

  initInteraction() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.isMouseDown = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  handleMouseMove(event) {
    if (!this.isMouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;

    this.applyForce(x, y, dx, dy);

    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  handleMouseUp() {
    this.isMouseDown = false;
  }

  resize(width, height) {
    // Update canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;

    // Update renderer dimensions
    if (this.renderer) {
      this.renderer.resize(width, height);
    }

    // Recalculate grid dimensions
    const cellSize = Math.min(width, height) / 30; // or whatever ratio you want
    const gridWidth = Math.floor(width / cellSize);
    const gridHeight = Math.floor(height / cellSize);

    // Create new grid with new dimensions
    this.gridSize = { width: gridWidth, height: gridHeight };
    this.cellSize = cellSize;

    // Update particle system if it exists
    if (this.particleSystem) {
      this.particleSystem.resize(width, height);
    }
  }

  applyForce(x, y, fx, fy) {
    const solver = this.grid.fluidSolver;
    const n = solver.numX;
    const h = solver.h;

    const gx = Math.floor(x / h);
    const gy = Math.floor(y / h);
    const radius = 3;

    for (
      let i = Math.max(1, gx - radius);
      i <= Math.min(solver.numX - 2, gx + radius);
      i++
    ) {
      for (
        let j = Math.max(1, gy - radius);
        j <= Math.min(solver.numY - 2, gy + radius);
        j++
      ) {
        if (solver.s[i + j * n] !== 0) {
          const dx = (i - gx) * h;
          const dy = (j - gy) * h;
          const d = Math.sqrt(dx * dx + dy * dy);
          const weight = Math.max(0, 1 - d / (radius * h));

          solver.u[i + j * n] += fx * weight;
          solver.v[i + j * n] += fy * weight;
        }
      }
    }
  }

  setConfig(config) {
    this.grid.setConfig(config);
  }

  getConfig() {
    return this.grid.getConfig();
  }

  reset() {
    // Change from resetSimulation() to reset()
    this.grid.reset();
    this.renderer?.gl.clear(this.renderer.gl.COLOR_BUFFER_BIT);
    this.lastTime = performance.now();
  }

  dispose() {
    this.grid.dispose();
    this.renderer.dispose();

    // Remove event listeners
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
  }

  getStats() {
    return this.grid.getMetrics();
  }
  render() {
    console.log("Render frame");
    // Draw grid and particles
    this.grid.draw(this.programInfo);

    // Request next frame
    requestAnimationFrame(() => this.render());
  }

  savePreset(name) {
    return this.presetManager.savePreset(name, this.grid.getConfig());
  }

  loadPreset(name) {
    const preset = this.presetManager.loadPreset(name);
    if (preset) {
      this.grid.setConfig(preset);
    }
    return preset;
  }

  getAvailablePresets() {
    return this.presetManager.getAllPresets();
  }
}

export { FluidSimulation };
