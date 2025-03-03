import { BaseUi } from "./baseUi.js";
import { socketManager } from "../../network/socketManager.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

export class LeftUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.controls = {};
    this.initFolders();
    this.gui.title("Parameters");
  }

  setPresetManager(presetManager) {
    // No longer needed for LeftUi
  }

  initFolders() {
    // Persistent folders
    // this.gui = this.createFolder("Global");

    this.initGlobalControls();

    this.particleFolder = this.createFolder("Particles");
    this.physicsFolder = this.createFolder("Physics");
    this.collisionFolder = this.createFolder("Collision");
    this.boundaryFolder = this.createFolder("Boundary");
    this.restFolder = this.createFolder("Rest State");

    // Remove udpFolder
    // this.udpFolder = this.createFolder("UDP Network", true);

    this.debugFolder = this.createFolder("Debug", true); // Non-persistent folders

    // Initialize all controls
    // Remove initUDPControls call
    // this.initUDPControls();

    this.initParticleControls();
    this.initPhysicsControls();
    this.initCollisionControls();
    this.initBoundaryControls();
    this.initRestStateControls();
    this.initDebugControls();

    // Set default open states
    // this.gui.open();
    this.particleFolder.open();
    this.physicsFolder.open();
    this.collisionFolder.open();
    this.debugFolder.open(false);
  }

  //#region Control
  initGlobalControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Pause control
    this.gui
      .add(this.main, "paused")
      .name("Pause")
      .onFinishChange((value) => {
        console.log(`Simulation is ${value ? "paused" : "running"}`);
      });

    // Update the render mode dropdown to include the new "Overlap" option
    if (this.main.gridRenderer.renderModes) {
      const gridFields = Object.values(
        this.main.gridRenderer.renderModes.modes
      );
      // Make sure "Overlap" is included in gridFields from the updated GridField enum
      // this.gui
      //   .add(this.main.gridRenderer.renderModes, "currentMode", gridFields)
      //   .name("Grid Field")
      //   .onChange(() => this.main.gridRenderer.resetColors());
    }

    if (this.main.gridRenderer.renderModes) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      this.controls.fieldType = this.gui
        .add(fieldControl, "field", Object.values(GridField))
        // .className("preset-select")
        .name("Mode")
        .onChange((value) => {
          // Set new mode
          this.main.gridRenderer.renderModes.currentMode = value;
          // Update display
          this.controls.fieldType.updateDisplay();
        });

      const behaviorControl = {
        behavior: particles.organicBehavior.currentBehavior,
      };

      this.controls.behaviorType = this.gui
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Organic Behavior")
        .onChange((value) => {
          console.log("Behavior changed to:", value);
          particles.organicBehavior.currentBehavior = value;
          // Use stored uiManager reference

          this.main.ui.rightUi.updateOrganicFolders(value);

          this.controls.behaviorType.updateDisplay();
        });

      this.gui
        .add(this.main.particleSystem.boundary, "mode", {
          Bounce: "BOUNCE",
          Warp: "WARP",
        })
        .name("Boundary")
        .onChange((value) => {
          this.main.particleSystem.setBoundaryMode(value);
        });

      const smoothing = this.main.gridRenderer.renderModes.smoothing;
      this.gui
        .add(this.main.gridRenderer, "maxDensity", 0.1, 10, 0.1)
        .name("Max Density");
      this.gui
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("Fade In Speed")
        .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));

      this.gui
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("Fade Out Speed")
        .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));

      this.gui.add(particles, "timeStep", 0.001, 0.05, 0.001).name("Time Step");

      this.gui
        .add(particles, "timeScale", 0, 2, 0.1)
        .name("Speed")
        .onFinishChange((value) => {
          console.log(`Animation speed: ${value}x`);
        });

      this.gui
        .add(particles, "velocityDamping", 0.8, 1, 0.01)
        .name("Velocity Damping")
        .onFinishChange((value) => {
          console.log(`Velocity damping set to ${value}`);
        });
      // this.gui
      //   .add(particles, "picFlipRatio", 0, 1, 0.01)
      //   .name("PIC / FLIP")
      //   .onFinishChange((value) => {
      //     console.log(`PIC/FLIP mixing ratio: ${value * 100}% FLIP`);
      //   });
    }
  }
  //#endregion

  //#region Particle
  initParticleControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.particleFolder
      .add(particles, "numParticles", 1, 2000, 10)
      .name("Count")
      .onFinishChange((value) => {
        particles.reinitializeParticles(value);
      });

    this.particleFolder
      .add(particles, "particleRadius", 0.005, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        particles.collisionSystem.particleRadius = value * 2;
        // Reset all particles to new base radius before turbulence affects them
        particles.particleRadii.fill(value);
      });

    this.particleFolder
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    this.particleFolder
      .addColor(this.main.particleRenderer.config, "color")
      .name("Color");
  }
  //#endregion

  //#region Physics
  initPhysicsControls() {
    const physicsFolder = this.physicsFolder;

    // Add gravity strength control
    physicsFolder
      .add(
        { strength: this.main.particleSystem.gravity.strength },
        "strength",
        0,
        20,
        0.1 // Adding step information
      )
      .name("Gravity Strength")
      .onChange((value) => {
        this.main.particleSystem.gravity.setStrength(value);
      });

    // Add gravity direction controls
    const gravityDirection = {
      x: this.main.particleSystem.gravity.directionX,
      y: this.main.particleSystem.gravity.directionY,
    };

    physicsFolder
      .add(gravityDirection, "x", -1, 1, 0.1)
      .name("Gravity X")
      .onChange((value) => {
        // Update X and preserve normalized direction
        this.main.particleSystem.gravity.setDirection(
          value,
          this.main.particleSystem.gravity.directionY,
          this.main.particleSystem.gravity.directionZ
        );
      });

    physicsFolder
      .add(gravityDirection, "y", -1, 1, 0.1)
      .name("Gravity Y")
      .onChange((value) => {
        // Update Y and preserve normalized direction
        this.main.particleSystem.gravity.setDirection(
          this.main.particleSystem.gravity.directionX,
          value,
          this.main.particleSystem.gravity.directionZ
        );
      });

    // Add gravity enable/disable toggle
    physicsFolder
      .add(this.main.particleSystem.gravity, "enabled")
      .name("Gravity Enabled");

    // // Rest of the physics controls
    // physicsFolder
    //   .add(this.main.particleSystem, "gravityFlip")
    //   .name("Flip Gravity");

    // Add timestep control
  }
  //#endregion

  //#region Collision
  initCollisionControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.collisionFolder
      .add(particles.collisionSystem, "repulsion", 0, 5, 0.01)
      .name("Repulsion");

    this.collisionFolder
      .add(particles.collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    this.collisionFolder
      .add(particles.collisionSystem, "damping", 0.5, 1.0, 0.01)
      .name("Collision Damping");
  }
  //#endregion

  //#region Boundary
  initBoundaryControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.boundaryFolder
      .add(particles.boundary, "radius", 0.3, 0.55, 0.005)
      .name("Size")
      .onChange((value) => {
        particles.boundary.update({ radius: value }, [
          // (boundary) => this.main.baseRenderer.drawCircularBoundary(boundary),
        ]);
      });

    this.boundaryFolder
      .add(particles, "boundaryDamping", 0.0, 1.0, 0.01)
      .name("Wall Friction")
      .onChange((value) => (particles.boundaryDamping = value));

    this.boundaryFolder
      .add(particles.boundary, "cBoundaryRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");
    this.boundaryFolder
      .add(particles.boundary, "boundaryRepulsion", 0.0, 20, 0.01)
      .name("Wall Repulsion")
      .onChange((value) => {
        console.log(`Boundary repulsion set to ${value}`);
      });
  }
  //#endregion

  //#region Rest State
  initRestStateControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    const controls = {
      density: particles.restDensity || 1.0,
      gasConstant: particles.gasConstant || 2.0,
      velocityThreshold: particles.velocityThreshold || 0.01,
      positionThreshold: particles.positionThreshold || 0.01,
    };

    this.restFolder
      .add(controls, "density", 0, 10)
      .name("Rest Density")
      .onChange((value) => (particles.restDensity = value));

    this.restFolder
      .add(controls, "gasConstant", 0, 100)
      .name("Gas Constant")
      .onChange((value) => (particles.gasConstant = value));

    this.restFolder
      .add(controls, "velocityThreshold", 0, 0.1)
      .name("Velocity Threshold")
      .onChange((value) => (particles.velocityThreshold = value));

    this.restFolder
      .add(controls, "positionThreshold", 0, 0.1)
      .name("Position Threshold")
      .onChange((value) => (particles.positionThreshold = value));
  }
  //#endregion

  //#region Debug
  initDebugControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Grid visibility
    if (this.main.gridRenderer) {
      const gridControl = { showGrid: false };
      this.debugFolder
        .add(gridControl, "showGrid")
        .name("Grid")
        .onChange((value) => {
          if (this.main.gridRenderer?.visible !== undefined) {
            this.main.gridRenderer.visible = value;
          }
        });
    }

    // Boundary visibility
    if (this.main.boundary) {
      this.debugFolder
        .add({ showBoundary: true }, "showBoundary")
        .name("Boundary");
      // .onChange((value) => this.main.boundary.setVisible(value));
    }

    // Particle visibility
    if (this.main.particleRenderer) {
      this.debugFolder
        .add({ showParticles: true }, "showParticles")
        .name("Particles");
      // .onChange((value) => this.main.particleRenderer.setVisible(value));
    }

    // Debug renderer controls
    if (this.main.debugRenderer) {
      this.debugFolder
        .add({ showVelocities: false }, "showVelocities")
        .name("Velocities");
      // .onChange((value) => this.main.debugRenderer.setShowVelocities(value));

      this.debugFolder
        .add({ showNeighbors: false }, "showNeighbors")
        .name("Neighbors");
      // .onChange((value) => this.main.debugRenderer.setShowNeighbors(value));
    }

    const socket = socketManager;
    if (socket) {
      const debugNetworkControl = {
        showNetwork: socket.debugSend,
        showNetworkMouse: socket.debugReceive,
      };

      this.debugFolder
        .add(debugNetworkControl, "showNetwork")
        .name("Network Debug Send")
        .onChange((value) => {
          socket.debugSend = value;
        });

      this.debugFolder
        .add(debugNetworkControl, "showNetworkMouse")
        .name("Network Debug Receive")
        .onChange((value) => {
          socket.debugReceive = value;
        });
    }
  } //#endregion

  // Get available control targets
  getControlTargets() {
    const targets = ["None"];

    // Basic targets (already implemented)
    targets.push("Particle Size");
    targets.push("Gravity Strength");
    targets.push("Repulsion");

    // Global section
    targets.push("Max Density");
    targets.push("Animation Speed");
    targets.push("Fade In Speed");
    targets.push("Fade Out Speed");
    targets.push("Time Step");
    targets.push("Velocity Damping");

    // Particle section
    targets.push("Particle Count");
    targets.push("Particle Opacity");

    // Physics section
    targets.push("Gravity X");
    targets.push("Gravity Y");

    // Collision section
    targets.push("Bounce");
    targets.push("Collision Damping");

    // Boundary section
    targets.push("Boundary Size");
    targets.push("Wall Repulsion");
    targets.push("Wall Friction");
    targets.push("Boundary Bounce");

    // Rest State section
    targets.push("Rest Density");
    targets.push("Gas Constant");
    targets.push("Velocity Threshold");
    targets.push("Position Threshold");

    // Turbulence section (expanded)
    targets.push("Turbulence Strength");
    targets.push("Turbulence Scale");
    targets.push("Turbulence Speed");
    targets.push("Scale Strength");
    targets.push("Min Scale");
    targets.push("Max Scale");
    targets.push("Octaves");
    targets.push("Persistence");
    targets.push("Rotation");
    targets.push("Rotation Speed");
    targets.push("Inward Pull");
    targets.push("Decay Rate");
    targets.push("X Bias");
    targets.push("Y Bias");

    // Voronoi section
    targets.push("Voronoi Strength");
    targets.push("Edge Width");
    targets.push("Attraction");
    targets.push("Cell Count");
    targets.push("Cell Speed");
    targets.push("Voronoi Decay Rate");

    // Fluid Parameters
    targets.push("Fluid Radius");
    targets.push("Surface Tension");
    targets.push("Viscosity");
    targets.push("Fluid Damping");

    // Swarm Parameters
    targets.push("Swarm Radius");
    targets.push("Cohesion");
    targets.push("Alignment");
    targets.push("Separation");
    targets.push("Max Speed");

    // Automata Parameters
    targets.push("Automata Radius");
    targets.push("Automata Repulsion");
    targets.push("Automata Attraction");
    targets.push("Threshold");

    // Grid Parameters
    targets.push("Target Cells");
    targets.push("Grid Gap");
    targets.push("Cell Ratio");
    targets.push("Grid Scale");

    // Force controls
    targets.push("Organic Force");

    return targets;
  }

  // Find the actual controller for a given target name
  getControllerForTarget(targetName) {
    switch (targetName) {
      case "Particle Size":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "particleRadius",
            getValue: () => this.main.particleSystem.particleRadius,
            setValue: (value) => {
              this.main.particleSystem.particleRadius = value;
              this.main.particleSystem.collisionSystem.particleRadius =
                value * 2;
              // Reset all particles to new base radius before turbulence affects them
              this.main.particleSystem.particleRadii.fill(value);
            },
            updateDisplay: () => {},
          },
          property: "particleRadius",
          min: 0.005,
          max: 0.03,
          step: 0.001,
        };

      case "Gravity Strength":
        return {
          controller: {
            object: this.main.particleSystem.gravity,
            property: "strength",
            getValue: () => this.main.particleSystem.gravity.strength,
            setValue: (value) =>
              this.main.particleSystem.gravity.setStrength(value),
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 20,
          step: 0.1,
        };

      case "Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.collisionSystem,
            property: "repulsion",
            getValue: () => this.main.particleSystem.collisionSystem.repulsion,
            setValue: (value) =>
              (this.main.particleSystem.collisionSystem.repulsion = value),
            updateDisplay: () => {},
          },
          property: "repulsion",
          min: 0,
          max: 5,
          step: 0.01,
        };

      case "Max Density":
        return {
          controller: {
            object: this.main.gridRenderer,
            property: "maxDensity",
            getValue: () => this.main.gridRenderer.maxDensity,
            setValue: (value) => (this.main.gridRenderer.maxDensity = value),
            updateDisplay: () => {},
          },
          property: "maxDensity",
          min: 0.1,
          max: 10,
          step: 0.1,
        };

      case "Animation Speed":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "timeScale",
            getValue: () => this.main.particleSystem.timeScale,
            setValue: (value) => (this.main.particleSystem.timeScale = value),
            updateDisplay: () => {},
          },
          property: "timeScale",
          min: 0,
          max: 2,
          step: 0.1,
        };

      case "Fade In Speed":
        return {
          controller: {
            object: this.main.gridRenderer.renderModes.smoothing,
            property: "rateIn",
            getValue: () => this.main.gridRenderer.renderModes.smoothing.rateIn,
            setValue: (value) =>
              (this.main.gridRenderer.renderModes.smoothing.rateIn = value),
            updateDisplay: () => {},
          },
          property: "rateIn",
          min: 0.01,
          max: 0.5,
          step: 0.01,
        };

      case "Fade Out Speed":
        return {
          controller: {
            object: this.main.gridRenderer.renderModes.smoothing,
            property: "rateOut",
            getValue: () =>
              this.main.gridRenderer.renderModes.smoothing.rateOut,
            setValue: (value) =>
              (this.main.gridRenderer.renderModes.smoothing.rateOut = value),
            updateDisplay: () => {},
          },
          property: "rateOut",
          min: 0.01,
          max: 0.5,
          step: 0.01,
        };

      case "Time Step":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "timeStep",
            getValue: () => this.main.particleSystem.timeStep,
            setValue: (value) => (this.main.particleSystem.timeStep = value),
            updateDisplay: () => {},
          },
          property: "timeStep",
          min: 0.001,
          max: 0.05,
          step: 0.001,
        };

      case "Velocity Damping":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "velocityDamping",
            getValue: () => this.main.particleSystem.velocityDamping,
            setValue: (value) =>
              (this.main.particleSystem.velocityDamping = value),
            updateDisplay: () => {},
          },
          property: "velocityDamping",
          min: 0.8,
          max: 1,
          step: 0.01,
        };

      case "Particle Count":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "numParticles",
            getValue: () => this.main.particleSystem.numParticles,
            setValue: (value) => {
              const intValue = Math.round(value);
              this.main.particleSystem.numParticles = intValue;
              this.main.particleSystem.reinitializeParticles(intValue);
            },
            updateDisplay: () => {},
          },
          property: "numParticles",
          min: 1,
          max: 2000,
          step: 10,
        };

      case "Particle Opacity":
        return {
          controller: {
            object: this.main.particleRenderer,
            property: "particleOpacity",
            getValue: () => this.main.particleRenderer.particleOpacity,
            setValue: (value) =>
              (this.main.particleRenderer.particleOpacity = value),
            updateDisplay: () => {},
          },
          property: "particleOpacity",
          min: 0.0,
          max: 1.0,
          step: 0.01,
        };

      case "Gravity X":
        return {
          controller: {
            object: this.main.particleSystem.gravity,
            property: "directionX",
            getValue: () => this.main.particleSystem.gravity.directionX,
            setValue: (value) => {
              this.main.particleSystem.gravity.setDirection(
                value,
                this.main.particleSystem.gravity.directionY,
                this.main.particleSystem.gravity.directionZ
              );
            },
            updateDisplay: () => {},
          },
          property: "directionX",
          min: -1,
          max: 1,
          step: 0.1,
        };

      case "Gravity Y":
        return {
          controller: {
            object: this.main.particleSystem.gravity,
            property: "directionY",
            getValue: () => this.main.particleSystem.gravity.directionY,
            setValue: (value) => {
              this.main.particleSystem.gravity.setDirection(
                this.main.particleSystem.gravity.directionX,
                value,
                this.main.particleSystem.gravity.directionZ
              );
            },
            updateDisplay: () => {},
          },
          property: "directionY",
          min: -1,
          max: 1,
          step: 0.1,
        };

      case "Bounce":
        return {
          controller: {
            object: this.main.particleSystem.collisionSystem,
            property: "particleRestitution",
            getValue: () =>
              this.main.particleSystem.collisionSystem.particleRestitution,
            setValue: (value) =>
              (this.main.particleSystem.collisionSystem.particleRestitution =
                value),
            updateDisplay: () => {},
          },
          property: "particleRestitution",
          min: 0.0,
          max: 1.0,
          step: 0.05,
        };

      case "Collision Damping":
        return {
          controller: {
            object: this.main.particleSystem.collisionSystem,
            property: "damping",
            getValue: () => this.main.particleSystem.collisionSystem.damping,
            setValue: (value) =>
              (this.main.particleSystem.collisionSystem.damping = value),
            updateDisplay: () => {},
          },
          property: "damping",
          min: 0.5,
          max: 1.0,
          step: 0.01,
        };

      case "Boundary Size":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "radius",
            getValue: () => this.main.particleSystem.boundary.radius,
            setValue: (value) => {
              this.main.particleSystem.boundary.update({ radius: value });
            },
            updateDisplay: () => {},
          },
          property: "radius",
          min: 0.3,
          max: 0.55,
          step: 0.005,
        };

      case "Wall Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "boundaryRepulsion",
            getValue: () => this.main.particleSystem.boundary.boundaryRepulsion,
            setValue: (value) =>
              (this.main.particleSystem.boundary.boundaryRepulsion = value),
            updateDisplay: () => {},
          },
          property: "boundaryRepulsion",
          min: 0.0,
          max: 20,
          step: 0.01,
        };

      case "Wall Friction":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "boundaryDamping",
            getValue: () => this.main.particleSystem.boundaryDamping,
            setValue: (value) =>
              (this.main.particleSystem.boundaryDamping = value),
            updateDisplay: () => {},
          },
          property: "boundaryDamping",
          min: 0.0,
          max: 1.0,
          step: 0.01,
        };

      case "Boundary Bounce":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "cBoundaryRestitution",
            getValue: () =>
              this.main.particleSystem.boundary.cBoundaryRestitution,
            setValue: (value) =>
              (this.main.particleSystem.boundary.cBoundaryRestitution = value),
            updateDisplay: () => {},
          },
          property: "cBoundaryRestitution",
          min: 0.0,
          max: 1.0,
          step: 0.05,
        };

      case "Rest Density":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "restDensity",
            getValue: () => this.main.particleSystem.restDensity,
            setValue: (value) => (this.main.particleSystem.restDensity = value),
            updateDisplay: () => {},
          },
          property: "restDensity",
          min: 0,
          max: 10,
          step: 0.1,
        };

      case "Gas Constant":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "gasConstant",
            getValue: () => this.main.particleSystem.gasConstant,
            setValue: (value) => (this.main.particleSystem.gasConstant = value),
            updateDisplay: () => {},
          },
          property: "gasConstant",
          min: 0,
          max: 100,
          step: 1,
        };

      case "Velocity Threshold":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "velocityThreshold",
            getValue: () => this.main.particleSystem.velocityThreshold,
            setValue: (value) =>
              (this.main.particleSystem.velocityThreshold = value),
            updateDisplay: () => {},
          },
          property: "velocityThreshold",
          min: 0,
          max: 0.1,
          step: 0.001,
        };

      case "Position Threshold":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "positionThreshold",
            getValue: () => this.main.particleSystem.positionThreshold,
            setValue: (value) =>
              (this.main.particleSystem.positionThreshold = value),
            updateDisplay: () => {},
          },
          property: "positionThreshold",
          min: 0,
          max: 0.1,
          step: 0.001,
        };

      // Turbulence section
      case "Turbulence Strength":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "strength",
            getValue: () => this.main.turbulenceField.strength,
            setValue: (value) => (this.main.turbulenceField.strength = value),
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 10,
          step: 0.1,
        };

      case "Turbulence Speed":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "speed",
            getValue: () => this.main.turbulenceField.speed,
            setValue: (value) => (this.main.turbulenceField.speed = value),
            updateDisplay: () => {},
          },
          property: "speed",
          min: 0,
          max: 20,
          step: 0.1,
        };

      case "Scale Strength":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "scaleStrength",
            getValue: () => this.main.turbulenceField.scaleStrength,
            setValue: (value) =>
              (this.main.turbulenceField.scaleStrength = value),
            updateDisplay: () => {},
          },
          property: "scaleStrength",
          min: 0,
          max: 1,
          step: 0.01,
        };

      case "Inward Pull":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "inwardFactor",
            getValue: () => this.main.turbulenceField.inwardFactor,
            setValue: (value) =>
              (this.main.turbulenceField.inwardFactor = value),
            updateDisplay: () => {},
          },
          property: "inwardFactor",
          min: 0,
          max: 5,
          step: 0.1,
        };

      // Voronoi section
      case "Voronoi Strength":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "strength",
            getValue: () => this.main.voronoiField.strength,
            setValue: (value) => (this.main.voronoiField.strength = value),
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 10,
          step: 0.1,
        };

      case "Edge Width":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "edgeWidth",
            getValue: () => this.main.voronoiField.edgeWidth,
            setValue: (value) => (this.main.voronoiField.edgeWidth = value),
            updateDisplay: () => {},
          },
          property: "edgeWidth",
          min: 0.1,
          max: 50,
          step: 0.1,
        };

      case "Attraction":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "attractionFactor",
            getValue: () => this.main.voronoiField.attractionFactor,
            setValue: (value) =>
              (this.main.voronoiField.attractionFactor = value),
            updateDisplay: () => {},
          },
          property: "attractionFactor",
          min: 0,
          max: 8,
          step: 0.1,
        };

      case "Cell Count":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "cellCount",
            getValue: () => this.main.voronoiField.cellCount,
            setValue: (value) => {
              const intValue = Math.round(value);
              this.main.voronoiField.cellCount = intValue;
              this.main.voronoiField.regenerateCells();
            },
            updateDisplay: () => {},
          },
          property: "cellCount",
          min: 1,
          max: 100,
          step: 1,
        };

      case "Cell Speed":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "cellSpeed",
            getValue: () => this.main.voronoiField.cellSpeed,
            setValue: (value) => (this.main.voronoiField.cellSpeed = value),
            updateDisplay: () => {},
          },
          property: "cellSpeed",
          min: 0,
          max: 10,
          step: 0.1,
        };

      // Force controls
      case "Organic Force":
        // Get direct access to behavior object instead of going through UI
        const behavior = this.main.particleSystem.organicBehavior;
        return {
          controller: {
            // Create a proxy object that doesn't depend on rightUi
            object: {
              force: 1.0, // Default value
            },
            property: "force",
            getValue: () => {
              // Safely calculate current force value from behavior
              if (behavior && behavior.forceScales) {
                const forceTypes = ["Fluid", "Swarm", "Automata"];
                let totalForce = 0;
                let count = 0;

                forceTypes.forEach((type) => {
                  if (behavior.forceScales[type]) {
                    totalForce += behavior.forceScales[type].base;
                    count++;
                  }
                });

                return count > 0 ? totalForce / count : 1.0;
              }
              return 1.0;
            },
            setValue: (value) => {
              // Apply directly to behavior object
              if (behavior && behavior.forceScales) {
                const forceTypes = ["Fluid", "Swarm", "Automata"];
                forceTypes.forEach((type) => {
                  if (behavior.forceScales[type]) {
                    behavior.forceScales[type].base = value;
                  }
                });
              }
            },
            updateDisplay: () => {},
          },
          property: "force",
          min: 0,
          max: 5,
          step: 0.1,
        };

      // Additional Turbulence controls from right panel
      case "Turbulence Scale":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "scale",
            getValue: () => this.main.turbulenceField.scale,
            setValue: (value) => (this.main.turbulenceField.scale = value),
            updateDisplay: () => {},
          },
          property: "scale",
          min: 0.1,
          max: 10,
          step: 0.1,
        };

      case "Min Scale":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "minScale",
            getValue: () => this.main.turbulenceField.minScale,
            setValue: (value) => (this.main.turbulenceField.minScale = value),
            updateDisplay: () => {},
          },
          property: "minScale",
          min: 0.1,
          max: 1.0,
          step: 0.01,
        };

      case "Max Scale":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "maxScale",
            getValue: () => this.main.turbulenceField.maxScale,
            setValue: (value) => (this.main.turbulenceField.maxScale = value),
            updateDisplay: () => {},
          },
          property: "maxScale",
          min: 1.0,
          max: 4.0,
          step: 0.01,
        };

      case "Octaves":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "octaves",
            getValue: () => this.main.turbulenceField.octaves,
            setValue: (value) => {
              this.main.turbulenceField.octaves = Math.round(value);
              this.main.turbulenceField.regenerateNoiseBases();
            },
            updateDisplay: () => {},
          },
          property: "octaves",
          min: 1,
          max: 8,
          step: 1,
        };

      case "Persistence":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "persistence",
            getValue: () => this.main.turbulenceField.persistence,
            setValue: (value) =>
              (this.main.turbulenceField.persistence = value),
            updateDisplay: () => {},
          },
          property: "persistence",
          min: 0,
          max: 1,
          step: 0.01,
        };

      case "Rotation":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "rotation",
            getValue: () => this.main.turbulenceField.rotation,
            setValue: (value) => (this.main.turbulenceField.rotation = value),
            updateDisplay: () => {},
          },
          property: "rotation",
          min: 0,
          max: Math.PI * 2,
          step: 0.01,
        };

      case "Rotation Speed":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "rotationSpeed",
            getValue: () => this.main.turbulenceField.rotationSpeed,
            setValue: (value) =>
              (this.main.turbulenceField.rotationSpeed = value),
            updateDisplay: () => {},
          },
          property: "rotationSpeed",
          min: 0,
          max: 1,
          step: 0.01,
        };

      case "Decay Rate":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "decayRate",
            getValue: () => this.main.turbulenceField.decayRate,
            setValue: (value) => (this.main.turbulenceField.decayRate = value),
            updateDisplay: () => {},
          },
          property: "decayRate",
          min: 0.9,
          max: 1,
          step: 0.001,
        };

      case "X Bias":
        return {
          controller: {
            object: this.main.turbulenceField.directionBias,
            property: "0",
            getValue: () => this.main.turbulenceField.directionBias[0],
            setValue: (value) =>
              (this.main.turbulenceField.directionBias[0] = value),
            updateDisplay: () => {},
          },
          property: "0",
          min: -1,
          max: 1,
          step: 0.01,
        };

      case "Y Bias":
        return {
          controller: {
            object: this.main.turbulenceField.directionBias,
            property: "1",
            getValue: () => this.main.turbulenceField.directionBias[1],
            setValue: (value) =>
              (this.main.turbulenceField.directionBias[1] = value),
            updateDisplay: () => {},
          },
          property: "1",
          min: -1,
          max: 1,
          step: 0.01,
        };

      // Additional Voronoi controls
      case "Voronoi Decay Rate":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "decayRate",
            getValue: () => this.main.voronoiField.decayRate,
            setValue: (value) => (this.main.voronoiField.decayRate = value),
            updateDisplay: () => {},
          },
          property: "decayRate",
          min: 0.9,
          max: 1,
          step: 0.001,
        };

      // Fluid Parameters
      case "Fluid Radius":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Fluid,
            property: "radius",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Fluid.radius,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Fluid.radius =
                value),
            updateDisplay: () => {},
          },
          property: "radius",
          min: 5,
          max: 50,
          step: 1,
        };

      case "Surface Tension":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Fluid,
            property: "surfaceTension",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Fluid
                .surfaceTension,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Fluid.surfaceTension =
                value),
            updateDisplay: () => {},
          },
          property: "surfaceTension",
          min: 0,
          max: 1,
          step: 0.01,
        };

      case "Viscosity":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Fluid,
            property: "viscosity",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Fluid.viscosity,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Fluid.viscosity =
                value),
            updateDisplay: () => {},
          },
          property: "viscosity",
          min: 0,
          max: 1,
          step: 0.01,
        };

      case "Fluid Damping":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Fluid,
            property: "damping",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Fluid.damping,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Fluid.damping =
                value),
            updateDisplay: () => {},
          },
          property: "damping",
          min: 0,
          max: 1,
          step: 0.01,
        };

      // Swarm Parameters
      case "Swarm Radius":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Swarm,
            property: "radius",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Swarm.radius,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Swarm.radius =
                value),
            updateDisplay: () => {},
          },
          property: "radius",
          min: 5,
          max: 50,
          step: 1,
        };

      case "Cohesion":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Swarm,
            property: "cohesion",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Swarm.cohesion,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Swarm.cohesion =
                value),
            updateDisplay: () => {},
          },
          property: "cohesion",
          min: 0,
          max: 2,
          step: 0.01,
        };

      case "Alignment":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Swarm,
            property: "alignment",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Swarm.alignment,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Swarm.alignment =
                value),
            updateDisplay: () => {},
          },
          property: "alignment",
          min: 0,
          max: 2,
          step: 0.01,
        };

      case "Separation":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Swarm,
            property: "separation",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Swarm.separation,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Swarm.separation =
                value),
            updateDisplay: () => {},
          },
          property: "separation",
          min: 0,
          max: 2,
          step: 0.01,
        };

      case "Max Speed":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Swarm,
            property: "maxSpeed",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Swarm.maxSpeed,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Swarm.maxSpeed =
                value),
            updateDisplay: () => {},
          },
          property: "maxSpeed",
          min: 0,
          max: 1,
          step: 0.01,
        };

      // Automata Parameters
      case "Automata Radius":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Automata,
            property: "radius",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Automata.radius,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Automata.radius =
                value),
            updateDisplay: () => {},
          },
          property: "radius",
          min: 5,
          max: 200,
          step: 1,
        };

      case "Automata Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Automata,
            property: "repulsion",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Automata
                .repulsion,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Automata.repulsion =
                value),
            updateDisplay: () => {},
          },
          property: "repulsion",
          min: 0,
          max: 2,
          step: 0.01,
        };

      case "Automata Attraction":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Automata,
            property: "attraction",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Automata
                .attraction,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Automata.attraction =
                value),
            updateDisplay: () => {},
          },
          property: "attraction",
          min: 0,
          max: 10,
          step: 0.01,
        };

      case "Threshold":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.params.Automata,
            property: "threshold",
            getValue: () =>
              this.main.particleSystem.organicBehavior.params.Automata
                .threshold,
            setValue: (value) =>
              (this.main.particleSystem.organicBehavior.params.Automata.threshold =
                value),
            updateDisplay: () => {},
          },
          property: "threshold",
          min: 0,
          max: 1,
          step: 0.01,
        };

      // Grid Controls
      case "Target Cells":
        return {
          controller: {
            object: this.main.gridRenderer.gridParams,
            property: "target",
            getValue: () => this.main.gridRenderer.gridParams.target,
            setValue: (value) => {
              this.main.gridRenderer.gridParams.target = Math.round(value);
              this.main.gridRenderer.updateGrid();
            },
            updateDisplay: () => {},
          },
          property: "target",
          min: 1,
          max: 800,
          step: 1,
        };

      case "Grid Gap":
        return {
          controller: {
            object: this.main.gridRenderer.gridParams,
            property: "gap",
            getValue: () => this.main.gridRenderer.gridParams.gap,
            setValue: (value) => {
              this.main.gridRenderer.gridParams.gap = Math.round(value);
              this.main.gridRenderer.updateGrid();
            },
            updateDisplay: () => {},
          },
          property: "gap",
          min: 0,
          max: 20,
          step: 1,
        };

      case "Cell Ratio":
        return {
          controller: {
            object: this.main.gridRenderer.gridParams,
            property: "aspectRatio",
            getValue: () => this.main.gridRenderer.gridParams.aspectRatio,
            setValue: (value) => {
              this.main.gridRenderer.gridParams.aspectRatio = value;
              this.main.gridRenderer.updateGrid();
            },
            updateDisplay: () => {},
          },
          property: "aspectRatio",
          min: 0.5,
          max: 4,
          step: 0.01,
        };

      case "Grid Scale":
        return {
          controller: {
            object: this.main.gridRenderer.gridParams,
            property: "scale",
            getValue: () => this.main.gridRenderer.gridParams.scale,
            setValue: (value) => {
              this.main.gridRenderer.gridParams.scale = value;
              this.main.gridRenderer.updateGrid();
            },
            updateDisplay: () => {},
          },
          property: "scale",
          min: 0.1,
          max: 1,
          step: 0.01,
        };

      default:
        return null;
    }
  }
}
