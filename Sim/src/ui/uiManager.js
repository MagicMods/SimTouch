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

    this.presetManager = new PresetManager(
      this.leftUi.gui, // Use the .gui property
      this.rightUi.gui, // Use the .gui property
      this.pulseModUi,
      this.inputModUi
    );

    this.presetManager.setVoronoiField(this.main.voronoiField);
    this.rightUi.setPresetManager(this.presetManager);
    this.presetUi.setPresetManager(this.presetManager);
    this.inputModUi.initWithPresetManager(this.presetManager);
    this.pulseModUi.initWithPresetManager(this.presetManager);

    this.initializeUiComponents();
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
    this.stats.update();
  }

  update() {
    this.inputModUi.update();
    this.modulatorManager.update();
    this.stats.update();
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
    this.modulatorManager = new ModulatorManager();
    this.modulatorManager.storeUiPanelsForAutoRegistration(
      this.leftUi,
      this.rightUi
    );
    this.inputModUi.setModulatorManager(this.modulatorManager);
    this.pulseModUi.setModulatorManager(this.modulatorManager);
    this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);
    this.inputModUi.initializeWithUiPanels(this.leftUi, this.rightUi, true);
    this.pulseModUi.initializeWithUiPanels(this.leftUi, this.rightUi, true);
  }

  initializeCrossReferences() {
    this.modulatorManager = new ModulatorManager();
    this.modulatorManager.setUiPanels(this.leftUi, this.rightUi);
    this.pulseModUi.setModulatorManager(this.modulatorManager);
    this.inputModUi.setModulatorManager(this.modulatorManager);
    this.pulseModUi.initializeWithUiPanels(this.leftUi, this.rightUi);
    this.inputModUi.initializeWithUiPanels(this.leftUi, this.rightUi);
    this.modulatorManager.registerTargetsFromUi(this.leftUi, this.rightUi);
  }
}
