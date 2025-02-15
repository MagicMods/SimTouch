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
    const physics = this.main.particleSystem;
    const picFolder = this.gui.addFolder("Particles");

    // 1. Particle Properties
    const particleFolder = picFolder.addFolder("Properties");
    particleFolder
      .add(physics, "numParticles", 10, 1000, 10)
      .name("Count")
      .onChange((value) => {
        physics.reinitializeParticles(value);
      });

    particleFolder
      .add(physics, "particleRadius", 0.01, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        // Update collision system's particle radius
        physics.collisionSystem.particleRadius = value * 2; // Double for collision distance
      });

    // Add opacity control after size control
    particleFolder
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    // Add color control after opacity in particle folder
    particleFolder
      .addColor(this.main.particleRenderer, "particleColor")
      .name("Color");

    // 2. Physics Parameters
    const physicsFolder = picFolder.addFolder("Physics");
    physicsFolder.add(physics, "gravity", 0, 9.89, 0.1).name("Gravity");

    physicsFolder
      .add(physics, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Air Friction");

    // 3. Boundary Controls
    const boundaryFolder = picFolder.addFolder("Boundary");
    boundaryFolder
      .add(physics.boundary, "radius", 0.3, 0.55, 0.005)
      .name("Size")
      .onChange((value) => {
        physics.boundary.update({ radius: value }, [
          (boundary) => this.main.gridRenderer.updateBoundaryGeometry(boundary),
        ]);
      });

    // Wall friction: 0 = no friction, 1 = maximum friction
    boundaryFolder
      .add(physics, "boundaryDamping", 0.0, 1.0, 0.01)
      .name("Wall Friction")
      .onChange((value) => (physics.boundaryDamping = value)); // Invert for damping

    boundaryFolder
      .add(physics.boundary, "cBoundaryRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    // Visual controls
    const visualFolder = boundaryFolder.addFolder("Visual");
    visualFolder.addColor(physics.boundary, "color").name("Color");

    visualFolder
      .add(physics.boundary, "lineWidth", 0.1, 2, 1)
      .name("Line Width");

    // Collision parameters - corrected ranges
    const collisionFolder = physicsFolder.addFolder("Collision");
    // Update to use collisionSystem
    collisionFolder
      .add(physics.collisionSystem, "enabled")
      .name("Enable Collisions");

    collisionFolder
      .add(physics.collisionSystem, "repulsion", 0, 100.0, 0.05)
      .name("Repulsion");

    collisionFolder
      .add(physics.collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    collisionFolder
      .add(physics.collisionSystem, "damping", 0.5, 1.0, 0.01)
      .name("Collision Damping");

    // Rest state - lower values = more precise rest detection
    const restFolder = physicsFolder.addFolder("Rest State");
    restFolder
      .add(physics, "velocityThreshold", 0.00001, 0.1, 0.00001)
      .name("Min Speed");

    restFolder
      .add(physics, "positionThreshold", 0.000001, 0.1, 0.000001)
      .name("Min Move");

    // Add turbulence controls
    const turbulenceFolder = physicsFolder.addFolder("Turbulence");
    const turbulence = this.main.turbulenceField; // Get reference to turbulence field

    turbulenceFolder.add(turbulence, "enabled").name("Enable");

    turbulenceFolder.add(turbulence, "strength", 0, 10, 0.1).name("Strength");

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

    if (physics.mouseForces) {
      mouseInputFolder
        .add(physics.mouseForces, "mouseAttractor")
        .name("Attractor Mode")
        .onChange((value) => {
          console.log("Mouse mode:", value ? "Attractor/Repulsor" : "Drag");
        });

      mouseInputFolder
        .add(physics.mouseForces, "impulseRadius", 0.05, 0.5, 0.01)
        .name("Input Radius");

      mouseInputFolder
        .add(physics.mouseForces, "impulseMag", 0.001, 0.1, 0.001)
        .name("Input Strength");
    } else {
      console.warn("Mouse forces not initialized");
    }

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

    // Add Grid Controls
    const gridFolder = picFolder.addFolder("Grid");
    const gridRenderer = this.main.gridRenderer;

    // Density Map controls
    const densityFolder = gridFolder.addFolder("Density Map");
    densityFolder.add(gridRenderer, "showDensity").name("Show Density");
    densityFolder
      .add(gridRenderer, "minDensity", 0, 10, 0.1)
      .name("Min Density");
    densityFolder
      .add(gridRenderer, "maxDensity", 0, 10, 0.1)
      .name("Max Density");

    // Gradient controls
    const gradientFolder = gridFolder.addFolder("Gradient");
    const gradientPoints = gridRenderer.gradientPoints;

    // Add color controls for each gradient point
    gradientPoints.forEach((point, index) => {
      const pointFolder = gradientFolder.addFolder(`Point ${index + 1}`);
      pointFolder
        .add(point, "pos", 0, 100, 1)
        .name("Position")
        .onChange(() => gridRenderer.updateGradient());
      pointFolder
        .addColor(point, "r", 0, 1)
        .name("Red")
        .onChange(() => gridRenderer.updateGradient());
      pointFolder
        .addColor(point, "g", 0, 1)
        .name("Green")
        .onChange(() => gridRenderer.updateGradient());
      pointFolder
        .addColor(point, "b", 0, 1)
        .name("Blue")
        .onChange(() => gridRenderer.updateGradient());
    });

    // Open folders
    gridFolder.open();
    densityFolder.open();

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
