import { GridRenderer } from "./renderer/gridRenderer.js";
import { FluidSim } from "./simulation/fluidSim.js";
import { UI } from "./ui/ui.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    const gl = this.canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");

    this.simulation = new FluidSim(gl, this.canvas, 29, 14);
    console.log("Main constructor complete");
  }

  async init() {
    try {
      await this.simulation.initialize();
      this.ui = new UI(this.simulation);
      this.simulation.start();
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  static async create() {
    const main = new Main();
    await main.init();
    return main;
  }
}

window.onload = () => Main.create().catch(console.error);
