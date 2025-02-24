import { BaseUi } from "./baseUi.js";
import { GridField } from "../../renderer/gridRenderModes.js";
import { Behaviors } from "../../simulation/behaviors/organicBehavior.js";

export class LeftUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.presetManager = null; // Will be set later
    this.controls = {};
    this.initFolders();
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
    // Initialize preset controls now that we have the manager
    this.initPresetControls();
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
    this.initPresetControls();
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
    this.debugFolder.open(true);
  }

  initPresetControls() {
    if (!this.presetManager) return;

    const presets = this.presetManager.getPresetList();
    const presetControl = { current: presets[0] || "" };

    this.presetFolder
      .add(presetControl, "current", presets)
      .name("Load Preset")
      .onChange((value) => {
        if (value) this.presetManager.loadPreset(value);
      });

    const saveControl = {
      name: "my_preset",
      save: () => {
        // Save logic will be implemented later
        console.log("Save preset:", saveControl.name);
      },
    };

    this.presetFolder.add(saveControl, "name").name("Preset Name");

    this.presetFolder.add(saveControl, "save").name("Save Preset");
  }

  initUDPControls() {
    const udpNetwork = this.main.udpNetwork;
    if (!udpNetwork) return;

    // Create local control object
    const controls = {
      enabled: udpNetwork._enable,
      debug: udpNetwork._debug,
    };

    // Add enable toggle
    this.udpFolder
      .add(controls, "enabled")
      .name("Enable UDP")
      .onChange((value) => {
        udpNetwork.enable = value;
      });

    // Add debug toggle
    this.udpFolder
      .add(controls, "debug")
      .name("Debug Mode")
      .onChange((value) => {
        udpNetwork.debug = value;
      });

    // Add status display
    const status = { connection: "Disconnected" };
    const statusController = this.udpFolder
      .add(status, "connection")
      .name("Status")
      .disable();

    // Update status periodically
    setInterval(() => {
      const networkStatus = udpNetwork.getStatus();
      status.connection = networkStatus.connected
        ? "Connected"
        : "Disconnected";
      statusController.updateDisplay();
    }, 1000);

    // Add port configuration
    this.udpFolder
      .add(udpNetwork.config, "wsPort", 1024, 65535, 1)
      .name("WebSocket Port");

    this.udpFolder
      .add(udpNetwork.config, "udpPort", 1024, 65535, 1)
      .name("UDP Port");
  }

  initDebugControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    // Grid visibility
    if (this.main.gridRenderer) {
      this.debugFolder
        .add({ showGrid: false }, "showGrid")
        .name("Grid")
        .onChange((value) => this.main.gridRenderer.setVisible(value));
    }

    // Boundary visibility
    if (this.main.boundary) {
      this.debugFolder
        .add({ showBoundary: true }, "showBoundary")
        .name("Boundary")
        .onChange((value) => this.main.boundary.setVisible(value));
    }

    // Particle visibility
    if (this.main.particleRenderer) {
      this.debugFolder
        .add({ showParticles: true }, "showParticles")
        .name("Particles")
        .onChange((value) => this.main.particleRenderer.setVisible(value));
    }

    // Debug renderer controls
    if (this.main.debugRenderer) {
      this.debugFolder
        .add({ showVelocities: false }, "showVelocities")
        .name("Velocities")
        .onChange((value) => this.main.debugRenderer.setShowVelocities(value));

      this.debugFolder
        .add({ showNeighbors: false }, "showNeighbors")
        .name("Neighbors")
        .onChange((value) => this.main.debugRenderer.setShowNeighbors(value));
    }

    // UDP debug visibility
    if (this.main.udpNetwork) {
      this.debugFolder
        .add({ showUdp: false }, "showUdp")
        .name("UDP")
        .onChange((value) => (this.main.udpNetwork._debug = value));
    }
  }
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
          this.main.gridRenderer.renderModes.currentMode = value;
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
      this.globalFolder
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Organic Behavior")
        .onChange((value) => {
          particles.organicBehavior.currentBehavior = value;
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
    }
  }

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
      });

    this.particleFolder
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    this.particleFolder
      .addColor(this.main.particleRenderer.config, "color")
      .name("Color");
  }

  initPhysicsControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.physicsFolder.add(particles, "gravity", 0, 1, 0.01).name("Gravity");

    this.physicsFolder
      .add(particles, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Velocity Damping");
  }

  initCollisionControls() {
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.collisionFolder
      .add(particles.collisionSystem, "repulsion", 0, 40, 0.01)
      .name("Repulsion");

    this.collisionFolder
      .add(particles.collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    this.collisionFolder
      .add(particles.collisionSystem, "damping", 0.5, 1.0, 0.01)
      .name("Collision Damping");

    this.collisionFolder
      .add(this.main.particleSystem.boundary, "mode", {
        Bounce: "BOUNCE",
        Warp: "WARP",
      })
      .name("Boundary")
      .onChange((value) => {
        this.main.particleSystem.setBoundaryMode(value);
      });
  }

  initBoundaryControls() {
    const boundary = this.main.boundary;
    if (!boundary) return;

    this.boundaryFolder
      .add(boundary, "radius", 50, 200)
      .name("Radius")
      .onChange(() => boundary.updateBoundary());
  }

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

  initMouseControls() {
    const mouseForces = this.main.particleSystem.mouseForces;
    if (!mouseForces) return;

    // Create control object with proper property names
    const controls = {
      radius: mouseForces.impulseRadius || 0.75,
      strength: mouseForces.impulseMag || 0.08,
    };

    // Add mouse force radius control
    this.mouseInputFolder
      .add(controls, "radius", 0.1, 2.0)
      .name("Force Radius")
      .onChange((value) => (mouseForces.impulseRadius = value));

    // Add mouse force strength control
    this.mouseInputFolder
      .add(controls, "strength", 0, 0.2)
      .name("Force Strength")
      .onChange((value) => (mouseForces.impulseMag = value));
  }

  showSavePresetDialog(defaultName) {
    const overlay = document.createElement("div");
    overlay.className = "preset-overlay";
    // ... implementation of save dialog ...
  }

  addFileControls() {
    const fileControls = {
      export: () => this.main.presetManager.saveToFile("preset"),
      import: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          await this.main.presetManager.loadFromFile(file);
          // Update preset list
          const presets = this.main.presetManager.getPresetList();
          this.controls.mainPreset?.options(presets);
        };
        input.click();
      },
    };

    this.presetFolder.add(fileControls, "export").name("Export to File");
    this.presetFolder.add(fileControls, "import").name("Import from File");
  }
}
