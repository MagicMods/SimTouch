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
    try {
      // Create UI panels
      this.leftUi = new LeftUi(this.main, this.leftContainer);
      this.rightUi = new RightUi(this.main, this.rightContainer);
      this.presetUi = new PresetUi(this.main, this.presetContainer);
      this.networkUi = new NetworkUi(this.main, this.networkContainer);

      // Create pulse modulation UI - this should be created after leftUi and rightUi
      this.pulseModUi = new PulseModulationUi(
        this.main,
        this.pulseModContainer
      );
      this.pulseModUi.initializeWithUiPanels(this.leftUi, this.rightUi);

      // Create input UI after leftUi and rightUi
      this.inputUi = new InputUi(this.main, this.inputContainer);

      // Register with PresetManager if available
      if (this.presetManager) {
        this.leftUi.setPresetManager(this.presetManager);
        this.rightUi.setPresetManager(this.presetManager);
        this.pulseModUi.initWithPresetManager(this.presetManager);
        // this.inputUi.initWithPresetManager(this.presetManager);
      }

      // Set up cross-panel connections
      if (this.pulseModulationUi && this.leftUi && this.rightUi) {
        this.pulseModulationUi.initializeWithUiPanels(
          this.leftUi,
          this.rightUi
        );
      } else {
        console.warn("Some UI panels not initialized, skipping connections");
      }

      // Initialize preset managers if they exist
      if (this.presetManager) {
        if (this.rightUi) this.rightUi.setPresetManager(this.presetManager);
        if (this.inputUi && this.inputUi.initWithPresetManager)
          this.inputUi.initWithPresetManager(this.presetManager);
        if (this.pulseModulationUi && this.pulseModulationUi.initPresetControls)
          this.pulseModulationUi.initPresetControls(this.presetManager);
      }

      // Initialize cross-panel interactions after all UI components are created
      if (this.inputUi) {
        this.inputUi.initializeWithUiPanels(this.leftUi, this.rightUi);
      }

      // PulseModulationUi should be initialized after InputUi
      if (this.pulseModulationUi) {
        this.pulseModulationUi.initializeWithUiPanels(
          this.leftUi,
          this.rightUi
        );
      }
    } catch (e) {
      console.error("Error initializing UI components:", e);
      // Continue execution even if UI component initialization fails
    }
  }
}
