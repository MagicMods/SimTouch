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

    // Initialize PresetManager with UI panels directly
    this.presetManager = new PresetManager(
      this.leftUi.gui,
      this.rightUi.gui,
      this.pulseModUi // Pass pulseModUi directly
    );

    // Pass PresetManager to panels
    this.presetUi.setPresetManager(this.presetManager);
    this.rightUi.setPresetManager(this.presetManager);

    // Initialize the pulse modulation UI with references to other panels
    this.pulseModUi.initializeWithUiPanels(this.leftUi, this.rightUi);

    // Pass PresetManager to PulseModulationUi
    this.pulseModUi.initWithPresetManager(this.presetManager);

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
}
