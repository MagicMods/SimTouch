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

    // Particle count with reinit
    const particleControl = picFolder
      .add(physics, "numParticles", 10, 500, 10)
      .name("Particles");

    particleControl.onChange((value) => {
      physics.numParticles = value;
      physics.particles = new Float32Array(value * 2);
      physics.velocitiesX = new Float32Array(value);
      physics.velocitiesY = new Float32Array(value);
      physics.initializeParticles();
      console.log(`PIC particles reinitialized with count: ${value}`);
    });

    // Physics parameters with refined ranges
    const physicsFolder = picFolder.addFolder("Physics");
    physicsFolder
      .add(physics, "gravity", -5, 5, 0.1) // Smaller range for [0,1] space
      .name("Gravity");
    physicsFolder
      .add(physics, "restitution", 0.1, 1.0, 0.05) // More natural bounce range
      .name("Restitution");
    physicsFolder
      .add(physics, "velocityDamping", 0.95, 1.0, 0.001)
      .name("Velocity Damping");
    physicsFolder
      .add(physics, "boundaryDamping", 0.5, 1.0, 0.05)
      .name("Boundary Damping");
    physicsFolder
      .add(physics, "particleRadius", 0.08, 1, 0.001) // Finer size control
      .name("Particle Size");

    // Boundary parameters
    const boundaryFolder = picFolder.addFolder("Boundary");
    boundaryFolder.add(physics, "radius", 0.3, 0.495, 0.005).name("Radius");

    // Animation controls
    const animationFolder = picFolder.addFolder("Animation");
    animationFolder
      .add(physics, "timeScale", 0, 2, 0.1)
      .name("Speed")
      .onChange((value) => {
        console.log(`Animation speed: ${value}x`);
      });

    // Open relevant folders
    picFolder.open();
    physicsFolder.open();
    animationFolder.open();

    console.log("UI initialized with PIC parameters");
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}

export { UI };
