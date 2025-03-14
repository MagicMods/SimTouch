class MouseForces {
  constructor({
    impulseRadius = 0.75,
    impulseMag = 0.08,
    overrideRadius = 0.15, // Inner zone where mouse completely overrides other forces
    overrideStrength = 2.0, // How strongly to override other forces
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

    canvas.addEventListener("mousedown", (e) => {
      const pos = this.getMouseSimulationCoords(e, canvas);
      this.mouseState.position = pos;
      this.mouseState.lastPosition = pos;
      this.mouseState.isPressed = true;
      this.mouseState.buttons.add(e.button);
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!this.mouseState.isPressed) return;

      const pos = this.getMouseSimulationCoords(e, canvas);
      const dx = pos.x - this.mouseState.lastPosition.x;
      const dy = pos.y - this.mouseState.lastPosition.y;

      // Handle different mouse buttons
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

      this.mouseState.lastPosition = this.mouseState.position;
      this.mouseState.position = pos;
    });

    canvas.addEventListener("mouseup", (e) => {
      this.mouseState.buttons.delete(e.button);
      if (this.mouseState.buttons.size === 0) {
        this.mouseState = {
          position: null,
          lastPosition: null,
          isPressed: false,
          buttons: new Set(),
        };
      }
    });

    canvas.addEventListener("mouseleave", () => {
      this.mouseState = {
        position: null,
        lastPosition: null,
        isPressed: false,
        buttons: new Set(),
      };
    });
  }

  getMouseSimulationCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height,
    };
  }

  update(particleSystem) {
    // Reset activity flag at the start of each frame
    this.isActive = false;

    // Process regular mouse input when button is held down
    if (this.mouseState.isPressed && this.mouseState.position) {
      this.isActive = true;
      const pos = this.mouseState.position;

      // Apply appropriate force based on button
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

    // Process external input if enabled
    if (this.externalInputEnabled && this.externalMouseState.isPressed) {
      this.isActive = true;
      const pos = this.externalMouseState.position;

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
      if (!this._originalGravity) {
        this._originalGravity = particleSystem.gravity.strength;
      }

      // Reduce gravity by 80% during mouse interaction
      particleSystem.gravity.strength = this._originalGravity * 0.1;
    }

    // Similarly handle turbulence if needed
    if (particleSystem.turbulence) {
      if (!this._originalTurbulenceStrength) {
        this._originalTurbulenceStrength = particleSystem.turbulence.strength;
      }

      // Reduce turbulence by 80%
      particleSystem.turbulence.strength =
        this._originalTurbulenceStrength * 0.2;
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
  }
}

export { MouseForces };
