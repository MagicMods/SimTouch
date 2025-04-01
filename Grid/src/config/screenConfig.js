export class ScreenConfig {
    constructor(options = {}) {
        // Physical screen properties
        this.physicalWidth = options.physicalWidth || 240;
        this.physicalHeight = options.physicalHeight || 240;
        this.shape = options.shape || 'circular'; // 'circular' or 'rectangular'

        // Grid parameters
        this.targetCells = options.targetCells || 341;
        this.scale = options.scale || 0.986;
        this.gap = options.gap || 1;
        this.aspectRatio = options.aspectRatio || 1.0;
        this.allowCut = options.allowCut !== undefined ? options.allowCut : 1;

        // Visual rendering properties
        this.maxRenderWidth = options.maxRenderWidth || 960;

        // Optional name for profiles
        this.name = options.name || 'Custom';
    }

    // Calculate canvas dimensions based on physical screen ratio and max width constraint
    getCanvasDimensions() {
        const ratio = this.physicalWidth / this.physicalHeight;

        let renderWidth, renderHeight;

        if (ratio >= 1) {
            // Width >= Height (landscape or square)
            renderWidth = Math.min(this.maxRenderWidth, 960);
            renderHeight = renderWidth / ratio;
        } else {
            // Height > Width (portrait)
            renderHeight = Math.min(this.maxRenderWidth, 960);
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
        return renderDims.width / this.physicalWidth;
    }

    // Clone the configuration
    clone() {
        return new ScreenConfig({
            physicalWidth: this.physicalWidth,
            physicalHeight: this.physicalHeight,
            shape: this.shape,
            targetCells: this.targetCells,
            scale: this.scale,
            gap: this.gap,
            aspectRatio: this.aspectRatio,
            allowCut: this.allowCut,
            maxRenderWidth: this.maxRenderWidth,
            name: this.name + ' (copy)'
        });
    }
} 