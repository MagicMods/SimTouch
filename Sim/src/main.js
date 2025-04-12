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
import { DimensionManager } from "./coreGrid/dimensionManager.js";
import { BoundaryManager } from "./coreGrid/boundaryManager.js";
import { GridGenRenderer } from "./renderer/gridGenRenderer.js";
import { BoundaryRenderer } from "./renderer/boundaryRenderer.js";

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


    // Initialize parameters (needed for managers)
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

    this.simParams = {
      simulation: {
        paused: true, // Initial state matching existing logic
        timeStep: this.particleSystem.timeStep, // From ParticleSystem
        timeScale: this.particleSystem.timeScale, // From ParticleSystem
        velocityDamping: this.particleSystem.velocityDamping, // From ParticleSystem
        maxVelocity: this.particleSystem.maxVelocity, // From ParticleSystem
        picFlipRatio: this.particleSystem.picFlipRatio, // From ParticleSystem
        particleCount: this.particleSystem.numParticles, // Add particle count
        particleRadius: this.particleSystem.particleRadius // Add particle radius
      },
      boundary: {
        mode: this.boundary.mode,
        shape: boundaryType,
      },
      rendering: {
        // Initial values from GridRenderer and its components
        gridMode: this.gridRenderer.renderModes?.currentMode || "PROXIMITY", // Default to DENSITY if not found
        maxDensity: this.gridRenderer.maxDensity || 5.0 // Default from GridRenderer or a sensible value
      },
      smoothing: {
        // Initial values from GridRenderer's smoothing object
        rateIn: this.gridRenderer.renderModes?.smoothing?.rateIn || 0.1, // Default if not found
        rateOut: this.gridRenderer.renderModes?.smoothing?.rateOut || 0.05 // Default if not found
      },
      gravity: {
        directionX: this.particleSystem.gravity.directionX,
        directionY: this.particleSystem.gravity.directionY
      },
      collision: {
        enabled: this.particleSystem.collisionSystem.enabled,
        gridSize: this.particleSystem.collisionSystem.gridSize,
        repulsion: this.particleSystem.collisionSystem.repulsion,
        particleRestitution: this.particleSystem.collisionSystem.particleRestitution,
      },
      turbulence: {
        strength: this.turbulenceField.strength,
        scale: this.turbulenceField.scale,
        speed: this.turbulenceField.speed,
        rotationSpeed: this.turbulenceField.rotationSpeed,
        rotation: this.turbulenceField.rotation,
        pullFactor: this.turbulenceField.pullFactor,
        affectPosition: this.turbulenceField.affectPosition,
        scaleField: this.turbulenceField.scaleField,
        affectScale: this.turbulenceField.affectScale,
        minScale: this.turbulenceField.minScale,
        maxScale: this.turbulenceField.maxScale,
        patternStyle: this.turbulenceField.patternStyle,
        decayRate: this.turbulenceField.decayRate,
        directionBiasX: this.turbulenceField.directionBias[0],
        directionBiasY: this.turbulenceField.directionBias[1],
        contrast: this.turbulenceField.contrast,
        biasStrength: this.turbulenceField.biasStrength,
        patternFrequency: this.turbulenceField.patternFrequency,
        noiseSeed: this.turbulenceField.noiseSeed,
        separation: this.turbulenceField.separation,
        domainWarp: this.turbulenceField.domainWarp,
        domainWarpSpeed: this.turbulenceField.domainWarpSpeed,
        symmetryAmount: this.turbulenceField.symmetryAmount,
        phase: this.turbulenceField.phase,
        phaseSpeed: this.turbulenceField.phaseSpeed,
        blurAmount: this.turbulenceField.blurAmount,
        _displayBiasAccelX: this.turbulenceField._displayBiasAccelX || 0,
        _displayBiasAccelY: this.turbulenceField._displayBiasAccelY || 0
      },
      voronoi: {
        strength: this.voronoiField.strength,
        edgeWidth: this.voronoiField.edgeWidth,
        attractionFactor: this.voronoiField.attractionFactor,
        cellCount: this.voronoiField.cellCount,
        cellMovementSpeed: this.voronoiField.cellMovementSpeed,
        decayRate: this.voronoiField.decayRate,
        velocityBlendFactor: this.voronoiField.velocityBlendFactor,
        pullMode: this.voronoiField.pullMode
      },
      organic: { // New section for OrganicBehavior
        behavior: this.particleSystem.organicBehavior.currentBehavior,
        // Global controls (might need adjustment based on UI)
        // Assuming global force applies to forceScales.base, radius to params[type].radius
        globalForce: this.particleSystem.organicBehavior.forceScales?.Fluid?.base || 0.1, // Use one as example
        globalRadius: this.particleSystem.organicBehavior.params?.Fluid?.radius || 30, // Use one as example
        // Nested parameters for each behavior type
        Fluid: { // Get initial values from organicBehavior.params.Fluid
          surfaceTension: this.particleSystem.organicBehavior.params?.Fluid?.surfaceTension ?? 0.5,
          viscosity: this.particleSystem.organicBehavior.params?.Fluid?.viscosity ?? 0.2,
          damping: this.particleSystem.organicBehavior.params?.Fluid?.damping ?? 0.98
        },
        Swarm: { // Get initial values from organicBehavior.params.Swarm
          cohesion: this.particleSystem.organicBehavior.params?.Swarm?.cohesion ?? 1.0,
          alignment: this.particleSystem.organicBehavior.params?.Swarm?.alignment ?? 0.7,
          separation: this.particleSystem.organicBehavior.params?.Swarm?.separation ?? 1.2,
          maxSpeed: this.particleSystem.organicBehavior.params?.Swarm?.maxSpeed ?? 0.5
        },
        Automata: { // Get initial values from organicBehavior.params.Automata
          repulsion: this.particleSystem.organicBehavior.params?.Automata?.repulsion ?? 0.8,
          attraction: this.particleSystem.organicBehavior.params?.Automata?.attraction ?? 0.5,
          threshold: this.particleSystem.organicBehavior.params?.Automata?.threshold ?? 0.2
        },
        Chain: { // Get initial values from organicBehavior.params.Chain
          linkDistance: this.particleSystem.organicBehavior.params?.Chain?.linkDistance ?? 0,
          linkStrength: this.particleSystem.organicBehavior.params?.Chain?.linkStrength ?? 10,
          alignment: this.particleSystem.organicBehavior.params?.Chain?.alignment ?? 0.5,
          branchProb: this.particleSystem.organicBehavior.params?.Chain?.branchProb ?? 2,
          maxLinks: this.particleSystem.organicBehavior.params?.Chain?.maxLinks ?? 10
        },
      },
      particleRenderer: { // Move particleRenderer section to the top level
        // Store base color as hex for UI, renderer will convert
        color: rgbArrayToHex(this.particleRenderer.config?.color?.slice(0, 3) || [1, 1, 1]),
        opacity: this.particleRenderer.particleOpacity // Store opacity separately
      },
      network: { // New section
        enabled: socketManager.enable, // Initial state from manager
        debugSend: socketManager.debugSend, // Initial state
        debugReceive: socketManager.debugReceive // Initial state
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

    this.dimensionManager = new DimensionManager(
      this.gridParams.screen.width,
      this.gridParams.screen.height,
      this.gridParams.renderSize.maxRenderWidth,
      this.gridParams.renderSize.maxRenderHeight
    );
    this.#applyCurrentDimensionsAndBoundary();
    const initialDimensions = this.dimensionManager.getDimensions();
    this.boundaryManager = new BoundaryManager(
      this.gridParams,
      initialDimensions
    );
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
      this.boundaryManager
    );
    console.log("Instantiated new Grid components (DimensionManager, BoundaryManager, BoundaryRenderer, GridGenRenderer)");

    // --- BEGIN PLAN STEP 5 Action 4: Subscribe Grid UI Handler ---
    // Subscribe main to Grid UI changes (assuming NewGridUi emits 'uiControlChanged')
    eventBus.on('uiControlChanged', this.handleGridUIChange.bind(this));
    console.log("Main subscribed to uiControlChanged events for Grid UI.");
    // --- BEGIN STEP 1: Reinstate Sim Handler Subscription ---
    eventBus.on('uiControlChanged', this.handleSimUIChange.bind(this));
    console.log("Main re-subscribed handleSimUIChange to uiControlChanged events.");
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
      eventBus.on('uiControlChanged', this.handleGridUIChange.bind(this));
      console.log("Main subscribed to uiControlChanged events for Grid UI.");

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
    console.log(`SimParams updated via UI: ${paramPath} = ${value}`, JSON.stringify(this.simParams));

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
    this.gridRenderer.draw(this.particleSystem);
    this.particleRenderer.draw(this.particleSystem.getParticles());

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
