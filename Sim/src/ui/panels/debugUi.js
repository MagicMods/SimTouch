import { BaseUi } from "../baseUi.js";

export class DebugUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    this.controls = {};
    this.gui.title("Debug");
    this.initDebugControls();
    this.setupFolderObserver();
  }

  initDebugControls() {


  }

  setupFolderObserver() {

  }

  updateDebugVisibility(enabled) {

  }

  updateDebugControllers() {

  }
}
