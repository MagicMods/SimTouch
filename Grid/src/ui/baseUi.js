import GUI from "lil-gui";

export class BaseUi {
    constructor(main, container) {
        if (!main) {
            throw new Error("Main reference is required for BaseUi");
        }

        if (!container) {
            throw new Error("Container element is required for BaseUi");
        }

        this.main = main;
        this.gui = new GUI({ container });
        this.controls = {};
    }

    dispose() {
        this.gui.destroy();
    }

    createFolder(name, exclude = false) {
        if (!name) {
            throw new Error("Folder name is required");
        }

        const folder = this.gui.addFolder(name);
        if (exclude) folder.exclude = true;
        return folder;
    }
} 