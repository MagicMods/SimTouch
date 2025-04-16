import { BaseUi } from "../baseUi.js";
import { eventBus } from "../../util/eventManager.js";

export class DebugUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.debugFlags = main.debugFlags;

    this.controls = {};
    this.gui.title("Debug");
    this.initDebugControls();
    this.setupFolderObserver();
  }

  initDebugControls() {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "boolean-button-container";

    // Configuration for ALL toggle buttons
    const toggleButtonsConfig = [
      { text: "Boundary", flag: "boundary" },
      { text: "BoundShape", flag: "boundaryShape" },
      { text: "Collision", flag: "collision" },
      { text: "Core", flag: "core" },
      { text: "Dimensions", flag: "dimensions" },
      { text: "Emu", flag: "emu" },
      { text: "Events", flag: "events" },
      { text: "Fluid", flag: "fluidFlip" },
      { text: "Gradients", flag: "gradients" },
      { text: "Grid", flag: "grid" },
      { text: "GridGen", flag: "gridGenRenderer" },
      { text: "GridGeo", flag: "gridGeometry" },
      { text: "GridModes", flag: "gridRenderModes" },
      { text: "InputM", flag: "inputMod" },
      { text: "Inputs", flag: "inputs" },
      { text: "Main", flag: "main" },
      { text: "ModMgr", flag: "modManager" },
      { text: "Neighbors", flag: "neighbors" },
      { text: "Network", flag: "network" },
      { text: "NoiseFld", flag: "noiseField" },
      { text: "NoisePrv", flag: "noisePreview" },
      { text: "Organic", flag: "organic" },
      { text: "Overlay", flag: "overlay" },
      { text: "Param", flag: "param" },
      { text: "Particles", flag: "particles" },
      { text: "Preset", flag: "preset" },
      { text: "Pressure", flag: "pressure" },
      { text: "PulseM", flag: "pulseMod" },
      { text: "Rand", flag: "randomizer" },
      { text: "Server", flag: "server" },
      { text: "Sound", flag: "sound" },
      { text: "State", flag: "state" },
      { text: "Turb", flag: "turbulence" },
      { text: "Velocity", flag: "velocity" },
      { text: "Verify", flag: "verification" },
      { text: "Voronoi", flag: "voronoi" }
    ];

    // Create buttons from config
    toggleButtonsConfig.forEach((config) => {
      const button = document.createElement("button");
      button.textContent = config.text;
      button.className = "toggle-button";
      button.dataset.flag = config.flag; // Store flag name on button

      // Set initial active state
      if (this.main.debugFlags[config.flag]) button.classList.add("active");

      // Add event listener
      button.addEventListener("click", (event) => {
        const clickedButton = event.currentTarget;
        const flagName = clickedButton.dataset.flag;

        // Update internal UI state first
        this.main.debugFlags[flagName] = !this.main.debugFlags[flagName];
        // --- BEGIN TEMP DEBUG ---
        console.log(`[DebugUi] Toggled ${flagName} directly to: ${this.main.debugFlags[flagName]}`);
        // --- END TEMP DEBUG ---
        clickedButton.classList.toggle("active");

        // Notify change via event
        eventBus.emit('uiControlChanged', { paramPath: 'debugFlags.' + flagName, value: this.main.debugFlags[flagName] });
      });

      buttonContainer.appendChild(button);
    });

    // Add button container to the folder
    const buttonContainerChildren = this.gui.domElement.querySelector(".children");
    buttonContainerChildren.insertBefore(buttonContainer, buttonContainerChildren.firstChild);
  }

  setupFolderObserver() {

  }

  updateDebugVisibility(enabled) {

  }

  updateDebugControllers() {

  }
}
