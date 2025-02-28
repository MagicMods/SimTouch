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

    // Add External Mouse Input folder!
    this.externalInputFolder = this.createFolder("External Input");

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
    this.initExternalInputControls(); // Add this line!

    // Set default open states
    this.presetFolder.open();
    this.globalFolder.open();
    this.particleFolder.open();
    this.physicsFolder.open();
    this.collisionFolder.open();
    this.mouseInputFolder.open(true);
    this.debugFolder.open(false);
    this.externalInputFolder.open(true); // Open this folder by default
  }

  initPresetControls() {
    this.presetControls = this.presetControls || {};

    // Find the correct container in dat.GUI's structure
    const containerElement =
      this.presetFolder.domElement.querySelector(".children");
    if (!containerElement) {
      console.error("Could not find container element in preset folder");
      return;
    }

    // Clear existing elements
    containerElement.innerHTML = "";

    const presetSelect = document.createElement("select");
    presetSelect.classList = "preset-select";
    // Add padding for better appearance
    presetSelect.style.padding = "4px";
    presetSelect.style.width = "100%";

    this.updatePresetDropdown(presetSelect);

    presetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      console.log("Preset selector changed to:", value);
      this.presetManager.loadPreset(value);
    });

    this.presetControls.selector = presetSelect;

    // Keep existing navigation buttons code unchanged
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.justifyContent = "space-between";
    navContainer.style.margin = "5px 5px";
    navContainer.style.width = "100%";

    const prevButton = document.createElement("button");
    prevButton.textContent = "← Prev";
    prevButton.style.flex = "1";
    prevButton.style.marginRight = "5px";
    prevButton.addEventListener("click", () => this.navigatePreset(-1));

    const nextButton = document.createElement("button");
    nextButton.textContent = "Next →";
    nextButton.style.flex = "1";
    nextButton.style.marginLeft = "5px";
    nextButton.addEventListener("click", () => this.navigatePreset(1));

    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);

    // CREATE A NEW CONTAINER FOR PRESET MANAGEMENT BUTTONS
    const actionsContainer = document.createElement("div");
    actionsContainer.style.display = "flex";
    actionsContainer.style.justifyContent = "space-between";
    actionsContainer.style.margin = "5px 5px";
    actionsContainer.style.width = "100%";
    actionsContainer.style.flexWrap = "wrap"; // Allow wrapping if needed

    // SAVE BUTTON
    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.flex = "1";
    saveButton.style.margin = "0 2px";
    saveButton.addEventListener("click", () => {
      const presetName = prompt("Enter preset name:");
      if (this.presetManager.savePreset(presetName)) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPreset();
        alert(`Preset "${presetName}" saved.`);
      }
    });

    // DELETE BUTTON
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.style.flex = "1";
    deleteButton.style.margin = "0 2px";
    deleteButton.addEventListener("click", () => {
      const current = this.presetManager.getSelectedPreset();
      console.log("Attempting to delete preset:", current);
      if (this.presetManager.deletePreset(current)) {
        this.updatePresetDropdown(presetSelect);
        presetSelect.value = this.presetManager.getSelectedPreset();
        alert(`Preset "${current}" deleted.`);
      }
    });

    // EXPORT BUTTON
    const exportButton = document.createElement("button");
    exportButton.textContent = "Export All";
    exportButton.style.flex = "1";
    exportButton.style.margin = "0 2px";
    exportButton.addEventListener("click", () => {
      this.presetManager.exportPresets();
    });

    // IMPORT BUTTON
    const importButton = document.createElement("button");
    importButton.textContent = "Import";
    importButton.style.flex = "1";
    importButton.style.margin = "0 2px";
    importButton.addEventListener("click", () => {
      // Create hidden file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);

      // Set up file input handling
      fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = this.presetManager.importPresets(e.target.result);
            if (result) {
              // Update the preset dropdown
              this.updatePresetDropdown(this.presetControls.selector);
              alert(
                `Successfully imported presets. Added or updated ${result} presets.`
              );
            } else {
              alert("Failed to import presets. Check console for details.");
            }
          };
          reader.readAsText(file);
        }
        document.body.removeChild(fileInput);
      });

      // Trigger file input
      fileInput.click();
    });

    // Add buttons to the container
    actionsContainer.appendChild(saveButton);
    actionsContainer.appendChild(deleteButton);
    actionsContainer.appendChild(exportButton);
    actionsContainer.appendChild(importButton);

    // Use the correct container for adding elements
    containerElement.appendChild(actionsContainer);
    containerElement.appendChild(presetSelect);
    containerElement.appendChild(navContainer);
  }

  // Add navigation method
  navigatePreset(direction) {
    const options = this.presetManager.getPresetOptions();
    const currentPreset = this.presetManager.getSelectedPreset();
    let currentIndex = options.indexOf(currentPreset);

    // Calculate new index with wrapping
    let newIndex = (currentIndex + direction + options.length) % options.length;
    const newPreset = options[newIndex];

    // Load the new preset
    console.log(`Navigating from "${currentPreset}" to "${newPreset}"`);
    this.presetManager.loadPreset(newPreset);

    // Update the dropdown display
    this.presetControls.selector.value = newPreset;
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
    const particles = this.main.particleSystem;
    if (!particles) return;

    this.physicsFolder.add(particles, "gravity", 0, 1, 0.01).name("Gravity");

    // Add gravity flip toggle
    this.physicsFolder
      .add(particles, "gravityFlip")
      .name("Flip Gravity")
      .onChange((value) => {
        console.log(`Gravity direction flipped: ${value}`);
      });

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

  initExternalInputControls() {
    if (!this.main.externalInput) return;

    const externalInput = this.main.externalInput;
    const mouseForces = this.main.mouseForces;

    // External input enable/disable
    this.externalInputFolder
      .add({ enabled: mouseForces.externalInputEnabled }, "enabled")
      .name("Enable External Input")
      .onChange((value) => {
        if (value) {
          externalInput.enable();
        } else {
          externalInput.disable();
        }
      });

    // Create a persistent button type object
    const buttonTypeControl = {
      type: mouseForces.externalMouseState.button,
    };

    // Button type selector
    const buttonController = this.externalInputFolder
      .add(buttonTypeControl, "type", {
        "Left (Attract)": 0,
        "Middle (Drag)": 1,
        "Right (Repulse)": 2,
      })
      .name("Button Type")
      .onChange((value) => {
        // Update the actual button type in mouseForces
        mouseForces.externalMouseState.button = value;

        // Apply the change via externalInput
        externalInput.setMouseButton(
          value,
          mouseForces.externalMouseState.isPressed
        );

        console.log("Button type changed to:", value);
      });

    // Update the UI when external data changes button type
    externalInput.onButtonTypeChange = (type) => {
      buttonTypeControl.type = type;
      buttonController.updateDisplay();
    };

    // Sensitivity control
    this.externalInputFolder
      .add(
        { sensitivity: mouseForces.externalSensitivity },
        "sensitivity",
        0.0001,
        0.01
      )
      .name("Sensitivity")
      .onChange((value) => {
        externalInput.setSensitivity(value);
      });

    // Position display (read-only)
    const positionDisplay = {
      position: `X: ${mouseForces.externalMouseState.position.x.toFixed(
        2
      )}, Y: ${mouseForces.externalMouseState.position.y.toFixed(2)}`,
    };

    const positionController = this.externalInputFolder
      .add(positionDisplay, "position")
      .name("Position")
      .disable();

    // Update position display periodically
    setInterval(() => {
      if (mouseForces.externalInputEnabled) {
        positionDisplay.position = `X: ${mouseForces.externalMouseState.position.x.toFixed(
          2
        )}, Y: ${mouseForces.externalMouseState.position.y.toFixed(2)}`;
        positionController.updateDisplay();
      }
    }, 100);
  }

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
}
