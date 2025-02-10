import { GridRenderer } from "./renderer/gridRenderer.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) {
      throw new Error("Canvas not found");
    }

    this.renderer = new GridRenderer(this.canvas);
    console.log("Main constructor complete");
  }

  async initialize() {
    try {
      const programInfo = await this.renderer.initShaders();
      console.log("Shader initialization complete:", programInfo);

      // Verify shader variables
      if (
        programInfo.attributes.position === undefined ||
        programInfo.uniforms.color === undefined
      ) {
        throw new Error("Required shader variables not found");
      }

      // Draw grid
      this.renderer.draw(programInfo);
      console.log("Grid rendering complete");
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  }

  static async create() {
    const main = new Main();
    await main.initialize();
    return main;
  }
}

// Entry point
window.onload = async () => {
  try {
    await Main.create();
  } catch (error) {
    console.error("Failed to create simulation:", error);
  }
};

export { Main };
