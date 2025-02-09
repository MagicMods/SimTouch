import { BaseRenderer } from "../renderer/baseRenderer.js";
import { ReactiveGrid } from "./reactiveGrid.js";

class Main {
  static async create() {
    const main = new Main();
    await main.initialize();
    return main;
  }

  constructor() {
    let canvas = document.getElementById("glCanvas"); // Match ID from test.html
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "glCanvas"; // Match ID from sim.html
      canvas.width = 1000; // Match dimensions from sim.html
      canvas.height = 1000;
      document.body.appendChild(canvas);
    }
    this.canvas = canvas;
    this.renderer = new BaseRenderer(this.canvas);
    console.log(
      "Main constructor complete - Canvas:",
      canvas.width,
      "x",
      canvas.height
    );
  }

  async initialize() {
    try {
      // Initialize shaders through renderer
      const programInfo = await this.renderer.initShaders();
      console.log("Got program info:", programInfo);

      this.reactiveGrid = new ReactiveGrid(this.renderer);
      this.reactiveGrid.setProgramInfo(programInfo);
      console.log("Grid initialized");

      this.startRenderLoop();
      console.log("Initialization complete");
    } catch (error) {
      console.error("Initialization failed:", error);
      throw error;
    }
  }

  startRenderLoop() {
    const update = () => {
      if (this.reactiveGrid) {
        this.reactiveGrid.draw();
      }
      requestAnimationFrame(update);
    };
    update();
  }
}

window.onload = async () => {
  try {
    await Main.create();
  } catch (error) {
    console.error("Failed to create simulation:", error);
  }
};

export { Main };
