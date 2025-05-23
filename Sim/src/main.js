import { ShaderManager } from "./shader/shaderManager.js";
// Simulation
import { ParticleSystem } from "./simulation/core/particleSystem.js";
import { TurbulenceField } from "./simulation/forces/turbulenceField.js";
import { VoronoiField } from "./simulation/forces/voronoiField.js";
// CoreGrid   
import { DimensionManager } from "./coreGrid/dimensionManager.js";
import { BoundaryManager } from "./coreGrid/boundaryManager.js";
// UI
import { UiManager } from "./ui/uiManager.js";
// Input
import { MouseForces } from "./simulation/forces/mouseForces.js";
import { ExternalInputConnector } from "./input/externalInputConnector.js";
import { EmuForces } from "./simulation/forces/emuForces.js";
import { JoystickRenderer } from "./renderer/joystickRenderer.js";
import { MicInputForces } from "./simulation/forces/micForces.js";
import { DataVisualization } from "./renderer/dataVisualization.js";
import { SoundVisualizer } from "./sound/soundVisualizer.js";
// Renderer
import { GridGenRenderer } from "./renderer/gridGenRenderer.js";
import { BoundaryRenderer } from "./renderer/boundaryRenderer.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
// Udp
import { ModulatorManager } from "./input/modulatorManager.js";
import { comManager } from "./com/comManager.js";
import { eventBus } from "./util/eventManager.js";
import { debugManager } from "./util/debugManager.js";

export class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    // Create GL context with stencil buffer and store it locally
    this.gl = this.canvas.getContext("webgl2", { stencil: true });
    if (!this.gl) throw new Error("WebGL2 not supported");

    this.vizuContainer = document.createElement('div');
    this.vizuContainer.className = 'vizu-container';
    document.body.appendChild(this.vizuContainer);

    this.shaderManager = new ShaderManager(this.gl);

    this.simParams = {
      simulation: {
        paused: false,
        timeStep: 1 / 60,
        timeScale: 1.0,
        velocityDamping: 1.0,
        maxVelocity: 1,
        picFlipRatio: 0,
        particleCount: 500,
        particleRadius: 0.01,
        restDensity: 2.0,
      },
      boundary: {
        mode: "BOUNCE",
        shape: "CIRCULAR",
        scale: 1.03,
        damping: 0.8,
        restitution: 1.0,
        repulsion: 0,
      },
      rendering: {
        gridMode: "Proximity",
        maxDensity: 2.10
      },
      smoothing: {
        rateIn: 0.1,
        rateOut: 0.05
      },
      gravity: {
        directionX: 0,
        directionY: 0
      },
      collision: {
        enabled: true,
        gridSizeCollision: 10,
        repulsion: 0.5,
        particleRestitution: 0.8,
        damping: 0.98,
      },
      turbulence: {
        strength: 4,
        scale: 3.0,
        speed: 1.0,
        rotationSpeed: 0.0,
        rotation: 0.0,
        pullFactor: 1.0,
        affectPosition: false,
        scaleField: false,
        affectScale: true,
        minScale: 0.008,
        maxScale: 0.03,
        patternStyle: "Checkerboard",
        decayRate: 1.0,
        directionBiasX: 0,
        directionBiasY: 0,
        contrast: 0.5,
        biasStrength: 0.3,
        patternFrequency: 2.0,
        noiseSeed: Math.random() * 10000,
        separation: 0,
        domainWarp: 0,
        domainWarpSpeed: 0,
        symmetryAmount: 0.0,
        phase: 0.0,
        phaseSpeed: -1,
        blurAmount: 0.8,
        _displayBiasAccelX: 0,
        _displayBiasAccelY: 0
      },
      voronoi: {
        strength: 0,
        edgeWidth: 0.3,
        attractionFactor: 1.0,
        cellCount: 10,
        cellMovementSpeed: 0.2,
        decayRate: 0.99,
        velocityBlendFactor: 0.7,
        pullMode: false
      },
      organic: {
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
        color: "FFFFFF",
        opacity: 0.1,
        showVelocityField: false,
      },
      udp: {
        enabled: false,
        debugSend: false,
        debugReceive: false
      },
      serial: {
        enabled: false,
        debugSend: false,
        debugReceive: false
      }

    };

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
        cellColor: [0.5, 0.5, 0.5], // Default gray 808080
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

    // Pass gridParams reference to ComManager
    comManager.setGridParamsRef(this.gridParams);

    this.dimensionManager = new DimensionManager(
      this.gridParams.screen.width,
      this.gridParams.screen.height,
      this.gridParams.renderSize.maxRenderWidth,
      this.gridParams.renderSize.maxRenderHeight
    );
    this.applyCurrentDimensionsAndBoundary(); // Apply dimensions early

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
      boundaryManager: this.boundaryManager,
    });

    this.modulatorManager = new ModulatorManager();

    this.particleRenderer = new ParticleRenderer(this.gl, this.shaderManager);
    this.gridGenRenderer = new GridGenRenderer(
      this.gl,
      this.shaderManager,
      this.gridParams,
      this.dimensionManager,
      this.boundaryManager,
      this.particleSystem
    );

    this.frame = 0;
    this.mouseForces = new MouseForces();
    this.mouseForces.setMainReference(this);
    this.mouseForces.setupMouseInteraction(this.canvas, this.particleSystem);
    this.micForces = new MicInputForces();

    // Attach mouseForces to particleSystem
    this.particleSystem.mouseForces = this.mouseForces;



    // Instantiate Renderers that depend on Managers
    this.boundaryRenderer = new BoundaryRenderer(
      document.body,
      this.boundaryManager,
      this.canvas
    );

    eventBus.on('gridChanged', this.handleGridUIChange.bind(this));
    eventBus.on('uiControlChanged', this.handleSimUIChange.bind(this));
    if (debugManager.get('main')) console.log("Main subscribed to uiControlChanged events for Grid UI.");
  }

  async init() {
    try {
      await this.shaderManager.init();

      this.dataVisualization = new DataVisualization(this.vizuContainer, this);
      await this.dataVisualization.init(); // Initialize DataVisualization asynchronously
      comManager.setDataVisualization(this.dataVisualization);

      // Create EmuForces instance with correct reference to gravity
      this.emuForces = new EmuForces({
        gravity: this.particleSystem.gravity
      });

      this.externalInput = new ExternalInputConnector(
        this.mouseForces,
        this.emuForces,
        this.micForces
      )
        .enable()
        .setSensitivity(0.001);



      this.joystickRenderer = new JoystickRenderer(this.vizuContainer, this.externalInput.emuForces, this);
      this.emuForces.setJoystickRenderer(this.joystickRenderer);


      this.audioAnalyzer = this.micForces.analyzer;

      this.soundVisualizer = new SoundVisualizer({
        container: this.vizuContainer,
        analyzer: this.audioAnalyzer,
        width: 400,
        height: 150,
        visualizations: ['spectrum', 'volume', 'waveform', 'bands'],
        showFps: false,
        theme: 'dark'
      });
      this.soundVisualizer.initialize();

      this.ui = new UiManager(this);
      this.setGridParams(this.gridParams);
      this.animate();

      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  handleSimUIChange({ paramPath, value }) {

    // Original logic for simParams
    const keys = paramPath.split('.');
    let current = this.simParams;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
      if (!current) { console.error(`Invalid paramPath structure: ${paramPath} at segment ${keys[i]}`); return; }
    }
    if (!current) { console.error(`Invalid paramPath structure before final assignment: ${paramPath}`); return; }
    current[keys[keys.length - 1]] = value;
    if (debugManager.get('events')) console.log(`SimParams updated via UI: ${paramPath} = ${value}`);

    eventBus.emit('simParamsUpdated', { simParams: this.simParams });
  }

  handleGridUIChange({ paramPath, value }) {
    const validGridPrefixes = ['screen', 'gridSpecs', 'shadow', 'colors', 'flags', 'renderSize'];
    const pathRoot = paramPath.split('.')[0];
    if (!validGridPrefixes.includes(pathRoot)) {
      if (debugManager.get('events')) console.log(`handleGridUIChange received non-grid path: ${paramPath}. Ignoring.`);
      return;
    }

    if (debugManager.get('main')) console.log(`Grid UI Change Received: ${paramPath} =`, value);
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
    this.particleRenderer.draw(this.particleSystem.getParticles());
    const error = this.gl.getError();
    if (error) {
      console.error("WebGL Error:", error);
    }

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

  applyCurrentDimensionsAndBoundary() {
    if (!this.canvas || !this.gl || !this.dimensionManager) {
      console.warn("_applyCurrentDimensionsAndBoundary called before canvas, GL context, or DimensionManager was ready.");
      return;
    }
    this.dimensionManager.applyToCanvas(this.canvas);
    if (this.gridParams?.screen?.shape) {
      this.dimensionManager.applyCanvasStyle(this.canvas, this.gridParams.screen.shape);
    } else {
      console.warn("applyCurrentDimensionsAndBoundary: gridParams.screen.shape not available for styling.");
      this.dimensionManager.applyCanvasStyle(this.canvas, 'rectangular');
    }
    this.dimensionManager.applyViewport(this.gl);
    if (debugManager.get('dimensions')) console.info(`Applied canvas dimensions/settings via DimensionManager: ${this.dimensionManager.renderWidth}x${this.dimensionManager.renderHeight}`);
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
    // Always apply boundary/style settings if dimensionManager is checked,
    // regardless of whether numeric dimensions changed, to catch shape changes.
    this.applyCurrentDimensionsAndBoundary();

    // Still return whether the numeric dimensions changed for potential callers.
    return dimensionsChanged;
  }

  setGridParams(newGridParams) {
    this.checkAndApplyDimensionChanges();

    if (this.dimensionManager) {
      eventBus.emit('gridParamsUpdated', { gridParams: this.gridParams, dimensions: this.dimensionManager.getDimensions() });
    } else {
      console.warn("setGridParams: DimensionManager not ready, cannot emit gridParamsUpdated event.");
    }
  }
}

function rgbArrayToHex(rgb = [1, 1, 1]) {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * 255)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * 255)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * 255)));
  return `${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

window.onload = () => Main.create().catch(console.error);