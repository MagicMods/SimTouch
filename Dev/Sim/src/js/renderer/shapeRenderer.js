class ShapeRenderer {
  constructor(baseRenderer) {
    this.renderer = baseRenderer;
  }

  drawRectangle(x, y, width, height, color) {
    // Convert to clip space coordinates
    const left = (x / this.renderer.width) * 2.0 - 1.0;
    const right = ((x + width) / this.renderer.width) * 2.0 - 1.0;
    const top = -((y / this.renderer.height) * 2.0 - 1.0);
    const bottom = -((y + height) / this.renderer.height) * 2.0 - 1.0;

    const vertices = [left, top, right, top, left, bottom, right, bottom];

    this.renderer.drawShape(vertices, color);
  }

  drawCircle(x, y, radius, color, segments = 32) {
    const vertices = [];
    const centerX = (x / this.renderer.width) * 2.0 - 1.0;
    const centerY = -((y / this.renderer.height) * 2.0 - 1.0);
    const radiusX = (radius / this.renderer.width) * 2.0;
    const radiusY = (radius / this.renderer.height) * 2.0;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push(
        centerX + Math.cos(angle) * radiusX,
        centerY + Math.sin(angle) * radiusY
      );
    }

    this.renderer.drawShape(vertices, color);
  }
}

export { ShapeRenderer };
