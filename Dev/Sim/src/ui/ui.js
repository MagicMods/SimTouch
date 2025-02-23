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

    // Create GUI instances
    this.leftGui = new GUI({ container: this.createContainer("left") });
    this.rightGui = new GUI({ container: this.createContainer("right") });

    // Initialize PresetManager with both GUIs
    this.presetManager = new PresetManager(this.leftGui, this.rightGui);

    // Initialize stats
    this.stats = new Stats();
    this.controls = {
      fieldType: null,
      boundary: null,
      mainPreset: null,
    };
    this.initStats();
    this.initGUI();
  }

  // Add method to create containers
  createContainer(position) {
    const container = document.createElement("div");
    container.className = `gui-container-${position}`;
    document.body.appendChild(container);
    return container;
  }

  initStats() {
    // Create stats container
    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";
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
    const particlePropertyFolder = this.leftGui.addFolder("Particles");
    const physicsFolder = this.leftGui.addFolder("Physics");
    const collisionFolder = this.leftGui.addFolder("Collision");
    const boundaryFolder = this.leftGui.addFolder("Boundary");
    const restFolder = this.leftGui.addFolder("Rest State");
    const udpFolder = this.leftGui.addFolder("UDP Network");
    const mouseInputFolder = this.leftGui.addFolder("Mouse Input");
    const debugFolder = this.leftGui.addFolder("Debug");

    // Right panel folders
    const turbulenceFolder = this.rightGui.addFolder("Turbulence");
    const organicFolder = this.rightGui.addFolder("Organic Behavior");
    const organicForceFolder = organicFolder.addFolder("Force");
    const gridFolder = this.rightGui.addFolder("Grid");

    //#region Presets
    presetFolder.open();

    // Add save controls
    const saveControls = {
      name: "my_preset",
      save: async () => {
        // Create overlay with input dialog
        const overlay = document.createElement("div");
        overlay.className = "preset-overlay";

        const dialog = document.createElement("div");
        dialog.className = "preset-dialog";

        const input = document.createElement("input");
        input.className = "preset-input";
        input.value = saveControls.name;

        const buttons = document.createElement("div");
        buttons.className = "preset-buttons";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.onclick = async () => {
          const filename = await this.presetManager.savePreset(input.value);
          overlay.remove();
          if (filename) {
            const msg = document.createElement("div");
            msg.className = "notification";
            msg.textContent = `Saved to ${filename}`;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
          }
        };

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.onclick = () => overlay.remove();

        buttons.appendChild(cancelBtn);
        buttons.appendChild(saveBtn);
        dialog.appendChild(input);
        dialog.appendChild(buttons);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        input.focus();
        input.select();
      },
    };

    presetFolder.add(saveControls, "save").name("Save Preset");

    // Main preset selector
    const mainPresetControl = { preset: "" };
    const mainPresets = await this.presetManager.scanPresetFolder("main");

    if (mainPresets.length > 0) {
      this.controls.mainPreset = presetFolder
        .add(mainPresetControl, "preset", mainPresets)
        .name("Main Preset")
        .onChange(async (value) => {
          try {
            const preset = await this.presetManager.loadPreset(value, "main");
            if (preset) {
              this.leftGui.load(preset.left);
              this.rightGui.load(preset.right);
              console.log(`Applied preset: ${value}`);
            }
          } catch (error) {
            console.error("Preset loading error:", error);
          }
        });
    }
    //#endregion

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
        .name("Mode")
        .onChange((value) => {
          this.main.gridRenderer.renderModes.currentMode = value;
          this.controls.fieldType.updateDisplay();
        });

      const smoothing = this.main.gridRenderer.renderModes.smoothing;
      globalFolder
        .add(gridRenderer, "maxDensity", 0.1, 10, 0.1)
        .name("Max Density");
      globalFolder
        .add(smoothing, "rateIn", 0.01, 0.5)
        .name("Fade In Speed")
        .onFinishChange(() => console.log("Smoothing in:", smoothing.rateIn));

      globalFolder
        .add(smoothing, "rateOut", 0.01, 0.5)
        .name("Fade Out Speed")
        .onFinishChange(() => console.log("Smoothing out:", smoothing.rateOut));

      const behaviorControl = {
        behavior: particles.organicBehavior.currentBehavior,
      };
      globalFolder
        .add(behaviorControl, "behavior", Object.values(Behaviors))
        .name("Organic Behavior")
        .onChange((value) => {
          particles.organicBehavior.currentBehavior = value;
        });

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
    }

    //#endregion

    //#region Particles

    particlePropertyFolder.open();
    // let previousNumParticles = particles.numParticles;
    particlePropertyFolder
      .add(particles, "numParticles", 1, 2000, 10)
      .name("Count")
      .onFinishChange((value) => {
        // if (value > previousNumParticles) {
        particles.reinitializeParticles(value);
        // }
        // previousNumParticles = value;
      });

    particlePropertyFolder
      .add(particles, "particleRadius", 0.005, 0.03, 0.001)
      .name("Size")
      .onChange((value) => {
        // Update collision system's particle radius
        particles.collisionSystem.particleRadius = value * 2; // Double for collision distance
      });

    // Add opacity control after size control
    particlePropertyFolder
      .add(this.main.particleRenderer, "particleOpacity", 0.0, 1.0, 0.01)
      .name("Opacity");

    // Add after opacity control
    particlePropertyFolder
      .addColor(this.main.particleRenderer.config, "color")
      .name("Color");
    //#endregion

    //#region Physics

    physicsFolder.open();
    physicsFolder.add(particles, "gravity", 0, 1, 0.01).name("Gravity");

    physicsFolder
      .add(particles, "velocityDamping", 0.8, 1.0, 0.01)
      .name("Velocity Damping");

    //#region Collision

    collisionFolder.open();
    collisionFolder
      .add(particles.collisionSystem, "repulsion", 0, 40, 0.01)
      .name("Repulsion");

    collisionFolder
      .add(particles.collisionSystem, "particleRestitution", 0.0, 1.0, 0.05)
      .name("Bounce");

    collisionFolder
      .add(particles.collisionSystem, "damping", 0.5, 1.0, 0.01)
      .name("Collision Damping");

    collisionFolder
      .add(this.main.particleSystem.boundary, "mode", {
        Bounce: "BOUNCE",
        Warp: "WARP",
      })
      .name("Boundary")
      .onChange((value) => {
        this.main.particleSystem.setBoundaryMode(value);
      });
    //#endregion

    //#region Boundary

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

    //#region Rest State

    restFolder.open(false);
    restFolder
      .add(particles, "velocityThreshold", 0.00001, 0.1, 0.00001)
      .name("Min Speed");

    restFolder
      .add(particles, "positionThreshold", 0.000001, 0.1, 0.000001)
      .name("Min Move");
    //#endregion

    //#region UDP Network
    console.log("UDP Network status:", this.main.udpNetwork?.getStatus());

    const networkStatus = {
      connected: false,
      lastSent: "No data sent",
    };

    // Add UDP configuration with broadcast only
    const udpConfig = this.main.udpNetwork?.config || {
      wsPort: 5501,
      udpPort: 3000,
    };

    if (this.main.udpNetwork) {
      // Basic controls
      udpFolder.add(this.main.udpNetwork, "enable").name("Enable Network");

      // Status displays
      udpFolder
        .add(networkStatus, "connected")
        .name("Connected")
        .listen()
        .disable();

      // udpFolder
      //   .add(networkStatus, "lastSent")
      //   .name("Last Sent")
      //   .listen()
      //   .disable();

      // Configuration subfolder
      udpFolder
        .add(udpConfig, "udpPort")
        .min(1024)
        .max(65535)
        .step(1)
        .name("UDP Port")
        .onChange((value) => {
          console.log(`UDP broadcast port: ${value}`);
        });

      // Reconnect button
      udpFolder
        .add(
          {
            reconnect: () => {
              this.main.udpNetwork.close();
              const success = this.main.udpNetwork.init(udpConfig);
              if (!success) {
                networkStatus.connected = false;
                console.warn("Failed to reconnect UDP network");
              }
            },
          },
          "reconnect"
        )
        .name("Reconnect");

      // Update status when data is sent
      const originalSendUDPMessage = this.main.udpNetwork.sendUDPMessage;
      this.main.udpNetwork.sendUDPMessage = function (data) {
        const result = originalSendUDPMessage.call(this, data);
        if (result) {
          networkStatus.lastSent = new Date().toLocaleTimeString();
          networkStatus.connected = this.isConnected;
        }
        return result;
      };
    } else {
      console.warn("UDP Network not initialized");
    }

    udpFolder.open();
    //#endregion

    //#region Mouse Input

    mouseInputFolder.open(true);
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

    debugFolder.add(particles, "debug").name("Show Debug Particles");
    debugFolder
      .add(particles.organicBehavior, "debug")
      .name("Debug Organic Behavior");
    debugFolder
      .add(particles, "debugShowVelocityField")
      .name("Show Velocity Field");
    debugFolder
      .add(particles, "debugShowPressureField")
      .name("Show Pressure Field");
    debugFolder.add(particles, "debugShowBoundaries").name("Show Boundaries");
    debugFolder.add(particles, "debugShowFlipGrid").name("Show FLIP Grid");
    debugFolder.add(particles, "debugShowNoiseField").name("Show Noise Field");
    debugFolder.add(this.main.udpNetwork, "debug").name("Show Debug Network");
    debugFolder.open(true);
    //#endregion

    //////////////////////////////////////////
    //////////////////////////////////////////

    //#region Turbulence

    const turbulenceControl = { preset: "none" };
    const turbulencePresets = await this.presetManager.scanPresetFolder(
      "turbulences"
    );

    // Filter out 'none.json' from presets since we handle it separately
    const filteredPresets = turbulencePresets.filter((name) => name !== "none");

    turbulenceFolder
      .add(turbulenceControl, "preset", ["none", ...filteredPresets])
      .name("Preset")
      .onChange(async (value) => {
        if (value === "none") {
          // Use none.json preset instead of reset()
          const nonePreset = await this.presetManager.loadPreset(
            "none",
            "turbulences"
          );
          if (nonePreset) {
            this.main.turbulenceField.setParameters(nonePreset);
          }
        } else {
          const preset = await this.presetManager.loadPreset(
            value,
            "turbulences"
          );
          if (preset) {
            this.main.turbulenceField.setParameters(preset);
          }
        }
        // Update displays
        turbulenceFolder.controllers.forEach((c) => c.updateDisplay());
        advancedFolder.controllers.forEach((c) => c.updateDisplay());
        biasFolder.controllers.forEach((c) => c.updateDisplay());
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
      // Fluid behavior
      const fluidFolder = organicFolder.addFolder("Fluid Parameters");
      fluidFolder
        .add(particles.organicBehavior.params.Fluid, "radius", 5, 50)
        .name("Radius");
      fluidFolder
        .add(particles.organicBehavior.params.Fluid, "surfaceTension", 0, 1)
        .name("Surface Tension");
      fluidFolder
        .add(particles.organicBehavior.params.Fluid, "viscosity", 0, 1)
        .name("Viscosity");
      fluidFolder
        .add(particles.organicBehavior.params.Fluid, "damping", 0.5, 1)
        .name("Damping");

      // Swarm behavior
      const swarmFolder = organicFolder.addFolder("Swarm Parameters");
      swarmFolder
        .add(particles.organicBehavior.params.Swarm, "radius", 5, 50)
        .name("Radius");
      swarmFolder
        .add(particles.organicBehavior.params.Swarm, "cohesion", 0, 1)
        .name("Cohesion");
      swarmFolder
        .add(particles.organicBehavior.params.Swarm, "alignment", 0, 1)
        .name("Alignment");
      swarmFolder
        .add(particles.organicBehavior.params.Swarm, "separation", 0, 1)
        .name("Separation");
      swarmFolder
        .add(particles.organicBehavior.params.Swarm, "maxSpeed", 0, 5)
        .name("Max Speed");

      // Automata behavior
      const automataFolder = organicFolder.addFolder("Automata Parameters");
      automataFolder
        .add(particles.organicBehavior.params.Automata, "radius", 5, 50)
        .name("Radius");
      automataFolder
        .add(particles.organicBehavior.params.Automata, "repulsion", 0, 1)
        .name("Repulsion");
      automataFolder
        .add(particles.organicBehavior.params.Automata, "attraction", 0, 1)
        .name("Attraction");
      automataFolder
        .add(particles.organicBehavior.params.Automata, "threshold", 0, 1)
        .name("Threshold");

      organicForceFolder
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

    // In the Grid section, fix the Field Type control
    if (gridRenderer.gridParams) {
      const gridParamFolder = gridFolder.addFolder("Parameters");
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

      // Grid Stats - only add if values exist
      const stats = gridParamFolder.addFolder("Stats");
      stats.add(gridRenderer.gridParams, "cols").name("Columns").listen();
      stats.add(gridRenderer.gridParams, "rows").name("Rows").listen();
      stats.add(gridRenderer.gridParams, "width").name("Rect Width").listen();
      stats.add(gridRenderer.gridParams, "height").name("Rect Height").listen();

      gridFolder.open(false);
    }

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
  }

  dispose() {
    if (this.leftGui) this.leftGui.destroy();
    if (this.rightGui) this.rightGui.destroy();
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }

  // formatParameterName(key) {
  //   return (
  //     key
  //       .split(/(?=[A-Z])/)
  //       .join(" ")
  //       .charAt(0)
  //       .toUpperCase() +
  //     key
  //       .split(/(?=[A-Z])/)
  //       .join(" ")
  //       .slice(1)
  //   );
  // }
}

export { UI };
