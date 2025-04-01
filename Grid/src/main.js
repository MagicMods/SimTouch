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

        // Initialize parameters
        this.params = {
            target: 341,
            gap: 1,
            aspectRatio: 1,
            scale: 0.982,
            cols: 0,
            rows: 0,
            width: 0,
            height: 0,
            centerOffsetX: 0,    // Offset for the grid center X position
            centerOffsetY: 0,    // Offset for the grid center Y position
            allowCut: 3,            // 0-3: Controls how many corners can be outside the boundary
            displayMode: 'masked',  // Default to masked view
            showIndices: false,     // Show cell indices
            showCellCenters: false, // Show cell centers
            showCellCounts: false,  // Enable cell counts by default
            boundaryType: 'circular', // Default to circular boundary
            boundaryParams: {
                width: 240,         // Width for rectangular boundary
                height: 240,        // Height for rectangular boundary
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

        // Initialize canvas dimensions based on boundary type
        this.updateCanvasDimensions();

        // Initialize renderer
        this.renderer = new GridGenRenderer(this.gl);

        // Set renderer instance to be accessed by UI
        this.gridParams = this.params;

        // Initialize UI manager
        this.ui = new UiManager(this);

        // Initial render
        this.renderer.updateGrid(this.params);
    }

    // Update canvas dimensions based on boundary aspect ratio
    updateCanvasDimensions() {
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
        if (this.canvas) {
            this.canvas.width = width;
            this.canvas.height = height;

            // Log the new dimensions
            console.log(`Canvas dimensions updated: ${width}x${height}`);
        }
    }

    // Animation loop (for future animation support)
    animate() {
        // Update any animated components
        if (this.ui) {
            this.ui.update(1 / 60); // Use fixed timestep for now
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