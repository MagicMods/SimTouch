import { LeftUi } from "./panels/leftUi.js";
import { RightUi } from "./panels/rightUi.js";
import { PresetUi } from "./panels/presetUi.js";
import { InputUi } from "./panels/inputUi.js";
import { PresetManager } from "../util/presetManager.js";
import Stats from "../util/statsModule.js";

export class UiManager {
  constructor(main) {
    if (!main) throw new Error("Main instance required");
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");

    // Update: Position presets on left-top, inputs on right-top
    this.presetContainer = this.createContainer("left-top");
    this.inputContainer = this.createContainer("right-top");

    // Initialize UI panels
    this.leftUi = new LeftUi(main, this.leftContainer);
    this.rightUi = new RightUi(main, this.rightContainer);
    this.presetUi = new PresetUi(main, this.presetContainer);
    this.inputUi = new InputUi(main, this.inputContainer);

    // Initialize PresetManager with both GUI instances
    this.presetManager = new PresetManager(this.leftUi.gui, this.rightUi.gui);

    // Pass PresetManager to panels
    this.presetUi.setPresetManager(this.presetManager);
    this.rightUi.setPresetManager(this.presetManager);

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

  dispose() {
    this.leftUi.dispose();
    this.rightUi.dispose();
    this.presetUi.dispose();
    this.inputUi.dispose();
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }
}
