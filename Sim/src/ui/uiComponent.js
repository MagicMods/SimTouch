import { BaseUi } from "../panels/baseUi.js";

export class UiComponent {
  constructor(main, parent) {
    this.main = main;
    this.parent = parent;
    this.folder = null;
    this.controllers = {};
    this.presetManager = null;
  }

  setPresetManager(presetManager) {
    this.presetManager = presetManager;
  }

  createFolder(name) {
    this.folder = this.parent.addFolder(name);
    return this.folder;
  }

  getControlTargets() {
    return {};
  }

  updateControllerDisplays() {
    // Default implementation does nothing
  }
}