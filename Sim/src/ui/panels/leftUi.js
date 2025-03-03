import { BaseUi } from "./baseUi.js";
import { socketManager } from "../../network/socketManager.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

export class LeftUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.controls = {};
    this.initFolders();
  }

  setPresetManager(presetManager) {
    // No longer needed for LeftUi
  }

  initFolders() {
    // Persistent folders
    this.globalFolder = this.createFolder("Global");
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

    this.initDebugControls();
    this.initGlobalControls();
    this.initParticleControls();
    this.initPhysicsControls();
    this.initCollisionControls();
    this.initBoundaryControls();
    this.initRestStateControls();

    // Set default open states
    this.globalFolder.open();
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
    this.globalFolder
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
      // this.globalFolder
      //   .add(this.main.gridRenderer.renderModes, "currentMode", gridFields)
      //   .name("Grid Field")
      //   .onChange(() => this.main.gridRenderer.resetColors());
    }

    if (this.main.gridRenderer.renderModes) {
      const fieldControl = {
        field: this.main.gridRenderer.renderModes.currentMode,
      };

      this.controls.fieldType = this.globalFolder
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

      this.controls.behaviorType = this.globalFolder
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Organic Behavior")
        .onChange((value) => {
          console.log("Behavior changed to:", value);
          particles.organicBehavior.currentBehavior = value;
          // Use stored uiManager reference

          this.main.ui.rightUi.updateOrganicFolders(value);

          this.controls.behaviorType.updateDisplay();
        });

      this.globalFolder
        .add(this.main.particleSystem.boundary, "mode", {
          Bounce: "BOUNCE",
          Warp: "WARP",
        })
        .name("Boundary")
        .onChange((value) => {
          this.main.particleSystem.setBoundaryMode(value);
        });

      const smoothing = this.main.gridRenderer.renderModes.smoothing;
      this.globalFolder
        .add(this.main.gridRenderer, "maxDensity", 0.1, 10, 0.1)
        .name("Max Density");
      this.globalFolder
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("Fade In Speed")
        .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));

      this.globalFolder
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("Fade Out Speed")
        .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));

      this.globalFolder
        .add(particles, "timeStep", 0.001, 0.05, 0.001)
        .name("Time Step");

      this.globalFolder
        .add(particles, "timeScale", 0, 2, 0.1)
        .name("Speed")
        .onFinishChange((value) => {
          console.log(`Animation speed: ${value}x`);
        });

      this.globalFolder
        .add(particles, "velocityDamping", 0.8, 1, 0.01)
        .name("Velocity Damping")
        .onFinishChange((value) => {
          console.log(`Velocity damping set to ${value}`);
        });
      // this.globalFolder
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

    // Boundary section
    targets.push("Boundary Size");
    targets.push("Wall Repulsion");

    // Turbulence section
    targets.push("Turbulence Strength");
    targets.push("Turbulence Speed");
    targets.push("Scale Strength");
    targets.push("Inward Pull");

    // Voronoi section
    targets.push("Voronoi Strength");
    targets.push("Edge Width");
    targets.push("Attraction");
    targets.push("Cell Count");
    targets.push("Cell Speed");

    // Force controls
    targets.push("Fluid Force");
    targets.push("Swarm Force");
    targets.push("Automata Force");

    return targets;
  }

  // Find the actual controller for a given target name
  getControllerForTarget(targetName) {
    switch (targetName) {
      // Existing controls
      case "Particle Size":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "particleRadius",
            updateDisplay: () => {},
          },
          property: "particleRadius",
          min: 0.005,
          max: 0.03,
          step: 0.001, // Adding step information
        };

      case "Gravity Strength":
        return {
          controller: {
            object: this.main.particleSystem.gravity,
            property: "strength",
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 20,
          step: 0.1, // Adding step information
        };

      case "Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.collisionSystem,
            property: "repulsion",
            updateDisplay: () => {},
          },
          property: "repulsion",
          min: 0,
          max: 5,
          step: 0.01, // Adding step information
        };

      // Global section
      case "Max Density":
        return {
          controller: {
            object: this.main.gridRenderer,
            property: "maxDensity",
            updateDisplay: () => {},
          },
          property: "maxDensity",
          min: 0.1,
          max: 10,
          step: 0.1, // Adding step information
        };

      case "Animation Speed":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "timeScale",
            updateDisplay: () => {},
          },
          property: "timeScale",
          min: 0,
          max: 2,
          step: 0.1, // Adding step information
        };

      // Boundary section
      case "Boundary Size":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "radius",
            updateDisplay: () => {
              // Update the boundary visually when radius changes
              this.main.particleSystem.boundary.update({
                radius: this.main.particleSystem.boundary.radius,
              });
            },
          },
          property: "radius",
          min: 0.3,
          max: 0.55,
          step: 0.005, // Adding step information
        };

      case "Wall Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "boundaryRepulsion",
            updateDisplay: () => {},
          },
          property: "boundaryRepulsion",
          min: 0,
          max: 20,
          step: 0.01, // Adding step information
        };

      // Turbulence section
      case "Turbulence Strength":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "strength",
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 10,
          step: 0.1, // Adding step information
        };

      case "Turbulence Speed":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "speed",
            updateDisplay: () => {},
          },
          property: "speed",
          min: 0,
          max: 20,
          step: 0.1, // Adding step information
        };

      case "Scale Strength":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "scaleStrength",
            updateDisplay: () => {},
          },
          property: "scaleStrength",
          min: 0,
          max: 1,
          step: 0.01, // Adding step information
        };

      case "Inward Pull":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "inwardFactor",
            updateDisplay: () => {},
          },
          property: "inwardFactor",
          min: 0,
          max: 5,
          step: 0.1, // Adding step information
        };

      // Voronoi section
      case "Voronoi Strength":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "strength",
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 10,
          step: 0.1, // Adding step information
        };

      case "Edge Width":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "edgeWidth",
            updateDisplay: () => {},
          },
          property: "edgeWidth",
          min: 0.1,
          max: 50,
          step: 0.1, // Adding step information
        };

      case "Attraction":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "attractionFactor",
            updateDisplay: () => {},
          },
          property: "attractionFactor",
          min: 0,
          max: 8,
          step: 0.1, // Adding step information
        };

      case "Cell Count":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "cellCount",
            updateDisplay: () => {
              // Regenerate cells when count changes
              if (this.main.voronoiField.regenerateCells) {
                this.main.voronoiField.regenerateCells();
              }
            },
          },
          property: "cellCount",
          min: 1,
          max: 10,
          step: 1, // Adding step information
        };

      case "Cell Speed":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "cellMovementSpeed",
            updateDisplay: () => {},
          },
          property: "cellMovementSpeed",
          min: 0,
          max: 4,
          step: 0.1, // Adding step information
        };

      // Force controls
      case "Fluid Force":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.forceScales.Fluid,
            property: "base",
            updateDisplay: () => {},
          },
          property: "base",
          min: 0,
          max: 5,
          step: 0.1, // Adding step information
        };

      case "Swarm Force":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.forceScales.Swarm,
            property: "base",
            updateDisplay: () => {},
          },
          property: "base",
          min: 0,
          max: 5,
          step: 0.1, // Adding step information
        };

      case "Automata Force":
        return {
          controller: {
            object:
              this.main.particleSystem.organicBehavior.forceScales.Automata,
            property: "base",
            updateDisplay: () => {},
          },
          property: "base",
          min: 0,
          max: 5,
          step: 0.1, // Adding step information
        };

      default:
        return null;
    }
  }
}
