import { BaseRenderer } from "./baseRenderer.js";

export class GridGenRenderer extends BaseRenderer {
    constructor(gl) {
        super(gl);
        this.TARGET_WIDTH = 240;
        this.TARGET_HEIGHT = 240;

        // Make sure we create a WebGL context with stencil buffer
        if (!gl.getContextAttributes().stencil) {
            console.warn("Stencil buffer not available, masking will not work correctly");
        }

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

        // Cell count overlay
        this.countOverlay = document.createElement('div');
        this.countOverlay.style.position = 'absolute';
        this.countOverlay.style.top = '10px';
        this.countOverlay.style.left = '10px';
        this.countOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.countOverlay.style.color = 'white';
        this.countOverlay.style.padding = '8px';
        this.countOverlay.style.fontFamily = 'Arial, sans-serif';
        this.countOverlay.style.fontSize = '12px';
        this.countOverlay.style.borderRadius = '4px';
        this.countOverlay.style.display = 'none';
        canvas.parentNode.insertBefore(this.countOverlay, canvas.nextSibling);

        // Create a framebuffer for offscreen rendering
        this.framebuffer = gl.createFramebuffer();

        // Create a texture to render to
        this.renderTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.TARGET_WIDTH, this.TARGET_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Create a renderbuffer for depth
        this.depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.TARGET_WIDTH, this.TARGET_HEIGHT);

        // Attach texture and renderbuffer to framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.renderTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);

        // Reset bindings
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    updateGrid(params) {
        // Clear canvas and overlays
        this.gl.clearColor(0, 0, 0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
        this.textOverlay.innerHTML = '';

        // Setup shader program
        this.gl.useProgram(this.programInfo.program);
        this.gl.uniform2f(
            this.programInfo.uniformLocations.resolution,
            this.TARGET_WIDTH,
            this.TARGET_HEIGHT
        );

        // Draw reference circles
        this.drawCircle(120, 120, 120, [0.9, 0.9, 0.9, 1]); // Outer circle
        this.drawCircle(120, 120, 120 * params.scale, [0.1, 0.1, 0.1, 1]); // Inner circle

        // Generate grid
        const rectangles = this.generateRectangles(params);

        // Classify cells as inside or boundary
        this.classifyCells(rectangles);

        // Draw cells based on display mode
        this.renderCells(rectangles, params.displayMode);

        // Draw indices if enabled
        if (params.showIndices) {
            this.updateCellIndices(rectangles, params.displayMode);
        }

        // Update cell count display
        this.updateCellCountDisplay(rectangles, params.showCellCounts);

        // Update params with actual values
        params.cols = this.gridParams.cols;
        params.rows = this.gridParams.rows;
        params.width = this.gridParams.width;
        params.height = this.gridParams.height;
        params.cellCount.total = rectangles.length;
        params.cellCount.inside = rectangles.filter(r => r.cellType === 'inside').length;
        params.cellCount.boundary = rectangles.filter(r => r.cellType === 'boundary').length;
    }

    classifyCells(rectangles) {
        const CENTER_X = 120;
        const CENTER_Y = 120;
        const RADIUS = 120;

        rectangles.forEach(rect => {
            // Cell corners
            const corners = [
                { x: rect.x, y: rect.y }, // Top-left
                { x: rect.x + rect.width, y: rect.y }, // Top-right
                { x: rect.x, y: rect.y + rect.height }, // Bottom-left
                { x: rect.x + rect.width, y: rect.y + rect.height } // Bottom-right
            ];

            // Cell center
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;
            const centerDist = Math.hypot(centerX - CENTER_X, centerY - CENTER_Y);

            // Check if any corner is outside the circle
            const anyCornerOutside = corners.some(corner =>
                Math.hypot(corner.x - CENTER_X, corner.y - CENTER_Y) > RADIUS
            );

            // Check if any edge intersects the circle
            const edges = [
                // Horizontal edges
                { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y },
                { x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height },
                // Vertical edges
                { x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height },
                { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height }
            ];

            const edgeIntersectsCircle = edges.some(edge =>
                this.lineIntersectsCircle(
                    edge.x1, edge.y1, edge.x2, edge.y2,
                    CENTER_X, CENTER_Y, RADIUS
                )
            );

            // Classify the cell
            if (centerDist <= RADIUS && !anyCornerOutside) {
                // Cell is fully inside the circle
                rect.cellType = 'inside';
                rect.color = [0.5, 0.5, 0.5, 1.0]; // Normal gray
            } else if (centerDist <= RADIUS || edgeIntersectsCircle || !anyCornerOutside) {
                // Cell is on the boundary (center inside or edge intersects or some corners inside)
                rect.cellType = 'boundary';
                rect.color = [0.5, 0.5, 0.5, 1.0]; // Normal gray (color will be changed in render)
            } else {
                // Cell is fully outside
                rect.cellType = 'outside';
                rect.color = [0.5, 0.5, 0.5, 1.0]; // Normal gray
            }
        });
    }

    renderCells(rectangles, displayMode) {
        // Define colors for different cell types
        const colors = {
            inside: [0.5, 0.5, 0.5, 1.0],     // Normal gray
            boundary: [0.6, 0.4, 0.4, 1.0],   // Reddish
            outside: [0.3, 0.3, 0.3, 1.0]     // Darker gray
        };

        // Special handling for masked mode
        if (displayMode === 'masked') {
            this.renderMaskedCells(rectangles, colors);
            return;
        }

        // Draw cells based on other display modes
        rectangles.forEach(rect => {
            let shouldDraw = false;
            let customColor = null;

            switch (displayMode) {
                case 'all':
                    // Draw all cells with their regular color
                    shouldDraw = true;
                    break;
                case 'inside':
                    // Only draw cells fully inside the circle
                    shouldDraw = rect.cellType === 'inside';
                    break;
                case 'boundary':
                    // Only draw boundary cells, with highlighted color
                    shouldDraw = rect.cellType === 'boundary';
                    customColor = colors.boundary;
                    break;
            }

            if (shouldDraw) {
                this.drawRectangle(
                    rect.x, rect.y, rect.width, rect.height,
                    customColor || rect.color
                );
            }
        });
    }

    renderMaskedCells(rectangles, colors) {
        const gl = this.gl;
        const CENTER_X = 120;
        const CENTER_Y = 120;
        const RADIUS = 120;

        // Enable stencil test
        gl.enable(gl.STENCIL_TEST);
        gl.clear(gl.STENCIL_BUFFER_BIT);

        // Step 1: Draw the circle into the stencil buffer 
        gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        gl.stencilMask(0xFF);
        gl.colorMask(false, false, false, false); // Don't draw to color buffer

        this.drawCircle(CENTER_X, CENTER_Y, RADIUS, [1, 1, 1, 1]); // Color doesn't matter

        // Step 2: Only draw where the stencil buffer is set
        gl.colorMask(true, true, true, true); // Re-enable drawing to color buffer
        gl.stencilFunc(gl.EQUAL, 1, 0xFF);    // Draw only where stencil is 1
        gl.stencilMask(0x00);                 // Don't modify stencil buffer

        // Draw all cells, but they'll only appear inside the circle
        rectangles.forEach(rect => {
            const customColor = rect.cellType === 'boundary' ? colors.boundary : rect.color;
            // Only draw inside and boundary cells (filtered by the stencil test)
            if (rect.cellType !== 'outside') {
                this.drawRectangle(
                    rect.x, rect.y, rect.width, rect.height,
                    customColor
                );
            }
        });

        // Disable stencil test when done
        gl.disable(gl.STENCIL_TEST);
    }

    updateCellIndices(rectangles, displayMode) {
        // Determine which cells to display indices for
        const filteredRects = rectangles.filter(rect => {
            switch (displayMode) {
                case 'all': return true;
                case 'inside': return rect.cellType === 'inside';
                case 'boundary': return rect.cellType === 'boundary';
                case 'masked': return rect.cellType !== 'outside';
                default: return true;
            }
        });

        // Make sure the overlay has the same position as the canvas
        const canvas = this.gl.canvas;
        this.textOverlay.style.top = `${canvas.offsetTop}px`;
        this.textOverlay.style.left = `${canvas.offsetLeft}px`;
        this.textOverlay.style.width = `${canvas.width}px`;
        this.textOverlay.style.height = `${canvas.height}px`;

        // Create an index label for each filtered cell
        filteredRects.forEach((rect, i) => {
            // Calculate font size based on cell dimensions
            const cellSize = Math.min(rect.width, rect.height);
            const fontSize = Math.max(5.5, Math.min(12, cellSize / 3.5));

            const label = document.createElement('div');
            label.textContent = rectangles.indexOf(rect).toString(); // Use original index
            label.style.position = 'absolute';
            label.style.left = `${rect.x + rect.width / 2}px`;
            label.style.top = `${rect.y + rect.height / 2}px`;
            label.style.transform = 'translate(-50%, -50%)';
            label.style.color = 'red';
            label.style.fontSize = `${fontSize}px`;
            label.style.fontFamily = 'Arial, sans-serif';
            label.style.fontWeight = 'bold';
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

    updateCellCountDisplay(rectangles, show) {
        // Update cell count overlay
        this.countOverlay.style.display = show ? 'block' : 'none';

        if (show) {
            const total = rectangles.length;
            const inside = rectangles.filter(r => r.cellType === 'inside').length;
            const boundary = rectangles.filter(r => r.cellType === 'boundary').length;

            this.countOverlay.innerHTML = `
                <div>Total Cells: ${total}</div>
                <div>Inside Cells: ${inside}</div>
                <div>Boundary Cells: ${boundary}</div>
            `;
        }
    }

    lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
        // Calculate the closest point on the line to the circle center
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction vector
        const nx = dx / len;
        const ny = dy / len;

        // Vector from line start to circle center
        const vx = cx - x1;
        const vy = cy - y1;

        // Project this vector onto the line direction
        const projection = vx * nx + vy * ny;

        // Clamp projection to line segment
        const projectionClamped = Math.max(0, Math.min(len, projection));

        // Calculate closest point on line
        const closestX = x1 + projectionClamped * nx;
        const closestY = y1 + projectionClamped * ny;

        // Check if closest point is within radius
        return Math.hypot(closestX - cx, closestY - cy) <= r;
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

            // Add extra columns and rows to catch partial cells at the boundary
            if (params.boundaryMode === 'partial') {
                maxCols += 1;
                maxRows += 1;
            }

            const cols = maxCols * 2 + 1;
            const rows = maxRows * 2 + 1;

            const rectangles = [];
            for (let c = -maxCols; c <= maxCols; c++) {
                for (let r = -maxRows; r <= maxRows; r++) {
                    const dx = c * stepX;
                    const dy = r * stepY;

                    // Cell center position
                    const cellCenterX = center + dx;
                    const cellCenterY = center + dy;

                    // Cell corners
                    const left = cellCenterX - scaledW / 2;
                    const right = cellCenterX + scaledW / 2;
                    const top = cellCenterY - scaledH / 2;
                    const bottom = cellCenterY + scaledH / 2;

                    // Check if cell center is inside the circle
                    const centerDist = Math.hypot(dx, dy);
                    const centerInside = centerDist <= radius;

                    // For partial mode, also check if any corner is inside the circle
                    let cornerInside = false;
                    if (params.boundaryMode === 'partial' && !centerInside) {
                        const cornerDistances = [
                            Math.hypot(left - center, top - center),
                            Math.hypot(right - center, top - center),
                            Math.hypot(left - center, bottom - center),
                            Math.hypot(right - center, bottom - center)
                        ];
                        cornerInside = cornerDistances.some(dist => dist <= radius);
                    }

                    // Determine if we should include this cell
                    const includeCell = centerInside || (params.boundaryMode === 'partial' && cornerInside);

                    if (includeCell) {
                        rectangles.push({
                            x: Math.round(left),
                            y: Math.round(top),
                            width: scaledW,
                            height: scaledH,
                            color: [0.5, 0.5, 0.5, 1],
                            cellType: 'unknown' // Will be classified later
                        });
                    }
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