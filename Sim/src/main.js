import { ShaderManager } from "./shaders/shaderManager.js";
// Simulation
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { TurbulenceField } from "./simulation/forces/turbulenceField.js";
import { VoronoiField } from "./simulation/forces/voronoiField.js";
// CoreGrid   
import { DimensionManager } from "./coreGrid/dimensionManager.js";
import { BoundaryManager } from "./coreGrid/boundaryManager.js";
import { CircularBoundary } from "./simulation/boundary/circularBoundary.js";
import { RectangularBoundary } from "./simulation/boundary/rectangularBoundary.js";
// UI
import { UiManager } from "./ui/uiManager.js";
// Input
import { MouseForces } from "./simulation/forces/mouseForces.js";
import { ExternalInputConnector } from "./input/externalInputConnector.js";
import { EmuForces } from "./simulation/forces/emuForces.js";
import { EmuRenderer } from "./renderer/emuRenderer.js";
import { MicInputForces } from "./simulation/forces/micForces.js";
// Renderer
import { GridGenRenderer } from "./renderer/gridGenRenderer.js";
import { BoundaryRenderer } from "./renderer/boundaryRenderer.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { GridRenderModes } from "./renderer/gridRenderModes.js";
// Network
import { ModulatorManager } from "./input/modulatorManager.js";
import { socketManager } from "./network/socketManager.js";
import { eventBus } from "./util/eventManager.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    // Create GL context with stencil buffer and store it locally
    this.gl = this.canvas.getContext("webgl2", { stencil: true });
    if (!this.gl) throw new Error("WebGL2 not supported");

    this.shaderManager = new ShaderManager(this.gl);

    // Define gridParams first
    this.gridParams = {
      screen: {
        width: 240,
        height: 240,
        shape: "circular",
      },
      gridSpecs: {
        targetCellCount: 341,
        gap: 1,
        aspectRatio: 1.0,
        scale: 1.0,
        allowCut: 3,
        centerOffsetX: 0,
        centerOffsetY: 0,
      },
      shadow: {
        shadowIntensity: 0.17,
        shadowThreshold: 0,
        blurAmount: 0.23,
      },
      colors: {
        gridBackgroundColor: [0.0, 0.0, 0.0], //rgb(0, 0, 0)
        cellColor: [0.5, 0.5, 0.5], // Default gray #808080
        gradientPreset: 'c0',
      },
      flags: {
        showGridCells: true,
        showIndices: false,
        showCellCenters: false,
        showBoundary: false,
      },
      renderSize: {
        maxRenderWidth: 960,
        maxRenderHeight: 960,
      },
      // Add default values for calculated stats (used by lil-gui .listen())
      cellCount: 0,
      cols: 0,
      rows: 0,
      calculatedCellWidth: 0,
      calculatedCellHeight: 0,
    };

    // Define simParams next, using default values
    this.simParams = {
      simulation: {
        paused: false,
        timeStep: 1 / 60, // Default from ParticleSystem
        timeScale: 1.0, // Default from ParticleSystem
        velocityDamping: 0.98, // Default from ParticleSystem
        maxVelocity: 1, // Default from ParticleSystem
        picFlipRatio: 0, // Default from ParticleSystem
        particleCount: 500, // Default from ParticleSystem
        particleRadius: 0.01, // Default from ParticleSystem
        restDensity: 2.0, // Default from ParticleSystem
      },
      boundary: {
        mode: "BOUNCE", // Initial default
        shape: "CIRCULAR", // Initial default
        scale: 1.0,
        damping: 0.8,
        restitution: 1.0,
        repulsion: 1.0,
      },
      rendering: {
        gridMode: "Proximity", // Default guess (was from gridRenderer)
        maxDensity: 2.10 // Default from GridRenderer
      },
      smoothing: {
        rateIn: 0.1, // Default guess (was from gridRenderer.renderModes)
        rateOut: 0.05 // Default guess (was from gridRenderer.renderModes)
      },
      gravity: {
        directionX: 0, // Default from GravityForces (via ParticleSystem)
        directionY: 0  // Default from GravityForces (via ParticleSystem)
      },
      collision: {
        enabled: true, // Default from CollisionSystem
        gridSize: 10, // Default from CollisionSystem
        repulsion: 0.5, // Default from CollisionSystem
        particleRestitution: 0.8, // Default from CollisionSystem
        damping: 0.98, // Default from CollisionSystem
      },
      turbulence: {
        strength: 4, // Default from TurbulenceField
        scale: 3.0, // Default from TurbulenceField
        speed: 1.0, // Default from TurbulenceField
        rotationSpeed: 0.0, // Default from TurbulenceField
        rotation: 0.0, // Default from TurbulenceField
        pullFactor: 1.0, // Default from TurbulenceField
        affectPosition: false, // Default from TurbulenceField
        scaleField: false, // Default from TurbulenceField
        affectScale: false, // Default from TurbulenceField
        minScale: 0.008, // Default from TurbulenceField
        maxScale: 0.03, // Default from TurbulenceField
        patternStyle: "Checkerboard", // Default from TurbulenceField
        decayRate: 0.99, // Default from TurbulenceField
        directionBiasX: 0, // Default from TurbulenceField
        directionBiasY: 0, // Default from TurbulenceField
        contrast: 0.5, // Default from TurbulenceField
        biasStrength: 0.3, // Default from TurbulenceField
        patternFrequency: 2.0, // Default from TurbulenceField
        noiseSeed: Math.random() * 10000, // Default from TurbulenceField
        separation: 0, // Default from TurbulenceField
        domainWarp: 0, // Default from TurbulenceField
        domainWarpSpeed: 0, // Default from TurbulenceField
        symmetryAmount: 0.0, // Default from TurbulenceField
        phase: 0.0, // Default from TurbulenceField
        phaseSpeed: -1, // Default from TurbulenceField
        blurAmount: 0.8, // Default from TurbulenceField
        _displayBiasAccelX: 0, // Default internal state
        _displayBiasAccelY: 0  // Default internal state
      },
      voronoi: {
        strength: 0, // Default from VoronoiField
        edgeWidth: 0.3, // Default from VoronoiField
        attractionFactor: 1.0, // Default from VoronoiField
        cellCount: 10, // Default from VoronoiField
        cellMovementSpeed: 0.2, // Default from VoronoiField
        decayRate: 0.99, // Default from VoronoiField
        velocityBlendFactor: 0.7, // Default from VoronoiField
        pullMode: false // Default from VoronoiField
      },
      organic: { // Defaults from OrganicBehavior
        behavior: "None",
        globalForce: 0.1,
        globalRadius: 30,
        Fluid: {
          surfaceTension: 0.5,
          viscosity: 0.2,
          damping: 0.98
        },
        Swarm: {
          cohesion: 1.0,
          alignment: 0.7,
          separation: 1.2,
          maxSpeed: 0.5
        },
        Automata: {
          repulsion: 0.8,
          attraction: 0.5,
          threshold: 0.2
        },
        Chain: {
          linkDistance: 0,
          linkStrength: 10,
          alignment: 0.5,
          branchProb: 2,
          maxLinks: 10
        },
      },
      particleRenderer: {
        color: "#FFFFFF", // Default from ParticleRenderer config
        opacity: 0.1 // Default from ParticleRenderer
      },
      network: { // Defaults from socketManager
        enabled: false,
        debugSend: false,
        debugReceive: false
      }
    };

    // Instantiate DimensionManager
    this.dimensionManager = new DimensionManager(
      this.gridParams.screen.width,
      this.gridParams.screen.height,
      this.gridParams.renderSize.maxRenderWidth,
      this.gridParams.renderSize.maxRenderHeight
    );
    this.#applyCurrentDimensionsAndBoundary(); // Apply dimensions early

    // Instantiate BoundaryManager
    const initialDimensions = this.dimensionManager.getDimensions();
    this.boundaryManager = new BoundaryManager(
      this.gridParams,
      initialDimensions,
      this.dimensionManager
    );

    // Get the physics boundary instance from the manager
    const physicsBoundary = this.boundaryManager.getPhysicsBoundary();
    if (!physicsBoundary) {
      throw new Error("Failed to get physicsBoundary from BoundaryManager");
    }

    // Pass the physics boundary instance to other components that need it
    this.turbulenceField = new TurbulenceField({ boundary: physicsBoundary });
    this.voronoiField = new VoronoiField({ boundary: physicsBoundary });

    // Instantiate ParticleSystem, passing the boundary manager
    this.particleSystem = new ParticleSystem({
      turbulence: this.turbulenceField,
      voronoi: this.voronoiField,
      boundaryManager: this.boundaryManager
      // Use defaults for particleCount, timeStep etc. from simParams or ParticleSystem constructor
    });

    this.gridRenderModes = new GridRenderModes(this.gridParams, this.dimensionManager, this.boundaryManager, this.particleSystem);
    // Instantiate other components
    this.modulatorManager = new ModulatorManager();
    this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);

    this.frame = 0;
    this.mouseForces = new MouseForces();
    this.mouseForces.setMainReference(this); // Set direct reference to main
    this.mouseForces.setupMouseInteraction(this.canvas, this.particleSystem);
    this.micForces = new MicInputForces();

    // Attach mouseForces to particleSystem
    this.particleSystem.mouseForces = this.mouseForces;

    // Create EmuForces instance with correct reference to gravity
    this.emuForces = new EmuForces({
      gravity: this.particleSystem.gravity, // Now particleSystem exists
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

    // Instantiate Renderers that depend on Managers
    this.boundaryRenderer = new BoundaryRenderer(
      document.body,
      this.boundaryManager,
      this.canvas
    );
    this.gridGenRenderer = new GridGenRenderer(
      this.gl,
      this.shaderManager,
      this.gridParams,
      this.dimensionManager,
      this.boundaryManager,
      this.particleSystem,
      this.gridRenderModes
    );
    console.log("Instantiated new Grid components (DimensionManager, BoundaryManager, BoundaryRenderer, GridGenRenderer)");

    // --- BEGIN PLAN STEP 5 Action 4: Subscribe Grid UI Handler ---
    // Subscribe main to Grid UI changes (assuming NewGridUi emits 'uiControlChanged')
    eventBus.on('uiControlChanged', this.handleGridUIChange.bind(this));
    console.log("Main subscribed to uiControlChanged events for Grid UI.");
    // --- END STEP 1 ---
    // TODO: Review if the existing subscription below needs modification or removal
    // Subscribe main to UI changes using the correct method name 'on'
  }

  async init() {
    try {
      await this.shaderManager.init();

      // Get audio analyzer directly without null checks
      this.audioAnalyzer = this.micForces.analyzer;

      this.ui = new UiManager(this);

      eventBus.on('uiControlChanged', this.handleSimUIChange.bind(this));
      // eventBus.on('uiControlChanged', this.handleGridUIChange.bind(this));

      this.animate();
      this.setGridParams(this.gridParams);
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  handleSimUIChange({ paramPath, value }) {
    const keys = paramPath.split('.');
    let current = this.simParams;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
      if (!current) {
        console.error(`Invalid paramPath structure: ${paramPath} at segment ${keys[i]}`);
        return;
      }
    }
    if (!current) {
      console.error(`Invalid paramPath structure before final assignment: ${paramPath}`);
      return;
    }
    current[keys[keys.length - 1]] = value;
    console.log(`SimParams updated via UI: ${paramPath} = ${value}`);

    eventBus.emit('simParamsUpdated', { simParams: this.simParams });
  }

  handleGridUIChange({ paramPath, value }) {
    // --- BEGIN STEP 2: Add Path Validation ---
    const validGridPrefixes = ['screen', 'gridSpecs', 'shadow', 'colors', 'flags', 'renderSize'];
    const pathRoot = paramPath.split('.')[0];
    if (!validGridPrefixes.includes(pathRoot)) {
      // console.debug(`handleGridUIChange received non-grid path: ${paramPath}. Ignoring.`);
      return; // Ignore paths not starting with gridParams keys
    }
    // --- END STEP 2 ---

    console.log(`Grid UI Change Received: ${paramPath} =`, value);
    try {
      const parts = paramPath.split('.');
      let current = this.gridParams;

      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
          console.error(`handleGridUIChange: Invalid path segment ${parts[i]} in ${paramPath}`);
          return;
        }
        current = current[parts[i]];
      }

      const finalKey = parts[parts.length - 1];

      if (paramPath === 'screen') {
        if (!this.gridParams.screen) this.gridParams.screen = {};
        Object.assign(this.gridParams.screen, value);
      } else {
        if (current[finalKey] !== undefined) {
          current[finalKey] = value;
        } else {
          console.error(`handleGridUIChange: Invalid final key ${finalKey} in ${paramPath}`);
          return;
        }
      }

      this.setGridParams(this.gridParams);

    } catch (error) {
      console.error(`Error handling grid UI change (${paramPath}=${value}):`, error);
    }
  }

  animate() {
    if (!this.simParams.simulation.paused) this.render();
    requestAnimationFrame(() => this.animate());
  }

  render() {
    this.frame++;

    this.particleSystem.mouseForces.update(this.particleSystem);
    this.emuForces.apply(this.particleSystem.timeStep);
    this.turbulenceField.update(this.particleSystem.timeStep);
    this.voronoiField.update(this.particleSystem.timeStep);

    this.particleSystem.step();
    this.gridGenRenderer.draw();
    this.particleRenderer.draw(this.particleSystem.getParticles()); // Temporarily disable

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

  #applyCurrentDimensionsAndBoundary() {
    if (!this.canvas || !this.gl || !this.dimensionManager) {
      console.warn("_applyCurrentDimensionsAndBoundary called before canvas, GL context, or DimensionManager was ready.");
      return;
    }
    this.dimensionManager.applyToCanvas(this.canvas);
    if (this.gridParams?.screen?.shape) {
      this.dimensionManager.applyCanvasStyle(this.canvas, this.gridParams.screen.shape);
    } else {
      console.warn("#applyCurrentDimensionsAndBoundary: gridParams.screen.shape not available for styling.");
      this.dimensionManager.applyCanvasStyle(this.canvas, 'rectangular');
    }
    this.dimensionManager.applyViewport(this.gl);
    console.info(`Applied canvas dimensions/settings via DimensionManager: ${this.dimensionManager.renderWidth}x${this.dimensionManager.renderHeight}`);
  }

  checkAndApplyDimensionChanges() {
    if (!this.dimensionManager || !this.gridParams?.screen || !this.gridParams?.renderSize) {
      console.warn("checkAndApplyDimensionChanges called before dependencies were ready.");
      return false;
    }
    const dimensionsChanged = this.dimensionManager.updateDimensions(
      this.gridParams.screen.width,
      this.gridParams.screen.height,
      this.gridParams.renderSize.maxRenderWidth,
      this.gridParams.renderSize.maxRenderHeight
    );
    if (dimensionsChanged) {
      console.debug("DimensionManager reported changes, applying updates...");
      this.#applyCurrentDimensionsAndBoundary();
    }
    return dimensionsChanged;
  }

  setGridParams(newGridParams) {
    this.checkAndApplyDimensionChanges();

    if (this.dimensionManager) {
      eventBus.emit('gridParamsUpdated', { gridParams: this.gridParams, dimensions: this.dimensionManager.getDimensions() });
      console.debug("Emitted gridParamsUpdated event.");
    } else {
      console.warn("setGridParams: DimensionManager not ready, cannot emit gridParamsUpdated event.");
    }
  }
}

function rgbArrayToHex(rgb = [1, 1, 1]) {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * 255)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * 255)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * 255)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

window.onload = () => Main.create().catch(console.error);

export { Main };
