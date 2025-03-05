import { LeftUi } from "./panels/leftUi.js";
import { RightUi } from "./panels/rightUi.js";
import { PresetUi } from "./panels/presetUi.js";
import { InputUi } from "./panels/inputUi.js";
import { NetworkUi } from "./panels/networkUi.js";
import { PulseModulationUi } from "./panels/pulseModulationUi.js";
import { PresetManager } from "../util/presetManager.js";
import Stats from "../util/statsModule.js";

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
    this.pulseModUi = new PulseModulationUi(main, this.pulseModContainer);
    this.presetUi = new PresetUi(main, this.presetContainer);
    this.networkUi = new NetworkUi(main, this.networkContainer);
    this.inputUi = new InputUi(main, this.inputContainer);

    // Initialize PresetManager with all UI panels
    this.presetManager = new PresetManager(
      this.leftUi.gui,
      this.rightUi.gui,
      this.pulseModUi,
      this.inputUi
    );

    // Make sure InputUi has access to PresetManager
    this.inputUi.main.presetManager = this.presetManager;

    // Pass PresetManager to panels
    this.presetUi.setPresetManager(this.presetManager);
    this.rightUi.setPresetManager(this.presetManager);
    this.pulseModUi.initWithPresetManager(this.presetManager);
    this.inputUi.initWithPresetManager(this.presetManager); // Initialize mic presets UI

    // Initialize the pulse modulation UI with references to other panels
    this.pulseModUi.initializeWithUiPanels(this.leftUi, this.rightUi);

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
    this.modulatorManager = new ModulatorManager();

    console.log("UiManager: Initializing UI components");

    // First initialize all UI panels without targets
    // (existing panel initialization code)

    console.log("UiManager: Setting shared ModulatorManager");

    // Share the ModulatorManager with UI components that need it
    if (this.inputUi) {
      this.inputUi.setModulatorManager(this.modulatorManager);
    }

    if (this.pulseModulationUi) {
      this.pulseModulationUi.setModulatorManager(this.modulatorManager);
    }

    console.log("UiManager: Registering targets");

    // Register targets from UI panels
    this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);

    console.log("UiManager: Initializing cross-references");

    // Now initialize UI components with panel references
    if (this.inputUi) {
      this.inputUi.initializeWithUiPanels(this.leftUi, this.rightUi);
    }

    if (this.pulseModulationUi) {
      this.pulseModulationUi.initializeWithUiPanels(this.leftUi, this.rightUi);
    }

    console.log("UiManager: All UI components initialized");
  }
}
