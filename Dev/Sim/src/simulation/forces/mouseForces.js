class MouseForces {
  constructor({ impulseRadius = 0.75, impulseMag = 0.08 } = {}) {
    // Force parameters
    this.impulseRadius = impulseRadius;
    this.impulseMag = impulseMag;

    // Unified mouse state
    this.mouseState = {
      position: null,
      lastPosition: null,
      isPressed: false,
      buttons: new Set(), // Track multiple buttons
    };
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
    // No longer needed as forces are applied directly in mousemove
    return;
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
        const factor = Math.pow(1 - dist / this.impulseRadius, 2);
        // Apply damping compensation to force
        let force = factor * this.impulseMag * dampingCompensation;

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
