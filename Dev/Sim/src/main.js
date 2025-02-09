import { BaseRenderer } from "./renderer/baseRenderer.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) {
      throw new Error("Canvas not found");
    }

    this.renderer = new BaseRenderer(this.canvas);
    console.log("Main constructor complete");
  }

  async initialize() {
    try {
      // Initialize shaders
      const programInfo = await this.renderer.initShaders();
      console.log("Shader initialization complete:", programInfo);

      // Debug log the actual structure
      console.log("Attributes:", programInfo.attributes);
      console.log("Uniforms:", programInfo.uniforms);

      // Check if attributes and uniforms exist (not undefined)
      if (
        programInfo.attributes.position === undefined ||
        programInfo.uniforms.color === undefined
      ) {
        throw new Error("Required shader variables not found");
      }

      // Draw test triangle with different colors
      const vertices = new Float32Array([
        0.0,
        0.5, // top
        -0.5,
        -0.5, // bottom left
        0.5,
        -0.5, // bottom right
      ]);

      // Red triangle
      this.renderer.drawShape(vertices, [1.0, 0.0, 0.0, 1.0], programInfo);

      console.log("Test rendering complete");
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
