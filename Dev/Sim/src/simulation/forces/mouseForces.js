class MouseForces {
  constructor({ impulseRadius = 0.3, impulseMag = 0.08 } = {}) {
    // Core parameters
    this.impulseRadius = impulseRadius;
    this.impulseMag = impulseMag;

    // Mouse state
    this.activePosition = null;
    this.leftPressed = false;
    this.rightPressed = false;
  }

  setMouseState(x, y, isPressed, button = null) {
    this.activePosition = isPressed ? { x, y } : null;

    // Track buttons separately
    if (button === 0) {
      // Left button
      this.leftPressed = isPressed;
    } else if (button === 2) {
      // Right button
      this.rightPressed = isPressed;
    }

    // Clear state when no buttons are pressed
    if (!this.leftPressed && !this.rightPressed) {
      this.activePosition = null;
    }
  }

  update(particleSystem) {
    if (!this.activePosition || (!this.leftPressed && !this.rightPressed))
      return;

    // Both buttons = repulsion
    if (this.leftPressed && this.rightPressed) {
      this.applyImpulseAt(
        particleSystem,
        this.activePosition.x,
        this.activePosition.y,
        "repulse"
      );
    }
    // Right button only = attractor
    else if (this.rightPressed) {
      this.applyImpulseAt(
        particleSystem,
        this.activePosition.x,
        this.activePosition.y,
        "attract"
      );
    }
    // Left button only = drag (handled by mousemove events)
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
}

export { MouseForces };
