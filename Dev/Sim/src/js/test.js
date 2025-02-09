import { SimulationManager } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing simulation");

  const canvas = document.getElementById("glCanvas");
  if (!canvas) {
    throw new Error("Canvas element not found");
  }
  console.log(`Canvas found: ${canvas.width}x${canvas.height}`);

  // Initialize simulation
  const simulation = new SimulationManager(canvas);

  // Start animation loop
  function animate() {
    simulation.update();
    requestAnimationFrame(animate);
  }

  console.log("Starting animation loop");
  animate();
});
