import { GridGenRenderer } from "./renderer/gridGenRenderer.js";
import { CircularBoundary } from "./boundary/circularBoundary.js";
import { RectangularBoundary } from "./boundary/rectangularBoundary.js";
import { UiManager } from "./ui/uiManager.js";

class Main {
    constructor() {
        // Initialize WebGL context with stencil buffer
        this.canvas = document.getElementById("glCanvas");
        this.gl = this.canvas.getContext("webgl", { stencil: true });

        if (!this.gl) {
            console.error("WebGL not supported");
            return;
        }

        // Set max canvas dimension
        this.MAX_CANVAS_SIZE = 960;

        // Make boundary classes available for UI
        this.CircularBoundary = CircularBoundary;
        this.RectangularBoundary = RectangularBoundary;

        // Debug log to verify boundary classes are correctly imported
        console.log("Main.js - Boundary classes check:", {
            CircularBoundary: typeof CircularBoundary,
            RectangularBoundary: typeof RectangularBoundary,
            CircularPrototype: CircularBoundary.prototype,
            RectangularPrototype: RectangularBoundary.prototype
        });

        // Instead of initializing with ScreenProfiles, set default values directly
        // Initialize parameters with default 240x240 circular grid (the "sweet spot" configuration)
        this.params = {
            // Physical screen properties (moved from ScreenConfig)
            physicalWidth: 240,
            physicalHeight: 240,
            shape: 'circular', // 'circular' or 'rectangular'

            // Grid generation parameters
            target: 341,
            gap: 1,
            aspectRatio: 1.0,
            scale: 0.986,
            allowCut: 3,

            // Grid position parameters
            cols: 0,
            rows: 0,
            width: 0,
            height: 0,
            centerOffsetX: 0,
            centerOffsetY: 0,

            // Display parameters
            displayMode: 'masked',
            showIndices: false,
            showCellCenters: false,
            showCellCounts: false,

            // Boundary parameters
            boundaryType: 'circular',
            boundaryParams: {
                width: 240,   // Width for rectangular boundary
                height: 240,  // Height for rectangular boundary
            },

            // Cell count tracking
            cellCount: {
                total: 0,
                inside: 0,
                boundary: 0
            },

            // Visual rendering properties
            maxRenderWidth: 960,

            // Color settings - using [r,g,b] normalized format (0-1)
            colors: {
                background: [0, 0, 0],            // Black background
                insideCells: [0.5, 0.5, 0.5],     // Gray for inside cells
                boundaryCells: [0.6, 0.4, 0.4],   // Reddish for boundary cells
                outsideCells: [0.3, 0.3, 0.3],    // Darker gray for outside cells
                indexText: [1, 1, 0],             // Yellow for indices
                outerCircle: [0.9, 0.9, 0.9],     // Light gray for outer circle
                innerCircle: [0.1, 0.1, 0.1],     // Dark gray for inner circle
                maskCircle: [0.15, 0.15, 0.15]    // Dark gray for mask circle
            }
        };

        // Initialize canvas dimensions based on physical dimensions
        this.updateCanvasDimensions();

        // Initialize renderer with parameters
        this.renderer = new GridGenRenderer(this.gl, this.params);

        // Set renderer instance to be accessed by UI
        this.gridParams = this.params;

        // Initialize UI manager
        this.ui = new UiManager(this);

        // Initial render
        this.renderer.updateGrid(this.params);
    }

    // Calculate canvas dimensions based on physical screen ratio and max width constraint
    getCanvasDimensions() {
        const ratio = this.params.physicalWidth / this.params.physicalHeight;

        let renderWidth, renderHeight;

        if (ratio >= 1) {
            // Width >= Height (landscape or square)
            renderWidth = Math.min(this.params.maxRenderWidth, 960);
            renderHeight = renderWidth / ratio;
        } else {
            // Height > Width (portrait)
            renderHeight = Math.min(this.params.maxRenderWidth, 960);
            renderWidth = renderHeight * ratio;
        }

        return {
            width: Math.round(renderWidth),
            height: Math.round(renderHeight),
            centerX: Math.round(renderWidth / 2),
            centerY: Math.round(renderHeight / 2)
        };
    }

    // Get scale factor between physical and rendering dimensions
    getRenderScale() {
        const renderDims = this.getCanvasDimensions();
        return renderDims.width / this.params.physicalWidth;
    }

    // Update canvas dimensions based on physical dimensions
    updateCanvasDimensions() {
        if (!this.canvas) return;

        // Get dimensions from physical parameters
        const canvasDims = this.getCanvasDimensions();
        this.canvas.width = canvasDims.width;
        this.canvas.height = canvasDims.height;

        // Update canvas visual style based on boundary type
        if (this.params.boundaryType === 'circular') {
            this.canvas.style.borderRadius = '50%';
        } else {
            this.canvas.style.borderRadius = '1%';
        }

        // Update GL viewport if renderer is initialized
        if (this.renderer && this.renderer.gl) {
            this.renderer.gl.viewport(0, 0, canvasDims.width, canvasDims.height);
        }

        console.log(`Canvas dimensions updated: ${canvasDims.width}x${canvasDims.height}`);
    }

    // Animation loop (for future animation support)
    animate() {
        // Update any animated components
        if (this.ui) {
            this.ui.update(1 / 60); // Use fixed timestep for now
        }

        // Update stats if renderer has updated them
        if (this.renderer && this.renderer.gridParams) {
            // If physical dimensions are available, update those directly
            if (this.renderer.gridParams.physicalWidth !== undefined) {
                this.params.physicalWidth = this.renderer.gridParams.physicalWidth;
                this.params.physicalHeight = this.renderer.gridParams.physicalHeight;

                // Also update the standard width/height for backwards compatibility
                this.params.width = this.renderer.gridParams.physicalWidth;
                this.params.height = this.renderer.gridParams.physicalHeight;
            } else {
                // Otherwise, use the visual dimensions
                this.params.width = this.renderer.gridParams.width;
                this.params.height = this.renderer.gridParams.height;
            }

            // Update other grid stats
            this.params.cols = this.renderer.gridParams.cols;
            this.params.rows = this.renderer.gridParams.rows;
        }

        // Request next frame
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize application when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const app = new Main();
    // Start animation loop if needed
    app.animate();
}); 