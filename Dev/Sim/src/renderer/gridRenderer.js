import { ShapeRenderer } from "./shapeRenderer.js";

class GridRenderer {
  constructor(baseRenderer) {
    this.baseRenderer = baseRenderer;
    this.shapeRenderer = new ShapeRenderer(baseRenderer);
  }

  drawGrid(grid) {
    // Draw background cells
    const rectangles = grid.generateRectangles();
    rectangles.forEach((rect) => {
      this.shapeRenderer.drawRectangle(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        rect.color
      );
    });

    // Draw particles if they exist
    if (grid.particles) {
      this.drawParticles(grid.particles);
    }

    // Draw obstacle if active
    if (grid.isObstacleActive) {
      this.drawObstacle(grid);
    }
  }

  drawParticles(particles) {
    const particleColor = [0.2, 0.6, 1.0, 1.0];
    particles.forEach((particle) => {
      this.shapeRenderer.drawCircle(
        particle.x,
        particle.y,
        particle.radius,
        particleColor
      );
    });
  }

  drawObstacle(grid) {
    if (grid.circleCenter && grid.circleRadius) {
      this.shapeRenderer.drawCircle(
        grid.circleCenter.x,
        grid.circleCenter.y,
        grid.circleRadius,
        grid.obstacleColor || [0.3, 0.3, 0.3, 1.0]
      );
    }
  }
}

export { GridRenderer };
