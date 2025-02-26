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
    this.leftUi = new LeftUi(main, this.leftContainer);
    this.rightUi = new RightUi(main, this.rightContainer);

    // Initialize PresetManager with both GUI instances
    this.presetManager = new PresetManager(this.leftUi.gui, this.rightUi.gui);

    // Pass PresetManager to panels
    this.leftUi.setPresetManager(this.presetManager);
    this.rightUi.setPresetManager(this.presetManager);

    // Initialize stats
    this.stats = new Stats();
    this.initStats();

    // Add a force type selector
    this.addForceTypeSelector();
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
    if (this.stats) {
      this.stats.dom.remove();
      this.stats = null;
    }
  }

  addForceTypeSelector() {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "10px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "100";

    const label = document.createElement("span");
    label.textContent = "Force Type: ";
    label.style.color = "white";
    container.appendChild(label);

    const select = document.createElement("select");
    const options = ["Turbulence", "Voronoi", "Both"];

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });

    select.value = "Turbulence"; // Default to turbulence
    this.setActiveForce("Turbulence");

    select.addEventListener("change", (e) => {
      this.setActiveForce(e.target.value);
    });

    container.appendChild(select);
    document.body.appendChild(container);
  }

  setActiveForce(forceType) {
    const turbulence = this.main.turbulenceField;
    const voronoi = this.main.voronoiField;

    switch (forceType) {
      case "Turbulence":
        turbulence.strength = this.turbulenceStrength || 0.5;
        voronoi.strength = 0;
        break;
      case "Voronoi":
        this.turbulenceStrength = turbulence.strength;
        turbulence.strength = 0;
        voronoi.strength = voronoi.strength || 1.0;
        break;
      case "Both":
        turbulence.strength = this.turbulenceStrength || 0.3;
        voronoi.strength = voronoi.strength || 0.7;
        break;
    }

    // Update UI visibility if needed
    if (this.rightUi) {
      this.rightUi.turbulenceFolder.domElement.style.display =
        forceType === "Turbulence" || forceType === "Both" ? "block" : "none";

      this.rightUi.voronoiFolder.domElement.style.display =
        forceType === "Voronoi" || forceType === "Both" ? "block" : "none";
    }
  }
}
