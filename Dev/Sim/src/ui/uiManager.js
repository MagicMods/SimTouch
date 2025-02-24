import { LeftUi } from "./panels/leftUi.js";
import { RightUi } from "./panels/rightUi.js";
import { PresetManager } from "../util/presetManager.js";
import Stats from "../util/statsModule.js";

export class UiManager {
  constructor(main) {
    if (!main) throw new Error("Main instance required");
    this.main = main;

    // Create GUI containers
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");

    // Initialize UI panels first
    this.leftUI = new LeftUi(main, this.leftContainer);
    this.rightUI = new RightUi(main, this.rightContainer);

    // Initialize PresetManager with GUI instances
    this.presetManager = new PresetManager(this.leftUI.gui, this.rightUI.gui);

    // Pass presetManager to leftUI after initialization
    this.leftUI.setPresetManager(this.presetManager);

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
    this.leftUI.dispose();
    this.rightUI.dispose();
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }
}
