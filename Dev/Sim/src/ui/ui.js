import GUI from "lil-gui";

class UI {
  constructor(main) {
    if (!main) {
      throw new Error("Main instance required");
    }
    this.main = main;
    this.gui = new GUI();
    this.presets = {};
    this.currentPreset = "";
    this.initGUI();
    this.loadStoredPresets();
  }

  initGUI() {
    const physics = this.main.particleSystem;

    // Add Presets folder at the top
    const presetFolder = this.gui.addFolder("Presets");
    presetFolder.open();

    const presetConfig = {
      name: "Default",
      save: () => this.savePreset(),
      load: () => this.loadPreset(),
    };

    // Add preset controls
    presetFolder.add(presetConfig, "name").name("Name");

    const saveButton = presetFolder
      .add(presetConfig, "save")
      .name("Save Preset");

    const loadButton = presetFolder
      .add(presetConfig, "load")
      .name("Load Preset");

    // Initially disable load button
    loadButton.disable();

    //#region Animation
    const globalFolder = this.gui.addFolder("Global");
    globalFolder.open();
    globalFolder
      .add(physics, "timeScale", 0, 2, 0.1)
      .name("Speed")
      .onChange((value) => {
        console.log(`Animation speed: ${value}x`);
      });
    globalFolder
      .add(physics, "picFlipRatio", 0, 1, 0.01)
      .name("PIC / FLIP")
      .onChange((value) => {
        console.log(`PIC/FLIP mixing ratio: ${value * 100}% FLIP`);
      });
    //#endregion

    //#region Particles
    const particlesFolder = this.gui.addFolder("Particles");
    const particleFolder = particlesFolder.addFolder("Properties");
    particlesFolder.open();
    particleFolder.open();
    particleFolder
      .add(physics, "numParticles", 10, 1000, 10)
      .name("Count")
      .onChange((value) => {
        physics.reinitializeParticles(value);
      });

    particleFolder
      .add(physics, "particleRadius", 0.005, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        // Update collision system's particle radius
        physics.collisionSystem.particleRadius = value * 2; // Double for collision distance
      });

    // Add opacity control after size control
    particleFolder
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    // Add after opacity control
    particleFolder
      .addColor(this.main.particleRenderer.config, "color")
      .name("Color");
    //#endregion

    //#region Physics
    const physicsFolder = particlesFolder.addFolder("Physics");
    physicsFolder.open();
    physicsFolder.add(physics, "gravity", 0, 9.89, 0.1).name("Gravity");

    physicsFolder
      .add(physics, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Air Friction");
    //#endregion

    //#region Collision
    const collisionFolder = physicsFolder.addFolder("Collision");
    collisionFolder.open();
    // collisionFolder
    //   .add(physics.collisionSystem, "enabled")
    //   .name("Enable Collisions");

    collisionFolder
      .add(physics.collisionSystem, "repulsion", 0, 100.0, 0.05)
      .name("Repulsion");

    collisionFolder
      .add(physics.collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    collisionFolder
      .add(physics.collisionSystem, "damping", 0.5, 1.0, 0.01)
      .name("Collision Damping");
    //#endregion

    //#region Rest State
    const restFolder = physicsFolder.addFolder("Rest State");
    restFolder.open(false);
    restFolder
      .add(physics, "velocityThreshold", 0.00001, 0.1, 0.00001)
      .name("Min Speed");

    restFolder
      .add(physics, "positionThreshold", 0.000001, 0.1, 0.000001)
      .name("Min Move");
    //#endregion

    //#region Turbulence
    const turbulenceFolder = physicsFolder.addFolder("Turbulence");
    const turbulence = this.main.turbulenceField; // Get reference to turbulence field

    // turbulenceFolder.add(turbulence, "enabled").name("Enable");

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
    //#endregion

    //#region FLIP
    const flipFolder = particlesFolder.addFolder("FLIP");

    flipFolder
      .add(physics, "flipIterations", 1, 40, 1)
      .name("Pressure Iterations");

    flipFolder.open();
    //#endregion

    //#region Boundary
    const boundaryFolder = particlesFolder.addFolder("Boundary");
    boundaryFolder.open(false);
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

    //#endregion

    //#region Grid
    const gridFolder = this.gui.addFolder("Grid");
    const densityFolder = gridFolder.addFolder("Density Map");
    gridFolder.open();
    densityFolder.open();
    // densityFolder
    //   .add(this.main.gridRenderer, "showDensity")
    //   .name("Show Density");
    // densityFolder
    //   .add(this.main.gridRenderer, "densityOpacity", 0, 1, 0.1)
    //   .name("Opacity");
    densityFolder
      .add(this.main.gridRenderer, "minDensity", 0, 10, 0.1)
      .name("Min Density");
    densityFolder
      .add(this.main.gridRenderer, "maxDensity", 0.1, 10, 0.1)
      .name("Max Density");

    const gradientFolder = gridFolder.addFolder("Gradient");
    gradientFolder.open(false);
    const gradientPoints = this.main.gridRenderer.gradientPoints;

    // Add color controls for each gradient point
    gradientPoints.forEach((point, index) => {
      const pointFolder = gradientFolder.addFolder(`Point ${index + 1}`);
      pointFolder
        .add(point, "pos", 0, 100, 1)
        .name("Position")
        .onChange(() => this.main.gridRenderer.updateGradient());
      pointFolder
        .addColor(point, "color")
        .name("Color")
        .onChange(() => this.main.gridRenderer.updateGradient());
    });

    //#endregion

    //#region Mouse Input
    const mouseInputFolder = this.gui.addFolder("Mouse Input");
    mouseInputFolder.open(false);
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
    //#endregion

    //#region Debug
    const debugFolder = this.gui.addFolder("Debug");
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
    debugFolder.open(false);
    //#endregion

    console.log("UI initialized with PIC parameters");
  }

  savePreset() {
    const name = this.gui.folders[0].controllers[0].getValue();
    if (!name) {
      console.warn("Please enter a preset name");
      return;
    }

    try {
      this.presets[name] = this.gui.save();
      this.currentPreset = name;

      // Enable load button
      this.gui.folders[0].controllers[2].enable();

      console.log(`Preset "${name}" saved`);

      // Save to localStorage
      localStorage.setItem("fluidPresets", JSON.stringify(this.presets));
    } catch (error) {
      console.error("Error saving preset:", error);
    }
  }

  loadPreset() {
    const name = this.gui.folders[0].controllers[0].getValue();
    const preset = this.presets[name];

    if (!preset) {
      console.warn(`Preset "${name}" not found`);
      return;
    }

    try {
      this.gui.load(preset);
      console.log(`Preset "${name}" loaded`);
    } catch (error) {
      console.error("Error loading preset:", error);
    }
  }

  // Add method to load presets from localStorage on startup
  loadStoredPresets() {
    const stored = localStorage.getItem("fluidPresets");
    if (stored) {
      try {
        this.presets = JSON.parse(stored);
        // Enable load button if we have presets
        if (Object.keys(this.presets).length > 0) {
          this.gui.folders[0].controllers[2].enable();
        }
      } catch (error) {
        console.error("Error loading stored presets:", error);
      }
    }
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}

export { UI };
