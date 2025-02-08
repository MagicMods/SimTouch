import { FluidSimulation } from "./fluidSimulation.js";

// Initialize simulation
const canvas = document.getElementById("glCanvas");
const sim = new FluidSimulation(canvas);

// Control handlers
const resetBtn = document.getElementById("resetBtn");
const flipBtn = document.getElementById("flipBtn");
const pauseBtn = document.getElementById("pauseBtn");
const particleSlider = document.getElementById("particleSlider");
const particleCount = document.getElementById("particleCount");
const fpsCounter = document.getElementById("fpsCounter");
const activeParticles = document.getElementById("activeParticles");

const gravitySlider = document.getElementById("gravitySlider");
const flipRatioSlider = document.getElementById("flipRatioSlider");
const pressureSlider = document.getElementById("pressureSlider");
const relaxSlider = document.getElementById("relaxSlider");

const gravityValue = document.getElementById("gravityValue");
const flipRatioValue = document.getElementById("flipRatioValue");
const pressureValue = document.getElementById("pressureValue");
const relaxValue = document.getElementById("relaxValue");

const repulsionSlider = document.getElementById("repulsionSlider");
const repulsionValue = document.getElementById("repulsionValue");
const obstacleSlider = document.getElementById("obstacleSlider");
const obstacleValue = document.getElementById("obstacleValue");

// Add opacity slider handler
const opacitySlider = document.getElementById("opacitySlider");
const opacityValue = document.getElementById("opacityValue");

const velocityDampingSlider = document.getElementById("velocityDampingSlider");
const velocityDampingValue = document.getElementById("velocityDampingValue");
const collisionDampingSlider = document.getElementById(
  "collisionDampingSlider"
);
const collisionDampingValue = document.getElementById("collisionDampingValue");

const particleSizeSlider = document.getElementById("particleSizeSlider");
const particleSizeValue = document.getElementById("particleSizeValue");

opacitySlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  opacityValue.textContent = value.toFixed(2);
  const color = sim.grid.particleSystem.particleColor;
  sim.grid.particleSystem.particleColor = [color[0], color[1], color[2], value];
});

particleSizeSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  particleSizeValue.textContent = value.toFixed(1);
  sim.grid.particleSystem.particleRadius = value;
});

velocityDampingSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  if (!Number.isFinite(value)) return;

  const solver = sim.grid.fluidSolver;
  if (solver && typeof solver.velocityDamping !== "undefined") {
    velocityDampingValue.textContent = value.toFixed(3);
    solver.velocityDamping = value;
  }
});

collisionDampingSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  collisionDampingValue.textContent = value.toFixed(3);
  sim.grid.particleSystem.collisionDamping = value;
});

gravitySlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  if (!Number.isFinite(value)) return;

  const solver = sim.grid.fluidSolver;
  if (solver && typeof solver.gravity !== "undefined") {
    gravityValue.textContent = value.toFixed(2);
    solver.gravity = value;
  }
});

flipRatioSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  if (!Number.isFinite(value)) return;

  const solver = sim.grid.fluidSolver;
  if (solver && typeof solver.flipRatio !== "undefined") {
    flipRatioValue.textContent = value.toFixed(2);
    solver.flipRatio = value;
  }
});

pressureSlider.addEventListener("input", (e) => {
  const value = parseInt(e.target.value);
  if (!Number.isFinite(value)) return;

  const solver = sim.grid.fluidSolver;
  if (solver && typeof solver.numPressureIters !== "undefined") {
    pressureValue.textContent = value;
    solver.numPressureIters = value;
  }
});

relaxSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  if (!Number.isFinite(value)) return;

  const solver = sim.grid.fluidSolver;
  if (solver && typeof solver.overRelaxation !== "undefined") {
    relaxValue.textContent = value.toFixed(2);
    solver.overRelaxation = value;
  }
});

let isPaused = false;
let animationId = null;

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Button handlers
resetBtn.onclick = () => sim.reset();
resetBtn.addEventListener("click", () => {
  sim.reset();
});
flipBtn.onclick = () => {
  const config = sim.getConfig();
  config.simulation.gravity *= -1;
  sim.setConfig(config);
};
pauseBtn.onclick = () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  if (!isPaused) {
    animate();
  } else if (animationId) {
    cancelAnimationFrame(animationId);
  }
};

// Update particle slider max and default value
particleSlider.max = 1000;
particleSlider.value = 338;

particleSlider.oninput =
  ("input",
  (e) => {
    const count = parseInt(e.target.value);
    //   console.log("Slider value:", count);

    particleCount.textContent = sim.grid.particleSystem.particleCount;

    // Update simulation directly
    sim.grid.setParticleCount(count);
  });

repulsionSlider.addEventListener("input", (e) => {
  const value = e.target.value;
  repulsionValue.textContent = value;
  sim.grid.particleSystem.repulsionStrength = parseFloat(value); // Changed
});

obstacleSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  sim.grid.circleRadius = value;
  sim.grid.particleSystem.circleRadius = value;
  obstacleValue.textContent = value.toFixed(0);
});

// Update display with initial values
particleCount.textContent = sim.grid.particleSystem.particleCount;

// Access through fluidSolver instead of grid directly
const solver = sim.grid.fluidSolver;
gravityValue.textContent = solver.gravity.toFixed(2);
flipRatioValue.textContent = solver.flipRatio.toFixed(2);
pressureValue.textContent = solver.numPressureIters;
relaxValue.textContent = solver.overRelaxation.toFixed(2);

// Update initial particle count
sim.grid.setParticleCount(338);

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    sim.grid.isObstacleActive = true;
    sim.grid.circleCenter.x = x;
    sim.grid.circleCenter.y = y;
    sim.grid.particleSystem.isObstacleActive = true; // Add this line
    sim.grid.particleSystem.circleCenter.x = x; // Add this line
    sim.grid.particleSystem.circleCenter.y = y; // Add this line
    isDragging = true;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    isDragging = false;
    sim.grid.isObstacleActive = false;
    sim.grid.particleSystem.isObstacleActive = false;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const newX = (e.clientX - rect.left) * scaleX - dragOffset.x;
  const newY = (e.clientY - rect.top) * scaleY - dragOffset.y;

  // Constrain obstacle within canvas bounds
  sim.grid.circleCenter.x = Math.max(
    sim.grid.circleRadius,
    Math.min(canvas.width - sim.grid.circleRadius, newX)
  );
  sim.grid.circleCenter.y = Math.max(
    sim.grid.circleRadius,
    Math.min(canvas.height - sim.grid.circleRadius, newY)
  );

  // Update particle system obstacle position
  sim.grid.particleSystem.circleCenter.x = sim.grid.circleCenter.x;
  sim.grid.particleSystem.circleCenter.y = sim.grid.circleCenter.y;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
  sim.grid.isObstacleActive = false;
  sim.grid.particleSystem.isObstacleActive = false;
});

// Animation loop
function animate() {
  if (!isPaused) {
    sim.update();
    const stats = sim.getStats();
    fpsCounter.textContent = Math.round(stats.fps);
    activeParticles.textContent = stats.activeParticles;
    animationId = requestAnimationFrame(animate);
  }
}

// Start simulation
animate();

// Window resize handler
function handleResize() {
  const container = document.querySelector(".simulation-container");
  if (!container || !sim) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  try {
    sim.resize(width, height);
  } catch (error) {
    console.error("Error resizing simulation:", error);
  }
}

// Debounce resize events
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, 250);
});

// Replace unload with beforeunload
window.addEventListener("beforeunload", () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  sim.dispose();
});

// Error handling
window.addEventListener("error", (error) => {
  console.error("Simulation error:", error);
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  isPaused = true;
  pauseBtn.textContent = "Resume";
});

// Remove global functions and add to module scope
function updatePresetList() {
  const select = document.getElementById("presetList");
  const presets = sim.getAvailablePresets();

  select.innerHTML = '<option value="">Select preset...</option>';
  presets.forEach(({ name, timestamp }) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${name} (${new Date(
      timestamp
    ).toLocaleDateString()})`;
    select.appendChild(option);
  });
}

// Add event listeners instead of inline onclick
function updateControls(config) {
  const controlMap = {
    gravitySlider: ["simulation", "gravity"],
    velocityDampingSlider: ["simulation", "velocityDamping"],
    flipRatioSlider: ["simulation", "flipRatio"],
    relaxSlider: ["simulation", "overRelaxation"],
    pressureSlider: ["simulation", "pressureIterations"],
    particleSizeSlider: ["particles", "radius"],
    collisionDampingSlider: ["particles", "collisionDamping"],
    repulsionSlider: ["particles", "repulsionStrength"],
  };

  // ...rest of updateControls implementation...
}

async function initPresetControls() {
  const presetList = document.getElementById("presetList");
  const exportBtn = document.getElementById("exportPresetBtn");

  if (!presetList || !exportBtn) {
    console.error("Required preset elements not found");
    return;
  }

  // Clear existing options
  presetList.innerHTML = '<option value="">Select preset...</option>';

  try {
    // Load presets and populate dropdown
    const presetNames = await sim.presetManager.loadPresets();

    presetNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      presetList.appendChild(option);
    });

    // Handle preset selection
    presetList.addEventListener("change", (e) => {
      const selectedValue = e.target.value;
      if (selectedValue) {
        console.log(`Applying preset: ${selectedValue}`);
        sim.presetManager.applyPreset(selectedValue);
      }
    });

    // Handle export button
    exportBtn.addEventListener("click", () => {
      sim.presetManager.exportCurrentState();
    });
  } catch (error) {
    console.error("Failed to initialize preset controls:", error);
  }
}

// Call initialization after sim is ready
window.addEventListener("load", () => {
  initPresetControls().catch(console.error);
});

function init() {
  // ...existing code...
  initPresetControls();
  // ...existing code...
}

function exportCurrentState() {
  const sliders = [
    "particleSlider",
    "opacitySlider",
    "particleSizeSlider",
    "gravitySlider",
    "velocityDampingSlider",
    "flipRatioSlider",
    "pressureSlider",
    "relaxSlider",
    "collisionDampingSlider",
    "repulsionSlider",
    "obstacleSlider",
  ];

  const state = {
    sliders: {},
  };

  sliders.forEach((id) => {
    const slider = document.getElementById(id);
    if (slider) {
      state.sliders[id] = parseFloat(slider.value);
    }
  });

  console.log("Preset Configuration:");
  console.log(JSON.stringify(state, null, 2));
}

// Add debug button to UI
document
  .getElementById("exportPresetBtn")
  .addEventListener("click", exportCurrentState);
