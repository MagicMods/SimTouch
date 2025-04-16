export class EmuRenderer {
  constructor(container, emuForces, main) {
    this.emuForces = emuForces;
    this.main = main;
    this.debugFlag = this.main.debugFlags.debugEmu;
    this.visible = false;
    this.isDragging = false;

    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;

    this.springStrength = 0.5;
    this.springEnabled = true;

    // Create overlay canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "emu-visualization";
    this.canvas.width = 150;
    this.canvas.height = 150;
    this.canvas.style.position = "absolute";
    this.canvas.style.bottom = "40px";
    this.canvas.style.left = "50%";
    this.canvas.style.transform = "translateX(-50%)";
    this.canvas.style.background = "rgba(0, 0, 0, 0.5)";
    this.canvas.style.borderRadius = "5px";
    this.canvas.style.zIndex = "10";
    this.ctx = this.canvas.getContext("2d");

    container.appendChild(this.canvas);

    this.setupMouseInteraction();

    this.animationFrameId = null;
    this.startAnimation();

    // Check if main has turbulenceField before accessing
    if (this.main && this.main.turbulenceField) {
      this.turbulenceField = this.main.turbulenceField;
      if (this.debugFlag) console.log("EmuRenderer has direct access to turbulenceField via main");
    } else {
      console.warn("EmuRenderer: Main reference or turbulenceField not found on main object.");
    }
  }

  setupMouseInteraction() {
    // For detecting double-tap
    this.lastTapTime = 0;

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Touch events for mobile support - add {passive: false} option
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();

      // Check for double-tap
      const currentTime = new Date().getTime();
      const tapLength = currentTime - this.lastTapTime;

      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        this.resetJoystick();
        this.lastTapTime = 0; // Reset to prevent triple-tap
      } else {
        // Single tap
        this.lastTapTime = currentTime;

        // Process as normal tap
        this.handleMouseDown({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY
        });
      }
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
    // Remove the dependency on emuForces.enabled
    if (!this.visible) return;

    // Get canvas-relative coordinates
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is inside the circle (using center coordinates from drawAccelerationIndicator)
    const centerX = this.canvas.width / 2;  // 75
    const centerY = this.canvas.height / 2; // 75
    const radius = 45;

    const distFromCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );

    if (distFromCenter <= radius) {
      this.isDragging = true;
      this.joystickActive = true;

      // Set manual override flag to stop EMU data updates (only if EMU is enabled)
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

      // Don't reset joystick position when released
      // this.joystickActive = false;

      // Clear manual override flag when done dragging (only if EMU is enabled)
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

    // Store joystick position values
    this.joystickX = clampedX;
    this.joystickY = clampedY;

    // Only update EMU data if EMU forces are available
    if (this.emuForces) {
      // Update EMU data without swapping axes
      this.emuForces.emuData.accelX = clampedX; // Use X for X
      this.emuForces.emuData.accelY = clampedY; // Use Y for Y

      // Apply to gravity immediately (if EMU is enabled)
      if (this.emuForces.enabled) {
        this.emuForces.apply(0.016); // Apply with default timestep
      }
    }

    // Always update the UI regardless of EMU being enabled
    this.updateGravityUI();
    this.updateTurbulenceBiasUI();

    // Update joystick sliders in InputsUi if available
    this.updateJoystickSliders();
  }

  updateGravityUI() {
    // Try to find gravity through main or emuForces
    let gravity = null;

    if (this.main?.particleSystem?.gravity) {
      gravity = this.main.particleSystem.gravity;
    } else if (this.emuForces?.gravity) {
      gravity = this.emuForces.gravity;
    }

    if (!gravity) return;

    // Apply joystick input directly to gravity if EMU is not enabled
    // This makes the joystick controller work independently
    if (!this.emuForces?.enabled && this.joystickActive) {
      // Check if gravity strength is > 0 before applying
      if (typeof this.emuForces?.accelGravityMultiplier === 'number') {
        // If there's a strength multiplier property
        if (this.emuForces.accelGravityMultiplier >= 0) {
          gravity.setRawDirection(
            this.joystickX * this.emuForces.accelGravityMultiplier, // X controls X
            this.joystickY * this.emuForces.accelGravityMultiplier, // Y controls Y
            -1 * this.emuForces.accelGravityMultiplier // Default Z value
          );
        }
      } else {
        // Default behavior if no multiplier found - just use the values directly
        gravity.setRawDirection(this.joystickX, this.joystickY, -1);
      }
    }

    // Find all gravity UI instances
    const gravityControllers = document.querySelectorAll('.dg .c input[type="text"]');

    // Loop through them to find G-X and G-Y controllers
    gravityControllers.forEach(input => {
      const label = input.parentElement?.parentElement?.querySelector('.property-name');
      if (label) {
        const name = label.textContent?.trim();

        if (name === 'G-X' && gravity) {
          // Update the X input value
          input.value = gravity.directionX.toFixed(1);

          // Trigger change event to update internal state
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        }
        else if (name === 'G-Y' && gravity) {
          // Update the Y input value
          input.value = gravity.directionY.toFixed(1);

          // Trigger change event to update internal state
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        }
      }
    });
  }

  updateTurbulenceBiasUI() {
    // First try using Main
    let turbulenceField = null;
    let main = this.main;

    // Look for turbulence field in the main object
    if (this.main && this.main.turbulenceField) {
      turbulenceField = this.main.turbulenceField;
    }

    // If still not found, check other paths
    if (!turbulenceField && this.emuForces) {
      if (this.emuForces.simulation && this.emuForces.simulation.turbulenceField) {
        turbulenceField = this.emuForces.simulation.turbulenceField;
      }

      if (!turbulenceField && this.emuForces.gravity &&
        this.emuForces.gravity.particleSystem &&
        this.emuForces.gravity.particleSystem.main) {
        main = this.emuForces.gravity.particleSystem.main;
        turbulenceField = main.turbulenceField;
      }

      // Try simulation.main if it exists
      if (!turbulenceField && this.emuForces.simulation &&
        this.emuForces.simulation.main) {
        main = this.emuForces.simulation.main;
        turbulenceField = main.turbulenceField;
      }
    }

    if (!turbulenceField) {
      return; // Turbulence field not found
    }

    // Normalize joystick values to -1 to 1 range for bias controls
    const biasX = Math.max(-1, Math.min(1, this.joystickX / 10)); // X controls X
    const biasY = Math.max(-1, Math.min(1, -this.joystickY / 10)); // Invert Y for correct direction

    // Apply joystick input directly to turbulence bias if EMU is not enabled
    // This makes the joystick controller work independently
    if (this.joystickActive) {
      // Only apply if biasStrength > 0
      if (turbulenceField.biasStrength > 0) {
        // Use the physics model's acceleration setter - this will handle the implementation details
        turbulenceField.setBiasSpeed(biasX, biasY);
      }
    }

    // If turbulenceUi is available with the updateBiasControllers method, use it
    if (main && main.turbulenceUi) {
      try {
        main.turbulenceUi.updateBiasControllers();
        return; // We're done, no need to manually update DOM elements
      } catch (e) {
        console.warn("Error updating bias controllers:", e);
        // Continue with fallback method
      }
    }

    // Otherwise fall back to direct DOM manipulation
    const biasControllers = document.querySelectorAll('.dg .c input[type="text"]');

    // Loop through them to find T-BiasX and T-BiasY controllers
    biasControllers.forEach(input => {
      if (!input.parentElement || !input.parentElement.parentElement) return;

      const label = input.parentElement.parentElement.querySelector('.property-name');
      if (!label || !label.textContent) return;

      const name = label.textContent.trim();

      if (name === 'T-BiasX') {
        // Check if display property exists
        if (typeof turbulenceField._displayBiasAccelX !== 'undefined') {
          input.value = turbulenceField._displayBiasAccelX.toFixed(2);
        } else {
          // Fallback for older versions without display properties
          input.value = (-turbulenceField._biasAccelX / turbulenceField.biasStrength * 5).toFixed(2);
        }

        // Trigger change event to update internal state
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
      else if (name === 'T-BiasY') {
        // Check if display property exists
        if (typeof turbulenceField._displayBiasAccelY !== 'undefined') {
          input.value = turbulenceField._displayBiasAccelY.toFixed(2);
        } else {
          // Fallback for older versions without display properties
          input.value = (turbulenceField._biasAccelY / turbulenceField.biasStrength * 5).toFixed(2);
        }

        // Trigger change event to update internal state
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    });
  }

  startAnimation() {
    const animate = () => {
      if (this.springEnabled && !this.isDragging && this.joystickActive) {
        this.applySpringForce();
      }

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

  resetJoystick() {
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;

    // Reset actual gravity if EMU is not enabled
    let gravity = null;
    if (this.main && this.main.particleSystem && this.main.particleSystem.gravity) {
      gravity = this.main.particleSystem.gravity;
    } else if (this.emuForces && this.emuForces.gravity) {
      gravity = this.emuForces.gravity;
    }

    if (gravity && (!this.emuForces || !this.emuForces.enabled)) {
      gravity.setRawDirection(0, 0, gravity.directionZ || -1);
    }

    // Reset turbulence bias if EMU is not enabled
    let turbulenceField = null;
    if (this.main && this.main.turbulenceField) {
      turbulenceField = this.main.turbulenceField;
    } else if (this.emuForces && this.emuForces.turbulenceField) {
      turbulenceField = this.emuForces.turbulenceField;
    }

    if (turbulenceField && (!this.emuForces || !this.emuForces.enabled)) {
      try {
        // Call the resetBias method which fully resets the physics model
        turbulenceField.resetBias();
      } catch (e) {
        // Fallback if resetBias isn't available
        turbulenceField.setBiasSpeed(0, 0);
      }
    }

    this.updateGravityUI();
    this.updateTurbulenceBiasUI();
    this.updateJoystickSliders();
  }

  draw() {
    if (!this.visible) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Get joystick data - either from EMU if enabled, or from stored joystick values
    let accelX, accelY, accelZ;

    if (this.emuForces?.enabled && !this.isDragging) {
      // Use real EMU data if available and not currently dragging
      const data = this.emuForces.emuData;
      accelX = data.accelX;
      accelY = data.accelY;
      accelZ = data.accelZ;
    } else if (this.joystickActive) {
      // Use joystick values without swapping
      accelX = this.joystickX;
      accelY = this.joystickY;
      accelZ = -1; // Smaller default Z value for better visualization
    } else {
      // Default values if neither active
      accelX = 0;
      accelY = 0;
      accelZ = -1; // Smaller default Z value for better visualization
    }

    const data = { accelX, accelY, accelZ };

    // Draw acceleration indicator (centered)
    this.drawAccelerationIndicator(data, 75, 75, 45);
  }

  drawAccelerationIndicator(data, centerX, centerY, radius) {
    const ctx = this.ctx;

    // Draw title
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText("Joystick", centerX - 20, 20);

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

    // Fix position calculation without axis swap
    const indicatorX = centerX + clamp(data.accelX / 10 * radius, -radius, radius);
    const indicatorY = centerY - clamp(data.accelY / 10 * radius, -radius, radius);

    // Draw gravity vector (opposite to acceleration)
    const arrowLength = radius * 0.75;

    // Calculate normalized gravity vector (opposite of acceleration)
    let vx = -data.accelX; // X affects X
    let vy = data.accelY;  // Y affects Y
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
        centerX + 30,
        centerY + radius + 15
      );
    }

    // Draw the acceleration indicator (a filled circle)
    const intensity = Math.min(1, Math.abs(data.accelZ));
    const color = `rgba(${255 * intensity}, ${255 * (1 - intensity)}, 0, 1)`;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw the z-acceleration as the size of a ring with more reasonable size
    const zRadius = 5 + Math.abs(data.accelZ) * 1.5;
    ctx.strokeStyle =
      data.accelZ < 0 ? "rgba(255, 100, 100, 0.8)" : "rgba(100, 255, 100, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, zRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Add X and Y labels in the rotated context
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "10px Arial";
    ctx.fillText("Y", centerX - 4, centerY + radius + 16);
    ctx.fillText("X", centerX - radius - 16, centerY + 2);
  }

  applySpringForce() {
    const distX = 0 - this.joystickX;
    const distY = 0 - this.joystickY;

    // Apply spring force proportional to distance and spring strength
    this.joystickX += distX * this.springStrength;
    this.joystickY += distY * this.springStrength;

    // If close enough to center, snap to center and deactivate
    const totalDist = Math.sqrt(this.joystickX * this.joystickX + this.joystickY * this.joystickY);
    if (totalDist < 0.1) {
      this.joystickX = 0;
      this.joystickY = 0;
      this.joystickActive = false;
    }

    this.updateGravityUI();
    this.updateTurbulenceBiasUI();
    this.updateJoystickSliders();
  }

  setSpringStrength(value) {
    this.springStrength = Math.max(0, Math.min(1, value));
    return this;
  }

  setSpringEnabled(enabled) {
    this.springEnabled = enabled;
    return this;
  }


  updateJoystickSliders() {

    if (this.inputsUi) {
      if (this.inputsUi.joystickXController && this.inputsUi.joystickYController) {
        // Get the normalized values (-1 to 1 range)
        const normX = this.joystickX / 10;
        const normY = this.joystickY / 10;

        // Update the controller objects if they have the correct interface
        if (this.inputsUi.joystickXController.object &&
          typeof this.inputsUi.joystickXController.updateDisplay === 'function') {
          this.inputsUi.joystickXController.object.x = normX;
          this.inputsUi.joystickXController.updateDisplay();
        }

        if (this.inputsUi.joystickYController.object &&
          typeof this.inputsUi.joystickYController.updateDisplay === 'function') {
          this.inputsUi.joystickYController.object.y = normY;
          this.inputsUi.joystickYController.updateDisplay();
        }
      }

      // Ensure joystick is marked as active if values are non-zero
      if (Math.abs(this.joystickX) > 0.01 || Math.abs(this.joystickY) > 0.01) {
        this.joystickActive = true;
      }
    }
  }
}
