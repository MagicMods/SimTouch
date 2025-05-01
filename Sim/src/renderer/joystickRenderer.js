import { debugManager } from "../util/debugManager.js";

export class JoystickRenderer {
  constructor(container, emuForces, main) {
    this.emuForces = emuForces;
    this.main = main;

    this.visible = false;
    this.isDragging = false;

    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;

    this.springStrength = 0.1;
    this.springEnabled = true;

    this.gravityInfluenceMultiplier = 0.1;
    this.turbulenceBiasInfluenceMultiplier = 0.3;
    this.turbulenceBiasSensitivityFactor = 0.5; // Tuning factor

    // Create overlay canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "emu-visualization";
    this.canvas.width = 150;
    this.canvas.height = 150;
    this.ctx = this.canvas.getContext("2d");

    container.appendChild(this.canvas);

    this.setupMouseInteraction();

    this.animationFrameId = null;
    this.startAnimation();

    // Check if main has turbulenceField before accessing
    if (this.main && this.main.turbulenceField) {
      this.turbulenceField = this.main.turbulenceField;
      if (this.db) console.log("JoystickRenderer has direct access to turbulenceField via main");
    } else {
      console.warn("JoystickRenderer: Main reference or turbulenceField not found on main object.");
    }
  }

  get db() {
    return debugManager.get('joystick');
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

    // Always update the UI regardless of EMU being enabled
    this.updateGravityUI();
    this.updateTurbulenceBiasUI();

    // Update joystick sliders in InputsUi if available
    this.updateJoystickSliders();
  }

  updateGravityUI() {
    // Try to find gravity through main or emuForces
    let gravity = null;
    // console.log("gravity ", this.main?.particleSystem?.gravity, this.emuForces?.gravity); // Debug log
    if (this.main?.particleSystem?.gravity) {
      gravity = this.main.particleSystem.gravity;
    } else if (this.emuForces?.gravity) {
      gravity = this.emuForces.gravity;
    }

    if (!gravity) return;

    // Apply joystick input directly to the physics gravity object
    // This makes the joystick controller work independently
    if (this.joystickActive) {
      // Use the dedicated influence multiplier
      const multiplier = this.gravityInfluenceMultiplier;

      // Check if gravity strength multiplier is > 0 before applying
      if (multiplier >= 0) {
        gravity.setRawDirection(
          this.joystickX * multiplier, // X controls X
          this.joystickY * multiplier, // Y controls Y
          gravity.directionZ // Keep existing Z or default if needed
        );
      }
    }

    // --- Refactored UI Update ---
    // Update the GravityUi sliders directly via their controllers
    const gravityUi = this.main?.ui?.gravityUi; // Assuming path is main.ui.gravityUi
    if (gravityUi && this.joystickActive) {
      // Calculate the scaled values based on the multiplier
      const multiplier = this.gravityInfluenceMultiplier;
      const scaledJoystickX = this.joystickX * multiplier;
      const scaledJoystickY = this.joystickY * multiplier;

      // Update G-X slider with the scaled value
      if (gravityUi.gravityXController) {
        try {
          gravityUi.gravityXController.setValue(scaledJoystickX);
        } catch (e) {
          console.warn("Error setting GravityUi G-X controller:", e);
        }
      }

      // Update G-Y slider with the scaled value
      if (gravityUi.gravityYController) {
        try {
          gravityUi.gravityYController.setValue(scaledJoystickY);
        } catch (e) {
          console.warn("Error setting GravityUi G-Y controller:", e);
        }
      }
    }
    // --- End Refactored UI Update ---
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

    // Apply joystick input directly to turbulence bias
    if (this.joystickActive) {
      // Normalize joystick values to -1 to 1 range for bias controls
      const baseBiasX = this.joystickX / 10; // X controls X
      const baseBiasY = -this.joystickY / 10; // Invert Y for correct direction

      const effectiveBiasX = baseBiasX * this.turbulenceBiasInfluenceMultiplier * this.turbulenceBiasSensitivityFactor;
      const effectiveBiasY = baseBiasY * this.turbulenceBiasInfluenceMultiplier * this.turbulenceBiasSensitivityFactor;

      // Use the physics model's acceleration setter - this will handle the implementation details
      turbulenceField.setBiasSpeed(effectiveBiasX, effectiveBiasY);
    }

    // If turbulenceUi is available with the updateBiasControllers method, use it
    if (main && main.ui && main.ui.turbulenceUi) {
      try {
        main.ui.turbulenceUi.updateBiasControllers();
        return; // We're done, no need to manually update DOM elements
      } catch (e) {
        console.warn("Error updating bias controllers:", e);
      }
    }
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

    if (gravity) {
      gravity.setRawDirection(0, 0, gravity.directionZ || -1);
    }

    // Reset turbulence bias if EMU is not enabled
    let turbulenceField = null;
    if (this.main && this.main.turbulenceField) {
      turbulenceField = this.main.turbulenceField;
    } else if (this.emuForces && this.emuForces.turbulenceField) {
      turbulenceField = this.emuForces.turbulenceField;
    }

    if (turbulenceField) {
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

    // Get joystick data - always use the internal joystickX/Y state now
    let accelX, accelY, accelZ;

    if (this.joystickActive) {
      // Use joystick values without swapping
      accelX = this.joystickX;
      accelY = this.joystickY;
      accelZ = -1; // Smaller default Z value for better visualization
    } else {
      // Default values if joystick is not active
      accelX = 0;
      accelY = 0;
      accelZ = -1;
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
    ctx.fillText("Gravity", centerX - 20, 20);

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
    const scale = 1; // Scale factor to make small accelerations visible
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
    // Spring only applies if enabled, user isn't dragging, joystick is active,
    // AND EMU input is NOT enabled.
    if (this.springEnabled && !this.isDragging && this.joystickActive && !this.emuForces?.enabled) {
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

        // --- Explicitly reset physics when snapping to zero ---
        // Reset actual gravity if EMU is not enabled
        let gravity = null;
        if (this.main?.particleSystem?.gravity) {
          gravity = this.main.particleSystem.gravity;
        } else if (this.emuForces?.gravity) {
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
          // Note: This path might not be valid if emuForces doesn't have turbulenceField directly
          turbulenceField = this.emuForces.turbulenceField;
        }
        if (turbulenceField && (!this.emuForces || !this.emuForces.enabled)) {
          try {
            turbulenceField.resetBias();
          } catch (e) {
            turbulenceField.setBiasSpeed(0, 0);
          }
        }
        // --- End physics reset ---

        // --- Explicitly update UI controllers to zero ---
        const gravityUi = this.main?.ui?.gravityUi;
        if (gravityUi) {
          if (gravityUi.gravityXController) {
            try {
              gravityUi.gravityXController.setValue(0);
            } catch (e) {
              console.warn("Error setting GravityUi G-X controller to 0:", e);
            }
          }
          if (gravityUi.gravityYController) {
            try {
              gravityUi.gravityYController.setValue(0);
            } catch (e) {
              console.warn("Error setting GravityUi G-Y controller to 0:", e);
            }
          }
        }
        // --- End UI zeroing ---
      }

      // Update UI based on new spring position (potentially zeroed)
      this.updateGravityUI();
      this.updateTurbulenceBiasUI();
      this.updateJoystickSliders();
    }
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

  // <<< NEW SETTERS START
  setGravityInfluenceMultiplier(value) {
    this.gravityInfluenceMultiplier = Math.max(0, value); // Ensure non-negative
  }
  setTurbulenceBiasInfluenceMultiplier(value) {
    this.turbulenceBiasInfluenceMultiplier = Math.max(0, value); // Ensure non-negative
  }
  // >>> NEW SETTERS END
}
