import { GridRenderer } from "./renderer/gridRenderer.js";
import { FluidSim } from "./simulation/fluidSim.js";
import { UI } from "./ui/ui.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    this.gl = this.canvas.getContext("webgl2");
    if (!this.gl) throw new Error("WebGL2 not supported");

    // Ensure numeric dimensions
    const width = 29;
    const height = 14;

    this.simulation = new FluidSim(this.gl, this.canvas, width, height);
    console.log("Main constructor complete");
  }

  async create() {
    try {
      // Initialize simulation first
      await this.simulation.initialize();

      // Create UI after simulation is initialized
      this.ui = new UI(this.simulation);

      // Start animation loop only after everything is ready
      this.simulation.start();

      return this;
    } catch (error) {
      console.error("Failed to create simulation:", error);
      throw error;
    }
  }

  static async init() {
    const main = new Main();
    return main.create();
  }
}

window.onload = () => Main.init();
