import { NewGridUi } from "./panels/newGridUi.js";
import { eventBus } from '../util/eventManager.js';

export class UiManager {
  constructor(main) {
    if (!main) {
      throw new Error("Main reference is required for UiManager");
    }
    this.main = main;
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");
    this.newGridUi = null;
    console.info("CSS loaded via HTML link tag");
  }

  async initPanels() {
    return new Promise(resolve => {
      console.log("UiManager: Starting panel initialization...");
      this.newGridUi = new NewGridUi(this.main, this.rightContainer);
      // Subscribe to grid parameter updates
      eventBus.on('gridParamsUpdated', ({ gridParams }) => {
        if (this.newGridUi && typeof this.newGridUi.updateUIState === 'function') {
          this.newGridUi.updateUIState(gridParams);
        } else {
          console.warn("UiManager: newGridUi or updateUIState not available when gridParamsUpdated received.");
        }
      });
      console.log("UiManager: Panel initialization complete and event listener added.");
      resolve();
    });
  }

  createContainer(position) {
    const container = document.createElement("div");
    container.className = `gui-container-${position}`;
    document.body.appendChild(container);
    return container;
  }

  update(deltaTime) { }

  dispose() {
    if (this.newGridUi) {
      this.newGridUi.dispose();
    }

    if (this.leftContainer) {
      document.body.removeChild(this.leftContainer);
    }

    if (this.rightContainer) {
      document.body.removeChild(this.rightContainer);
    }
  }
}
