export class PulseModulator {
  constructor(id, params = {}) {
    this.id = id;
    this.type = params.type || "sine"; // sine, square, triangle
    this.speed = params.speed || 1.0;
    this.min = params.min !== undefined ? params.min : 0;
    this.max = params.max !== undefined ? params.max : 1;
    this.targetControl = params.targetControl || null;
    this.targetProperty = params.targetProperty || null;
    this.active = params.active !== undefined ? params.active : true;
    this.phase = params.phase || 0;
  }

  getSignalValue() {
    const time = (Date.now() / 1000) * this.speed + this.phase;
    let value = 0;

    switch (this.type) {
      case "sine":
        value = Math.sin(time * Math.PI * 2) * 0.5 + 0.5; // Map to 0-1
        break;
      case "square":
        value = Math.sin(time * Math.PI * 2) >= 0 ? 1 : 0;
        break;
      case "triangle":
        value = Math.abs((time % 2) - 1); // Triangle wave 0-1
        break;
    }

    // Map from 0-1 to min-max
    return this.min + value * (this.max - this.min);
  }

  update() {
    if (!this.active || !this.targetControl || !this.targetProperty) return;

    // Get the current signal value
    const value = this.getSignalValue();

    // Update the target property
    if (this.targetControl.object && this.targetProperty) {
      this.targetControl.object[this.targetProperty] = value;
      this.targetControl.updateDisplay();
    }
  }
}

export class PulseModulatorManager {
  constructor() {
    this.modulators = new Map();
    this.nextId = 1;
    this.animationFrameId = null;
    this.updateBound = this.update.bind(this);
  }

  addModulator(params = {}) {
    const id = this.nextId++;
    const modulator = new PulseModulator(id, params);
    this.modulators.set(id, modulator);

    if (this.modulators.size === 1) {
      this.startUpdates();
    }

    return modulator;
  }

  removeModulator(id) {
    const result = this.modulators.delete(id);

    if (this.modulators.size === 0) {
      this.stopUpdates();
    }

    return result;
  }

  startUpdates() {
    if (!this.animationFrameId) {
      this.update();
    }
  }

  stopUpdates() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  update() {
    // Update all modulators
    for (const modulator of this.modulators.values()) {
      modulator.update();
    }

    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.updateBound);
  }
}
