import GUI from "lil-gui";

class UI {
  constructor(main) {
    if (!main) {
      throw new Error("Main instance required");
    }
    this.main = main;
    this.gui = new GUI();
    this.initGUI();
  }

  initGUI() {
    // Reference system controls
    const refFolder = this.gui.addFolder("Reference");
    refFolder
      .add(this.main.simulation, "particleCount", 0, 500, 10)
      .name("Particles")
      .onChange(() => {
        console.log(
          `Reference particles: ${this.main.simulation.particleCount}`
        );
      });

    // PIC system controls
    const picFolder = this.gui.addFolder("PIC");
    const physics = this.main.particleSystem;

    // Physics parameters
    const physicsFolder = picFolder.addFolder("Physics");
    physicsFolder.add(physics, "gravity", -20, 20, 0.1).name("Gravity");
    physicsFolder.add(physics, "restitution", 0, 2, 0.05).name("Restitution");
    physicsFolder
      .add(physics, "velocityDamping", 0.9, 1, 0.001)
      .name("Velocity Damping");
    physicsFolder
      .add(physics, "boundaryDamping", 0, 1, 0.05)
      .name("Boundary Damping");
    physicsFolder
      .add(physics, "particleRadius", 0.001, 0.02, 0.001)
      .name("Particle Size");

    // Boundary parameters
    const boundaryFolder = picFolder.addFolder("Boundary");
    boundaryFolder.add(physics, "radius", 0.3, 0.495, 0.005).name("Radius");

    // Open relevant folders
    picFolder.open();
    physicsFolder.open();

    console.log("UI initialized with PIC parameters");
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}

export { UI };
