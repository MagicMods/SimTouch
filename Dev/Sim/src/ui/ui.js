import GUI from "lil-gui";

class UI {
  constructor(fluidSim) {
    this.sim = fluidSim;
    this.gui = new GUI();

    this.stats = {
      fps: 0,
      particles: this.sim.solver.numParticles,
    };

    this.initGUI();
    this.startStatsUpdate();
  }

  initGUI() {
    // Stats folder
    const statsFolder = this.gui.addFolder("Stats");
    statsFolder.add(this.stats, "fps").listen().name("FPS");
    statsFolder.add(this.stats, "particles").name("Particles");

    // Simulation Controls
    const simFolder = this.gui.addFolder("Simulation");
    simFolder.add(this.sim.solver, "gravity", -10, 10, 0.1).name("Gravity");
    simFolder
      .add(this.sim.solver, "timeStep", 0.001, 0.05, 0.001)
      .name("Time Step");
    simFolder
      .add(this.sim.solver, "velocityDamping", 0.9, 1, 0.001)
      .name("Velocity Damping");
    simFolder
      .add(this.sim.solver, "boundaryDamping", 0, 1, 0.05)
      .name("Boundary Damping");

    // Particle Controls
    const particleFolder = this.gui.addFolder("Particles");
    particleFolder
      .add(this.sim.solver, "particleRadius", 0.1, 2, 0.1)
      .name("Size");
    particleFolder
      .add(this.sim.solver, "particleMass", 0.1, 5, 0.1)
      .name("Mass");
    particleFolder
      .add(this.sim.solver, "particleStiffness", 0, 1, 0.05)
      .name("Stiffness");
    particleFolder
      .add(this.sim.solver, "restitution", 0, 1, 0.05)
      .name("Restitution");

    // Open folders by default
    statsFolder.open();
    simFolder.open();
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
}

export { UI };
