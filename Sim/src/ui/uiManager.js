import { LeftUi } from "./panels/leftUi.js";
import { RightUi } from "./panels/rightUi.js";
import { PresetUi } from "./panels/presetUi.js";
import { InputModulationUi } from "./panels/inputModulationUi.js";
import { NetworkUi } from "./panels/networkUi.js";
import { PulseModulationUi } from "./panels/pulseModulationUi.js";
import { PresetManager } from "../presets/presetManager.js";
import Stats from "../util/statsModule.js";
import { ModulatorManager } from "../input/modulatorManager.js"; // Add this import

export class UiManager {
  constructor(main) {
    if (!main) throw new Error("Main instance required");
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");
    this.pulseModContainer = this.createContainer("left-top");
    this.presetContainer = this.createContainer("left-second");
    this.networkContainer = this.createContainer("center-top");
    this.inputContainer = this.createContainer("right-top");

    // Initialize UI components
    this.leftUi = new LeftUi(main, this.leftContainer);
    this.rightUi = new RightUi(main, this.rightContainer);
    this.pulseModUi = new PulseModulationUi(main, this.pulseModContainer);
    this.networkUi = new NetworkUi(main, this.networkContainer);
    this.inputModUi = new InputModulationUi(main, this.inputContainer);

    // Debug log the preset container
    console.log(
      "Creating PresetUi component with container:",
      this.presetContainer
    );
    this.presetUi = new PresetUi(main, this.presetContainer);

    // Initialize PresetManager with the GUI objects, not UI components
    console.log("Creating PresetManager with GUI references");
    this.presetManager = new PresetManager(
      this.leftUi.gui, // Use the .gui property
      this.rightUi.gui, // Use the .gui property
      this.pulseModUi,
      this.inputModUi
    );

    // Set up voronoiField reference
    if (this.main?.voronoiField) {
      console.log(
        "UiManager: Setting up voronoiField reference in PresetManager"
      );
      this.presetManager.setVoronoiField(this.main.voronoiField);
    }

    // Make references available to UI components
    console.log("Setting PresetManager in UI components");
    this.rightUi.setPresetManager(this.presetManager);
    this.presetUi.setPresetManager(this.presetManager);

    if (typeof this.inputModUi.initWithPresetManager === "function") {
      this.inputModUi.initWithPresetManager(this.presetManager);
    }

    if (typeof this.pulseModUi.initWithPresetManager === "function") {
      this.pulseModUi.initWithPresetManager(this.presetManager);
    }

    // Initialize UI components with shared ModulatorManager and targets
    this.initializeUiComponents();

    // Initialize stats
    this.stats = new Stats();
    this.initStats();
  }

  createContainer(position) {
    const container = document.createElement("div");
    container.className = `gui-container-${position}`;
    document.body.appendChild(container);
    return container;
  }

  initStats() {
    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";
    statsContainer.appendChild(this.stats.dom);
    document.body.appendChild(statsContainer);
  }

  updateStats() {
    if (this.stats) this.stats.update();
  }

  update() {
    // First update input values from audio analyzer
    if (this.inputModUi) {
      this.inputModUi.update();
    }

    // Then update all modulators (both pulse and input)
    if (this.modulatorManager) {
      this.modulatorManager.update();
    }

    // Update stats display
    if (this.stats) this.stats.update();
  }

  dispose() {
    this.leftUi.dispose();
    this.rightUi.dispose();
    this.presetUi.dispose();
    this.inputModUi.dispose();
    this.networkUi.dispose();
    this.pulseModUi.dispose();
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }

  initializeUiComponents() {
    // Create a shared ModulatorManager
    console.log("UiManager: Creating shared ModulatorManager");
    this.modulatorManager = new ModulatorManager();

    // Store UI panels for auto-registration
    this.modulatorManager.storeUiPanelsForAutoRegistration(
      this.leftUi,
      this.rightUi
    );

    console.log("UiManager: Setting shared ModulatorManager in UI components");

    // Set shared manager in UI components
    if (this.inputModUi) {
      this.inputModUi.setModulatorManager(this.modulatorManager);
    }

    // FIXED: Use pulseModUi, not pulseModulationUi
    if (this.pulseModUi) {
      this.pulseModUi.setModulatorManager(this.modulatorManager);
    }

    console.log("UiManager: Registering targets from UI panels");

    // Register targets
    this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);

    console.log("UiManager: Initializing UI component cross-references");

    // Initialize UI components with panels and targets
    if (this.inputModUi) {
      this.inputModUi.initializeWithUiPanels(this.leftUi, this.rightUi, true);
    }

    // FIXED: Use pulseModUi, not pulseModulationUi
    if (this.pulseModUi) {
      this.pulseModUi.initializeWithUiPanels(this.leftUi, this.rightUi, true);
    }

    console.log("UiManager: All UI components initialized");
  }

  initializeCrossReferences() {
    console.log("UiManager: Initializing UI component cross-references");

    // Initialize InputUi with panels (this likely exists already)
    this.inputModUi.initializeWithUiPanels(this.leftUi, this.rightUi);

    // ADD THIS LINE to initialize PulseModulationUi with panels
    this.pulseModulationUi.initializeWithUiPanels(this.leftUi, this.rightUi);

    // Other initialization code...
  }
}
