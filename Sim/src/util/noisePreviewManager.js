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
        this.previewElements = new Map(); // Maps pattern values to DOM elements
        this.cleanupFunctions = new Map(); // Maps pattern values to cleanup functions
        this.lastRefreshTime = 0;
        this.unselectedIndex = 0;
        this.animationFrameId = null;
        this.refreshingSelected = true; // Toggle between selected and unselected

        // Settings
        this.selectedFps = 30; // Target FPS for the refresh cycle
    }

    /**
     * Initialize with DOM container and create preview elements
     * @param {HTMLElement} containerElement - The container for preview elements
     * @param {Boolean} folderIsOpen - Whether the previews folder is open initially
     */
    initialize(containerElement, folderIsOpen = false) {
        this.containerElement = containerElement;

        // Store references to preview elements
        const previewElements = containerElement.querySelectorAll('.pattern-preview');
        previewElements.forEach((element) => {
            const pattern = element.getAttribute('data-pattern');
            if (pattern) {
                this.previewElements.set(pattern, element);
            }
        });

        // Generate initial static previews for all patterns
        this.generateAllStaticPreviews();

        // Set initial folder state
        if (folderIsOpen) {
            this.setFolderOpen(true);
        }
    }

    /**
     * Generate static previews for all patterns
     */
    generateAllStaticPreviews() {
        // Remember original style
        const originalStyle = this.turbulenceField.patternStyle;

        this.patternEntries.forEach(([name, patternValue]) => {
            const element = this.previewElements.get(patternValue);
            if (element) {
                const img = element.querySelector('img');
                if (img) {
                    // Temporarily set pattern style
                    this.turbulenceField.patternStyle = patternValue;

                    // Create a static preview without manipulating time
                    const canvas = document.createElement('canvas');
                    canvas.width = this.previewSize;
                    canvas.height = this.previewSize;
                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.createImageData(this.previewSize, this.previewSize);
                    const data = imageData.data;

                    for (let y = 0; y < this.previewSize; y++) {
                        for (let x = 0; x < this.previewSize; x++) {
                            const nx = x / this.previewSize;
                            const ny = y / this.previewSize;
                            const noiseValue = this.turbulenceField.noise2D(nx, ny);

                            const index = (y * this.previewSize + x) * 4;
                            data[index] = noiseValue * 255;     // R
                            data[index + 1] = noiseValue * 255; // G
                            data[index + 2] = noiseValue * 255; // B
                            data[index + 3] = 255;         // A
                        }
                    }

                    ctx.putImageData(imageData, 0, 0);
                    img.src = canvas.toDataURL();
                }
            }
        });

        // Restore original pattern style
        this.turbulenceField.patternStyle = originalStyle;
    }

    /**
     * Set the selected pattern and update previews accordingly
     * @param {String} pattern - The pattern value to select
     */
    setSelectedPattern(pattern) {
        // Clean up previous selected pattern preview only (not affecting the field's animation)
        if (this.selectedPattern) {
            const cleanup = this.cleanupFunctions.get(this.selectedPattern);
            if (cleanup) {
                cleanup();
                this.cleanupFunctions.delete(this.selectedPattern);
            }
        }

        this.selectedPattern = pattern;

        // Start animation for new selected pattern if folder is open
        if (this.isFolderOpen) {
            this.refreshSelectedPreview();
        }

        // Update UI for selected element
        this.updateSelectedUI();
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
        this.isFolderOpen = isOpen;

        if (isOpen) {
            this.startRefreshLoop();
        } else {
            this.stopRefreshLoop();
        }
    }

    /**
     * Start the refresh animation loop
     */
    startRefreshLoop() {
        if (this.animationFrameId) return; // Already running

        this.lastRefreshTime = performance.now();
        this.refreshingSelected = true;
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
     * Main update loop for refreshing previews
     */
    update() {
        if (!this.isFolderOpen) return;

        const now = performance.now();
        const elapsed = now - this.lastRefreshTime;

        // Control overall refresh rate
        if (elapsed > (1000 / this.selectedFps)) {
            // Alternate between selected and unselected
            if (this.refreshingSelected) {
                this.refreshSelectedPreview();
            } else {
                this.refreshNextUnselectedPreview();
            }

            // Toggle for next frame
            this.refreshingSelected = !this.refreshingSelected;
            this.lastRefreshTime = now;
        }

        this.animationFrameId = requestAnimationFrame(() => this.update());
    }

    /**
     * Refresh the selected preview
     */
    refreshSelectedPreview() {
        if (!this.selectedPattern) return;

        const element = this.previewElements.get(this.selectedPattern);
        if (!element) return;

        const img = element.querySelector('img');
        if (!img) return;

        // Clean up existing animation if any
        const existingCleanup = this.cleanupFunctions.get(this.selectedPattern);
        if (existingCleanup) {
            existingCleanup();
        }

        // Create new animated preview - the field's animation continues regardless
        const cleanup = this.generatePreviewAnimation(
            this.previewSize,
            this.previewSize,
            this.selectedPattern,
            (dataUrl) => {
                img.src = dataUrl;
            }
        );

        this.cleanupFunctions.set(this.selectedPattern, cleanup);
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

        // Setup for animation
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        let animationFrame;

        const animate = () => {
            // Generate preview using current time (don't manipulate the field's time)
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const nx = x / width;
                    const ny = y / height;
                    // Use current time - don't modify field's time
                    const noiseValue = this.turbulenceField.noise2D(nx, ny);

                    const index = (y * width + x) * 4;
                    data[index] = noiseValue * 255;     // R
                    data[index + 1] = noiseValue * 255; // G
                    data[index + 2] = noiseValue * 255; // B
                    data[index + 3] = 255;         // A
                }
            }

            ctx.putImageData(imageData, 0, 0);
            callback(canvas.toDataURL());
            animationFrame = requestAnimationFrame(animate);
        };

        // Start animation
        animate();

        // Return cleanup function that only restores pattern style, not time
        return () => {
            cancelAnimationFrame(animationFrame);
            // Only restore pattern style
            this.turbulenceField.patternStyle = originalStyle;
        };
    }

    /**
     * Refresh the next unselected preview in sequence
     */
    refreshNextUnselectedPreview() {
        // Get all patterns except selected
        const unselectedPatterns = this.patternEntries
            .map(([, value]) => value)
            .filter(pattern => pattern !== this.selectedPattern);

        if (unselectedPatterns.length === 0) return;

        // Increment index and wrap around
        this.unselectedIndex = (this.unselectedIndex + 1) % unselectedPatterns.length;

        // Get the next pattern to refresh
        const patternToRefresh = unselectedPatterns[this.unselectedIndex];
        const element = this.previewElements.get(patternToRefresh);
        if (!element) return;

        const img = element.querySelector('img');
        if (!img) return;

        // Generate static preview (using current field state, not resetting time)
        const originalStyle = this.turbulenceField.patternStyle;
        this.turbulenceField.patternStyle = patternToRefresh;

        // Create a static preview without manipulating time
        const canvas = document.createElement('canvas');
        canvas.width = this.previewSize;
        canvas.height = this.previewSize;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(this.previewSize, this.previewSize);
        const data = imageData.data;

        for (let y = 0; y < this.previewSize; y++) {
            for (let x = 0; x < this.previewSize; x++) {
                const nx = x / this.previewSize;
                const ny = y / this.previewSize;
                const noiseValue = this.turbulenceField.noise2D(nx, ny);

                const index = (y * this.previewSize + x) * 4;
                data[index] = noiseValue * 255;     // R
                data[index + 1] = noiseValue * 255; // G
                data[index + 2] = noiseValue * 255; // B
                data[index + 3] = 255;         // A
            }
        }

        ctx.putImageData(imageData, 0, 0);
        img.src = canvas.toDataURL();

        // Restore original pattern style
        this.turbulenceField.patternStyle = originalStyle;
    }

    /**
     * Refresh all previews (e.g., when turbulence parameters change)
     */
    refreshAllPreviews() {
        if (!this.isFolderOpen) return;

        // Always refresh selected preview
        this.refreshSelectedPreview();

        // Create static previews for all unselected
        this.patternEntries.forEach(([name, patternValue]) => {
            if (patternValue !== this.selectedPattern) {
                const element = this.previewElements.get(patternValue);
                if (element) {
                    const img = element.querySelector('img');
                    if (img) {
                        // Generate preview without affecting field's time
                        const originalStyle = this.turbulenceField.patternStyle;
                        this.turbulenceField.patternStyle = patternValue;

                        // Create a static preview without manipulating time
                        const canvas = document.createElement('canvas');
                        canvas.width = this.previewSize;
                        canvas.height = this.previewSize;
                        const ctx = canvas.getContext('2d');
                        const imageData = ctx.createImageData(this.previewSize, this.previewSize);
                        const data = imageData.data;

                        for (let y = 0; y < this.previewSize; y++) {
                            for (let x = 0; x < this.previewSize; x++) {
                                const nx = x / this.previewSize;
                                const ny = y / this.previewSize;
                                const noiseValue = this.turbulenceField.noise2D(nx, ny);

                                const index = (y * this.previewSize + x) * 4;
                                data[index] = noiseValue * 255;     // R
                                data[index + 1] = noiseValue * 255; // G
                                data[index + 2] = noiseValue * 255; // B
                                data[index + 3] = 255;         // A
                            }
                        }

                        ctx.putImageData(imageData, 0, 0);
                        img.src = canvas.toDataURL();

                        // Restore original pattern style
                        this.turbulenceField.patternStyle = originalStyle;
                    }
                }
            }
        });
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
}
