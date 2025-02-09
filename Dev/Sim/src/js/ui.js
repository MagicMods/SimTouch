import { FluidSimulation } from "./fluidSimulation.js";
import GUI from "lil-gui";

// Initialize state
let isPaused = false;
let isDragging = false;
let sim = null;
let gui = null;
let frameCount = 0;
let lastFpsUpdate = performance.now();
const fpsUpdateInterval = 500; // Update every 500ms
const fpsHistory = new Array(10).fill(60); // Store last 10 FPS values

// Stats tracking
const stats = {
  fps: 0,
  particles: 0,
  lastTime: performance.now(),
};

function updateStats() {
  const now = performance.now();
  frameCount++;

  // Update FPS every 500ms
  if (now - lastFpsUpdate >= fpsUpdateInterval) {
    const deltaTime = (now - lastFpsUpdate) / 1000;
    const currentFps = Math.round(frameCount / deltaTime);

    // Update moving average
    fpsHistory.shift();
    fpsHistory.push(currentFps);
    const averageFps = Math.round(
      fpsHistory.reduce((a, b) => a + b) / fpsHistory.length
    );

    // Update stats display
    stats.fps = averageFps;
    stats.particles = sim?.grid?.particleSystem?.particleCount || 0;

    // Reset counters
    frameCount = 0;
    lastFpsUpdate = now;
  }

  requestAnimationFrame(updateStats);
}

function animate() {
  if (!isPaused && sim) {
    sim.update();
    requestAnimationFrame(animate);
  }
}

function updateSliderBackground(controller) {
  const percent =
    ((controller.getValue() - controller.min) /
      (controller.max - controller.min)) *
    100;
  controller.domElement
    .querySelector(".slider")
    .style.setProperty("--slider-percent", `${percent}%`);
}

function initGUI(simulation) {
  const gui = new GUI();
  window.gui = gui;

  // Add update callback to all sliders
  const addSliderUpdate = (controller) => {
    if (controller.type === "number" && controller.min !== undefined) {
      updateSliderBackground(controller);
      controller.onChange(() => updateSliderBackground(controller));
    }
  };

  // Stats folder
  const statsFolder = gui.addFolder("Stats");
  statsFolder.add(stats, "fps").listen().name("FPS").domElement.style.opacity =
    "1";
  statsFolder
    .add(stats, "particles")
    .listen()
    .name("Particles").domElement.style.opacity = "1";
  updateStats();

  // Simulation Controls
  const simFolder = gui.addFolder("Simulation");

  // Gravity controls grouped together
  simFolder.add(simulation.grid.fluidSolver, "gravity", 0, 100).name("Gravity");
  simFolder
    .add(
      {
        flipGravity: () => {
          simulation.grid.fluidSolver.gravity *= -1;
          Object.values(gui.folders).forEach((folder) =>
            folder.controllers.forEach((c) => c.updateDisplay())
          );
        },
      },
      "flipGravity"
    )
    .name("Flip Gravity");

  // Rest of simulation controls
  simFolder
    .add(simulation.grid.fluidSolver, "flipRatio", 0, 1)
    .name("FLIP Ratio");
  simFolder
    .add(simulation.grid.fluidSolver, "velocityDamping", 0.5, 1)
    .name("Velocity Damping");
  simFolder
    .add(simulation.grid.fluidSolver, "numPressureIters", 1, 100, 1)
    .name("Pressure Iterations");
  simFolder
    .add(simulation.grid.fluidSolver, "overRelaxation", 1, 2)
    .name("Relaxation");

  // Particle Controls
  const particleFolder = gui.addFolder("Particles");
  particleFolder
    .add(simulation.grid.particleSystem, "particleCount", 100, 1000, 1)
    .name("Count")
    .onChange(() => simulation.grid.particleSystem.setupParticles());
  particleFolder
    .add(simulation.grid.particleSystem, "particleRadius", 1, 10)
    .name("Size");
  particleFolder
    .add(simulation.grid.particleSystem, "collisionDamping", 0, 1)
    .name("Collision Damping");
  particleFolder
    .add(simulation.grid.particleSystem, "repulsionStrength", 0, 5000)
    .name("Repulsion");

  // Add particle color opacity control
  const particleColor = simulation.grid.particleSystem.particleColor;
  // particleColor[3] = 0;
  particleFolder.add(particleColor, "3", 0, 1).name("Opacity").step(0.1);

  // Actions (remove flipGravity from here)
  const actions = {
    reset: () => simulation.reset(),
    pause: () => {
      isPaused = !isPaused;
      if (!isPaused) animate();
      pauseController.name(isPaused ? "Resume" : "Pause");
    },
  };

  const actionsFolder = gui.addFolder("Actions");
  actionsFolder.add(actions, "reset").name("Reset");
  const pauseController = actionsFolder.add(actions, "pause").name("Pause");

  // Add obstacle size control
  actionsFolder
    .add(simulation.grid.particleSystem, "circleRadius", 60, 200, 1)
    .name("Obstacle Size");

  // Presets folder with improved handling
  const presetFolder = gui.addFolder("Presets");

  simulation.presetManager.loadPresets().then(() => {
    const presetNames = simulation.presetManager.getPresetNames();
    console.log("Available presets:", presetNames);

    if (presetNames.length > 0) {
      // Create preset control object with default preset
      const presetControl = {
        current: simulation.presetManager.defaultPreset,
      };

      // Add preset controls in correct order
      presetFolder
        .add(
          {
            export: () => {
              const state = simulation.presetManager.exportCurrentState();
              console.log("Current configuration:");
              console.log(JSON.stringify(state, null, 2));
            },
          },
          "export"
        )
        .name("Export to Console");

      // Add preset selection after export
      presetFolder
        .add(presetControl, "current", presetNames)
        .name("Load Preset")
        .onChange((value) => {
          console.log("Loading preset:", value);
          if (simulation.presetManager.applyPreset(value)) {
            // Update GUI
            for (const folder of Object.values(gui.folders)) {
              for (const controller of folder.controllers) {
                controller.updateDisplay();
              }
            }
            // Setup particles if count changed
            simulation.grid.particleSystem.setupParticles();
          }
        });
    }
  });

  // Apply to all folders
  Object.values(gui.folders).forEach((folder) => {
    folder.controllers.forEach(addSliderUpdate);
  });

  return gui;
}

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("glCanvas");
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  // Create simulation instance
  sim = new FluidSimulation(canvas);

  // Initialize canvas interaction
  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      isDragging = true;
      updateObstaclePosition(e, canvas);
    }
  });

  canvas.addEventListener("mouseup", () => {
    isDragging = false;
    sim.grid.isObstacleActive = false;
    sim.grid.particleSystem.isObstacleActive = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
      updateObstaclePosition(e, canvas);
    }
  });

  canvas.addEventListener("mouseleave", () => {
    isDragging = false;
    sim.grid.isObstacleActive = false;
    sim.grid.particleSystem.isObstacleActive = false;
  });

  // Initialize GUI and start animation
  gui = initGUI(sim);
  animate();
});

function updateObstaclePosition(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  sim.grid.isObstacleActive = true;
  sim.grid.particleSystem.isObstacleActive = true;
  sim.grid.circleCenter = { x, y };
  sim.grid.particleSystem.circleCenter = { x, y };
}
