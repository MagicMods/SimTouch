import { BaseUi } from "./baseUi.js";
import { PulseModulatorManager } from "../../input/pulseModulator.js";
import { NetworkConfig } from "../../network/networkConfig.js";
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

    this.udpFolder = this.createFolder("UDP Network", true); // Non-persistent folders
    this.debugFolder = this.createFolder("Debug", true); // Non-persistent folders
    this.pulseModulatorFolder = this.createFolder("Pulse Modulator", true); // Non-persistent folder

    // Initialize all controls
    this.initUDPControls();
    this.initDebugControls();
    this.initGlobalControls();
    this.initParticleControls();
    this.initPhysicsControls();
    this.initCollisionControls();
    this.initBoundaryControls();
    this.initRestStateControls();

    this.initPulseModulatorControls();

    // Set default open states
    this.globalFolder.open();
    this.particleFolder.open();
    this.physicsFolder.open();
    this.collisionFolder.open();
    this.debugFolder.open(false);
    this.pulseModulatorFolder.open(true);
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
        .name("Mode")
        .onChange((value) => {
          // Set new mode
          this.main.gridRenderer.renderModes.currentMode = value;
          // Update display
          this.controls.fieldType.updateDisplay();
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
        .add(particles, "timeScale", 0, 2, 0.1)
        .name("Speed")
        .onFinishChange((value) => {
          console.log(`Animation speed: ${value}x`);
        });

      this.globalFolder
        .add(particles, "picFlipRatio", 0, 1, 0.01)
        .name("PIC / FLIP")
        .onFinishChange((value) => {
          console.log(`PIC/FLIP mixing ratio: ${value * 100}% FLIP`);
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
        20
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

    // Rest of the physics controls
    physicsFolder
      .add(this.main.particleSystem, "gravityFlip")
      .name("Flip Gravity");

    // Add timestep control
    physicsFolder
      .add(this.main.particleSystem, "timeStep", 0.001, 0.05, 0.001)
      .name("Time Step");
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

  //#region UDP
  initUDPControls() {
    const socket = socketManager;
    if (!socket) return;

    // Create local control object
    const controls = {
      enabled: socket.enable,
      debugSend: socket.debugSend,
      debugReceive: socket.debugReceive,
    };

    // Add status display
    const status = {
      connection: "Disconnected",
      lastMessage: "None",
      messageCount: 0,
    };
    // Add enable toggle
    this.udpFolder
      .add(controls, "enabled")
      .name("Enable Network")
      .onChange((value) => {
        socket.enable = value;
        if (value && !socket.isConnected) {
          socket.connect();
        } else if (!value && socket.isConnected) {
          socket.disconnect();
        }
      });

    const statusController = this.udpFolder
      .add(status, "connection")
      .name("Status")
      .disable();

    setInterval(() => {
      status.connection = socket.isConnected ? "Connected" : "Disconnected";
      statusController.updateDisplay();
    }, 1000);

    this.udpFolder
      .add({ host: NetworkConfig.UDP_HOST }, "host")
      .name("UDP Host")
      .onChange((value) => {
        console.log(`Note: UDP host changes require server restart`);
      });

    this.udpFolder
      .add({ port: NetworkConfig.UDP_PORT }, "port", 1024, 65535, 1)
      .name("UDP Output Port")
      .onChange((value) => {
        console.log(`Note: UDP input port changes require server restart`);
      });
    // Add port configuration
    this.udpFolder
      .add({ port: NetworkConfig.UDP_INPUT_PORT }, "port", 1024, 65535, 1)
      .name("UDP Input Port")
      .onChange((value) => {
        console.log(`Note: UDP input port changes require server restart`);
      });

    // // Add debug receive toggle
    // this.udpFolder
    //   .add(controls, "debugReceive")
    //   .name("Debug Mouse Input")
    //   .onChange((value) => {
    //     socket.debugReceive = value;
    //   });

    // const lastMessageController = this.udpFolder
    //   .add(status, "lastMessage")
    //   .name("Last Input")
    //   .disable();

    // const msgCountController = this.udpFolder
    //   .add(status, "messageCount")
    //   .name("Message Count")
    //   .disable();

    // // Track message count
    // socket.addMouseHandler((x, y) => {
    //   status.messageCount++;
    //   status.lastMessage = `X: ${x}, Y: ${y}`;
    //   lastMessageController.updateDisplay();
    //   msgCountController.updateDisplay();
    // });

    // // Update status periodically
    // setInterval(() => {
    //   status.connection = socket.isConnected ? "Connected" : "Disconnected";
    //   statusController.updateDisplay();
    // }, 1000);
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

  initPulseModulatorControls() {
    // Initialize modulator manager
    this.modulatorManager = new PulseModulatorManager();

    // Add button to create new modulator
    const addButton = { add: () => this.addPulseModulator() };
    this.pulseModulatorFolder.add(addButton, "add").name("+ Add Modulator");

    // Add one modulator by default
    this.addPulseModulator();
  }

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
        };

      default:
        return null;
    }
  }

  addPulseModulator() {
    // Create a modulator
    const modulator = this.modulatorManager.addModulator();

    // Create a subfolder for this modulator
    const subfolder = this.pulseModulatorFolder.addFolder(
      `Modulator ${modulator.id}`
    );

    // 1. Active toggle
    subfolder.add(modulator, "active").name("Active");

    // 2. Wave type selector
    subfolder
      .add(modulator, "type", ["sine", "square", "triangle"])
      .name("Wave Type");

    // Target selector
    const targetSelector = { target: "None" };
    const targetOptions = this.getControlTargets();

    // 3. Target Parameter
    const targetController = subfolder
      .add(targetSelector, "target", targetOptions)
      .name("Target Parameter")
      .onChange((value) => {
        if (value === "None") {
          modulator.targetControl = null;
          modulator.targetProperty = null;
          return;
        }

        const target = this.getControllerForTarget(value);
        if (target) {
          modulator.targetControl = target.controller;
          modulator.targetProperty = target.property;

          // Automatically set min/max based on the target's range
          if (target.min !== undefined && target.max !== undefined) {
            modulator.min = target.min;
            modulator.max = target.max;
            minController.updateDisplay();
            maxController.updateDisplay();
          }
        }
      });

    // 4. Set Range from Target button
    const autoRangeControl = {
      autoRange: () => {
        if (targetSelector.target === "None") {
          alert("Select a target parameter first");
          return;
        }

        const target = this.getControllerForTarget(targetSelector.target);
        if (target && target.min !== undefined && target.max !== undefined) {
          modulator.min = target.min;
          modulator.max = target.max;
          minController.updateDisplay();
          maxController.updateDisplay();
        }
      },
    };

    subfolder.add(autoRangeControl, "autoRange").name("Set Range from Target");

    // 5. Speed control
    subfolder.add(modulator, "speed", 0.1, 5).name("Speed");

    // 6. Phase control
    subfolder.add(modulator, "phase", 0, Math.PI * 2).name("Phase");

    // 7 & 8. Min/Max controls - store direct references to them
    const minController = subfolder
      .add(modulator, "min", -10, 10)
      .name("Min Value");
    const maxController = subfolder
      .add(modulator, "max", -10, 10)
      .name("Max Value");

    // 9. Remove button
    const removeButton = {
      remove: () => {
        this.modulatorManager.removeModulator(modulator.id);
        subfolder.destroy();
      },
    };
    subfolder.add(removeButton, "remove").name("- Remove");

    return modulator;
  }
}
