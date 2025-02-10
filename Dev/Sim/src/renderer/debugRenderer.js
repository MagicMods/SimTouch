import { BaseRenderer } from "./baseRenderer.js";

class DebugRenderer extends BaseRenderer {
  constructor(canvas) {
    super(canvas);
    this.arrowLength = 20; // Length of velocity arrows
    this.pressureScale = 0.1; // Scale for pressure visualization
  }

  drawDebugOverlay(solver, programInfo) {
    if (!programInfo) return;

    // Draw velocity field
    this.drawVelocityField(solver, programInfo);

    // Draw pressure field
    this.drawPressureField(solver, programInfo);

    // Draw boundaries
    this.drawBoundaries(solver, programInfo);
  }

  drawVelocityField(solver, programInfo) {
    const vertices = [];
    const scale = this.arrowLength;

    // Sample velocity field at regular intervals
    for (let y = 0; y < solver.height; y += 2) {
      for (let x = 0; x < solver.width; x += 2) {
        const i = solver.IX(x, y);
        const u = solver.u[i];
        const v = solver.v[i];

        // Convert to screen space
        const x1 = (x / solver.width) * 2 - 1;
        const y1 = -((y / solver.height) * 2 - 1);
        const x2 = x1 + u * scale;
        const y2 = y1 - v * scale;

        // Add arrow line
        vertices.push(x1, y1, x2, y2);
      }
    }

    this.drawShape(
      new Float32Array(vertices),
      [0.0, 1.0, 0.0, 0.5], // Semi-transparent green
      programInfo,
      this.gl.LINES
    );
  }

  drawPressureField(solver, programInfo) {
    const vertices = [];
    const scale = this.pressureScale;

    for (let y = 0; y < solver.height; y++) {
      for (let x = 0; x < solver.width; x++) {
        const p = solver.p[solver.IX(x, y)];
        const intensity = Math.min(Math.abs(p) * scale, 1.0);

        // Draw pressure as colored points
        const x1 = (x / solver.width) * 2 - 1;
        const y1 = -((y / solver.height) * 2 - 1);
        vertices.push(x1, y1);

        this.drawShape(
          new Float32Array([x1, y1]),
          [p > 0 ? intensity : 0, 0, p < 0 ? intensity : 0, 0.5],
          programInfo,
          this.gl.POINTS
        );
      }
    }
  }

  drawBoundaries(solver, programInfo) {
    const vertices = [];

    for (let y = 0; y < solver.height; y++) {
      for (let x = 0; x < solver.width; x++) {
        if (solver.s[solver.IX(x, y)] === 1.0) {
          const x1 = (x / solver.width) * 2 - 1;
          const y1 = -((y / solver.height) * 2 - 1);
          vertices.push(x1, y1);
        }
      }
    }

    this.drawShape(
      new Float32Array(vertices),
      [1.0, 1.0, 1.0, 0.5], // Semi-transparent white
      programInfo,
      this.gl.POINTS
    );
  }
}

export { DebugRenderer };
