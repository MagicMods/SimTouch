import { BaseRenderer } from "./baseRenderer.js";

export class GridGenRenderer extends BaseRenderer {
    constructor(gl) {
        super(gl);
        this.TARGET_WIDTH = 240;
        this.TARGET_HEIGHT = 240;

        // Create a div container for text overlays
        this.textOverlay = document.createElement('div');
        this.textOverlay.style.position = 'absolute';
        this.textOverlay.style.top = '0';
        this.textOverlay.style.left = '0';
        this.textOverlay.style.width = `${this.TARGET_WIDTH}px`;
        this.textOverlay.style.height = `${this.TARGET_HEIGHT}px`;
        this.textOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
        this.textOverlay.style.overflow = 'hidden';

        // Insert the overlay after the canvas
        const canvas = gl.canvas;
        canvas.parentNode.insertBefore(this.textOverlay, canvas.nextSibling);

        // Set canvas position to relative if it's not already positioned
        const canvasStyle = window.getComputedStyle(canvas);
        if (canvasStyle.position === 'static') {
            canvas.style.position = 'relative';
        }
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

        // Debug visualization
        if (params.showCenters) {
            this.drawCellCenters(rectangles);
        }
        if (params.showBoundary) {
            this.highlightBoundaryCells(rectangles, params);
        }

        // Handle indices display
        this.updateCellIndices(rectangles, params.showIndices);

        // Update params with actual values
        params.cols = this.gridParams.cols;
        params.rows = this.gridParams.rows;
        params.width = this.gridParams.width;
        params.height = this.gridParams.height;
    }

    drawCellCenters(rectangles) {
        rectangles.forEach((rect) => {
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            this.drawCircle(centerX, centerY, 2, [1, 0, 0, 1]); // Red dots for centers
        });
    }

    updateCellIndices(rectangles, show) {
        // Clear previous indices
        this.textOverlay.innerHTML = '';

        if (!show) return;

        // Make sure the overlay has the same position and dimensions as the canvas
        const canvas = this.gl.canvas;
        const canvasBounds = canvas.getBoundingClientRect();
        const parentBounds = canvas.parentElement.getBoundingClientRect();

        // Position the overlay to exactly match the canvas position
        this.textOverlay.style.position = 'absolute';
        this.textOverlay.style.top = `${canvas.offsetTop}px`;
        this.textOverlay.style.left = `${canvas.offsetLeft}px`;
        this.textOverlay.style.width = `${canvas.width}px`;
        this.textOverlay.style.height = `${canvas.height}px`;

        // Create an index label for each cell
        rectangles.forEach((rect, i) => {
            // Calculate font size based on this specific cell's dimensions
            const cellSize = Math.min(rect.width, rect.height);
            const fontSize = Math.max(5.5, Math.min(12, cellSize / 3.5));

            const label = document.createElement('div');
            label.textContent = i.toString();
            label.style.position = 'absolute';
            label.style.left = `${rect.x + rect.width / 2}px`;
            label.style.top = `${rect.y + rect.height / 2}px`;
            label.style.transform = 'translate(-50%, -50%)'; // Center text
            label.style.color = 'yellow';
            label.style.fontSize = `${fontSize}px`;
            label.style.fontFamily = 'Arial, sans-serif';
            // label.style.fontWeight = 'bold';
            label.style.textAlign = 'center';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.justifyContent = 'center';
            label.style.width = `${rect.width}px`;
            label.style.height = `${rect.height}px`;
            label.style.userSelect = 'none';
            label.style.pointerEvents = 'none';
            label.style.margin = '0';
            label.style.padding = '0';
            this.textOverlay.appendChild(label);
        });
    }

    highlightBoundaryCells(rectangles, params) {
        const center = 120;
        const radius = 120 * params.scale;

        rectangles.forEach((rect) => {
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const dist = Math.hypot(centerX - center, centerY - center);

            if (Math.abs(dist - radius) < 5) { // 5px threshold for boundary detection
                this.drawRectangle(rect.x, rect.y, rect.width, rect.height, [1, 0, 0, 0.3]);
            }
        });
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