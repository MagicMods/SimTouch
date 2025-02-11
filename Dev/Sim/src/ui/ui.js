import GUI from "lil-gui";

class UI {
  constructor(simulation) {
    if (!simulation) {
      throw new Error("Simulation instance required");
    }
    this.sim = simulation;
    this.gui = new GUI();
    this.initGUI();
  }

  initGUI() {
    // Simulation controls
    const simFolder = this.gui.addFolder("Simulation");
    simFolder
      .add(this.sim, "particleCount", 0, 500, 10)
      .name("Particles")
      .onChange(() => {
        console.log(`Particle count updated: ${this.sim.particleCount}`);
      });

    // Particle appearance
    const appearanceFolder = this.gui.addFolder("Appearance");
    appearanceFolder
      .add(this.sim.particleRenderer.config, "size", 1, 10)
      .name("Size");

    console.log("UI initialized");
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}

export { UI };
