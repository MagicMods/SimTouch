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
    this.leftGui = new GUI({ container: this.createContainer("left") });
    this.rightGui = new GUI({ container: this.createContainer("right") });
    this.presetManager = new PresetManager(this.leftGui);
    this.stats = new Stats();
    this.initStats();
    this.initGUI();
    this.controls = {
      fieldType: null,
      boundary: null,
      mainPreset: null,
    };
  }

  // Add method to create containers
  createContainer(position) {
    const container = document.createElement("div");
    container.style.cssText = `
        position: absolute;
        top: 0;
        ${position === "left" ? "left: 0" : "right: 0"};
      `;
    document.body.appendChild(container);
    return container;
  }

  initStats() {
    // Create stats container
    const statsContainer = document.createElement("div");
    statsContainer.style.cssText = "position:absolute;bottom:1;left:0;";
    statsContainer.appendChild(this.stats.dom);
    document.body.appendChild(statsContainer);
  }

  updateStats() {
    if (this.stats) {
      this.stats.update();
    }
  }

  async initGUI() {
    const particles = this.main.particleSystem;
    const gridRenderer = this.main.gridRenderer;

    // Left panel folders
    const presetFolder = this.leftGui.addFolder("Presets");
    const globalFolder = this.leftGui.addFolder("Global");
    const particlesFolder = this.leftGui.addFolder("Particles");
    const physicsFolder = particlesFolder.addFolder("Physics");

    // Right panel folders
    const turbulenceFolder = this.rightGui.addFolder("Turbulence");
    const organicFolder = this.rightGui.addFolder("Organic Behavior");
    const gridFolder = this.rightGui.addFolder("Grid");
    const mouseInputFolder = this.rightGui.addFolder("Mouse Input");
    const debugFolder = this.rightGui.addFolder("Debug");
    presetFolder.open();

    // Export button only
    presetFolder
      .add(
        {
          export: () => {
            const leftState = this.leftGui.save();
            const rightState = this.rightGui.save();
            const completeState = {
              left: leftState,
              right: rightState,
            };
            console.log("Current configuration:");
            console.log(JSON.stringify(completeState, null, 2));
          },
        },
        "export"
      )
      .name("Export to Console");

    // Main preset selector
    const mainPresetControl = {
      preset: "Default",
    };

    await this.presetManager.loadMainPresets();
    const mainPresets = this.presetManager.getPresetNames("main");
    if (mainPresets.length > 0) {
      mainPresetControl.preset = mainPresets[0];
      this.controls.mainPreset = presetFolder
        .add(mainPresetControl, "preset", ["Default", ...mainPresets])
        .name("Main Preset")
        .onChange(async (value) => {
          if (value === "Default") {
            // Reset to default values
            this.main.particleSystem.reset();
          } else {
            await this.presetManager.loadPreset(value);
          }
        });
    }

    presetFolder
      .add(this.main, "paused")
      .name("Pause")
      .onFinishChange((value) => {
        console.log(`Simulation is ${value ? "paused" : "running"}`);
      });

    //#region Global
    globalFolder.open();

    // Field selection
    if (this.main.gridRenderer.renderModes) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      this.controls.fieldType = globalFolder
        .add(fieldControl, "field", Object.values(GridField))
        .name("Field Type")
        .onChange((value) => {
          this.main.gridRenderer.renderModes.currentMode = value;
          this.controls.fieldType.updateDisplay();
        });
      globalFolder
        .add(this.main.particleSystem.boundary, "mode", {
          Bounce: "BOUNCE",
          Warp: "WARP",
        })
        .name("Boundary")
        .onChange((value) => {
          this.main.particleSystem.setBoundaryMode(value);
        });
    }
    // Add behavior type selector
    if (particles.organicBehavior) {
      const behaviorControl = {
        behavior: particles.organicBehavior.currentBehavior,
      };
      globalFolder
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Behavior")
        .onChange((value) => {
          particles.organicBehavior.currentBehavior = value;
        });
    }
    globalFolder
      .add(particles, "timeScale", 0, 2, 0.1)
      .name("Speed")
      .onFinishChange((value) => {
        console.log(`Animation speed: ${value}x`);
      });
    globalFolder
      .add(particles, "picFlipRatio", 0, 1, 0.01)
      .name("PIC / FLIP")
      .onFinishChange((value) => {
        console.log(`PIC/FLIP mixing ratio: ${value * 100}% FLIP`);
      });

    // Add smoothing controls to grid folder
    if (this.main.gridRenderer.renderModes?.smoothing) {
      // const smoothingFolder = globalFolder.addFolder("Value Smoothing");
      const smoothing = this.main.gridRenderer.renderModes.smoothing;
      globalFolder
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("Fade In Speed")
        .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));

      globalFolder
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("Fade Out Speed")
        .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));
    }
    // Density controls
    globalFolder
      .add(gridRenderer, "maxDensity", 0.1, 10, 0.1)
      .name("Max Density");

    // Create both controls with the same options

    //#endregion

    //#region Particles

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

    particleFolder.add(particles, "debug").name("Show Debug");
    //#endregion

    //#region Physics

    physicsFolder.open();
    physicsFolder.add(particles, "gravity", 0, 1, 0.01).name("Gravity");

    physicsFolder
      .add(particles, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Velocity Damping");
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

    // Add boundary mode control
    boundaryFolder
      .add(this.main.particleSystem.boundary, "mode", {
        Bounce: "BOUNCE",
        Warp: "WARP",
      })
      .name("Mode")
      .onChange((value) => {
        this.main.particleSystem.setBoundaryMode(value);
      });
    //#endregion
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

    const turbulenceControl = {
      preset: "None",
    };

    await this.presetManager.loadSubPresets("turbulence");
    turbulenceFolder
      .add(
        turbulenceControl,
        "preset",
        this.presetManager.getPresetNames("turbulence")
      )
      .name("Preset")
      .onChange((value) => {
        const preset = this.presetManager.applySubPreset("turbulence", value);
        if (preset) {
          this.main.turbulenceField.setParameters(preset);
        }
        // Update GUI
        for (const ctrl of turbulenceFolder.controllers) {
          ctrl.updateDisplay();
        }
        for (const ctrl of advancedFolder.controllers) {
          ctrl.updateDisplay();
        }
        for (const ctrl of biasFolder.controllers) {
          ctrl.updateDisplay();
        }
      });

    turbulenceFolder
      .add(this.main.turbulenceField, "strength", 0, 2)
      .name("Strength");
    turbulenceFolder
      .add(this.main.turbulenceField, "scale", 0.1, 10)
      .name("Scale");
    turbulenceFolder
      .add(this.main.turbulenceField, "speed", 0, 5)
      .name("Speed");

    // Advanced parameters
    const advancedFolder = turbulenceFolder.addFolder("Advanced");
    advancedFolder
      .add(this.main.turbulenceField, "octaves", 1, 8, 1)
      .name("Octaves");
    advancedFolder
      .add(this.main.turbulenceField, "persistence", 0, 1)
      .name("Persistence");
    advancedFolder
      .add(this.main.turbulenceField, "rotation", 0, Math.PI * 2)
      .name("Rotation");
    advancedFolder
      .add(this.main.turbulenceField, "inwardFactor", 0, 5)
      .name("Inward Pull");
    advancedFolder
      .add(this.main.turbulenceField, "decayRate", 0.9, 1)
      .name("Decay Rate");

    // Direction Bias
    const biasFolder = turbulenceFolder.addFolder("Direction Bias");
    biasFolder
      .add(this.main.turbulenceField.directionBias, "0", -1, 1)
      .name("X Bias");
    biasFolder
      .add(this.main.turbulenceField.directionBias, "1", -1, 1)
      .name("Y Bias");

    turbulenceFolder.open();

    //#endregion

    //#region Organic Behavior
    if (particles.organicBehavior) {
      // const organicFolder = this.rightGui.addFolder("Organic Behavior");

      const behaviorControl = {
        behavior: particles.organicBehavior.currentBehavior,
      };
      organicFolder
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Behavior Type")
        .onChange((value) => {
          particles.organicBehavior.currentBehavior = value;
        });

      this.addBehaviorParameters(organicFolder, particles.organicBehavior);

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
        .onFinishChange(() => {
          console.log("Force scale updated");
        });
    }
    //#endregion

    //#region Grid

    gridFolder.open();

    const gridParamFolder = gridFolder.addFolder("Parameters");

    // In the Grid section, fix the Field Type control
    if (gridRenderer.gridParams) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      const fieldTypeControl = gridFolder
        .add(fieldControl, "field", Object.values(GridField))
        .name("Field Type")
        .onChange((value) => {
          this.main.gridRenderer.renderModes.currentMode = value;
          fieldControl.field = value; // Update the control object
          fieldTypeControl.updateDisplay();
        });

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
        .onChange(() => this.main.gridRenderer.gradient.update());
      pointFolder
        .addColor(point, "color")
        .name("Color")
        .onChange(() => this.main.gridRenderer.gradient.update());
    });

    //#endregion

    //#region Mouse Input

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

  dispose() {
    if (this.leftGui) this.leftGui.destroy();
    if (this.rightGui) this.rightGui.destroy();
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }

  addBehaviorParameters(folder, behavior) {
    Object.entries(behavior.params).forEach(([type, params]) => {
      const subFolder = folder.addFolder(`${type} Parameters`);

      Object.entries(params).forEach(([key, value]) => {
        if (key !== "mode") {
          switch (key) {
            case "radius":
              subFolder
                .add(params, key, 5, 50)
                .name(this.formatParameterName(key));
              break;
            case "maxSpeed":
              subFolder
                .add(params, key, 0, 5)
                .name(this.formatParameterName(key));
              break;
            case "damping":
              subFolder
                .add(params, key, 0.5, 1)
                .name(this.formatParameterName(key));
              break;
            default:
              subFolder
                .add(params, key, 0, 1)
                .name(this.formatParameterName(key));
          }
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
