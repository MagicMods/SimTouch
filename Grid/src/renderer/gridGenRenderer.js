import { BaseRenderer } from "./baseRenderer.js";
import { CircularBoundary } from "../boundary/circularBoundary.js";
import { RectangularBoundary } from "../boundary/rectangularBoundary.js";

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

        // Create another div container for cell center indicators
        this.centerOverlay = document.createElement('div');
        this.centerOverlay.style.position = 'absolute';
        this.centerOverlay.style.top = '0';
        this.centerOverlay.style.left = '0';
        this.centerOverlay.style.width = `${this.TARGET_WIDTH}px`;
        this.centerOverlay.style.height = `${this.TARGET_HEIGHT}px`;
        this.centerOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
        this.centerOverlay.style.overflow = 'hidden';

        // Insert the overlays after the canvas
        const canvas = gl.canvas;
        canvas.parentNode.insertBefore(this.textOverlay, canvas.nextSibling);
        canvas.parentNode.insertBefore(this.centerOverlay, canvas.nextSibling);

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

        // Initialize boundary (default to circular)
        this.boundary = new CircularBoundary(120, 120, 120);

        // Store gridParams for stats
        this.gridParams = {
            cols: 0,
            rows: 0,
            width: 0,
            height: 0
        };
    }

    updateGrid(grid) {
        this.grid = grid;
        this.gridW = grid.cols;
        this.gridH = grid.rows;
        this.gridParams = {
            cols: grid.cols,
            rows: grid.rows,
            width: grid.width,
            height: grid.height
        };

        // Update renderables
        this.updateRenderables();
    }

    updateRenderables() {
        // Get background color from params or default to black
        const bgColor = this.grid.colors && this.grid.colors.background
            ? [...this.grid.colors.background, 1.0] // Add alpha=1
            : [0, 0, 0, 1.0];

        // Clear canvas and overlays
        this.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
        this.textOverlay.innerHTML = '';
        this.centerOverlay.innerHTML = '';

        // Setup shader program
        this.gl.useProgram(this.programInfo.program);
        this.gl.uniform2f(
            this.programInfo.uniformLocations.resolution,
            this.TARGET_WIDTH,
            this.TARGET_HEIGHT
        );

        // Get colors from params for reference shapes
        const outerColor = this.grid.colors && this.grid.colors.outerCircle
            ? [...this.grid.colors.outerCircle, 1] // Add alpha=1
            : [0.9, 0.9, 0.9, 1];

        const innerColor = this.grid.colors && this.grid.colors.innerCircle
            ? [...this.grid.colors.innerCircle, 1] // Add alpha=1
            : [0.1, 0.1, 0.1, 1];

        const maskColor = this.grid.colors && this.grid.colors.maskCircle
            ? [...this.grid.colors.maskCircle, 1] // Add alpha=1
            : [0.15, 0.15, 0.15, 1];

        // Calculate the base center position and apply offset
        const baseCenter = 120;
        const centerX = baseCenter + (this.grid.centerOffsetX || 0);
        const centerY = baseCenter + (this.grid.centerOffsetY || 0);

        // Draw reference shapes based on boundary type
        if (this.boundary instanceof CircularBoundary) {
            // Draw circular reference
            this.drawCircle(centerX, centerY, 120, outerColor); // Outer circle
            this.drawCircle(centerX, centerY, 120 * this.grid.scale, innerColor); // Inner circle
        } else if (this.boundary instanceof RectangularBoundary) {
            // Draw rectangular reference
            const halfWidth = (this.boundary.width * this.grid.scale) / 2;
            const halfHeight = (this.boundary.height * this.grid.scale) / 2;
            this.drawRectangle(
                centerX - halfWidth, centerY - halfHeight,
                this.boundary.width * this.grid.scale,
                this.boundary.height * this.grid.scale,
                outerColor
            );
        }

        // Generate grid
        const rectangles = this.generateRectangles(this.grid);

        // Classify cells using the boundary system
        this.classifyCells(rectangles, this.grid.allowCut);

        // Store color parameters to be used in rendering
        if (this.grid.colors) {
            this.cellColors = {
                inside: [...this.grid.colors.insideCells, 1.0], // Add alpha=1 
                boundary: [...this.grid.colors.boundaryCells, 1.0],
                outside: [...this.grid.colors.outsideCells, 1.0],
                background: bgColor,
                maskCircle: maskColor
            };
        } else {
            // Default colors if not specified
            this.cellColors = {
                inside: [0.5, 0.5, 0.5, 1.0],
                boundary: [0.6, 0.4, 0.4, 1.0],
                outside: [0.3, 0.3, 0.3, 1.0],
                background: [0, 0, 0, 1.0],
                maskCircle: [0.15, 0.15, 0.15, 1.0]
            };
        }

        // Draw cells based on display mode
        this.renderCells(rectangles, this.grid.displayMode);

        // Draw indices if enabled
        if (this.grid.showIndices) {
            this.updateCellIndices(rectangles, this.grid.displayMode, this.grid.colors?.indexText);
        }

        // Draw cell centers if enabled
        if (this.grid.showCellCenters) {
            this.updateCellCenters(rectangles, this.grid.displayMode);
        }

        // Update cell count display
        this.updateCellCountDisplay(rectangles, this.grid.showCellCounts);

        // Update params with actual values
        this.grid.cols = this.gridParams.cols;
        this.grid.rows = this.gridParams.rows;
        this.grid.width = this.gridParams.width;
        this.grid.height = this.gridParams.height;
        this.grid.cellCount.total = rectangles.length;
        this.grid.cellCount.inside = rectangles.filter(r => r.cellType === 'inside').length;
        this.grid.cellCount.boundary = rectangles.filter(r => r.cellType === 'boundary').length;
    }

    classifyCells(rectangles, allowCut = 1) {
        rectangles.forEach(rect => {
            rect.cellType = this.boundary.classifyCell(rect, allowCut);
        });
    }

    renderCells(rectangles, displayMode) {
        // Use stored colors from updateGrid
        const colors = this.cellColors || {
            inside: [0.5, 0.5, 0.5, 1.0],
            boundary: [0.6, 0.4, 0.4, 1.0],
            outside: [0.3, 0.3, 0.3, 1.0]
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

            // Special case: When allowCut is 0, show all cells
            if (this.grid.allowCut === 0) {
                shouldDraw = true;
                customColor = rect.cellType === 'inside' ? colors.inside :
                    (rect.cellType === 'boundary' ? colors.boundary : colors.outside);
            } else {
                // Standard display modes
                switch (displayMode) {
                    case 'all':
                        // Draw all cells with their regular color
                        shouldDraw = true;
                        customColor = colors[rect.cellType];
                        break;
                    case 'inside':
                        // Only draw cells fully inside the circle
                        shouldDraw = rect.cellType === 'inside';
                        customColor = colors.inside;
                        break;
                    case 'boundary':
                        // Only draw boundary cells, with highlighted color
                        shouldDraw = rect.cellType === 'boundary';
                        customColor = colors.boundary;
                        break;
                }
            }

            if (shouldDraw) {
                this.drawRectangle(
                    rect.x, rect.y, rect.width, rect.height,
                    customColor
                );
            }
        });
    }

    renderMaskedCells(rectangles, colors) {
        const gl = this.gl;
        const boundary = this.boundary;
        const center = boundary.getCenter();

        // Apply offset to center coordinates
        const baseCenter = 120;
        const centerOffsetX = this.grid.centerOffsetX || 0;
        const centerOffsetY = this.grid.centerOffsetY || 0;
        const centerX = baseCenter + centerOffsetX;
        const centerY = baseCenter + centerOffsetY;

        // Clear with background color
        gl.clearColor(colors.background[0], colors.background[1], colors.background[2], colors.background[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        // Special case: When allowCut is 0, show all cells with appropriate colors, no masking
        if (this.grid.allowCut === 0) {
            rectangles.forEach(rect => {
                let cellColor;
                if (rect.cellType === 'inside') {
                    cellColor = colors.inside;
                } else if (rect.cellType === 'boundary') {
                    cellColor = colors.boundary;
                } else {
                    cellColor = colors.outside;
                }

                this.drawRectangle(
                    rect.x, rect.y, rect.width, rect.height,
                    cellColor
                );
            });

            // Draw the mask shape outline (for visual reference)
            if (this.boundary instanceof CircularBoundary) {
                // For circular boundary, draw a circle outline
                this.drawCircleOutline(centerX, centerY, this.boundary.getRadius(), colors.maskCircle);
            } else if (this.boundary instanceof RectangularBoundary) {
                // For rectangular boundary, draw a rectangle outline
                const halfWidth = (this.boundary.width * this.boundary.getScale()) / 2;
                const halfHeight = (this.boundary.height * this.boundary.getScale()) / 2;
                this.drawRectangleOutline(
                    centerX - halfWidth, centerY - halfHeight,
                    this.boundary.width * this.boundary.getScale(),
                    this.boundary.height * this.boundary.getScale(),
                    colors.maskCircle
                );
            }

            return;
        }

        // Draw the mask shape (this is visible outside the stencil)
        if (this.boundary instanceof CircularBoundary) {
            // For circular boundary, draw a circle
            this.drawCircle(centerX, centerY, this.boundary.getRadius(), colors.maskCircle);
        } else if (this.boundary instanceof RectangularBoundary) {
            // For rectangular boundary, draw a rectangle
            const halfWidth = (this.boundary.width * this.boundary.getScale()) / 2;
            const halfHeight = (this.boundary.height * this.boundary.getScale()) / 2;
            this.drawRectangle(
                centerX - halfWidth, centerY - halfHeight,
                this.boundary.width * this.boundary.getScale(),
                this.boundary.height * this.boundary.getScale(),
                colors.maskCircle
            );
        }

        // Enable stencil test
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        gl.stencilMask(0xFF);

        // First pass: Draw the boundary shape into the stencil buffer (but don't show it)
        gl.colorMask(false, false, false, false); // Don't draw to color buffer
        if (this.boundary instanceof CircularBoundary) {
            // For circular boundary, use a circle stencil
            this.drawCircle(center.x, center.y, this.boundary.getRadius(), [1, 1, 1, 1]);
        } else if (this.boundary instanceof RectangularBoundary) {
            // For rectangular boundary, use a rectangle stencil
            const halfWidth = (this.boundary.width * this.boundary.getScale()) / 2;
            const halfHeight = (this.boundary.height * this.boundary.getScale()) / 2;
            this.drawRectangle(
                center.x - halfWidth, center.y - halfHeight,
                this.boundary.width * this.boundary.getScale(),
                this.boundary.height * this.boundary.getScale(),
                [1, 1, 1, 1]
            );
        }

        // Second pass: Only draw where the stencil is 1 (inside boundary)
        gl.colorMask(true, true, true, true); // Re-enable drawing to color buffer
        gl.stencilFunc(gl.EQUAL, 1, 0xFF);    // Draw only where stencil is 1
        gl.stencilMask(0x00);                 // Don't modify stencil buffer

        // Draw each rectangle, applying the stencil mask
        rectangles.forEach(rect => {
            if (rect.cellType === 'inside') {
                // Inside cells with the custom color
                this.drawRectangle(
                    rect.x, rect.y, rect.width, rect.height,
                    colors.inside
                );
            } else if (rect.cellType === 'boundary') {
                // Boundary cells with the custom color
                this.drawRectangle(
                    rect.x, rect.y, rect.width, rect.height,
                    colors.boundary
                );
            }
        });

        // Disable stencil when done
        gl.disable(gl.STENCIL_TEST);
    }

    updateCellIndices(rectangles, displayMode, indexTextColor) {
        // Determine which cells to display indices for
        const filteredRects = rectangles.filter(rect => {
            // Special case: When allowCut is 0, show indices for all cells
            if (this.grid.allowCut === 0) {
                return true;
            }

            // Otherwise filter based on displayMode
            switch (displayMode) {
                case 'all': return true;
                case 'inside': return rect.cellType === 'inside';
                case 'boundary': return rect.cellType === 'boundary';
                case 'masked': return rect.cellType !== 'outside';
                default: return true;
            }
        });

        // Clear previous indices
        this.textOverlay.innerHTML = '';

        // Make sure the overlay has the same position as the canvas
        const canvas = this.gl.canvas;
        this.textOverlay.style.top = `${canvas.offsetTop}px`;
        this.textOverlay.style.left = `${canvas.offsetLeft}px`;
        this.textOverlay.style.width = `${canvas.width}px`;
        this.textOverlay.style.height = `${canvas.height}px`;

        // Calculate the scaling ratio between our fixed target size and actual canvas size
        const scaleX = canvas.width / this.TARGET_WIDTH;
        const scaleY = canvas.height / this.TARGET_HEIGHT;

        // Keep the index color as yellow by default (as set by user)
        // We don't modify the CSS color unless explicitly requested
        const textColorCSS = indexTextColor
            ? `rgb(${Math.round(indexTextColor[0] * 255)}, ${Math.round(indexTextColor[1] * 255)}, ${Math.round(indexTextColor[2] * 255)})`
            : 'yellow';

        // Create an index label for each filtered cell
        filteredRects.forEach((rect, i) => {
            // Calculate font size based on cell dimensions and scaling
            const cellSize = Math.min(rect.width, rect.height);
            const fontSize = Math.max(5.5, Math.min(12, cellSize / 3.5)) * Math.min(scaleX, scaleY);

            // Calculate the center position in target coordinates (240x240)
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;

            // Scale the position to match actual canvas size
            const scaledX = centerX * scaleX;
            const scaledY = centerY * scaleY;

            // Scale the width and height to match actual canvas size
            const scaledWidth = rect.width * scaleX;
            const scaledHeight = rect.height * scaleY;

            const label = document.createElement('div');
            label.textContent = rectangles.indexOf(rect).toString(); // Use original index
            label.style.position = 'absolute';
            label.style.left = `${scaledX}px`;
            label.style.top = `${scaledY}px`;
            label.style.transform = 'translate(-50%, -50%)';
            label.style.color = textColorCSS;
            label.style.fontSize = `${fontSize}px`;
            label.style.fontFamily = 'Arial, sans-serif';
            label.style.textAlign = 'center';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.justifyContent = 'center';
            label.style.width = `${scaledWidth}px`;
            label.style.height = `${scaledHeight}px`;
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
            // Position overlay relative to the actual canvas size
            const canvas = this.gl.canvas;
            this.countOverlay.style.top = `${canvas.offsetTop + 10}px`;
            this.countOverlay.style.left = `${canvas.offsetLeft + 10}px`;

            // Adjust font size based on canvas scaling
            const scaleX = canvas.width / this.TARGET_WIDTH;
            const scaleY = canvas.height / this.TARGET_HEIGHT;
            const scaleFactor = Math.min(scaleX, scaleY);

            // Adjust font size proportionally
            const fontSize = Math.max(8, Math.round(12 * scaleFactor));
            this.countOverlay.style.fontSize = `${fontSize}px`;
            this.countOverlay.style.padding = `${Math.max(4, Math.round(8 * scaleFactor))}px`;

            const total = rectangles.length;
            const inside = rectangles.filter(r => r.cellType === 'inside').length;
            const boundary = rectangles.filter(r => r.cellType === 'boundary').length;

            // Group boundary cells by number of corners outside
            const outsideCornerCounts = [0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4 corners outside
            rectangles.forEach(rect => {
                if (rect.cellType === 'boundary' && typeof rect.cornersOutside === 'number') {
                    outsideCornerCounts[rect.cornersOutside]++;
                }
            });

            this.countOverlay.innerHTML = `
                <div>Total Cells: ${total}</div>
                <div>Inside Cells: ${inside}</div>
                <div>Boundary Cells: ${boundary}</div>
                <div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 8px;">
                    <div>Boundary corner cuts:</div>
                    <div>No cut: ${outsideCornerCounts[0]}</div>
                    <div>1 corner: ${outsideCornerCounts[1]}</div>
                    <div>2 corners: ${outsideCornerCounts[2]}</div>
                    <div>3 corners: ${outsideCornerCounts[3]}</div>
                    <div>4 corners: ${outsideCornerCounts[4]}</div>
                </div>
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
        const baseCenter = 120;
        // Apply the center offset to the grid position
        const centerX = baseCenter + (params.centerOffsetX || 0);
        const centerY = baseCenter + (params.centerOffsetY || 0);

        const radius = this.boundary.getRadius();
        const allowCut = params.allowCut !== undefined ? params.allowCut : 1;
        const boundaryMode = allowCut > 0 ? 'partial' : 'center';

        for (let cellH = 120; cellH >= 1; cellH--) {
            const scaledH = Math.max(1, Math.round(cellH * params.scale));
            const scaledW = Math.max(1, Math.round(params.aspectRatio * scaledH));

            const stepX = scaledW + params.gap;
            const stepY = scaledH + params.gap;

            let maxCols = 0,
                maxRows = 0;

            // Calculate grid size based on boundary type
            if (this.boundary instanceof CircularBoundary) {
                // For circular boundary, determine how many cells fit within the radius
                // Include cells that have any overlap with the boundary (not just 50%)
                while ((maxCols) * stepX <= radius + (stepX / 2)) maxCols++;
                while ((maxRows) * stepY <= radius + (stepY / 2)) maxRows++;
            } else if (this.boundary instanceof RectangularBoundary) {
                const halfWidth = (this.boundary.width * params.scale) / 2;
                const halfHeight = (this.boundary.height * params.scale) / 2;

                // For rectangular boundary, include cells with any overlap
                while ((maxCols) * stepX <= halfWidth + (stepX / 2)) maxCols++;
                while ((maxRows) * stepY <= halfHeight + (stepY / 2)) maxRows++;
            }

            // Add extra columns and rows to catch partial cells at the boundary
            if (boundaryMode === 'partial') {
                maxCols += 1;
                maxRows += 1;
            }

            // Determine start and end indices for cell placement
            let startCol, endCol, startRow, endRow;

            // Handle the special case of a single cell (or very small grid)
            if (maxCols === 0 && maxRows === 0) {
                // Place a single cell at the center
                startCol = 0;
                endCol = 0;
                startRow = 0;
                endRow = 0;
            } else {
                // Ensure the grid is symmetric around the center point
                startCol = -maxCols;
                endCol = maxCols;
                startRow = -maxRows;
                endRow = maxRows;
            }

            const cols = endCol - startCol + 1;
            const rows = endRow - startRow + 1;

            // Create cells using original row-by-row indexing
            const rectangles = [];
            for (let c = startCol; c <= endCol; c++) {
                for (let r = startRow; r <= endRow; r++) {
                    const dx = c * stepX;
                    const dy = r * stepY;

                    // Cell center position in canvas coordinates
                    const cellCenterX = centerX + dx;
                    const cellCenterY = centerY + dy;

                    // Cell corners
                    const left = cellCenterX - scaledW / 2;
                    const right = cellCenterX + scaledW / 2;
                    const top = cellCenterY - scaledH / 2;
                    const bottom = cellCenterY + scaledH / 2;

                    // Check if cell center is inside the boundary
                    const centerInside = this.boundary.isPointInside(cellCenterX, cellCenterY);

                    // Check corners for partial cells if allowing cuts
                    let includeCell = centerInside;
                    let cornersOutside = 0;

                    if (boundaryMode === 'partial' && !centerInside) {
                        const corners = [
                            { x: left, y: top },
                            { x: right, y: top },
                            { x: left, y: bottom },
                            { x: right, y: bottom }
                        ];

                        // Count corners outside the boundary
                        cornersOutside = corners.filter(corner =>
                            !this.boundary.isPointInside(corner.x, corner.y)
                        ).length;

                        // Check against the allowCut parameter
                        if (cornersOutside <= allowCut && cornersOutside < 4) {
                            includeCell = true;
                        }

                        // For edge case, check edge intersections when all corners are outside
                        if (!includeCell && cornersOutside === 4 && allowCut > 0) {
                            const edges = [
                                // Horizontal edges
                                { x1: left, y1: top, x2: right, y2: top },
                                { x1: left, y1: bottom, x2: right, y2: bottom },
                                // Vertical edges
                                { x1: left, y1: top, x2: left, y2: bottom },
                                { x1: right, y1: top, x2: right, y2: bottom }
                            ];

                            // Check if any edge intersects the boundary
                            const edgeIntersects = edges.some(edge =>
                                this.boundary.lineIntersectsBoundary(
                                    edge.x1, edge.y1, edge.x2, edge.y2
                                )
                            );

                            includeCell = edgeIntersects;
                        }
                    }

                    if (includeCell) {
                        rectangles.push({
                            x: Math.round(left),
                            y: Math.round(top),
                            width: scaledW,
                            height: scaledH,
                            color: [0.5, 0.5, 0.5, 1],
                            cellType: 'unknown', // Will be classified later
                            cornersOutside: cornersOutside, // Store corner count
                            cornersInside: 4 - cornersOutside
                        });

                        // Stop if we've reached the target number of cells
                        if (rectangles.length >= params.target) {
                            break;
                        }
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

    // New method to display cell centers
    updateCellCenters(rectangles, displayMode) {
        // Determine which cells to display centers for
        const filteredRects = rectangles.filter(rect => {
            // Special case: When allowCut is 0, show centers for all cells
            if (this.grid.allowCut === 0) {
                return true;
            }

            // Otherwise filter based on displayMode
            switch (displayMode) {
                case 'all': return true;
                case 'inside': return rect.cellType === 'inside';
                case 'boundary': return rect.cellType === 'boundary';
                case 'masked': return rect.cellType !== 'outside';
                default: return true;
            }
        });

        // Clear previous centers
        this.centerOverlay.innerHTML = '';

        // Make sure the overlay has the same position as the canvas
        const canvas = this.gl.canvas;
        this.centerOverlay.style.top = `${canvas.offsetTop}px`;
        this.centerOverlay.style.left = `${canvas.offsetLeft}px`;
        this.centerOverlay.style.width = `${canvas.width}px`;
        this.centerOverlay.style.height = `${canvas.height}px`;

        // Calculate the scaling ratio between our fixed target size and actual canvas size
        const scaleX = canvas.width / this.TARGET_WIDTH;
        const scaleY = canvas.height / this.TARGET_HEIGHT;

        // Create a center indicator for each filtered cell
        filteredRects.forEach(rect => {
            // Calculate center position in target coordinates (240x240)
            const centerX = rect.x + rect.width / 2;
            const centerY = rect.y + rect.height / 2;

            // Scale the position to match actual canvas size
            const scaledX = centerX * scaleX;
            const scaledY = centerY * scaleY;

            // Create the center dot with precise positioning
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.left = `${scaledX}px`;
            dot.style.top = `${scaledY}px`;
            dot.style.width = '3px';
            dot.style.height = '3px';
            dot.style.marginLeft = '-1.5px';  // Center the dot horizontally
            dot.style.marginTop = '-1.5px';   // Center the dot vertically
            dot.style.backgroundColor = rect.cellType === 'inside' ? 'lime' : 'red';
            dot.style.borderRadius = '50%';
            // Remove transform that could cause misalignment
            // dot.style.transform = 'translate(-50%, -50%)';
            dot.style.pointerEvents = 'none';
            dot.style.boxShadow = '0 0 2px rgba(0,0,0,0.8)';

            // Add a class based on the cell type for styling
            dot.classList.add(`cell-center-${rect.cellType}`);

            this.centerOverlay.appendChild(dot);
        });
    }

    // Draw a circle outline
    drawCircleOutline(centerX, centerY, radius, color, lineWidth = 1) {
        const gl = this.gl;
        const numSegments = 64; // Enough for smooth circle
        const vertices = [];

        // Calculate vertices for the circle
        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            vertices.push(x, y);
        }

        // Use the program
        gl.useProgram(this.programInfo.program);

        // Set uniform for color
        gl.uniform4fv(this.programInfo.uniformLocations.color, color);

        // Create buffer and bind data
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // Set attribute
        gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        gl.vertexAttribPointer(
            this.programInfo.attribLocations.position,
            2, gl.FLOAT, false, 0, 0
        );

        // Draw line loop
        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINE_LOOP, 0, numSegments + 1);

        // Cleanup
        gl.disableVertexAttribArray(this.programInfo.attribLocations.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(buffer);
    }

    // Draw a rectangle outline
    drawRectangleOutline(x, y, width, height, color, lineWidth = 1) {
        const gl = this.gl;
        const vertices = [
            x, y,                   // Bottom-left
            x + width, y,           // Bottom-right
            x + width, y + height,  // Top-right
            x, y + height,          // Top-left
            x, y                    // Back to bottom-left to close the loop
        ];

        // Use the program
        gl.useProgram(this.programInfo.program);

        // Set uniform for color
        gl.uniform4fv(this.programInfo.uniformLocations.color, color);

        // Create buffer and bind data
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // Set attribute
        gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        gl.vertexAttribPointer(
            this.programInfo.attribLocations.position,
            2, gl.FLOAT, false, 0, 0
        );

        // Draw line strip
        gl.lineWidth(lineWidth);
        gl.drawArrays(gl.LINE_STRIP, 0, 5);

        // Cleanup
        gl.disableVertexAttribArray(this.programInfo.attribLocations.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(buffer);
    }
} 