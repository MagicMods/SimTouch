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
    // const refFolder = this.gui.addFolder("Reference");
    // refFolder
    //   .add(this.main.simulation, "particleCount", 0, 500, 10)
    //   .name("Particles")
    //   .onChange(() => {
    //     console.log(
    //       `Reference particles: ${this.main.simulation.particleCount}`
    //     );
    //   });

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

    // Core parameters - gravity now positive up
    physicsFolder
      .add(physics, "gravity", 0, 9.89, 0.1)
      .name("Gravity")
      .onChange((value) => (physics.gravity = value)); // Invert for screen space

    // Collision parameters - corrected ranges
    const collisionFolder = physicsFolder.addFolder("Collision");

    // Restitution: 0 = no bounce, 1 = perfect bounce
    collisionFolder.add(physics, "restitution", 0.0, 1.0, 0.05).name("Bounce");

    // Air friction: 0 = no friction, 1 = maximum friction
    collisionFolder
      .add(physics, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Air Friction")
      .onChange((value) => (physics.velocityDamping = value)); // Invert for damping

    // Wall friction: 0 = no friction, 1 = maximum friction
    collisionFolder
      .add(physics, "boundaryDamping", 0.0, 1.0, 0.01)
      .name("Wall Friction")
      .onChange((value) => (physics.boundaryDamping = value)); // Invert for damping

    // Rest state - lower values = more precise rest detection
    const restFolder = physicsFolder.addFolder("Rest State");
    restFolder
      .add(physics, "velocityThreshold", 0.00001, 0.01, 0.00001)
      .name("Min Speed");

    restFolder
      .add(physics, "positionThreshold", 0.000001, 0.001, 0.000001)
      .name("Min Move");

    // Particle parameters - size as percentage of space
    const particleFolder = physicsFolder.addFolder("Particles");
    particleFolder
      .add(physics, "particleRadius", 0.001, 0.05, 0.001)
      .name("Size %");

    // particleFolder
    //   .add(physics, "renderScale", 100, 1000, 50)
    //   .name("Visual Scale");

    // Add particle interaction controls
    const interactionFolder = physicsFolder.addFolder("Interaction");

    // Toggle particle collisions
    interactionFolder
      .add(physics, "collisionEnabled")
      .name("Enable Collisions");

    // Repulsion strength
    interactionFolder.add(physics, "repulsion", 0, 100, 0.05).name("Repulsion");

    // Collision energy preservation
    interactionFolder
      .add(physics, "collisionDamping", 0.5, 1.0, 0.01)
      .name("Collision Preserve");

    // Add turbulence controls
    const turbulenceFolder = physicsFolder.addFolder("Turbulence");

    turbulenceFolder.add(physics, "turbulenceEnabled").name("Enable");

    turbulenceFolder
      .add(physics, "turbulenceStrength", 0, 10, 0.1)
      .name("Strength");

    turbulenceFolder.add(physics, "turbulenceScale", 1, 10, 0.5).name("Scale");

    turbulenceFolder.add(physics, "turbulenceSpeed", 0, 5, 0.1).name("Speed");

    turbulenceFolder
      .add(physics, "turbulenceOctaves", 1, 5, 1)
      .name("Complexity");

    turbulenceFolder
      .add(physics, "turbulencePersistence", 0, 1, 0.1)
      .name("Roughness");

    turbulenceFolder
      .add(physics, "turbulenceRotation", 0, Math.PI * 2, 0.1)
      .name("Rotation");

    turbulenceFolder.open();

    // Open new folder
    interactionFolder.open();

    // Boundary parameters
    const boundaryFolder = picFolder.addFolder("Boundary");
    boundaryFolder.add(physics, "radius", 0.3, 0.495, 0.005).name("Radius");

    // Animation speed
    const animationFolder = picFolder.addFolder("Animation");
    animationFolder
      .add(physics, "timeScale", 0, 2, 0.1)
      .name("Speed")
      .onChange((value) => {
        console.log(`Animation speed: ${value}x`);
      });

    // Debug parameters
    const debugFolder = picFolder.addFolder("Debug");
    debugFolder.add(physics, "debugEnabled").name("Show Grid");

    // Open relevant folders
    picFolder.open();
    physicsFolder.open();
    collisionFolder.open();
    restFolder.open();
    particleFolder.open();
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
