import GUI from "lil-gui";

class UI {
  constructor(simulation) {
    if (!simulation) {
      throw new Error("Simulation instance required");
    }
    this.sim = simulation;
    this.stats = {
      fps: 0,
      frameTime: 0,
      lastTime: performance.now(),
    };

    this.gui = new GUI();
    this.initGUI();
    this.startStatsUpdate();

    console.log("UI initialized");
  }

  initGUI() {
    // Simulation controls
    const simFolder = this.gui.addFolder("Simulation");
    simFolder.add(this.sim, "particleCount", 0, 500, 10).name("Particle Count");

    // Particle appearance
    const particleFolder = this.gui.addFolder("Particles");
    particleFolder
      .add(this.sim.particleRenderer.config, "size", 1, 30, 0.5)
      .name("Size");

    const color = particleFolder
      .addColor(this.sim.particleRenderer.config, "color")
      .name("Color");

    // Stats folder
    const statsFolder = this.gui.addFolder("Stats");
    statsFolder.add(this.stats, "fps").name("FPS").listen();

    console.log("UI initialized with particle controls");
  }

  startStatsUpdate() {
    let frameCount = 0;
    let lastTime = performance.now();
    const updateInterval = 500; // Update every 500ms

    const updateStats = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      if (elapsed >= updateInterval) {
        this.stats.fps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(updateStats);
    };

    updateStats();
  }

  updateStats() {
    const now = performance.now();
    const dt = now - this.stats.lastTime;
    this.stats.lastTime = now;
    this.stats.frameTime = dt;
    this.stats.fps = Math.round(1000 / dt);
    requestAnimationFrame(() => this.updateStats());
  }
}

export { UI };
