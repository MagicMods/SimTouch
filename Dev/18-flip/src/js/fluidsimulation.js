import { Grid } from "./grid.js";
import { Renderer } from "./renderer.js";

class FluidSimulation {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.grid = new Grid(this.renderer.gl, canvas.width, canvas.height);
    this.lastTime = performance.now();
  }

  update() {
    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.grid.simulate(dt);
    this.renderer.draw(this.grid);
  }

  start() {
    const animate = () => {
      this.update();
      requestAnimationFrame(animate);
    };
    animate();
  }

  initInteraction() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.isMouseDown = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  handleMouseMove(event) {
    if (!this.isMouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - this.lastMouseX;
    const dy = y - this.lastMouseY;

    this.grid.applyForce(x, y, dx, dy);

    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  handleMouseUp() {
    this.isMouseDown = false;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.resize(width, height);
    this.grid.resize(width, height);
  }

  applyForce(x, y, fx, fy, radius = 10) {
    const strength = Math.sqrt(fx * fx + fy * fy);
    const maxForce = 1000;
    const scale = Math.min(strength, maxForce) / maxForce;

    this.grid.particles.forEach((p) => {
      const dx = x - p.x;
      const dy = y - p.y;
      const r2 = dx * dx + dy * dy;

      if (r2 < radius * radius) {
        const weight = 1 - Math.sqrt(r2) / radius;
        p.vx += fx * weight * scale;
        p.vy += fy * weight * scale;
      }
    });
  }

  setConfig(config) {
    this.grid.setConfig(config);
  }

  getConfig() {
    return this.grid.getConfig();
  }

  reset() {
    this.grid.resetSimulation();
    this.lastTime = performance.now();
  }

  dispose() {
    this.grid.dispose();
    this.renderer.dispose();

    // Remove event listeners
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
  }

  getStats() {
    return {
      fps: 1000 / (performance.now() - this.lastTime),
      ...this.grid.getStats(),
    };
  }
}

export { FluidSimulation };
