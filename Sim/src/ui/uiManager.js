import { LeftUi } from "./panels/leftUi.js";
import { RightUi } from "./panels/rightUi.js";
import { PresetUi } from "./panels/presetUi.js";
import { InputUi } from "./panels/inputUi.js";
import { NetworkUi } from "./panels/networkUi.js";
import { PulseModulationUi } from "./panels/pulseModulationUi.js";
import { PresetManager } from "../util/presetManager.js";
import Stats from "../util/statsModule.js";
import { ModulatorManager } from "../input/modulatorManager.js"; // Add this import

export class UiManager {
  constructor(main) {
    if (!main) throw new Error("Main instance required");
    this.main = main;

    // Create GUI containers with the new order
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");
    this.pulseModContainer = this.createContainer("left-top");
    this.presetContainer = this.createContainer("left-second");
    this.networkContainer = this.createContainer("center-top");
    this.inputContainer = this.createContainer("right-top");

    // Initialize UI panels
    this.leftUi = new LeftUi(main, this.leftContainer);
    this.rightUi = new RightUi(main, this.rightContainer);
    this.pulseModulationUi = new PulseModulationUi(
      main,
      this.pulseModContainer
    );
    this.presetUi = new PresetUi(main, this.presetContainer);
    this.networkUi = new NetworkUi(main, this.networkContainer);
    this.inputUi = new InputUi(main, this.inputContainer);

    // Initialize PresetManager with all UI panels
    this.presetManager = new PresetManager(
      this.leftUi.gui,
      this.rightUi.gui,
      this.pulseModulationUi,
      this.inputUi
    );

    // Make sure InputUi has access to PresetManager
    this.inputUi.main.presetManager = this.presetManager;

    // Pass PresetManager to panels
    this.presetUi.setPresetManager(this.presetManager);
    this.rightUi.setPresetManager(this.presetManager);
    this.pulseModulationUi.initWithPresetManager(this.presetManager);
    this.inputUi.initWithPresetManager(this.presetManager); // Initialize mic presets UI

    // THIS IS THE KEY CHANGE: Initialize UI components with shared ModulatorManager and targets
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
    if (this.pulseModUi) {
      this.pulseModUi.update();
    }
    this.updateStats();
  }

  dispose() {
    this.leftUi.dispose();
    this.rightUi.dispose();
    this.presetUi.dispose();
    this.inputUi.dispose();
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
    if (this.inputUi) {
      this.inputUi.setModulatorManager(this.modulatorManager);
    }

    if (this.pulseModulationUi) {
      this.pulseModulationUi.setModulatorManager(this.modulatorManager);
    }

    console.log("UiManager: Registering targets from UI panels");

    // Register targets
    this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);

    console.log("UiManager: Initializing UI component cross-references");

    // Initialize UI components with panels and targets
    if (this.inputUi) {
      this.inputUi.initializeWithUiPanels(this.leftUi, this.rightUi, true);
    }

    if (this.pulseModulationUi) {
      this.pulseModulationUi.initializeWithUiPanels(
        this.leftUi,
        this.rightUi,
        true
      );
    }

    console.log("UiManager: All UI components initialized");
  }
}
