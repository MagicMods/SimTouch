import { FluidSim } from "../simulation/fluidSim.js";
import GUI from "lil-gui";

class UI {
  constructor() {
    this.isPaused = false;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.fpsUpdateInterval = 500;
    this.fpsHistory = new Array(10).fill(60);

    this.stats = {
      fps: 0,
      particles: 0,
      lastTime: performance.now(),
    };

    this.gui = null;
    this.simulation = null;
  }

  initialize(canvas) {
    this.simulation = new FluidSim(canvas);
    this.initializeGUI();
    this.startStatsUpdate();
    this.startRenderLoop();
  }

  startStatsUpdate() {
    requestAnimationFrame(() => this.updateStats());
  }

  startRenderLoop() {
    if (!this.isPaused && this.simulation) {
      this.simulation.update();
    }
    requestAnimationFrame(() => this.startRenderLoop());
  }

  updateStats() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const deltaTime = (now - this.lastFpsUpdate) / 1000;
      const currentFps = Math.round(this.frameCount / deltaTime);

      // Update moving average
      this.fpsHistory.shift();
      this.fpsHistory.push(currentFps);
      const averageFps = Math.round(
        this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length
      );

      // Update stats
      this.stats.fps = averageFps;
      this.stats.particles = this.simulation?.grid?.particleCount || 0;

      // Reset counters
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    requestAnimationFrame(() => this.updateStats());
  }

  initializeGUI() {
    this.gui = new GUI();
    window.gui = this.gui; // Keep reference for debugging

    // Simulation controls
    const simulationFolder = this.gui.addFolder("Simulation");
    simulationFolder.add(this, "isPaused").name("Pause");

    // Grid controls
    const gridFolder = this.gui.addFolder("Grid");
    if (this.simulation?.grid) {
      gridFolder
        .add(this.simulation.grid, "particleCount", 100, 5000)
        .step(100)
        .onChange((value) => {
          this.simulation.grid.setParticleCount(value);
        });
    }

    // Stats display
    const statsFolder = this.gui.addFolder("Stats");
    statsFolder.add(this.stats, "fps").listen().disable();
    statsFolder.add(this.stats, "particles").listen().disable();

    // Add slider background update
    this.gui.controllers.forEach((controller) => {
      if (controller.type === "number" && controller.min !== undefined) {
        this.updateSliderBackground(controller);
        controller.onChange(() => this.updateSliderBackground(controller));
      }
    });
  }

  updateSliderBackground(controller) {
    const percent =
      ((controller.getValue() - controller.min) /
        (controller.max - controller.min)) *
      100;
    controller.domElement
      .querySelector(".slider")
      ?.style.setProperty("--slider-percent", `${percent}%`);
  }
}

export { UI };
