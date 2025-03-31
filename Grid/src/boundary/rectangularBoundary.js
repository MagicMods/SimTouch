import { BaseBoundary } from './baseBoundary.js';

export class RectangularBoundary extends BaseBoundary {
    constructor(centerX, centerY, width, height, scale = 1.0) {
        super(centerX, centerY, scale);
        this.width = width;
        this.height = height;
    }

    isPointInside(x, y) {
        const halfWidth = (this.width * this.scale) / 2;
        const halfHeight = (this.height * this.scale) / 2;
        return Math.abs(x - this.centerX) <= halfWidth &&
            Math.abs(y - this.centerY) <= halfHeight;
    }

    getRadius() {
        // For rectangular boundary, return the larger of width/2 or height/2
        return Math.max(this.width, this.height) * this.scale / 2;
    }

    classifyCell(cell, allowCut = 1) {
        const halfWidth = (this.width * this.scale) / 2;
        const halfHeight = (this.height * this.scale) / 2;

        const corners = [
            { x: cell.x, y: cell.y }, // Top-left
            { x: cell.x + cell.width, y: cell.y }, // Top-right
            { x: cell.x, y: cell.y + cell.height }, // Bottom-left
            { x: cell.x + cell.width, y: cell.y + cell.height } // Bottom-right
        ];

        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;

        const cornersOutside = this.getCornersOutside(cell);
        const cornersInside = 4 - cornersOutside;

        let edgeIntersectsRectangle = false;
        if (cornersInside === 0 && allowCut > 0) {
            const edges = [
                // Horizontal edges
                { x1: cell.x, y1: cell.y, x2: cell.x + cell.width, y2: cell.y },
                { x1: cell.x, y1: cell.y + cell.height, x2: cell.x + cell.width, y2: cell.y + cell.height },
                // Vertical edges
                { x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y + cell.height },
                { x1: cell.x + cell.width, y1: cell.y, x2: cell.x + cell.width, y2: cell.y + cell.height }
            ];

            edgeIntersectsRectangle = edges.some(edge =>
                this.lineIntersectsBoundary(
                    edge.x1, edge.y1, edge.x2, edge.y2
                )
            );
        }

        const centerInside = Math.abs(centerX - this.centerX) <= halfWidth &&
            Math.abs(centerY - this.centerY) <= halfHeight;

        if (cornersOutside === 0) {
            return 'inside';
        } else if (
            centerInside ||
            (cornersOutside <= allowCut && allowCut > 0) ||
            (allowCut > 0 && edgeIntersectsRectangle)
        ) {
            return 'boundary';
        } else {
            return 'outside';
        }
    }

    getCornersOutside(cell) {
        const halfWidth = (this.width * this.scale) / 2;
        const halfHeight = (this.height * this.scale) / 2;

        const corners = [
            { x: cell.x, y: cell.y }, // Top-left
            { x: cell.x + cell.width, y: cell.y }, // Top-right
            { x: cell.x, y: cell.y + cell.height }, // Bottom-left
            { x: cell.x + cell.width, y: cell.y + cell.height } // Bottom-right
        ];

        return corners.filter(corner =>
            Math.abs(corner.x - this.centerX) > halfWidth ||
            Math.abs(corner.y - this.centerY) > halfHeight
        ).length;
    }

    lineIntersectsBoundary(x1, y1, x2, y2) {
        const halfWidth = (this.width * this.scale) / 2;
        const halfHeight = (this.height * this.scale) / 2;

        // Check if either endpoint is inside the rectangle
        if (this.isPointInside(x1, y1) || this.isPointInside(x2, y2)) {
            return true;
        }

        // Check intersection with each edge of the rectangle
        const edges = [
            // Top edge
            {
                x1: this.centerX - halfWidth, y1: this.centerY - halfHeight,
                x2: this.centerX + halfWidth, y2: this.centerY - halfHeight
            },
            // Right edge
            {
                x1: this.centerX + halfWidth, y1: this.centerY - halfHeight,
                x2: this.centerX + halfWidth, y2: this.centerY + halfHeight
            },
            // Bottom edge
            {
                x1: this.centerX + halfWidth, y1: this.centerY + halfHeight,
                x2: this.centerX - halfWidth, y2: this.centerY + halfHeight
            },
            // Left edge
            {
                x1: this.centerX - halfWidth, y1: this.centerY + halfHeight,
                x2: this.centerX - halfWidth, y2: this.centerY - halfHeight
            }
        ];

        return edges.some(edge => this.linesIntersect(x1, y1, x2, y2,
            edge.x1, edge.y1, edge.x2, edge.y2));
    }

    linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denominator === 0) return false;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
} 