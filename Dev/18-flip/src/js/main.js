import { FluidSimulation } from "./fluidsimulation.js";

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

const dampingSlider = document.getElementById("dampingSlider");
const dampingValue = document.getElementById("dampingValue");

let isPaused = false;
let animationId = null;

let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Button handlers
resetBtn.onclick = () => sim.reset();
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

particleSlider.oninput = (e) => {
  const count = parseInt(e.target.value);
  //   console.log("Slider value:", count);

  particleCount.textContent = count;

  // Update simulation directly
  sim.grid.setParticleCount(count);
};

gravitySlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  gravityValue.textContent = value.toFixed(2);
  sim.grid.gravity = value;
});

flipRatioSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  flipRatioValue.textContent = value.toFixed(2);
  sim.grid.flipRatio = value;
});

pressureSlider.addEventListener("input", (e) => {
  const value = parseInt(e.target.value);
  pressureValue.textContent = value;
  sim.grid.numPressureIters = value;
});

relaxSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  relaxValue.textContent = value.toFixed(2);
  sim.grid.overRelaxation = value;
});

dampingSlider.addEventListener("input", (e) => {
  const value = parseFloat(e.target.value);
  dampingValue.textContent = value.toFixed(3);
  sim.grid.velocityDamping = value;
});

// Update display with initial values
particleCount.textContent = sim.grid.particleCount;
gravityValue.textContent = sim.grid.gravity.toFixed(2);
flipRatioValue.textContent = sim.grid.flipRatio.toFixed(2);
pressureValue.textContent = sim.grid.numPressureIters;
relaxValue.textContent = sim.grid.overRelaxation.toFixed(2);
dampingValue.textContent = sim.grid.velocityDamping.toFixed(3);

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  // Scale coordinates based on canvas size vs element size
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const dx = x - sim.grid.circleCenter.x;
  const dy = y - sim.grid.circleCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < sim.grid.circleRadius) {
    isDragging = true;
    dragOffset.x = dx;
    dragOffset.y = dy;
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
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
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
  const width = window.innerWidth;
  const height = window.innerHeight;
  sim.resize(width, height);
}

window.addEventListener("resize", handleResize);

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
