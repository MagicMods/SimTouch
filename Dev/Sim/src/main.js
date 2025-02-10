import { GridRenderer } from "./renderer/gridRenderer.js";
import { FluidSim } from "./simulation/fluidSim.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) {
      throw new Error("Canvas not found");
    }

    // Initialize renderer and simulation
    this.renderer = new GridRenderer(this.canvas);
    this.simulation = new FluidSim(this.canvas);

    console.log("Main constructor complete");
  }

  async initialize() {
    try {
      // Initialize shaders and get program info
      const programInfo = await this.renderer.initShaders();
      console.log("Shader initialization complete:", programInfo);

      // Store programInfo for simulation
      this.simulation.programInfo = programInfo;

      // Start simulation
      this.simulation.start();

      console.log("Simulation initialized and started");
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
