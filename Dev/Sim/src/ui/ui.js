import GUI from "lil-gui";
import { PresetManager } from "../util/presetManager.js";
import Stats from "../util/statsModule.js";
import { GridField } from "../renderer/gridRenderModes.js";
import { OrganicBehavior } from "../simulation/behaviors/organicBehavior.js";
import { Behaviors } from "../simulation/behaviors/organicBehavior.js";
class UI {
  constructor(main) {
    if (!main) throw new Error("Main instance required");
    this.main = main;
    this.gui = new GUI();
    this.presetManager = new PresetManager(this.gui);
    this.stats = new Stats();
    this.initStats();
    this.initGUI();
  }

  initStats() {
    // Create stats container
    const statsContainer = document.createElement("div");
    statsContainer.style.cssText = "position:absolute;top:0;left:0;";
    statsContainer.appendChild(this.stats.dom);
    document.body.appendChild(statsContainer);
  }

  updateStats() {
    if (this.stats) {
      this.stats.update();
    }
  }

  initGUI() {
    const particles = this.main.particleSystem;

    // Add Presets folder at the top
    const presetFolder = this.gui.addFolder("Presets");
    presetFolder.open();

    // Export button only
    presetFolder
      .add(
        {
          export: () => {
            const state = this.gui.save();
            console.log("Current configuration:");
            console.log(JSON.stringify(state, null, 2));
          },
        },
        "export"
      )
      .name("Export to Console");

    // Load presets from files
    this.presetManager.loadPresets().then(() => {
      const presetNames = this.presetManager.getPresetNames();
      if (presetNames.length > 0) {
        const presetControl = {
          current: this.presetManager.defaultPreset,
        };

        // Add preset selection dropdown
        presetFolder
          .add(presetControl, "current", presetNames)
          .name("Load Preset")
          .onChange((value) => {
            // Prevent recursion by checking if preset is already loaded
            if (value === this.presetManager.currentPreset) return;

            if (this.presetManager.presets[value]) {
              // Update current preset before loading
              this.presetManager.currentPreset = value;

              // Load preset without triggering onChange
              this.gui.load(this.presetManager.presets[value]);

              // Update all controllers manually
              Object.values(this.gui.folders).forEach((folder) => {
                folder.controllers.forEach((controller) => {
                  if (controller !== this.presetDropdown) {
                    controller.updateDisplay();
                  }
                });
              });

              // Update particle system if needed
              this.main.particleSystem.reinitializeParticles();
            }
          });
      }
    });

    //#region Animation
    const globalFolder = this.gui.addFolder("Global");
    globalFolder.open();
    globalFolder
      .add(particles, "timeScale", 0, 2, 0.1)
      .name("Speed")
      .onChange((value) => {
        console.log(`Animation speed: ${value}x`);
      });
    globalFolder
      .add(particles, "picFlipRatio", 0, 1, 0.01)
      .name("PIC / FLIP")
      .onChange((value) => {
        console.log(`PIC/FLIP mixing ratio: ${value * 100}% FLIP`);
      });
    globalFolder
      .add(this.main, "paused")
      .name("Pause")
      .onChange((value) => {
        console.log(`Simulation is ${value ? "paused" : "running"}`);
      });
    // Field selection
    if (this.main.gridRenderer.renderModes) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      globalFolder
        .add(fieldControl, "field", Object.values(GridField))
        .name("Field Type")
        .onChange((value) => {
          this.main.gridRenderer.renderModes.currentMode = value;
        });
    }
    //#endregion

    //#region Particles
    const particlesFolder = this.gui.addFolder("Particles");
    const particleFolder = particlesFolder.addFolder("Properties");
    particlesFolder.open();
    particleFolder.open();
    let previousNumParticles = particles.numParticles;
    particleFolder
      .add(particles, "numParticles", 1, 2000, 10)
      .name("Count")
      .onFinishChange((value) => {
        // if (value > previousNumParticles) {
        particles.reinitializeParticles(value);
        // }
        // previousNumParticles = value;
      });

    particleFolder
      .add(particles, "particleRadius", 0.005, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        // Update collision system's particle radius
        particles.collisionSystem.particleRadius = value * 2; // Double for collision distance
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
    physicsFolder.add(particles, "gravity", 0, 9.89, 0.1).name("Gravity");

    physicsFolder
      .add(particles, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Velocity Damping");
    //#endregion

    //#region Collision
    const collisionFolder = physicsFolder.addFolder("Collision");
    collisionFolder.open();
    // collisionFolder
    //   .add(particles.collisionSystem, "enabled")
    //   .name("Enable Collisions");

    collisionFolder
      .add(particles.collisionSystem, "repulsion", 0, 40, 0.01)
      .name("Repulsion");

    collisionFolder
      .add(particles.collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    collisionFolder
      .add(particles.collisionSystem, "damping", 0.5, 1.0, 0.01)
      .name("Collision Damping");
    //#endregion

    //#region Rest State
    const restFolder = physicsFolder.addFolder("Rest State");
    restFolder.open(false);
    restFolder
      .add(particles, "velocityThreshold", 0.00001, 0.1, 0.00001)
      .name("Min Speed");

    restFolder
      .add(particles, "positionThreshold", 0.000001, 0.1, 0.000001)
      .name("Min Move");
    //#endregion

    //#region Turbulence
    const turbulenceFolder = physicsFolder.addFolder("Turbulence");
    const turbulence = this.main.turbulenceField; // Get reference to turbulence field

    // turbulenceFolder.add(turbulence, "enabled").name("Enable");

    turbulenceFolder.add(turbulence, "strength", 0, 1, 0.01).name("Strength");

    turbulenceFolder.add(turbulence, "scale", 1, 10, 0.1).name("Scale");

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
      .add(particles, "flipIterations", 1, 40, 1)
      .name("Pressure Iterations");

    flipFolder.open();

    particleFolder.add(particles, "debug").name("Show Debug");
    //#endregion

    //#region Organic Behavior
    if (particles.organicBehavior) {
      const organicFolder = this.gui.addFolder("Organic Behavior");

      // Create behavior control object (like fieldControl)
      const behaviorControl = {
        behavior: particles.organicBehavior.currentBehavior,
      };

      // Add behavior controls
      organicFolder.add(particles.organicBehavior, "enabled").name("Enable");

      organicFolder
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Behavior Type")
        .onChange((value) => {
          particles.organicBehavior.currentBehavior = value;
        });

      const fluidParmaFolder = organicFolder.addFolder("Fluid Parameters");
      fluidParmaFolder
        .add(particles.organicBehavior.params[Behaviors.FLUID], "radius", 5, 50)
        .name("Radius");
      fluidParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.FLUID],
          "surfaceTension"
        )
        .name("Surface Tension");
      fluidParmaFolder
        .add(particles.organicBehavior.params[Behaviors.FLUID], "viscosity")
        .name("Viscosity");
      fluidParmaFolder
        .add(particles.organicBehavior.params[Behaviors.FLUID], "damping")
        .name("Damping");
      const swarmParmaFolder = organicFolder.addFolder("Swarm Parameters");
      swarmParmaFolder
        .add(particles.organicBehavior.params[Behaviors.SWARM], "radius", 5, 50)
        .name("Radius");
      swarmParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.SWARM],
          "cohesion",
          0,
          1
        )
        .name("Cohesion");
      swarmParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.SWARM],
          "alignment",
          0,
          1
        )
        .name("Alignment");
      swarmParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.SWARM],
          "separation",
          0,
          1
        )
        .name("Separation");
      swarmParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.SWARM],
          "maxSpeed",
          0,
          5
        )
        .name("Max Speed");
      const automataParmaFolder = organicFolder.addFolder(
        "Automata Parameters"
      );
      automataParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.AUTOMATA],
          "radius",
          5,
          50
        )
        .name("Radius");
      automataParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.AUTOMATA],
          "repulsion",
          0,
          1
        )
        .name("Repulsion");
      automataParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.AUTOMATA],
          "attraction",
          0,
          1
        )
        .name("Attraction");
      automataParmaFolder
        .add(
          particles.organicBehavior.params[Behaviors.AUTOMATA],
          "threshold",
          0,
          1
        )
        .name("Threshold");

      // In the initGUI method where you setup organic behavior controls
      const debugOrganicFolder = organicFolder.addFolder("Debug");
      debugOrganicFolder
        .add(particles.organicBehavior, "debug")
        .name("Show Debug");
      debugOrganicFolder
        .add(
          particles.organicBehavior.forceScales[Behaviors.FLUID],
          "base",
          0,
          1
        )
        .name("Force Scale")
        .onChange(() => {
          console.log("Force scale updated");
        });
    }

    //#region Grid
    const gridFolder = this.gui.addFolder("Grid");
    gridFolder.open();

    const gridParamFolder = gridFolder.addFolder("Parameters");
    const gridRenderer = this.main.gridRenderer;

    if (gridRenderer.gridParams) {
      // // Grid Parameters
      gridParamFolder
        .add(gridRenderer.gridParams, "target", 1, 800, 1)
        .name("Target Cells")
        .onChange(() => gridRenderer.updateGrid());
      gridParamFolder
        .add(gridRenderer.gridParams, "gap", 0, 20, 1)
        .name("Gap (px)")
        .onChange(() => gridRenderer.updateGrid());
      gridParamFolder
        .add(gridRenderer.gridParams, "aspectRatio", 0.5, 4, 0.01)
        .name("Cell Ratio")
        .onChange(() => gridRenderer.updateGrid());
      gridParamFolder
        .add(gridRenderer.gridParams, "scale", 0.1, 1, 0.01)
        .name("Grid Scale")
        .onChange(() => gridRenderer.updateGrid());
    }

    // Grid Stats - only add if values exist
    const stats = gridParamFolder.addFolder("Stats");
    stats.add(gridRenderer.gridParams, "cols").name("Columns").listen();
    stats.add(gridRenderer.gridParams, "rows").name("Rows").listen();
    stats.add(gridRenderer.gridParams, "width").name("Rect Width").listen();
    stats.add(gridRenderer.gridParams, "height").name("Rect Height").listen();

    // Density controls
    const densityFolder = gridFolder.addFolder("Density Map");
    densityFolder
      .add(gridRenderer, "minDensity", 0, 10, 0.1)
      .name("Min Density");
    densityFolder
      .add(gridRenderer, "maxDensity", 0.1, 10, 0.1)
      .name("Max Density");

    // Gradient controls
    const gradientFolder = gridFolder.addFolder("Gradient");
    gradientFolder.open(false);
    const gradientPoints = this.main.gridRenderer.gradient.points; // Direct access to points

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

    // Add smoothing controls to grid folder
    if (this.main.gridRenderer.renderModes?.smoothing) {
      const smoothingFolder = gridFolder.addFolder("Value Smoothing");
      const smoothing = this.main.gridRenderer.renderModes.smoothing;

      smoothingFolder.add(smoothing, "enabled").name("Enable Smoothing");

      smoothingFolder
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("Fade In Speed")
        .onChange(() => console.log("Smoothing in:", smoothing.rateIn));

      smoothingFolder
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("Fade Out Speed")
        .onChange(() => console.log("Smoothing out:", smoothing.rateOut));

      smoothingFolder
        .add(smoothing, "threshold", 0.0001, 0.01)
        .name("Change Threshold");
    }
    //#endregion

    //#region Boundary
    const boundaryFolder = particlesFolder.addFolder("Boundary");
    boundaryFolder.open(false);
    boundaryFolder
      .add(particles.boundary, "radius", 0.3, 0.55, 0.005)
      .name("Size")
      .onChange((value) => {
        particles.boundary.update({ radius: value }, [
          (boundary) => this.main.baseRenderer.drawCircularBoundary(boundary),
        ]);
      });

    // Wall friction: 0 = no friction, 1 = maximum friction
    boundaryFolder
      .add(particles, "boundaryDamping", 0.0, 1.0, 0.01)
      .name("Wall Friction")
      .onChange((value) => (particles.boundaryDamping = value)); // Invert for damping

    boundaryFolder
      .add(particles.boundary, "cBoundaryRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    //#endregion

    //#region Mouse Input
    const mouseInputFolder = this.gui.addFolder("Mouse Input");
    mouseInputFolder.open(false);
    if (particles.mouseForces) {
      mouseInputFolder
        .add(particles.mouseForces, "impulseRadius", 0.5, 2, 0.01)
        .name("Input Radius");

      mouseInputFolder
        .add(particles.mouseForces, "impulseMag", 0.01, 0.12, 0.001)
        .name("Impulse Magnitude");
    } else {
      console.warn("Mouse forces not initialized");
    }
    //#endregion

    //#region Debug
    const debugFolder = this.gui.addFolder("Debug");
    debugFolder.add(particles, "debug").name("Show Debug Overlay");
    debugFolder
      .add(particles, "debugShowVelocityField")
      .name("Show Velocity Field");
    debugFolder
      .add(particles, "debugShowPressureField")
      .name("Show Pressure Field");
    debugFolder.add(particles, "debugShowBoundaries").name("Show Boundaries");
    // NEW: Toggle for FLIP grid visualization
    debugFolder.add(particles, "debugShowFlipGrid").name("Show FLIP Grid");
    debugFolder.add(particles, "debugShowNoiseField").name("Show Noise Field");
    // NEW: Control noise field resolution
    debugFolder
      .add(particles, "noiseFieldResolution", 5, 50, 1)
      .name("Noise Field Resolution");
    debugFolder.open(false);
    //#endregion
  }

  updatePresetDropdown() {
    const presets = ["none", ...this.presetManager.getPresetNames()];
    this.presetDropdown.options = presets;
    this.presetDropdown.updateDisplay();
  }

  dispose() {
    if (this.gui) {
      this.gui.destroy();
    }
  }

  addBehaviorParameters(folder, behavior) {
    // Add parameter folders using same pattern as GridRenderModes
    Object.entries(behavior.params).forEach(([type, params]) => {
      const subFolder = folder.addFolder(`${type} Parameters`);
      Object.entries(params).forEach(([key, value]) => {
        if (key !== "mode") {
          // Skip mode parameter
          const min = key.includes("radius") ? 5 : 0;
          const max = key.includes("radius")
            ? 50
            : key.includes("maxSpeed")
            ? 5
            : 1;
          subFolder
            .add(params, key, min, max)
            .name(this.formatParameterName(key));
        }
      });
    });
  }

  formatParameterName(key) {
    return (
      key
        .split(/(?=[A-Z])/)
        .join(" ")
        .charAt(0)
        .toUpperCase() +
      key
        .split(/(?=[A-Z])/)
        .join(" ")
        .slice(1)
    );
  }
}

export { UI };
