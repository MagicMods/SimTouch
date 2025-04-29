import { BaseUi } from "../baseUi.js";
import { eventBus } from "../../util/eventManager.js";
import { debugManager } from '../../util/debugManager.js';

export class DebugUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.controls = {};
    this.gui.title("Debug");
    this.initDebugControls();
    this.gui.close();
  }

  initDebugControls() {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "boolean-button-container";

    // Configuration for ALL toggle buttons
    const toggleButtonsConfig = [
      { text: "Udp", flag: "udp" },
      { text: "Serial", flag: "serial" },
      { text: "Com", flag: "com" },
      { text: "Send/Rec", flag: "comSR" },

      { text: "Boundary", flag: "boundary" },
      { text: "Shapes", flag: "boundaryShape" },
      { text: "Dimensions", flag: "dimensions" },
      { text: "GridGeo", flag: "gridGeometry" },

      { text: "Grid", flag: "grid" },
      { text: "Gradient", flag: "gradients" },
      { text: "GridGen", flag: "gridGenRenderer" },
      { text: "GridModes", flag: "gridRenderModes" },
      { text: "Shader", flag: "shader" },

      { text: "Particles", flag: "particles" },
      { text: "Fluid", flag: "fluidFlip" },
      { text: "Velocity", flag: "velocity" },
      { text: "Collision", flag: "collision" },
      { text: "Gravity", flag: "gravity" },
      { text: "Noise", flag: "noise" },

      { text: "Neighbors", flag: "neighbors" },
      { text: "Turb", flag: "turbulence" },
      { text: "Voronoi", flag: "voronoi" },
      { text: "Organic", flag: "organic" },
      { text: "Automata", flag: "automataRules" },

      { text: "ModMgr", flag: "modManager" },
      { text: "PulseM", flag: "pulseMod" },
      { text: "InputM", flag: "inputMod" },
      { text: "Inputs", flag: "inputs" },
      { text: "Emu", flag: "emu" },

      { text: "Rand", flag: "randomizer" },
      { text: "Server", flag: "server" },
      { text: "Sound", flag: "sound" },
      { text: "Overlay", flag: "overlay" },

      { text: "Param", flag: "param" },
      { text: "State", flag: "state" },
      { text: "Events", flag: "events" },
      { text: "Preset", flag: "preset" },

      { text: "Main", flag: "main" },
      { text: "NoisePrv", flag: "noisePrv" },
      { text: "DataViz", flag: "dataViz" },
      { text: "MouseForces", flag: "mouseForces" },
      { text: "Joystick", flag: "joystick" },
      { text: "DebugUi", flag: "debugUi" },

    ];

    // Create buttons from config
    toggleButtonsConfig.forEach((config) => {
      const button = document.createElement("button");
      button.textContent = config.text;
      button.className = "toggle-button";
      button.dataset.flag = config.flag; // Store flag name on button

      // Set initial active state
      if (debugManager.get(config.flag)) button.classList.add("active");

      // Add event listener
      button.addEventListener("click", (event) => {
        const clickedButton = event.currentTarget;
        const flagName = clickedButton.dataset.flag;

        // Update internal UI state first
        const currentState = debugManager.get(flagName);
        const newState = !currentState;
        debugManager.set(flagName, newState);

        if (debugManager.get('debugUi')) console.log(`[DebugUi] Toggled ${flagName} via manager to: ${newState}`);

        clickedButton.classList.toggle("active");
      });

      buttonContainer.appendChild(button);
    });

    // Add button container to the folder
    const buttonContainerChildren = this.gui.domElement.querySelector(".children");
    buttonContainerChildren.insertBefore(buttonContainer, buttonContainerChildren.firstChild);
  }


}
