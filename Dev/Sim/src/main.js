import { GridRenderer } from "./renderer/gridRenderer.js";
import { FluidSim } from "./simulation/fluidSim.js";
import { UI } from "./ui/ui.js";

class Main {
  constructor() {
    // Get canvas and initialize WebGL
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) {
      throw new Error("Canvas not found");
    }

    const gl = this.canvas.getContext("webgl2");
    if (!gl) {
      throw new Error("WebGL2 not supported");
    }

    // Pass canvas reference to FluidSim
    this.simulation = new FluidSim(gl, this.canvas, 29, 14);
    console.log("Main constructor complete");

    // Initialize UI after simulation
    this.ui = new UI(this.simulation);

    // Start animation after initialization
    this.simulation.start();
  }

  static create() {
    return new Main();
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
