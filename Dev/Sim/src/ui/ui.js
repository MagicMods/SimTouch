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
    const picFolder = this.gui.addFolder("Particles");
    const physics = this.main.particleSystem;

    // Particle count and size controls
    const particleControl = picFolder
      .add(physics, "numParticles", 10, 1000, 10)
      .name("N");

    picFolder.add(physics, "particleRadius", 0.001, 0.05, 0.001).name("Size");

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
    const turbulence = this.main.turbulenceField; // Get reference to turbulence field

    turbulenceFolder.add(turbulence, "enabled").name("Enable");

    turbulenceFolder.add(turbulence, "strength", 0, 2, 0.1).name("Strength");

    turbulenceFolder.add(turbulence, "scale", 1, 10, 0.5).name("Scale");

    turbulenceFolder.add(turbulence, "speed", 0, 5, 0.1).name("Speed");

    turbulenceFolder.add(turbulence, "octaves", 1, 5, 1).name("Complexity");

    turbulenceFolder
      .add(turbulence, "persistence", 0, 1, 0.1)
      .name("Roughness");

    turbulenceFolder
      .add(turbulence, "rotation", 0, Math.PI * 2, 0.1)
      .name("Rotation");

    turbulenceFolder
      .add(turbulence, "inwardFactor", -2, 2, 0.1)
      .name("Inward Push");

    turbulenceFolder.open();

    // Open new folder
    interactionFolder.open();

    // Boundary parameters
    const boundaryFolder = picFolder.addFolder("Boundary");
    boundaryFolder
      .add(physics, "radius", 0.3, 0.55, 0.005)
      .name("Radius")
      .onChange((value) => {
        physics.radius = value;
        this.main.gridRenderer.updateBoundaryGeometry(value);
      });

    // Animation speed
    const animationFolder = picFolder.addFolder("Animation");
    animationFolder
      .add(physics, "timeScale", 0, 2, 0.1)
      .name("Speed")
      .onChange((value) => {
        console.log(`Animation speed: ${value}x`);
      });

    // Add Mouse Input controls
    const mouseInputFolder = picFolder.addFolder("Mouse Input");

    mouseInputFolder
      .add(physics, "mouseAttractor")
      .name("Attractor Mode")
      .onChange((value) => {
        console.log("Mouse mode:", value ? "Attractor/Repulsor" : "Drag");
      });

    mouseInputFolder
      .add(physics, "impulseRadius", 0.05, 0.5, 0.01)
      .name("Input Radius");

    mouseInputFolder
      .add(physics, "impulseMag", 0.001, 0.2, 0.001)
      .name("Input Strength");

    // Debug parameters
    const debugFolder = picFolder.addFolder("Debug");
    debugFolder.add(physics, "debugEnabled").name("Show Debug Overlay");
    debugFolder
      .add(physics, "debugShowVelocityField")
      .name("Show Velocity Field");
    debugFolder
      .add(physics, "debugShowPressureField")
      .name("Show Pressure Field");
    debugFolder.add(physics, "debugShowBoundaries").name("Show Boundaries");
    // NEW: Toggle for FLIP grid visualization
    debugFolder.add(physics, "debugShowFlipGrid").name("Show FLIP Grid");
    debugFolder.add(physics, "debugShowNoiseField").name("Show Noise Field");
    // NEW: Control noise field resolution
    debugFolder
      .add(physics, "noiseFieldResolution", 5, 50, 1)
      .name("Noise Field Resolution");

    // Add FLIP controls
    const flipFolder = picFolder.addFolder("FLIP");

    flipFolder
      .add(physics, "picFlipRatio", 0, 1, 0.01)
      .name("PIC / FLIP")
      .onChange((value) => {
        console.log(`PIC/FLIP mixing ratio: ${value * 100}% FLIP`);
      });

    // FLIP parameters
    flipFolder
      .add(physics, "flipIterations", 1, 40, 1)
      .name("Pressure Iterations");

    flipFolder.open();

    mouseInputFolder.open();

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
