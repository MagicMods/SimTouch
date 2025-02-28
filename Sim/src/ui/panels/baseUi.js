import GUI from "lil-gui";

export class BaseUi {
  constructor(main, container) {
    this.main = main;
    this.gui = new GUI({ container });
    this.controls = {};
  }

  dispose() {
    if (this.gui) this.gui.destroy();
  }

  createFolder(name, exclude = false) {
    const folder = this.gui.addFolder(name);
    if (exclude) folder.exclude = true;
    return folder;
  }
}
