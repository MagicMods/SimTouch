import { BaseRenderer } from "../renderer/baseRenderer.js";
import { GridRenderer } from "../renderer/gridRenderer.js";
import { FluidSolver } from "./fluidSolver.js";

class FluidSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.initializeRendering();
    this.setupSimulation();
  }

  async initializeRendering() {
    this.baseRenderer = new BaseRenderer(this.canvas);
    await this.baseRenderer.initShaders();
    this.gridRenderer = new GridRenderer(this.baseRenderer);
  }

  setupSimulation() {
    // TODO: Move simulation parameters to config
    const gridSize = { x: 40, y: 40 };
    const cellSize = 20;

    this.solver = new FluidSolver(gridSize, cellSize);
    console.log("Starting render loop");
  }

  update() {
    // Physics update
    this.solver.update();

    // Render update
    this.baseRenderer.beginRender();
    this.gridRenderer.drawGrid(this.solver.grid);
    this.baseRenderer.endRender();
  }

  dispose() {
    this.baseRenderer.dispose();
    this.solver.dispose();
  }
}

export { FluidSim };
