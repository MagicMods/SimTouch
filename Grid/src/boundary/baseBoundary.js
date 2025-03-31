export class BaseBoundary {
    constructor(centerX, centerY, scale = 1.0) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.scale = scale;
    }

    // Common methods for all boundary types
    isPointInside(x, y) {
        throw new Error('isPointInside must be implemented by derived classes');
    }

    getRadius() {
        throw new Error('getRadius must be implemented by derived classes');
    }

    // Grid-specific methods
    classifyCell(cell, allowCut = 1) {
        throw new Error('classifyCell must be implemented by derived classes');
    }

    // Helper method for cell classification
    getCornersOutside(cell) {
        throw new Error('getCornersOutside must be implemented by derived classes');
    }

    // Helper method for edge intersection
    lineIntersectsBoundary(x1, y1, x2, y2) {
        throw new Error('lineIntersectsBoundary must be implemented by derived classes');
    }

    // Common utility methods
    getCenter() {
        return { x: this.centerX, y: this.centerY };
    }

    getScale() {
        return this.scale;
    }

    setScale(scale) {
        this.scale = scale;
    }
} 