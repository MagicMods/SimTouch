import { BaseBoundary } from './baseBoundary.js';

export class CircularBoundary extends BaseBoundary {
    constructor(centerX, centerY, radius, scale = 1.0) {
        super(centerX, centerY, scale);
        this.radius = radius;
    }

    isPointInside(x, y) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        return Math.hypot(dx, dy) <= this.radius * this.scale;
    }

    getRadius() {
        return this.radius * this.scale;
    }

    classifyCell(cell, allowCut = 1) {
        // Get coordinates of cell corners and edges
        const corners = [
            { x: cell.x, y: cell.y }, // Top-left
            { x: cell.x + cell.width, y: cell.y }, // Top-right
            { x: cell.x, y: cell.y + cell.height }, // Bottom-left
            { x: cell.x + cell.width, y: cell.y + cell.height } // Bottom-right
        ];

        // Calculate cell center
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        const centerDist = Math.hypot(centerX - this.centerX, centerY - this.centerY);
        const centerInside = centerDist <= this.getRadius();

        // Determine how many corners are outside the boundary
        const cornersOutside = this.getCornersOutside(cell);
        const cornersInside = 4 - cornersOutside;

        // Store corner counts in the cell for UI display and debugging
        cell.cornersOutside = cornersOutside;
        cell.cornersInside = cornersInside;

        // Get detailed information about which corners are outside
        const cornerStatuses = corners.map(corner =>
            this.isPointInside(corner.x, corner.y) ? 'in' : 'out'
        );

        // Store detailed corner information for debugging
        cell.cornerInfo = {
            topLeft: cornerStatuses[0],
            topRight: cornerStatuses[1],
            bottomLeft: cornerStatuses[2],
            bottomRight: cornerStatuses[3],
            centerDist: centerDist,
            radius: this.getRadius(),
            centerInside: centerInside
        };

        // Case 1: Cell is completely inside (all corners inside)
        if (cornersOutside === 0) {
            return 'inside';
        }

        // Case 2: Special handling based on allowCut parameter
        if (allowCut === 0) {
            // With allowCut=0, only cells with center inside are considered boundary or inside
            return centerInside ? 'boundary' : 'outside';
        }

        // Case 3: Center is inside boundary = boundary cell
        if (centerInside) {
            return 'boundary';
        }

        // Case 4: Some corners are inside, check against allowCut threshold
        if (cornersInside > 0 && cornersOutside <= allowCut) {
            return 'boundary';
        }

        // Case 5: Check if any edge of the cell intersects with the boundary
        // This handles cells that have all corners outside but still intersect the boundary
        if (cornersOutside === 4 && allowCut > 0) {
            const edges = [
                // Horizontal edges
                { x1: cell.x, y1: cell.y, x2: cell.x + cell.width, y2: cell.y },
                { x1: cell.x, y1: cell.y + cell.height, x2: cell.x + cell.width, y2: cell.y + cell.height },
                // Vertical edges
                { x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y + cell.height },
                { x1: cell.x + cell.width, y1: cell.y, x2: cell.x + cell.width, y2: cell.y + cell.height }
            ];

            // If any edge intersects the boundary, include this cell
            const edgeIntersectsCircle = edges.some(edge =>
                this.lineIntersectsBoundary(
                    edge.x1, edge.y1, edge.x2, edge.y2
                )
            );

            if (edgeIntersectsCircle) {
                return 'boundary';
            }
        }

        // By default, the cell is outside
        return 'outside';
    }

    getCornersOutside(cell) {
        const corners = [
            { x: cell.x, y: cell.y }, // Top-left
            { x: cell.x + cell.width, y: cell.y }, // Top-right
            { x: cell.x, y: cell.y + cell.height }, // Bottom-left
            { x: cell.x + cell.width, y: cell.y + cell.height } // Bottom-right
        ];

        return corners.filter(corner =>
            Math.hypot(corner.x - this.centerX, corner.y - this.centerY) > this.getRadius()
        ).length;
    }

    lineIntersectsBoundary(x1, y1, x2, y2) {
        // Calculate the distance from the line to the circle center
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);

        // Normalize the line direction
        const nx = dx / len;
        const ny = dy / len;

        // Calculate the distance from the circle center to the line
        const t = nx * (this.centerX - x1) + ny * (this.centerY - y1);

        // Find the closest point on the line to the circle center
        const closestX = x1 + nx * t;
        const closestY = y1 + ny * t;

        // Check if the closest point is within the line segment
        if (t < 0 || t > len) {
            return false;
        }

        // Calculate the distance from the closest point to the circle center
        const dist = Math.hypot(closestX - this.centerX, closestY - this.centerY);

        // Check if the line intersects the circle
        return dist <= this.getRadius();
    }
} 