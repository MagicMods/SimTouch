export class EmuRenderer {
  constructor(container, emuForces) {
    this.emuForces = emuForces;
    this.visible = false;

    // Create overlay canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "emu-visualization";
    this.canvas.width = 150; // We only need one visualization now
    this.canvas.height = 150;
    this.canvas.style.position = "absolute";
    this.canvas.style.bottom = "10px";
    this.canvas.style.left = "50%";
    this.canvas.style.transform = "translateX(-50%)";
    this.canvas.style.background = "rgba(0, 0, 0, 0.5)";
    this.canvas.style.borderRadius = "5px";
    this.canvas.style.zIndex = "10";
    this.ctx = this.canvas.getContext("2d");

    // Add to container
    container.appendChild(this.canvas);

    // Animation frame
    this.animationFrameId = null;
    this.startAnimation();
  }

  startAnimation() {
    const animate = () => {
      this.draw();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  show() {
    this.visible = true;
    this.canvas.style.display = "block";
    return this;
  }

  hide() {
    this.visible = false;
    this.canvas.style.display = "none";
    return this;
  }

  draw() {
    if (!this.visible || !this.emuForces?.enabled) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Get current EMU data
    const data = this.emuForces.emuData;

    // Draw acceleration indicator (centered)
    this.drawAccelerationIndicator(data, 75, 75, 45);
  }

  drawAccelerationIndicator(data, centerX, centerY, radius) {
    const ctx = this.ctx;

    // Draw title
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText("Acceleration", centerX - 30, 20);

    // Draw boundary circle
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw X and Y axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Calculate indicator position based on acceleration
    // Limiting to the radius of the circle
    const scale = 10; // Scale factor to make small accelerations visible
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    // For 90° counter-clockwise rotation with correct up/down:
    // - New x = old y
    // - New y = -old x
    const indicatorX = centerX + clamp(data.accelY * scale, -radius, radius); // Use accelY for x (no negation needed)
    const indicatorY = centerY - clamp(data.accelX * scale, -radius, radius); // Use NEGATIVE accelX for y to fix up/down

    // Draw the acceleration indicator (a filled circle)
    const intensity = Math.abs(data.accelZ);
    const color = `rgba(${255 * intensity}, ${255 * (1 - intensity)}, 0, 1)`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw the z-acceleration as the size of a ring
    const zRadius = 5 + Math.abs(data.accelZ) * 3;
    ctx.strokeStyle =
      data.accelZ < 0 ? "rgba(255, 100, 100, 0.8)" : "rgba(100, 255, 100, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, zRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Add X and Y labels in the rotated context
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "10px Arial";
    ctx.fillText("Y", centerX + radius + 5, centerY);
    ctx.fillText("X", centerX, centerY - radius - 5);
  }
}
