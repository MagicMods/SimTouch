class MouseForces {
  constructor({
    impulseRadius = 1,
    impulseMag = 0.111,
    overrideRadius = 0.2, // Inner zone where mouse completely overrides other forces
    overrideStrength = 3.0, // How strongly to override other forces
  } = {}) {
    // Force parameters
    this.impulseRadius = impulseRadius;
    this.impulseMag = impulseMag;

    // Add new properties
    this.overrideRadius = overrideRadius;
    this.overrideStrength = overrideStrength;
    this.isActive = false; // Track if mouse is currently influencing the system

    // Unified mouse state
    this.mouseState = {
      position: null,
      lastPosition: null,
      isPressed: false,
      buttons: new Set(), // Track multiple buttons
    };

    // External input state
    this.externalInputEnabled = false;
    this.externalMouseState = {
      position: { x: 0.5, y: 0.5 }, // Center by default
      lastPosition: { x: 0.5, y: 0.5 },
      isPressed: false,
      button: 0, // Default to left button
      lastInputTime: 0, // Track when we last received input
      inputTimeout: 100, // Auto-release after 100ms of no input
    };
    this.externalSensitivity = 0.001; // Adjust based on your input scale
    // this.setupMouseDebug();

    // Add reference for the main object to detect render mode
    this.particleSystem = null;
    this.main = null; // Direct reference to main instance
    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;
  }

  // Set main instance reference
  setMainReference(main) {
    this.main = main;
    return this;
  }

  // Enable external input handling
  enableExternalInput() {
    this.externalInputEnabled = true;
    return this;
  }

  // Disable external input handling
  disableExternalInput() {
    this.externalInputEnabled = false;
    return this;
  }

  // Set external input sensitivity
  setExternalSensitivity(value) {
    this.externalSensitivity = value;
    return this;
  }

  // Handle UDP-received mouse data
  handleExternalMouseData(x, y) {
    if (!this.externalInputEnabled) return;

    // Special case: (0,0) signals a release
    if (x === 0 && y === 0) {
      this.externalMouseState.isPressed = false;
      return;
    }

    // Update positions
    this.externalMouseState.lastPosition = {
      ...this.externalMouseState.position,
    };

    // Convert from input coordinates to simulation coordinates
    const normalizedX = Math.max(0, Math.min(1, x / 240));
    const normalizedY = Math.max(0, Math.min(1, 1 - y / 240));

    // Set absolute position
    this.externalMouseState.position.x = normalizedX;
    this.externalMouseState.position.y = normalizedY;

    // Update last input time
    this.externalMouseState.lastInputTime = performance.now();

    // Make sure button is pressed when receiving data,
    // but DON'T change the button type
    this.externalMouseState.isPressed = true;
  }

  // Set external mouse button state
  setExternalMouseButton(button, pressed) {
    if (pressed) {
      this.externalMouseState.button = button;
      this.externalMouseState.isPressed = true;
    } else {
      this.externalMouseState.isPressed = false;
    }
  }

  setupMouseInteraction(canvas, particleSystem) {
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Store reference to particle system
    this.particleSystem = particleSystem;

    // Add mouse wheel event listener
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault(); // Prevent page scrolling
      this.handleMouseWheel(e);
    }, { passive: false });

    canvas.addEventListener("mousedown", (e) => {
      const pos = this.getMouseSimulationCoords(e, canvas);
      this.mouseState.position = pos;
      this.mouseState.lastPosition = pos;
      this.mouseState.isPressed = true;
      this.mouseState.buttons.add(e.button);

      // Check if we're in Noise mode and directly activate the joystick
      if (this.isInNoiseMode()) {
        this.joystickActive = true;
        this.handleJoystick(pos);
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!this.mouseState.isPressed) return;

      const pos = this.getMouseSimulationCoords(e, canvas);
      const dx = pos.x - this.mouseState.lastPosition.x;
      const dy = pos.y - this.mouseState.lastPosition.y;

      // Check if we're in Noise mode
      if (this.isInNoiseMode()) {
        // Handle as joystick for noise mode
        this.handleJoystick(pos);
      } else {
        // Handle normal particle interaction based on mouse button
        if (this.mouseState.buttons.has(1)) {
          // Middle mouse button
          this.applyDragForce(particleSystem, pos.x, pos.y, dx * 2, dy * 2);
        } else if (this.mouseState.buttons.has(0)) {
          // Left mouse button
          this.applyImpulseAt(particleSystem, pos.x, pos.y, "attract");
        } else if (this.mouseState.buttons.has(2)) {
          // Right mouse button
          this.applyImpulseAt(particleSystem, pos.x, pos.y, "repulse");
        }
      }

      this.mouseState.lastPosition = this.mouseState.position;
      this.mouseState.position = pos;
    });

    canvas.addEventListener("mouseup", (e) => {
      this.mouseState.buttons.delete(e.button);
      if (this.mouseState.buttons.size === 0) {
        this.mouseState.isPressed = false;

        // If in noise mode, keep joystick active but let spring return work
        if (this.isInNoiseMode()) {
          // Keep joystick data but mark as not pressed
          this.mouseState.position = null;
          this.mouseState.lastPosition = null;
        } else {
          // Reset everything for non-noise modes
          this.mouseState = {
            position: null,
            lastPosition: null,
            isPressed: false,
            buttons: new Set(),
          };
        }
      }
    });

    canvas.addEventListener("mouseleave", () => {
      // Similar logic to mouseup
      if (this.isInNoiseMode()) {
        this.mouseState.isPressed = false;
        this.mouseState.position = null;
        this.mouseState.lastPosition = null;
      } else {
        this.mouseState = {
          position: null,
          lastPosition: null,
          isPressed: false,
          buttons: new Set(),
        };
      }
    });

    // Add touch events to support mobile
    canvas.addEventListener("touchstart", (e) => {
      // Don't call preventDefault() in a passive listener
      const touch = e.touches[0];

      // Create a synthetic mouse event
      const pos = this.getTouchSimulationCoords(touch, canvas);
      this.mouseState.position = pos;
      this.mouseState.lastPosition = pos;
      this.mouseState.isPressed = true;
      this.mouseState.buttons.add(0); // Simulate left button

      // Directly activate joystick in Noise mode
      if (this.isInNoiseMode()) {
        this.joystickActive = true;
        this.handleJoystick(pos);
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
      // Don't call preventDefault() in a passive listener
      if (!this.mouseState.isPressed) return;

      const touch = e.touches[0];
      const pos = this.getTouchSimulationCoords(touch, canvas);

      if (this.isInNoiseMode()) {
        this.handleJoystick(pos);
      } else {
        // Handle as left button interaction
        this.applyImpulseAt(particleSystem, pos.x, pos.y, "attract");
      }

      this.mouseState.lastPosition = this.mouseState.position;
      this.mouseState.position = pos;
    }, { passive: true });

    canvas.addEventListener("touchend", () => {
      // Similar to mouseup
      this.mouseState.buttons.delete(0);
      this.mouseState.isPressed = false;

      if (this.isInNoiseMode()) {
        // Keep joystick active but let spring return work
        this.mouseState.position = null;
        this.mouseState.lastPosition = null;
      } else {
        this.mouseState = {
          position: null,
          lastPosition: null,
          isPressed: false,
          buttons: new Set(),
        };
      }
    });
  }

  getMouseSimulationCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height,
    };
  }

  getTouchSimulationCoords(touch, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) / rect.width,
      y: 1 - (touch.clientY - rect.top) / rect.height,
    };
  }

  isInNoiseMode() {
    // First try with direct main reference
    if (this.main &&
      this.main.gridRenderer &&
      this.main.gridRenderer.renderModes) {
      const currentMode = this.main.gridRenderer.renderModes.currentMode;
      return currentMode === "--- NOISE ---";
    }

    // Fallback to looking through particleSystem
    if (this.particleSystem &&
      this.particleSystem.main &&
      this.particleSystem.main.gridRenderer &&
      this.particleSystem.main.gridRenderer.renderModes) {
      const currentMode = this.particleSystem.main.gridRenderer.renderModes.currentMode;
      return currentMode === "--- NOISE ---";
    }

    return false;
  }

  handleJoystick(pos) {
    // For joystick, we'll map the whole canvas as if the center is 0.5, 0.5
    const centerX = 0.5;
    const centerY = 0.5;
    const maxRadius = 0.4; // Maximum distance from center (normalized)

    // Calculate offset from center
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;

    // Calculate distance from center
    const dist = Math.hypot(dx, dy);

    // Calculate normalized x,y values (from -1 to 1)
    let normX, normY;
    if (dist > maxRadius) {
      // If beyond max radius, normalize to max radius
      normX = (dx / dist) * 1.0;
      normY = (dy / dist) * 1.0; // Don't invert Y here - we'll do it later
    } else {
      // Within radius, scale proportionally to -1...1 range
      normX = dx / maxRadius;
      normY = dy / maxRadius;
    }

    // Store these values for our internal state
    this.joystickX = normX;
    this.joystickY = normY; // Use direct normY (don't invert)
    this.joystickActive = true;

    // If emuRenderer exists, update it directly
    if (this.main?.emuRenderer) {
      // EmuRenderer expects values in -10 to 10 range, so scale up
      this.main.emuRenderer.joystickX = normX * 10;
      this.main.emuRenderer.joystickY = normY * 10; // Use direct normY (don't invert)
      this.main.emuRenderer.joystickActive = true;

      // Let emuRenderer update the UI and physics
      this.main.emuRenderer.updateTurbulenceBiasUI();

      return; // Let emuRenderer handle updates
    }

    // Fallback to direct turbulence field update if no emuRenderer
    this.updateTurbulenceField(this.joystickX, this.joystickY);
  }

  updateTurbulenceField(x, y) {
    // First try with direct main reference
    if (this.main && this.main.turbulenceField) {
      const turbulenceField = this.main.turbulenceField;
      if (typeof turbulenceField.setBiasSpeed === 'function' && turbulenceField.biasStrength > 0) {
        turbulenceField.setBiasSpeed(x, y);
        return true;
      }
    }

    // Fallback to looking through particleSystem
    if (this.particleSystem && this.particleSystem.main && this.particleSystem.main.turbulenceField) {
      const turbulenceField = this.particleSystem.main.turbulenceField;
      if (typeof turbulenceField.setBiasSpeed === 'function' && turbulenceField.biasStrength > 0) {
        turbulenceField.setBiasSpeed(x, y);
        return true;
      }
    }

    return false;
  }

  update(particleSystem) {
    // Reset activity flag at the start of each frame
    this.isActive = false;

    // Check if we're in Noise mode
    const inNoiseMode = this.isInNoiseMode();

    // Process regular mouse input when button is held down
    if (this.mouseState.isPressed && this.mouseState.position) {
      this.isActive = true;
      const pos = this.mouseState.position;

      if (inNoiseMode) {
        // For Noise mode, keep updating joystick if active
        if (this.joystickActive) {
          this.handleJoystick(pos);
        } else {
          this.handleJoystick(pos); // Start joystick if not active
        }
      } else {
        // Apply appropriate force based on button for normal modes
        if (this.mouseState.buttons.has(1)) {
          // Middle mouse button - need movement for drag, handled in mousemove
        } else if (this.mouseState.buttons.has(0)) {
          // Left mouse button - continuous attraction
          this.applyImpulseAt(particleSystem, pos.x, pos.y, "attract");
        } else if (this.mouseState.buttons.has(2)) {
          // Right mouse button - continuous repulsion
          this.applyImpulseAt(particleSystem, pos.x, pos.y, "repulse");
        }
      }
    }

    // Process external input if enabled
    if (this.externalInputEnabled && this.externalMouseState.isPressed) {
      this.isActive = true;
      const pos = this.externalMouseState.position;

      if (inNoiseMode) {
        // Handle external input as joystick in Noise mode
        this.handleJoystick(pos);
      } else {
        // Apply appropriate force based on button - CONTINUOUSLY
        switch (this.externalMouseState.button) {
          case 0: // Left button
            this.applyImpulseAt(particleSystem, pos.x, pos.y, "attract");
            break;
          case 1: // Middle button
            // Middle button still needs movement for drag effect
            const dx = pos.x - this.externalMouseState.lastPosition.x;
            const dy = pos.y - this.externalMouseState.lastPosition.y;
            if (Math.hypot(dx, dy) > 0.001) {
              // Only if there's movement
              this.applyDragForce(particleSystem, pos.x, pos.y, dx * 2, dy * 2);
            }
            break;
          case 2: // Right button
            this.applyImpulseAt(particleSystem, pos.x, pos.y, "repulse");
            break;
        }
      }
    }

    // Apply spring return effect for joystick if active but not being held
    if (inNoiseMode && this.joystickActive && !this.mouseState.isPressed && !this.externalMouseState.isPressed) {
      // If emuRenderer exists, let it handle the spring return
      if (this.main?.emuRenderer && this.main.emuRenderer.visible) {
        // Don't apply our own spring - let emuRenderer handle it
      } else {
        this.applyJoystickSpring();
      }
    }
  }

  applyJoystickSpring() {
    // Calculate distance from center
    const distX = 0 - this.joystickX;
    const distY = 0 - this.joystickY;

    // Spring strength (0-1)
    const springStrength = 0.1;

    // Apply spring force
    this.joystickX += distX * springStrength;
    this.joystickY += distY * springStrength;

    // If close to center, snap to center
    if (Math.abs(this.joystickX) < 0.02 && Math.abs(this.joystickY) < 0.02) {
      this.joystickX = 0;
      this.joystickY = 0;

      // If emuRenderer is available, update it too
      if (this.main?.emuRenderer) {
        this.main.emuRenderer.joystickX = 0;
        this.main.emuRenderer.joystickY = 0;
        this.main.emuRenderer.joystickActive = false;
      }

      // Reset turbulence bias when joystick returns to center
      let turbulenceField = null;

      // First try direct main reference
      if (this.main?.turbulenceField) {
        turbulenceField = this.main.turbulenceField;
      }
      // Fallback to particle system
      else if (this.particleSystem?.main?.turbulenceField) {
        turbulenceField = this.particleSystem.main.turbulenceField;
      }

      if (turbulenceField) {
        if (typeof turbulenceField.resetBias === 'function') {
          turbulenceField.resetBias();
        } else if (typeof turbulenceField.setBiasSpeed === 'function') {
          turbulenceField.setBiasSpeed(0, 0);
        }

        this.joystickActive = false;
      }
    } else {
      // Update emuRenderer if available
      if (this.main?.emuRenderer) {
        this.main.emuRenderer.joystickX = this.joystickX * 10; // Scale to expected range
        this.main.emuRenderer.joystickY = this.joystickY * 10; // Don't invert Y anymore
        this.main.emuRenderer.updateTurbulenceBiasUI(); // Let it update the UI and turbulence field
      } else {
        // Update turbulence field with new values
        this.updateTurbulenceField(this.joystickX, this.joystickY);
      }
    }
  }

  applyImpulseAt(particleSystem, x, y, mode = null) {
    const { particles, velocitiesX, velocitiesY, numParticles } =
      particleSystem;
    // Get inverse of velocity damping to counteract system damping
    const dampingCompensation = 1 / particleSystem.velocityDamping;

    for (let i = 0; i < numParticles; i++) {
      const px = particles[i * 2];
      const py = particles[i * 2 + 1];
      const dx = px - x;
      const dy = py - y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.impulseRadius && dist > 0) {
        // Calculate normalized direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Different behavior based on distance from mouse
        if (dist < this.overrideRadius) {
          // INNER ZONE: Complete override of velocities
          const overrideFactor = Math.pow(1 - dist / this.overrideRadius, 2);

          if (mode === "attract") {
            // For attraction - directly set velocity toward mouse
            const strength =
              this.impulseMag * this.overrideStrength * overrideFactor;
            velocitiesX[i] = -nx * strength * dampingCompensation;
            velocitiesY[i] = -ny * strength * dampingCompensation;
          } else {
            // For repulsion - directly set velocity away from mouse
            const strength =
              this.impulseMag * this.overrideStrength * overrideFactor;
            velocitiesX[i] = nx * strength * dampingCompensation;
            velocitiesY[i] = ny * strength * dampingCompensation;
          }
        } else {
          // OUTER ZONE: Traditional additive force with stronger magnitude
          const factor = Math.pow(1 - dist / this.impulseRadius, 2);
          // Apply enhanced force with damping compensation
          let force = factor * this.impulseMag * dampingCompensation * 1.5;

          if (mode === "attract") {
            force = -force;
          }

          velocitiesX[i] += force * nx;
          velocitiesY[i] += force * ny;
        }
      }
    }
  }

  applyDragForce(particleSystem, x, y, dx, dy) {
    if (this.mouseAttractor) return;

    const { particles, velocitiesX, velocitiesY, numParticles } =
      particleSystem;
    const dragMag = Math.hypot(dx, dy);
    if (dragMag === 0) return;

    const dampingCompensation = 1 / particleSystem.velocityDamping;
    const ndx = dx / dragMag;
    const ndy = dy / dragMag;

    for (let i = 0; i < numParticles; i++) {
      const px = particles[i * 2];
      const py = particles[i * 2 + 1];
      const dist = Math.hypot(px - x, py - y);

      if (dist < this.impulseRadius) {
        const factor = 1 - dist / this.impulseRadius;
        // Apply damping compensation to force
        const force = factor * this.impulseMag * dampingCompensation;

        velocitiesX[i] += force * ndx;
        velocitiesY[i] += force * ndy;
      }
    }
  }

  // New method to temporarily reduce other forces when mouse is active
  neutralizeOtherForces(particleSystem) {
    if (!this.isActive) return;

    // Temporarily scale down gravity when mouse is active
    if (particleSystem.gravity && particleSystem.gravity.enabled) {
      // Store original strength if not already stored
      if (this._originalGravity === undefined) {
        this._originalGravity = particleSystem.gravity.strength;
      }

      // Reduce gravity by 90% during mouse interaction
      particleSystem.gravity.strength = this._originalGravity * 0.1;
    }

    // Handle turbulence reduction
    if (particleSystem.turbulence) {
      if (this._originalTurbulenceStrength === undefined) {
        this._originalTurbulenceStrength = particleSystem.turbulence.strength;
      }

      // Reduce turbulence by 80%
      particleSystem.turbulence.strength =
        this._originalTurbulenceStrength * 0.2;
    }

    // Add voronoi field reduction
    if (particleSystem.voronoi) {
      if (this._originalVoronoiStrength === undefined) {
        this._originalVoronoiStrength = particleSystem.voronoi.strength;
      }

      // Reduce voronoi by 80% during mouse interaction
      particleSystem.voronoi.strength =
        this._originalVoronoiStrength * 0.2;
    }
  }

  // Method to restore normal forces when mouse is inactive
  restoreOtherForces(particleSystem) {
    if (this.isActive) return;

    // Restore original gravity
    if (particleSystem.gravity && this._originalGravity !== undefined) {
      particleSystem.gravity.strength = this._originalGravity;
      this._originalGravity = undefined;
    }

    // Restore original turbulence
    if (
      particleSystem.turbulence &&
      this._originalTurbulenceStrength !== undefined
    ) {
      particleSystem.turbulence.strength = this._originalTurbulenceStrength;
      this._originalTurbulenceStrength = undefined;
    }

    // Restore original voronoi strength
    if (
      particleSystem.voronoi &&
      this._originalVoronoiStrength !== undefined
    ) {
      particleSystem.voronoi.strength = this._originalVoronoiStrength;
      this._originalVoronoiStrength = undefined;
    }
  }

  handleMouseWheel(e) {
    // Determine direction - normalize for cross-browser compatibility
    const delta = Math.sign(e.deltaY) * -1; // -1 for scroll down, 1 for scroll up

    // Find turbulence field
    let turbulenceField = this.main?.turbulenceField;
    if (!turbulenceField && this.particleSystem?.main?.turbulenceField) {
      turbulenceField = this.particleSystem.main.turbulenceField;
    }

    if (!turbulenceField) return;

    // Get current scale value
    let currentScale = turbulenceField.scale || 1.0;

    // Adjust scale - use smaller delta for finer control
    // The 0.05 factor can be adjusted for sensitivity
    const newScale = Math.max(0.1, Math.min(10, currentScale + delta * 0.2));

    // Update turbulence scale
    if (typeof turbulenceField.setScale === 'function') {
      turbulenceField.setScale(newScale);
    } else {
      // Direct property assignment fallback
      turbulenceField.scale = newScale;
    }

    // Update UI if available
    if (this.main?.turbulenceUi && typeof this.main.turbulenceUi.updateScaleControllers === 'function') {
      this.main.turbulenceUi.updateScaleControllers();
    }
  }
}

export { MouseForces };
