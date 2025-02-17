class MouseForces {
  constructor({
    impulseRadius = 0.3,
    impulseMag = 0.015,
    mouseAttractor = false,
  } = {}) {
    // Core parameters
    this.impulseRadius = impulseRadius;
    this.impulseMag = impulseMag;
    this.mouseAttractor = mouseAttractor;

    // Mouse state
    this.activePosition = null;
    this.isPressed = false;
    this.activeButton = null;

    // Add Main.js mouse state properties
    this.isMouseDown = false;
    this.mouseButton = null;
    this.lastMousePos = null;
    this.activeForcePos = null;
    this.activeForceMode = null;
  }

  setMouseState(x, y, isPressed, button = null) {
    this.activePosition = isPressed ? { x, y } : null;
    this.isPressed = isPressed;
    this.activeButton = isPressed ? button : null;
  }

  // Direct copy from Main.js
  setupMouseInteraction(canvas, particleSystem) {
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener("mousedown", (e) => {
      const pos = this.getMouseSimulationCoords(e, canvas);
      this.mouseButton = e.button;
      this.lastMousePos = pos;

      // Update mouse force state
      this.setMouseState(pos.x, pos.y, true, e.button);
    });

    canvas.addEventListener("mousemove", (e) => {
      const pos = this.getMouseSimulationCoords(e, canvas);

      if (this.mouseButton === 0 && !this.mouseAttractor) {
        // Normal mode: left mouse drag
        if (this.lastMousePos) {
          const dx = pos.x - this.lastMousePos.x;
          const dy = pos.y - this.lastMousePos.y;
          particleSystem.applyDragImpulse(pos.x, pos.y, dx, dy);
        }
      }

      // Update position for continuous force application
      if (this.mouseButton !== null) {
        this.setMouseState(pos.x, pos.y, true, this.mouseButton);
      }

      this.lastMousePos = pos;
    });

    const clearMouseState = () => {
      this.mouseButton = null;
      this.lastMousePos = null;
      this.setMouseState(0, 0, false);
    };

    canvas.addEventListener("mouseup", clearMouseState);
    canvas.addEventListener("mouseleave", clearMouseState);
  }

  // Direct copy from Main.js
  getMouseSimulationCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height,
    };
  }

  update(particleSystem) {
    if (!this.isPressed || !this.activePosition) return;

    if (this.mouseAttractor) {
      // Attractor mode: left = attract, right = repulse
      const mode = this.activeButton === 0 ? "attract" : "repulse";
      this.applyImpulseAt(
        particleSystem,
        this.activePosition.x,
        this.activePosition.y,
        mode
      );
    } else if (this.activeButton === 0) {
      // Normal mode: left button drag only
      return; // Drag handled by mousemove events
    }
  }

  applyImpulseAt(particleSystem, x, y, mode = null) {
    const { particles, velocitiesX, velocitiesY, numParticles } =
      particleSystem;

    for (let i = 0; i < numParticles; i++) {
      const px = particles[i * 2];
      const py = particles[i * 2 + 1];
      const dx = px - x;
      const dy = py - y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.impulseRadius && dist > 0) {
        const factor = Math.pow(1 - dist / this.impulseRadius, 2);
        let force = factor * this.impulseMag;

        if (mode === "attract") {
          force = -force;
        }

        const nx = dx / dist;
        const ny = dy / dist;

        velocitiesX[i] += force * nx;
        velocitiesY[i] += force * ny;
      }
    }
  }

  applyDragForce(particleSystem, x, y, dx, dy) {
    if (this.mouseAttractor) return;

    const { particles, velocitiesX, velocitiesY, numParticles } =
      particleSystem;
    const dragMag = Math.hypot(dx, dy);
    if (dragMag === 0) return;

    const ndx = dx / dragMag;
    const ndy = dy / dragMag;

    for (let i = 0; i < numParticles; i++) {
      const px = particles[i * 2];
      const py = particles[i * 2 + 1];
      const dist = Math.hypot(px - x, py - y);

      if (dist < this.impulseRadius) {
        const factor = 1 - dist / this.impulseRadius;
        const force = factor * this.impulseMag;

        velocitiesX[i] += force * ndx;
        velocitiesY[i] += force * ndy;
      }
    }
  }

  // setupMouseDebug() {
  //   this.canvas.addEventListener("mousedown", (e) => {
  //     const rect = this.canvas.getBoundingClientRect();
  //     const mouseX = (e.clientX - rect.left) / rect.width;
  //     const mouseY = (e.clientY - rect.top) / rect.height;

  //     console.table({
  //       "Mouse Click": {
  //         x: mouseX.toFixed(3),
  //         y: mouseY.toFixed(3),
  //       },
  //       "Relative to Center": {
  //         x: (mouseX - 0.5).toFixed(3),
  //         y: (mouseY - 0.5).toFixed(3),
  //       },
  //       "Canvas Pixels": {
  //         x: Math.round(e.clientX - rect.left),
  //         y: Math.round(e.clientY - rect.top),
  //       },
  //     });

  //     // Log boundary info from ParticleSystem, if available
  //     if (this.particleSystem.centerX && this.particleSystem.centerY) {
  //       console.log("Boundary:", {
  //         center: {
  //           x: this.particleSystem.centerX.toFixed(3),
  //           y: this.particleSystem.centerY.toFixed(3),
  //         },
  //         radius: this.particleSystem.radius.toFixed(3),
  //       });
  //     }
  //   });
  // }
}

export { MouseForces };
