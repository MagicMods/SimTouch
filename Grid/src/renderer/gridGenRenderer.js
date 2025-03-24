import { BaseRenderer } from "./baseRenderer.js";

export class GridGenRenderer extends BaseRenderer {
    constructor(gl) {
        super(gl);
        this.TARGET_WIDTH = 240;
        this.TARGET_HEIGHT = 240;
    }

    updateGrid(params) {
        // Clear canvas
        this.gl.clearColor(0, 0, 0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Use shader program
        this.gl.useProgram(this.programInfo.program);
        this.gl.uniform2f(
            this.programInfo.uniformLocations.resolution,
            this.TARGET_WIDTH,
            this.TARGET_HEIGHT
        );

        // Draw reference circles
        this.drawCircle(120, 120, 120, [0.9, 0.9, 0.9, 1]); // Outer circle
        this.drawCircle(120, 120, 120 * params.scale, [0.1, 0.1, 0.1, 1]); // Inner circle

        // Generate and draw grid
        const rectangles = this.generateRectangles(params);
        rectangles.forEach((rect) => {
            this.drawRectangle(rect.x, rect.y, rect.width, rect.height, rect.color);
        });

        // Update params with actual values
        params.cols = this.gridParams.cols;
        params.rows = this.gridParams.rows;
        params.width = this.gridParams.width;
        params.height = this.gridParams.height;
    }

    generateRectangles(params) {
        let bestRects = [];
        const center = 120;
        const radius = 120 * params.scale;

        for (let cellH = 120; cellH >= 1; cellH--) {
            const scaledH = Math.max(1, Math.round(cellH * params.scale));
            const scaledW = Math.max(1, Math.round(params.aspectRatio * scaledH));

            const stepX = scaledW + params.gap;
            const stepY = scaledH + params.gap;

            let maxCols = 0,
                maxRows = 0;
            while (Math.hypot(maxCols * stepX, 0) <= radius) maxCols++;
            while (Math.hypot(0, maxRows * stepY) <= radius) maxRows++;

            const cols = maxCols * 2 + 1;
            const rows = maxRows * 2 + 1;
            const total = cols * rows;

            if (total < params.target) continue;

            const rectangles = [];
            for (let c = -maxCols; c <= maxCols; c++) {
                for (let r = -maxRows; r <= maxRows; r++) {
                    const dx = c * stepX;
                    const dy = r * stepY;
                    if (Math.hypot(dx, dy) > radius) continue;

                    rectangles.push({
                        x: Math.round(center + dx - scaledW / 2),
                        y: Math.round(center + dy - scaledH / 2),
                        width: scaledW,
                        height: scaledH,
                        color: [0.5, 0.5, 0.5, 1],
                    });
                }
            }

            if (rectangles.length >= params.target) {
                this.gridParams = {
                    cols,
                    rows,
                    width: scaledW,
                    height: scaledH,
                };
                return rectangles.slice(0, params.target);
            }

            if (rectangles.length > bestRects.length) {
                bestRects = rectangles;
                this.gridParams = {
                    cols,
                    rows,
                    width: scaledW,
                    height: scaledH,
                };
            }
        }
        return bestRects.slice(0, params.target);
    }
} 