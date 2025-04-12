import { ShaderManager } from "./shaders/shaderManager.js";
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { UiManager } from "./ui/uiManager.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { GridRenderer } from "./renderer/gridRenderer.js";
import { TurbulenceField } from "./simulation/forces/turbulenceField.js";
import { VoronoiField } from "./simulation/forces/voronoiField.js";
import { CircularBoundary } from "./simulation/boundary/circularBoundary.js";
import { RectangularBoundary } from "./simulation/boundary/rectangularBoundary.js";
import { socketManager } from "./network/socketManager.js";
import { MouseForces } from "./simulation/forces/mouseForces.js";
import { ExternalInputConnector } from "./input/externalInputConnector.js";
import { EmuForces } from "./simulation/forces/emuForces.js";
import { EmuRenderer } from "./renderer/emuRenderer.js";
import { MicInputForces } from "./simulation/forces/micForces.js";
import { ModulatorManager } from "./input/modulatorManager.js";
import { eventBus } from "./util/eventManager.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    // Create GL context with stencil buffer and store it locally
    this.gl = this.canvas.getContext("webgl2", { stencil: true });
    if (!this.gl) throw new Error("WebGL2 not supported");

    this.shaderManager = new ShaderManager(this.gl);

    // Set default boundary type
    const boundaryType = "CIRCULAR"; // Can be "CIRCULAR" or "RECTANGULAR"

    // Create appropriate boundary
    if (boundaryType === "RECTANGULAR") {
      this.boundary = new RectangularBoundary();
    } else {
      this.boundary = new CircularBoundary();
    }

    this.turbulenceField = new TurbulenceField({ boundary: this.boundary });
    this.voronoiField = new VoronoiField({ boundary: this.boundary });
    this.particleSystem = new ParticleSystem({
      turbulence: this.turbulenceField,
      voronoi: this.voronoiField,
      boundaryType: boundaryType
    });

    this.modulatorManager = new ModulatorManager();

    this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);
    this.gridRenderer = new GridRenderer(this.gl, this.shaderManager);

    // Initialize central parameter object
    this.simParams = {
      simulation: {
        paused: true, // Initial state matching existing logic
        timeStep: this.particleSystem.timeStep, // From ParticleSystem
        timeScale: this.particleSystem.timeScale, // From ParticleSystem
        velocityDamping: this.particleSystem.velocityDamping, // From ParticleSystem
        maxVelocity: this.particleSystem.maxVelocity, // From ParticleSystem
        picFlipRatio: this.particleSystem.picFlipRatio // From ParticleSystem
      },
      boundary: {
        mode: this.particleSystem.boundary.mode // From ParticleSystem's boundary
      },
      rendering: {
        // Initial values from GridRenderer and its components
        gridMode: this.gridRenderer.renderModes?.currentMode || "DENSITY", // Default to DENSITY if not found
        maxDensity: this.gridRenderer.maxDensity || 5.0 // Default from GridRenderer or a sensible value
      },
      smoothing: {
        // Initial values from GridRenderer's smoothing object
        rateIn: this.gridRenderer.renderModes?.smoothing?.rateIn || 0.1, // Default if not found
        rateOut: this.gridRenderer.renderModes?.smoothing?.rateOut || 0.05 // Default if not found
      }
    };

    this.frame = 0;
    this.mouseForces = new MouseForces();
    this.mouseForces.setMainReference(this); // Set direct reference to main
    this.mouseForces.setupMouseInteraction(this.canvas, this.particleSystem);
    this.micForces = new MicInputForces();

    // Attach mouseForces to particleSystem
    this.particleSystem.mouseForces = this.mouseForces;

    // Create EmuForces instance with correct reference to gravity
    this.emuForces = new EmuForces({
      gravity: this.particleSystem.gravity,
    });

    this.externalInput = new ExternalInputConnector(
      this.mouseForces,
      this.emuForces,
      this.micForces
    )
      .enable()
      .setSensitivity(0.002);

    // Create the visualizer AFTER externalInput is initialized
    this.emuRenderer = new EmuRenderer(document.body, this.externalInput.emuForces, this);
    this.emuRenderer.hide();

    // Connect components directly without null checks
    console.log("Directly connecting turbulenceField to emuRenderer and emuForces");
    // Add direct reference to turbulenceField in emuForces
    this.externalInput.emuForces.turbulenceField = this.turbulenceField;

    // Add direct reference to main in simulation
    if (this.externalInput.emuForces.simulation) {
      this.externalInput.emuForces.simulation.main = this;
    }
    // Also store main reference in emuRenderer
    this.emuRenderer.main = this;

    socketManager.enable = false;
    socketManager.connect();
  }

  async init() {
    try {
      await this.shaderManager.init();

      // Get audio analyzer directly without null checks
      this.audioAnalyzer = this.micForces.analyzer;

      this.ui = new UiManager(this);

      // Subscribe main to UI changes using the correct method name 'on'
      eventBus.on('uiControlChanged', this.handleSimUIChange.bind(this));

      this.animate();
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  // Add handler for UI changes
  handleSimUIChange({ paramPath, value }) {
    const keys = paramPath.split('.');
    let current = this.simParams;
    for (let i = 0; i < keys.length - 1; i++) {
      // Create nested objects if they don't exist
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
      // Add a check if the path is still invalid after creation attempt
      if (!current) {
        console.error(`Invalid paramPath structure: ${paramPath} at segment ${keys[i]}`);
        return;
      }
    }
    // Final check before assignment
    if (!current) {
      console.error(`Invalid paramPath structure before final assignment: ${paramPath}`);
      return;
    }
    current[keys[keys.length - 1]] = value;
    console.log(`SimParams updated via UI: ${paramPath} = ${value}`, JSON.stringify(this.simParams)); // Log for verification
  }

  animate() {
    // Read pause state from simParams
    if (!this.simParams.simulation.paused) {
      this.render();
    }
    requestAnimationFrame(() => this.animate());
  }

  render() {
    this.frame++;

    // Apply forces in sequence
    this.particleSystem.mouseForces.update(this.particleSystem);
    this.emuForces.apply(this.particleSystem.timeStep);
    this.turbulenceField.update(this.particleSystem.timeStep);
    this.voronoiField.update(this.particleSystem.timeStep);

    // Step the particle system
    this.particleSystem.step();

    // Draw all visual elements
    this.gridRenderer.draw(this.particleSystem);
    this.particleRenderer.draw(this.particleSystem.getParticles());

    // Update UI and modulators
    this.ui.update(this.particleSystem.timeStep);
    this.modulatorManager.update(this.particleSystem.timeStep);
  }

  static async create() {
    const main = new Main();
    await main.init();
    return main;
  }

  setupMouseDebug() {
    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      console.table({
        "Mouse Click": {
          x: mouseX.toFixed(3),
          y: mouseY.toFixed(3),
        },
        "Relative to Center": {
          x: (mouseX - 0.5).toFixed(3),
          y: (mouseY - 0.5).toFixed(3),
        },
        "Canvas Pixels": {
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
        },
      });
    });
  }
}

window.onload = () => Main.create().catch(console.error);

export { Main };
