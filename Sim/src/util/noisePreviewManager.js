/**
 * NoisePreviewManager
 * Efficiently manages pattern previews with priority-based refreshing
 */
export class NoisePreviewManager {
    /**
     * @param {Object} turbulenceField - The turbulence field to generate previews from
     * @param {Number} previewSize - The size of the preview thumbnails
     * @param {Object} patterns - Map of pattern names to values
     */
    constructor(turbulenceField, previewSize, patterns) {
        this.turbulenceField = turbulenceField;
        this.previewSize = previewSize;
        this.patterns = patterns;
        this.patternEntries = Object.entries(patterns);

        // State
        this.selectedPattern = null;
        this.isFolderOpen = false;
        this.isParentFolderOpen = true; // New state to track parent folder visibility
        this.isVisible = false; // Will be updated after folder state is determined
        this.previewElements = new Map(); // Maps pattern values to DOM elements
        this.cleanupFunctions = new Map(); // Maps pattern values to cleanup functions
        this.lastRefreshTime = 0;
        this.animationFrameId = null;
        this.refreshingSelected = true; // Toggle between selected and unselected
        this._needsRefreshOnOpen = false; // Flag for refresh needed when reopening

        // Performance settings
        this.selectedFps = 15; // Lower default FPS for better performance
        this.hoverRefreshInterval = 100; // Refresh rate for hovered previews
        this.lastHoverRefreshTime = 0;

        // Parameter tracking for automatic refresh
        this._lastTurbulenceParams = this._captureCurrentParams();
        this._paramsCheckInterval = 500; // Check for parameter changes every 500ms
        this._lastParamsCheckTime = 0;

        // Track hover state
        this.hoveredPattern = null;
    }

    /**
     * Initialize with DOM container and create preview elements
     * @param {HTMLElement} containerElement - The container for preview elements
     * @param {Boolean} folderIsOpen - Whether the previews folder is open initially
     */
    initialize(containerElement, folderIsOpen = false) {
        this.containerElement = containerElement;

        // Store references to preview elements and add hover listeners
        const previewElements = containerElement.querySelectorAll('.pattern-preview');
        previewElements.forEach((element) => {
            const pattern = element.getAttribute('data-pattern');
            if (pattern) {
                this.previewElements.set(pattern, element);

                // Add hover listeners for unselected previews
                element.addEventListener('mouseenter', () => {
                    if (pattern !== this.selectedPattern) {
                        this.hoveredPattern = pattern;
                        this.lastHoverRefreshTime = 0; // Force immediate refresh
                    }
                });

                element.addEventListener('mouseleave', () => {
                    if (this.hoveredPattern === pattern) {
                        this.hoveredPattern = null;
                    }
                });
            }
        });

        // Generate initial static previews for all patterns
        this.generateAllStaticPreviews();

        // Set initial folder state
        this.setFolderOpen(folderIsOpen);

        // Check parent folder visibility
        this.checkParentFolderVisibility();

        // Explicitly ensure the refresh loop is started if visible
        this.ensureRefreshLoopStarted();
    }

    /**
     * Ensure the refresh loop is started if the previews are visible
     * This helps with initial load when the folder may already be open
     */
    ensureRefreshLoopStarted() {
        // Make sure visibility state is up to date
        this.updateVisibilityState();

        // If visible and animation loop isn't running, start it
        if (this.isVisible && !this.animationFrameId) {
            this.startRefreshLoop();

            // If we have a selected pattern, refresh it immediately
            if (this.selectedPattern) {
                this.refreshSelectedPreview();
            }
        }
    }

    /**
     * Check if any parent folders are closed, which would hide previews
     */
    checkParentFolderVisibility() {
        if (!this.containerElement) return;

        // Start from container and check all parent folders
        let element = this.containerElement;
        let isVisible = true;

        // Walk up the DOM until we hit the main GUI container
        while (element && !element.classList.contains('dg')) {
            // If we hit a closed folder, mark as not visible
            if (element.classList.contains('closed')) {
                isVisible = false;
                break;
            }

            const parent = element.parentElement;
            // Find parent folder if it exists
            if (parent) {
                const folderElement = parent.closest('.folder');
                if (folderElement === element) {
                    // We've reached the top of the folder hierarchy
                    break;
                }
                element = folderElement || parent;
            } else {
                break;
            }
        }

        // Update parent visibility state
        const prevParentState = this.isParentFolderOpen;
        this.isParentFolderOpen = isVisible;

        // Update combined visibility
        this.updateVisibilityState();

        // If visibility changed, handle refresh loop
        if (prevParentState !== this.isParentFolderOpen) {
            this.handleVisibilityChange();
        }
    }

    /**
     * Update the combined visibility state
     */
    updateVisibilityState() {
        const wasVisible = this.isVisible;
        this.isVisible = this.isFolderOpen && this.isParentFolderOpen;

        // If visibility changed, handle refresh loop
        if (wasVisible !== this.isVisible) {
            this.handleVisibilityChange();
        }
    }

    /**
     * Handle visibility changes by starting or stopping the refresh loop
     */
    handleVisibilityChange() {
        if (this.isVisible) {
            // If becoming visible, check if refresh needed
            if (this._needsRefreshOnOpen) {
                this.generateAllStaticPreviews();
                this._needsRefreshOnOpen = false;
            }
            this.startRefreshLoop();
        } else {
            // If becoming hidden, stop refresh
            this.stopRefreshLoop();
        }
    }

    /**
     * Helper method to generate a static preview image for a pattern
     * @param {String} patternValue - The pattern value to generate preview for
     * @param {Number} width - Width of the preview
     * @param {Number} height - Height of the preview
     * @returns {String} - Data URL of the preview image
     */
    generateStaticPreviewImage(patternValue, width, height) {
        // Temporarily set pattern style
        const originalStyle = this.turbulenceField.patternStyle;
        this.turbulenceField.patternStyle = patternValue;

        // For performance, use a smaller canvas for static previews
        const scaleFactor = 0.7; // 70% of original size for static previews
        const renderWidth = Math.max(24, Math.floor(width * scaleFactor));
        const renderHeight = Math.max(24, Math.floor(height * scaleFactor));

        // Create a static preview without manipulating time
        const canvas = document.createElement('canvas');
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(renderWidth, renderHeight);
        const data = imageData.data;

        // Only apply blur for the selected pattern
        const applyBlur = patternValue === this.selectedPattern;

        for (let y = 0; y < renderHeight; y++) {
            for (let x = 0; x < renderWidth; x++) {
                const nx = x / renderWidth;
                const ny = 1 - (y / renderHeight);
                const noiseValue = this.turbulenceField.noise2D(nx, ny, this.turbulenceField.time, applyBlur);

                const index = (y * renderWidth + x) * 4;
                data[index] = noiseValue * 255;     // R
                data[index + 1] = noiseValue * 255; // G
                data[index + 2] = noiseValue * 255; // B
                data[index + 3] = 255;         // A
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // If we need to upscale back to original size
        if (renderWidth !== width || renderHeight !== height) {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = width;
            finalCanvas.height = height;
            const finalCtx = finalCanvas.getContext('2d');
            // Use nearest-neighbor scaling for performance
            finalCtx.imageSmoothingEnabled = false;
            finalCtx.drawImage(canvas, 0, 0, width, height);
            canvas.width = 1; // Help garbage collection
            canvas.height = 1;

            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.85); // Use JPEG for smaller size

            // Restore original pattern style
            this.turbulenceField.patternStyle = originalStyle;

            return dataUrl;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for smaller size

        // Restore original pattern style
        this.turbulenceField.patternStyle = originalStyle;

        return dataUrl;
    }

    /**
     * Generate static previews for all patterns
     */
    generateAllStaticPreviews() {
        this.patternEntries.forEach(([name, patternValue]) => {
            const element = this.previewElements.get(patternValue);
            if (element) {
                const img = element.querySelector('img');
                if (img) {
                    img.src = this.generateStaticPreviewImage(
                        patternValue,
                        this.previewSize,
                        this.previewSize
                    );
                }
            }
        });
    }

    /**
     * Set the selected pattern and update previews accordingly
     * @param {String} pattern - The pattern value to select
     * @param {Boolean} forceAnimation - Force animation to start even if not visible
     */
    setSelectedPattern(pattern, forceAnimation = false) {
        // Clean up previous selected pattern preview only (not affecting the field's animation)
        if (this.selectedPattern) {
            const cleanup = this.cleanupFunctions.get(this.selectedPattern);
            if (cleanup) {
                try {
                    cleanup();
                } catch (e) {
                    console.warn('Error cleaning up animation:', e);
                }
                this.cleanupFunctions.delete(this.selectedPattern);
            }
        }

        this.selectedPattern = pattern;

        // Update UI for selected element
        this.updateSelectedUI();

        // Make sure visibility state is up to date
        this.updateVisibilityState();

        // Always refresh the selected pattern immediately, 
        // forcing animation if requested
        this.refreshSelectedPreview(forceAnimation);

        // If not already refreshing and we're visible (or forcing),
        // start the refresh loop
        if ((this.isVisible || forceAnimation) && !this.animationFrameId) {
            this.startRefreshLoop();
        }
    }

    /**
     * Update UI to reflect selected pattern
     */
    updateSelectedUI() {
        // Hide title for selected, show for others
        this.previewElements.forEach((element, pattern) => {
            const title = element.querySelector('div');
            if (title) {
                title.style.display = pattern === this.selectedPattern ? 'none' : 'block';
            }

            // Update border color
            element.style.borderColor = pattern === this.selectedPattern ? '#fff' : '#666';
        });
    }

    /**
     * Set whether the preview folder is open
     * @param {Boolean} isOpen - Whether the folder is open
     */
    setFolderOpen(isOpen) {
        // Skip if no change
        if (this.isFolderOpen === isOpen) return;

        this.isFolderOpen = isOpen;

        // Update combined visibility state
        this.updateVisibilityState();
    }

    /**
     * Set whether a parent folder containing the previews is open
     * @param {Boolean} isOpen - Whether the parent folder is open
     */
    setParentFolderOpen(isOpen) {
        // Skip if no change
        if (this.isParentFolderOpen === isOpen) return;

        this.isParentFolderOpen = isOpen;

        // Update combined visibility state
        this.updateVisibilityState();
    }

    /**
     * Start the refresh animation loop
     */
    startRefreshLoop() {
        if (this.animationFrameId) return; // Already running

        this.lastRefreshTime = performance.now();
        this.lastHoverRefreshTime = performance.now();
        this.refreshingSelected = true;

        // Immediately refresh the selected preview before starting the update loop
        if (this.selectedPattern) {
            this.refreshSelectedPreview();
        }

        this.update();
    }

    /**
     * Stop the refresh animation loop and clean up
     * IMPORTANT: Only cleans up preview animations, not affecting turbulence field's actual animation
     */
    stopRefreshLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clean up all active preview animations, but don't reset the field's time
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions.clear();

        // Generate static previews since animations are stopped
        this.generateAllStaticPreviews();
    }

    /**
     * Capture current parameter values for change detection
     * @private
     */
    _captureCurrentParams() {
        const field = this.turbulenceField;
        if (!field) return {};

        // Capture values of parameters that affect the preview appearance
        return {
            patternStyle: field.patternStyle,
            patternFrequency: field.patternFrequency,
            domainWarp: field.domainWarp,
            domainWarpSpeed: field.domainWarpSpeed,
            symmetryAmount: field.symmetryAmount,
            phase: field.phase,
            phaseSpeed: field.phaseSpeed,
            rotation: field.rotation,
            rotationSpeed: field.rotationSpeed,
            pullFactor: field.pullFactor,
            patternOffsetX: field.patternOffsetX,
            patternOffsetY: field.patternOffsetY,
            biasSpeedX: field.biasSpeedX,
            biasSpeedY: field.biasSpeedY,
            biasSmoothing: field.biasSmoothing,
            blurAmount: field.blurAmount,
            speed: field.speed,
            scale: field.scale,
            strength: field.strength,
            decayRate: field.decayRate,
            contrast: field.contrast,
            separation: field.separation,
            // Add string pattern parameters
            stringDensity: field.stringDensity,
            stringThickness: field.stringThickness,
            stringWaveSpeed: field.stringWaveSpeed,
            stringWaveAmplitude: field.stringWaveAmplitude,
            stringWaveFrequency: field.stringWaveFrequency,
            stringWeaveOffset: field.stringWeaveOffset
        };
    }

    /**
     * Check if turbulence parameters have changed
     * @private
     * @returns {Boolean} - True if parameters changed
     */
    _haveParamsChanged() {
        const currentParams = this._captureCurrentParams();
        const lastParams = this._lastTurbulenceParams;

        // Compare current with previous parameters
        for (const [key, value] of Object.entries(currentParams)) {
            // Tolerance for floating point comparison
            const tolerance = 0.0001;

            if (typeof value === 'number' && typeof lastParams[key] === 'number') {
                // Use tolerance for number comparison
                if (Math.abs(value - lastParams[key]) > tolerance) {
                    this._lastTurbulenceParams = currentParams;
                    return true;
                }
            } else if (value !== lastParams[key]) {
                // Direct comparison for non-numbers
                this._lastTurbulenceParams = currentParams;
                return true;
            }
        }

        return false;
    }

    /**
     * Main update loop for refreshing previews
     */
    update() {
        // Early exit if not visible
        if (!this.isVisible) {
            this.animationFrameId = null;
            return;
        }

        const now = performance.now();
        const elapsedSinceLastFrame = now - this.lastRefreshTime;
        const elapsedSinceParamsCheck = now - this._lastParamsCheckTime;
        const elapsedSinceHoverRefresh = now - this.lastHoverRefreshTime;

        // Periodically check if turbulence parameters have changed
        if (elapsedSinceParamsCheck > this._paramsCheckInterval) {
            this._lastParamsCheckTime = now;

            // If parameters changed, only update the selected preview
            if (this._haveParamsChanged()) {
                // Only refresh the selected preview in real-time
                if (this.selectedPattern) {
                    this.refreshSelectedPreview();
                }
            }
        }

        // Check if it's time for a frame update based on target FPS
        if (elapsedSinceLastFrame > (1000 / this.selectedFps)) {
            // Always prioritize selected pattern refresh
            this.refreshSelectedPreview();
            this.lastRefreshTime = now;
        }

        // Check if we need to refresh hovered preview
        if (this.hoveredPattern && elapsedSinceHoverRefresh > this.hoverRefreshInterval) {
            this.refreshHoveredPreview();
            this.lastHoverRefreshTime = now;
        }

        // Continue the animation loop only if still visible
        if (this.isVisible) {
            this.animationFrameId = requestAnimationFrame(() => this.update());
        } else {
            this.animationFrameId = null;
        }
    }

    /**
     * Refresh the selected preview
     * @param {Boolean} forceStart - Force animation to start even if already running
     */
    refreshSelectedPreview(forceStart = false) {
        if (!this.selectedPattern) return;

        const element = this.previewElements.get(this.selectedPattern);
        if (!element) return;

        const img = element.querySelector('img');
        if (!img) return;

        // Clean up existing animation if any
        const existingCleanup = this.cleanupFunctions.get(this.selectedPattern);
        if (existingCleanup) {
            try {
                existingCleanup();
            } catch (e) {
                console.warn('Error cleaning up previous animation:', e);
            }
            this.cleanupFunctions.delete(this.selectedPattern);
        }

        try {
            // Create new animated preview - the field's animation continues regardless
            const cleanup = this.generatePreviewAnimation(
                this.previewSize,
                this.previewSize,
                this.selectedPattern,
                (dataUrl) => {
                    if (img && !img.src) {
                        // If the image source is empty, set a static preview first
                        img.src = this.generateStaticPreviewImage(
                            this.selectedPattern,
                            this.previewSize,
                            this.previewSize
                        );
                    }

                    // Then set the animated frame
                    if (img) {
                        img.src = dataUrl;
                    }
                }
            );

            this.cleanupFunctions.set(this.selectedPattern, cleanup);

            // If the animation frame isn't running but we're visible or forcing,
            // start the refresh loop to ensure continual updates
            if ((this.isVisible || forceStart) && !this.animationFrameId) {
                this.startRefreshLoop();
            }
        } catch (err) {
            console.error('Error generating preview animation:', err);

            // Fallback to static preview
            if (img) {
                img.src = this.generateStaticPreviewImage(
                    this.selectedPattern,
                    this.previewSize,
                    this.previewSize
                );
            }
        }
    }

    /**
     * Custom preview animation generator that doesn't affect the turbulence field's time
     * This wraps the turbulence field's generateAnimatedPreview method but preserves the time state
     */
    generatePreviewAnimation(width, height, patternStyle, callback) {
        // Get current pattern style
        const originalStyle = this.turbulenceField.patternStyle;

        // Temporarily switch pattern style for preview
        this.turbulenceField.patternStyle = patternStyle;

        // For performance, use a slightly smaller render size for animation
        const scaleFactor = 0.8; // 80% of original size for animation (higher than static for quality)
        const renderWidth = Math.max(32, Math.floor(width * scaleFactor));
        const renderHeight = Math.max(32, Math.floor(height * scaleFactor));

        // Setup for animation
        const canvas = document.createElement('canvas');
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(renderWidth, renderHeight);
        const data = imageData.data;

        // For scaling if needed
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width;
        finalCanvas.height = height;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.imageSmoothingEnabled = false;

        let animationFrame;
        let lastFrameTime = 0;
        const frameInterval = 1000 / this.selectedFps; // Ensure we respect the FPS setting

        // Only apply blur for the selected pattern
        const applyBlur = patternStyle === this.selectedPattern;

        const animate = (timestamp) => {
            // Skip animation if not visible
            if (!this.isVisible) {
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            // Check if enough time has passed for a new frame
            if (timestamp - lastFrameTime < frameInterval) {
                animationFrame = requestAnimationFrame(animate);
                return;
            }

            // Update last frame time
            lastFrameTime = timestamp;

            // Generate preview using current time (don't manipulate the field's time)
            for (let y = 0; y < renderHeight; y++) {
                for (let x = 0; x < renderWidth; x++) {
                    const nx = x / renderWidth;
                    const ny = 1 - (y / renderHeight);
                    const noiseValue = this.turbulenceField.noise2D(nx, ny, this.turbulenceField.time, applyBlur);

                    const index = (y * renderWidth + x) * 4;
                    data[index] = noiseValue * 255;     // R
                    data[index + 1] = noiseValue * 255; // G
                    data[index + 2] = noiseValue * 255; // B
                    data[index + 3] = 255;         // A
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // Scale to final size if needed
            if (renderWidth !== width || renderHeight !== height) {
                finalCtx.clearRect(0, 0, width, height);
                finalCtx.drawImage(canvas, 0, 0, width, height);
                callback(finalCanvas.toDataURL('image/jpeg', 0.9));
            } else {
                callback(canvas.toDataURL('image/jpeg', 0.9));
            }

            animationFrame = requestAnimationFrame(animate);
        };

        // Start animation
        animationFrame = requestAnimationFrame(animate);

        // Return cleanup function that only restores pattern style, not time
        return () => {
            cancelAnimationFrame(animationFrame);
            // Only restore pattern style
            this.turbulenceField.patternStyle = originalStyle;

            // Help garbage collection
            canvas.width = 1;
            canvas.height = 1;
            finalCanvas.width = 1;
            finalCanvas.height = 1;
        };
    }

    /**
     * Refresh the currently hovered preview
     */
    refreshHoveredPreview() {
        if (!this.hoveredPattern) return;

        const element = this.previewElements.get(this.hoveredPattern);
        if (!element) return;

        const img = element.querySelector('img');
        if (!img) return;

        // Generate and set preview image
        img.src = this.generateStaticPreviewImage(
            this.hoveredPattern,
            this.previewSize,
            this.previewSize
        );
    }

    /**
     * Refresh all previews (e.g., when turbulence parameters change)
     * @param {Boolean} force - Force refresh even if folder is closed
     */
    refreshAllPreviews(force = false) {
        // Skip if not visible and we're not forcing a refresh
        if (!this.isVisible && !force) {
            // When not visible, just mark that we need a refresh when reopened
            this._needsRefreshOnOpen = true;
            return;
        }

        // Clear the needs refresh flag
        this._needsRefreshOnOpen = false;

        // Always refresh selected preview first
        if (this.selectedPattern) {
            this.refreshSelectedPreview(true);
        }

        // Create static previews for all unselected patterns
        this.patternEntries.forEach(([name, patternValue]) => {
            if (patternValue !== this.selectedPattern) {
                const element = this.previewElements.get(patternValue);
                if (element) {
                    const img = element.querySelector('img');
                    if (img) {
                        // Generate and set preview image
                        img.src = this.generateStaticPreviewImage(
                            patternValue,
                            this.previewSize,
                            this.previewSize
                        );
                    }
                }
            }
        });

        // Force animation loop to start if needed
        if (!this.animationFrameId && this.isVisible) {
            this.startRefreshLoop();
        }
    }

    /**
     * Set the refresh rate for the preview animation
     * @param {Number} fps - Frames per second for the refresh cycle
     */
    setRefreshRate(fps) {
        if (fps > 0) {
            this.selectedFps = fps;
        }
    }

    /**
     * Check if a preview folder is currently open
     * @returns {Boolean} - True if the preview folder is open
     */
    isFolderOpenState() {
        return this.isFolderOpen;
    }

    /**
     * Clean up all resources
     * This should be called when the UI is destroyed
     */
    dispose() {
        this.stopRefreshLoop();
        this.previewElements.clear();
        this.cleanupFunctions.clear();
        this.containerElement = null;
        this.turbulenceField = null;
    }

    /**
     * Set the performance profile for preview generation
     * @param {String} profile - 'low', 'medium', or 'high'
     */
    setPerformanceProfile(profile) {
        switch (profile) {
            case 'low':
                // Low performance settings for weaker devices
                this.selectedFps = 10;
                this.hoverRefreshInterval = 200;
                break;

            case 'medium':
                // Medium performance settings (default)
                this.selectedFps = 15;
                this.hoverRefreshInterval = 100;
                break;

            case 'high':
                // High performance settings for powerful devices
                this.selectedFps = 24;
                this.hoverRefreshInterval = 50;
                break;

            case 'ultra':
                // Ultra performance for development/testing
                this.selectedFps = 30;
                this.hoverRefreshInterval = 33;
                break;

            default:
                // Use medium as fallback
                this.setPerformanceProfile('medium');
        }

        // Restart refresh loop if running
        if (this.isVisible && this.animationFrameId) {
            this.stopRefreshLoop();
            this.startRefreshLoop();
        }
    }
}
