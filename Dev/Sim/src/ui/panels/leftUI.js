import { BaseUi } from "./baseUi.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";
import { socketManager } from "../../network/socketManager.js";
import { NetworkConfig } from "../../network/networkConfig.js";

export class LeftUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null;
    this.controls = {};
    this.initFolders();
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    this.initPresetControls(); // Move initialization here
  }

  initFolders() {
    this.presetFolder = this.createFolder("Presets", true); // Non-persistent folders

    // Persistent folders
    this.globalFolder = this.createFolder("Global");
    this.particleFolder = this.createFolder("Particles");
    this.physicsFolder = this.createFolder("Physics");
    this.collisionFolder = this.createFolder("Collision");
    this.boundaryFolder = this.createFolder("Boundary");
    this.restFolder = this.createFolder("Rest State");
    this.mouseInputFolder = this.createFolder("Mouse Input");

    this.udpFolder = this.createFolder("UDP Network", true); // Non-persistent folders
    this.debugFolder = this.createFolder("Debug", true); // Non-persistent folders

    // Initialize all controls
    this.initUDPControls();
    this.initDebugControls();
    this.initGlobalControls();
    this.initParticleControls();
    this.initPhysicsControls();
    this.initCollisionControls();
    this.initBoundaryControls();
    this.initRestStateControls();
    this.initMouseControls();

    // Set default open states
    this.presetFolder.open();
    this.globalFolder.open();
    this.particleFolder.open();
    this.physicsFolder.open();
    this.collisionFolder.open();
    this.mouseInputFolder.open(true);
    this.debugFolder.open(false);
  }

  initPresetControls() {
    this.presetControls = this.presetControls || {};

    const presetSelect = document.createElement("select");
    presetSelect.classList = "preset-select";

    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Preset selector changed to:", value);
      this.presetManager.loadPreset(value);
    });

    this.presetControls.selector = presetSelect;

    this.presetFolder
      .add(
        {
          save: () => {
            const presetName = prompt("Enter preset name:");
            if (this.presetManager.savePreset(presetName)) {
              this.updatePresetDropdown(presetSelect);
              presetSelect.value = this.presetManager.getSelectedPreset();
              alert(`Preset "${presetName}" saved.`);
            }
          },
        },
        "save"
      )
      .name("Save");

    this.presetFolder
      .add(
        {
          delete: () => {
            const current = this.presetManager.getSelectedPreset();
            console.log("Attempting to delete preset:", current);
            if (this.presetManager.deletePreset(current)) {
              this.updatePresetDropdown(presetSelect);
              presetSelect.value = this.presetManager.getSelectedPreset();
              alert(`Preset "${current}" deleted.`);
            }
          },
        },
        "delete"
      )
      .name("Delete");

    this.presetFolder.domElement.appendChild(presetSelect);
    console.log("Controllers after init:", this.presetFolder.controllers);
  }

  updatePresetDropdown(selectElement) {
    const options = this.presetManager.getPresetOptions();
    console.log("Updating preset dropdown with options:", options);

    selectElement.innerHTML = "";
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    selectElement.value = this.presetManager.getSelectedPreset();
  }

  updatePresetDropdown(selectElement) {
    const options = this.presetManager.getPresetOptions();
    console.log("Updating preset dropdown with options:", options);

    // Clear existing options
    selectElement.innerHTML = "";

    // Add new options
    options.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset;
      option.textContent = preset;
      selectElement.appendChild(option);
    });

    // Set current value
    selectElement.value = this.presetManager.getSelectedPreset();
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
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.physicsFolder.add(particles, "gravity", 0, 1, 0.01).name("Gravity");

    this.physicsFolder
      .add(particles, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Velocity Damping");
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

  //#region Mouse Input
  initMouseControls() {
    const particles = this.main.particleSystem;
    if (!particles?.mouseForces) return;

    this.mouseInputFolder
      .add(particles.mouseForces, "impulseRadius", 0.5, 2, 0.01)
      .name("Input Radius");

    this.mouseInputFolder
      .add(particles.mouseForces, "impulseMag", 0.01, 0.12, 0.001)
      .name("Impulse Magnitude");
  }
  //#endregion

  //#region UDP
  initUDPControls() {
    const socket = socketManager;
    if (!socket) return;

    // Create local control object
    const controls = {
      enabled: socket.enable,
      debug: socket.debug,
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

    // Add status display
    const status = { connection: "Disconnected" };
    const statusController = this.udpFolder
      .add(status, "connection")
      .name("Status")
      .disable();

    // Update status periodically
    setInterval(() => {
      status.connection = socket.isConnected ? "Connected" : "Disconnected";
      statusController.updateDisplay();
    }, 1000);

    // Add port configuration
    this.udpFolder
      .add({ host: NetworkConfig.UDP_HOST }, "host")
      .name("UDP Host")
      .onChange((value) => {
        if (socket.isConnected) {
          socket.reconnect(undefined, value);
        }
      });
    this.udpFolder
      .add({ port: NetworkConfig.UDP_PORT }, "port", 1024, 65535, 1)
      .name("UDP Port")
      .onChange((value) => {
        if (socket.isConnected) {
          socket.reconnect(value);
        }
      });
    this.udpFolder
      .add({ port: NetworkConfig.WEBSOCKET_PORT }, "port", 1024, 65535, 1)
      .name("WebSocket Port")
      .onChange((value) => {
        if (socket.isConnected) {
          socket.reconnect(value);
        }
      });

    // // Add connection controls
    // this.udpFolder
    //   .add(
    //     {
    //       reconnect: () => {
    //         socket.reconnect();
    //       },
    //     },
    //     "reconnect"
    //   )
    //   .name("Reconnect");
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
        showNetwork: socket.debug,
      };

      this.debugFolder
        .add(debugNetworkControl, "showNetwork")
        .name("Network Debug")
        .onChange((value) => {
          socket.debug = value;
        });

      // Add network stats if enabled
      if (socket.debug) {
        const stats = {
          bytesSent: 0,
          lastSent: "N/A",
        };

        const statsFolder = this.debugFolder.addFolder("Network Stats");

        statsFolder.add(stats, "bytesSent").name("Bytes Sent").disable();

        statsFolder.add(stats, "lastSent").name("Last Sent").disable();

        // Update stats periodically
        setInterval(() => {
          if (socket.debug && socket.isConnected) {
            stats.bytesSent = socket.bytesSent || 0;
            stats.lastSent = socket.lastSentTime
              ? new Date(socket.lastSentTime).toLocaleTimeString()
              : "N/A";
            statsFolder.controllers.forEach((c) => c.updateDisplay());
          }
        }, 1000);
      }
    }
  } //#endregion
}
