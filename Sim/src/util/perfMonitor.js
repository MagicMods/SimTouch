export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameTime: [],
      particleCount: 0,
      neighborSearchTime: 0,
      organicUpdateTime: 0,
    };
    this.maxSamples = 60;
  }

  startMeasure(name) {
    if (!this[name]) this[name] = performance.now();
  }

  endMeasure(name) {
    if (this[name]) {
      const duration = performance.now() - this[name];
      this.metrics[`${name}Time`] = duration;
      delete this[name];
    }
  }

  addFrameTime(dt) {
    this.metrics.frameTime.push(dt * 1000);
    if (this.metrics.frameTime.length > this.maxSamples) {
      this.metrics.frameTime.shift();
    }
  }

  getAverageFrameTime() {
    const times = this.metrics.frameTime;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
}
