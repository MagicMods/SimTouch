import { LeftUi } from "./panels/leftUi.js";
import { RightUi } from "./panels/rightUi.js";
import { PresetUi } from "./panels/presetUi.js";
import { PresetManager } from "../util/presetManager.js";
import Stats from "../util/statsModule.js";

export class UiManager {
  constructor(main) {
    if (!main) throw new Error("Main instance required");
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");
    this.presetContainer = this.createContainer("middle"); // Use the middle for preset controls

    // Initialize UI panels first
    this.leftUi = new LeftUi(main, this.leftContainer);
    this.rightUi = new RightUi(main, this.rightContainer);
    this.presetUi = new PresetUi(main, this.presetContainer);

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
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }
}
