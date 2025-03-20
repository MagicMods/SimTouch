export class EmuRenderer {
  constructor(container, emuForces, main = null) {
    this.emuForces = emuForces;
    this.main = main; // Store reference to main if provided
    this.visible = false;

    // Track if we're currently dragging
    this.isDragging = false;

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

    // Setup mouse interaction
    this.setupMouseInteraction();

    // Animation frame
    this.animationFrameId = null;
    this.startAnimation();

    // Log if we have direct access to turbulenceField
    if (this.main?.turbulenceField) {
      console.log("EmuRenderer has direct access to turbulenceField via main");
    }
  }

  setupMouseInteraction() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events for mobile support - add {passive: false} option
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleMouseDown({
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      });
    }, { passive: false }); // Explicitly mark as non-passive

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        this.handleMouseMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY
        });
      }
    }, { passive: false }); // Explicitly mark as non-passive

    document.addEventListener('touchend', this.handleMouseUp.bind(this));
  }

  handleMouseDown(e) {
    if (!this.visible || !this.emuForces?.enabled) return;

    // Get canvas-relative coordinates
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is inside the circle (using center coordinates from drawAccelerationIndicator)
    const centerX = this.canvas.width / 2;  // 75
    const centerY = this.canvas.height / 2; // 75
    const radius = 45; // Same as used in drawAccelerationIndicator

    const distFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );

    if (distFromCenter <= radius) {
      this.isDragging = true;

      // Set manual override flag to stop EMU data updates
      if (this.emuForces && typeof this.emuForces.setManualOverride === 'function') {
        this.emuForces.setManualOverride(true);
      }

      this.updateFromMouse(x, y);
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.updateFromMouse(x, y);
  }

  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Clear manual override flag when done dragging
      if (this.emuForces && typeof this.emuForces.setManualOverride === 'function') {
        this.emuForces.setManualOverride(false);
      }
    }
  }

  updateFromMouse(x, y) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = 45;

    // Convert canvas coordinates to normalized values (-radius to +radius)
    const normX = (x - centerX) / (radius / 10); // Scale by 10 to match acceleration scale
    const normY = (centerY - y) / (radius / 10); // Invert Y for correct direction

    // Clamp values to prevent extremes
    const clampedX = Math.max(-10, Math.min(10, normX));
    const clampedY = Math.max(-10, Math.min(10, normY));

    // Update EMU data (with axes swapped as per existing visualization)
    this.emuForces.emuData.accelX = clampedY;
    this.emuForces.emuData.accelY = clampedX;

    // Apply to gravity immediately
    this.emuForces.apply(0.016); // Apply with default timestep

    // Update gravity UI
    this.updateGravityUI();

    // Update turbulence bias UI
    this.updateTurbulenceBiasUI();
  }

  updateGravityUI() {
    // Find all gravity UI instances
    const gravityControllers = document.querySelectorAll('.dg .c input[type="text"]');

    // Loop through them to find G-X and G-Y controllers
    gravityControllers.forEach(input => {
      const label = input.parentElement?.parentElement?.querySelector('.property-name');
      if (label) {
        const name = label.textContent?.trim();

        if (name === 'G-X' && this.emuForces.gravity) {
          // Update the X input value
          input.value = this.emuForces.gravity.directionX.toFixed(1);

          // Trigger change event to update internal state
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        }
        else if (name === 'G-Y' && this.emuForces.gravity) {
          // Update the Y input value
          input.value = this.emuForces.gravity.directionY.toFixed(1);

          // Trigger change event to update internal state
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        }
      }
    });
  }

  updateTurbulenceBiasUI() {
    // Try to find the turbulenceField through various paths

    // First try the direct main reference if available
    let turbulenceField = this.main?.turbulenceField;
    let main = this.main;

    // If not found, try the direct reference from emuForces
    if (!turbulenceField) {
      turbulenceField = this.emuForces.turbulenceField;
    }

    // If still not found, check other paths
    if (!turbulenceField) {
      turbulenceField = this.emuForces.simulation?.turbulenceField;

      if (!turbulenceField && this.emuForces.gravity?.particleSystem?.main) {
        main = this.emuForces.gravity.particleSystem.main;
        turbulenceField = main.turbulenceField;
      }

      // Try simulation.main if it exists
      if (!turbulenceField && this.emuForces.simulation?.main) {
        main = this.emuForces.simulation.main;
        turbulenceField = main.turbulenceField;
      }
    }

    if (!turbulenceField) {
      console.log("Turbulence field not found in emuRenderer");
      return; // Turbulence field not found
    }

    console.log("Found turbulenceField in emuRenderer:", !!turbulenceField);

    // Normalize EMU accel values to -1 to 1 range for bias controls
    // Use original mapping since we fixed the coordinate system in turbulenceField.js
    const biasX = Math.max(-1, Math.min(1, this.emuForces.emuData.accelY / 10));
    const biasY = Math.max(-1, Math.min(1, this.emuForces.emuData.accelX / 10));

    // Update turbulenceField directly
    if (typeof turbulenceField.setBiasSpeed === 'function') {
      turbulenceField.setBiasSpeed(biasX, biasY);
      console.log(`Set biasSpeed: X=${biasX.toFixed(2)}, Y=${biasY.toFixed(2)}`);
    }

    // If turbulenceUi is available with the updateBiasControllers method, use it
    if (main?.turbulenceUi && typeof main.turbulenceUi.updateBiasControllers === 'function') {
      main.turbulenceUi.updateBiasControllers();
      console.log("Updated turbulence bias UI via updateBiasControllers");
      return; // We're done, no need to manually update DOM elements
    }

    // Otherwise fall back to direct DOM manipulation
    console.log("Falling back to manual DOM updates for turbulence bias UI");
    // Find all controllers in the document
    const biasControllers = document.querySelectorAll('.dg .c input[type="text"]');

    // Loop through them to find T-BiasX and T-BiasY controllers
    biasControllers.forEach(input => {
      const label = input.parentElement?.parentElement?.querySelector('.property-name');
      if (label) {
        const name = label.textContent?.trim();

        if (name === 'T-BiasX') {
          // Update the X input value
          input.value = biasX.toFixed(2);

          // Trigger change event to update internal state
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
          console.log(`Updated T-BiasX UI to ${biasX.toFixed(2)}`);
        }
        else if (name === 'T-BiasY') {
          // Update the Y input value
          input.value = biasY.toFixed(2);

          // Trigger change event to update internal state
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
          console.log(`Updated T-BiasY UI to ${biasY.toFixed(2)}`);
        }
      }
    });
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
    const indicatorX = centerX + clamp(data.accelY * scale, -radius, radius);
    const indicatorY = centerY - clamp(data.accelX * scale, -radius, radius);

    // Draw gravity vector (opposite to acceleration)
    const arrowLength = radius * 0.75;

    // Calculate normalized gravity vector (opposite of acceleration)
    let vx = -data.accelY;
    let vy = data.accelX;
    const vz = -data.accelZ;

    // Calculate vector length
    const vLength = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Normalize and scale to arrow length
    if (vLength > 0) {
      vx = (vx / vLength) * arrowLength;
      vy = (vy / vLength) * arrowLength;

      // Draw gravity arrow
      ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + vx, centerY + vy);

      // Draw arrowhead
      const headLength = 10;
      const angle = Math.atan2(vy, vx);
      ctx.lineTo(
        centerX + vx - headLength * Math.cos(angle - Math.PI / 6),
        centerY + vy - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(centerX + vx, centerY + vy);
      ctx.lineTo(
        centerX + vx - headLength * Math.cos(angle + Math.PI / 6),
        centerY + vy - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();

      // Show gravity strength using line thickness
      ctx.fillStyle = "rgba(255, 255, 0, 0.7)";
      ctx.fillText(
        "G: " + vLength.toFixed(2),
        centerX - 45,
        centerY + radius + 15
      );
    }

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
