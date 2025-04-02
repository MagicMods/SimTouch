import { GridUi } from "./panels/gridUi.js";

export class UiManager {
    constructor(main) {
        if (!main) {
            throw new Error("Main reference is required for UiManager");
        }

        this.main = main;

        // Create GUI containers
        this.leftContainer = this.createContainer("left");
        this.rightContainer = this.createContainer("right");

        // Initialize UI components
        this.initializeUIComponents();
    }

    loadCSS() {
        // This method is no longer needed as we're using a direct link tag in the HTML
        // We're keeping it for compatibility but it won't do anything
        console.log("CSS loaded via HTML link tag");
    }

    initializeUIComponents() {
        // Initialize only the GridUI component for now
        this.gridUi = new GridUi(this.main, this.rightContainer);
    }

    createContainer(position) {
        const container = document.createElement("div");
        container.className = `gui-container-${position}`;
        document.body.appendChild(container);
        return container;
    }

    // Update method for UiManager
    update(deltaTime) {
        // // Update the GridUI component
        // if (this.gridUi) {
        //     this.gridUi.update(deltaTime);
        // }
    }

    dispose() {
        // Dispose UI components
        if (this.gridUi) {
            this.gridUi.dispose();
        }

        // Remove containers
        if (this.leftContainer) {
            document.body.removeChild(this.leftContainer);
        }

        if (this.rightContainer) {
            document.body.removeChild(this.rightContainer);
        }
    }
} 