import { NewGridUi } from "./panels/newGridUi.js";
export class UiManager {
  constructor(main) {
    if (!main) {
      throw new Error("Main reference is required for UiManager");
    }
    this.main = main;
    this.leftContainer = this.createContainer("left");
    this.rightContainer = this.createContainer("right");
    this.initializeUIComponents();
    console.info("CSS loaded via HTML link tag");
  }

  initializeUIComponents() {
    this.newGridUi = new NewGridUi(this.main, this.rightContainer);
  }

  createContainer(position) {
    const container = document.createElement("div");
    container.className = `gui-container-${position}`;
    document.body.appendChild(container);
    return container;
  }

  update(deltaTime) {}

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
