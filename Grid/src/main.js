import { GridGenRenderer } from "./renderer/gridGenRenderer.js";
import { CircularBoundary } from "./boundary/circularBoundary.js";
import { RectangularBoundary } from "./boundary/rectangularBoundary.js";
import { UiManager } from "./ui/uiManager.js";
import { ScreenConfig } from "./config/screenConfig.js";
import { ScreenProfiles } from "./presets/screenProfiles.js";

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

        // Initialize with default screen configuration
        this.screenConfig = ScreenProfiles.getDefaultProfile();
        console.log("Using screen configuration:", this.screenConfig);

        // Initialize parameters
        this.params = {
            target: this.screenConfig.targetCells,
            gap: this.screenConfig.gap,
            aspectRatio: this.screenConfig.aspectRatio,
            scale: this.screenConfig.scale,
            cols: 0,
            rows: 0,
            width: 0,
            height: 0,
            centerOffsetX: 0,    // Offset for the grid center X position
            centerOffsetY: 0,    // Offset for the grid center Y position
            allowCut: this.screenConfig.allowCut,
            displayMode: 'masked',  // Default to masked view
            showIndices: false,     // Show cell indices
            showCellCenters: false, // Show cell centers
            showCellCounts: false,  // Enable cell counts by default
            boundaryType: this.screenConfig.shape, // Use shape from screen config
            boundaryParams: {
                width: this.screenConfig.physicalWidth,   // Width for rectangular boundary
                height: this.screenConfig.physicalHeight, // Height for rectangular boundary
            },
            cellCount: {
                total: 0,
                inside: 0,
                boundary: 0
            },
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

        // Initialize canvas dimensions based on screen config
        this.updateCanvasDimensions();

        // Initialize renderer with screen config
        this.renderer = new GridGenRenderer(this.gl, this.screenConfig);

        // Set renderer instance to be accessed by UI
        this.gridParams = this.params;

        // Initialize UI manager
        this.ui = new UiManager(this);

        // Initial render
        this.renderer.updateGrid(this.params);
    }

    // Update canvas dimensions based on screen configuration
    updateCanvasDimensions() {
        if (!this.canvas) return;

        // Get dimensions from screen config if available
        if (this.screenConfig) {
            const canvasDims = this.screenConfig.getCanvasDimensions();
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
            return;
        }

        // Legacy fallback if screen config is not available
        const boundaryType = this.params.boundaryType;
        let width, height, ratio;

        if (boundaryType === 'circular') {
            // Circular boundary has 1:1 aspect ratio
            width = this.MAX_CANVAS_SIZE;
            height = this.MAX_CANVAS_SIZE;
        } else {
            // Rectangular boundary - use the specified width/height ratio
            const boundaryWidth = this.params.boundaryParams.width;
            const boundaryHeight = this.params.boundaryParams.height;
            ratio = boundaryWidth / boundaryHeight;

            if (ratio >= 1) {
                // Width is greater than or equal to height
                width = this.MAX_CANVAS_SIZE;
                height = Math.round(width / ratio);
            } else {
                // Height is greater than width
                height = this.MAX_CANVAS_SIZE;
                width = Math.round(height * ratio);
            }
        }

        // Update canvas dimensions
        this.canvas.width = width;
        this.canvas.height = height;

        // Log the new dimensions
        console.log(`Canvas dimensions updated: ${width}x${height}`);
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