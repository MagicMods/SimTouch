export class NoisePreviewManager {

    constructor(turbulenceField, previewSize, patterns) {
        this.turbulenceField = turbulenceField;
        this.previewSize = previewSize;
        this.patterns = patterns;
        this.patternEntries = Object.entries(patterns);

        // State
        this.selectedPattern = null;
        this.isFolderOpen = false;
        this.isParentFolderOpen = true;
        this.isVisible = false;
        this.previewElements = new Map();
        this.cleanupFunctions = new Map();
        this.lastRefreshTime = 0;
        this.animationFrameId = null;
        this.refreshingSelected = true;
        this._needsRefreshOnOpen = false;
        this._inRefreshSelectedPreview = false;
        this.refreshingDisabled = false;

        // Performance settings
        this.selectedFps = 15;
        this.hoverRefreshInterval = 100;
        this.lastHoverRefreshTime = 0;

        // Parameter tracking for automatic refresh
        this._lastTurbulenceParams = this._captureCurrentParams();
        this._paramsCheckInterval = 500;
        this._lastParamsCheckTime = 0;

        // Track hover state
        this.hoveredPattern = null;
    }


    toggleRefreshingDisabled() {
        this.refreshingDisabled = !this.refreshingDisabled;

        if (this.refreshingDisabled) {
            this.stopRefreshLoop();
            this.generateAllStaticPreviews();
        } else if (this.isVisible) {
            this.startRefreshLoop();
        }
        // Update UI to reflect disabled state
        this.updateSelectedUI();
        return this.refreshingDisabled;
    }


    setRefreshingDisabled(disabled) {
        if (this.refreshingDisabled !== disabled) {
            this.refreshingDisabled = disabled;

            if (this.refreshingDisabled) {
                this.stopRefreshLoop();
                this.generateAllStaticPreviews();
            } else if (this.isVisible) {
                this.startRefreshLoop();
            }
            this.updateSelectedUI();
        }
    }


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


    updateVisibilityState() {
        const wasVisible = this.isVisible;
        this.isVisible = this.isFolderOpen && this.isParentFolderOpen;

        // If visibility changed, handle refresh loop
        if (wasVisible !== this.isVisible) {
            this.handleVisibilityChange();
        }
    }


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


    generateAllStaticPreviews() {
        // Store the original pattern style once before the loop
        const originalStyle = this.turbulenceField.patternStyle;

        this.patternEntries.forEach(([name, patternValue]) => {
            const element = this.previewElements.get(patternValue);
            if (element) {
                const img = element.querySelector('img');
                if (img) {
                    // Generate the preview without changing the pattern style in generateStaticPreviewImage
                    // by setting a flag to skip the style change
                    this.turbulenceField.patternStyle = patternValue;
                    img.src = this.generateStaticPreviewImage(
                        patternValue,
                        this.previewSize,
                        this.previewSize,
                        true // Skip style change in generateStaticPreviewImage
                    );
                }
            }
        });

        // Restore the original pattern style once after all previews are generated
        this.turbulenceField.patternStyle = originalStyle;
    }


    generateStaticPreviewImage(patternValue, width, height, skipStyleChange = false) {
        // Temporarily set pattern style (unless skipStyleChange is true)
        let originalStyle;
        if (!skipStyleChange) {
            originalStyle = this.turbulenceField.patternStyle;
            this.turbulenceField.patternStyle = patternValue;
        }

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

            // Restore original pattern style if we changed it
            if (!skipStyleChange) {
                this.turbulenceField.patternStyle = originalStyle;
            }

            return dataUrl;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for smaller size

        // Restore original pattern style if we changed it
        if (!skipStyleChange) {
            this.turbulenceField.patternStyle = originalStyle;
        }

        return dataUrl;
    }


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
        if (!this._inRefreshSelectedPreview) {
            this.refreshSelectedPreview(forceAnimation);
        }

        // If not already refreshing and we're visible (or forcing),
        // start the refresh loop
        if ((this.isVisible || forceAnimation) && !this.animationFrameId) {
            this.startRefreshLoop();
        }
    }


    updateSelectedUI() {
        // Hide title for selected, show for others
        this.previewElements.forEach((element, pattern) => {
            const title = element.querySelector('div');
            if (title) {
                title.style.display = pattern === this.selectedPattern ? 'none' : 'block';
            }

            // Update border color
            if (pattern === this.selectedPattern) {
                // For selected pattern, show different border when disabled
                if (this.refreshingDisabled) {
                    element.style.borderColor = '#ff6600'; // Orange border for disabled state
                    element.style.borderStyle = 'dashed';

                    // Add or update disabled indicator
                    let indicator = element.querySelector('.disabled-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.className = 'disabled-indicator';
                        indicator.innerHTML = '⏸'; // Pause symbol
                        indicator.style.cssText = `
                            position: absolute;
                            top: 5px;
                            right: 5px;
                            background-color: rgba(255, 102, 0, 0.7);
                            color: white;
                            border-radius: 50%;
                            width: 20px;
                            height: 20px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            z-index: 2;
                        `;
                        element.appendChild(indicator);
                    }
                } else {
                    element.style.borderColor = '#fff'; // White border for normal active state
                    element.style.borderStyle = 'solid';

                    // Remove disabled indicator if it exists
                    const indicator = element.querySelector('.disabled-indicator');
                    if (indicator) {
                        element.removeChild(indicator);
                    }
                }
            } else {
                element.style.borderColor = '#666';
                element.style.borderStyle = 'solid';

                // Remove any disabled indicator
                const indicator = element.querySelector('.disabled-indicator');
                if (indicator) {
                    element.removeChild(indicator);
                }
            }
        });
    }


    setFolderOpen(isOpen) {
        // Skip if no change
        if (this.isFolderOpen === isOpen) return;

        this.isFolderOpen = isOpen;

        // Update combined visibility state
        this.updateVisibilityState();
    }


    setParentFolderOpen(isOpen) {
        // Skip if no change
        if (this.isParentFolderOpen === isOpen) return;

        this.isParentFolderOpen = isOpen;

        // Update combined visibility state
        this.updateVisibilityState();
    }


    startRefreshLoop() {
        // Don't start if refreshing is disabled
        if (this.refreshingDisabled) return;

        if (this.animationFrameId) return; // Already running

        this.lastRefreshTime = performance.now();
        this.lastHoverRefreshTime = performance.now();
        this.refreshingSelected = true;

        // Immediately refresh the selected preview before starting the update loop
        if (this.selectedPattern && !this._inRefreshSelectedPreview) {
            this.refreshSelectedPreview();
        }

        this.update();
    }

    stopRefreshLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Save the current pattern style before cleanup
        const originalPatternStyle = this.turbulenceField.patternStyle;

        // Clean up all active preview animations, but don't reset the field's time
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions.clear();

        // Restore the original pattern style that was saved before cleanup
        this.turbulenceField.patternStyle = originalPatternStyle;

        // Generate static previews since animations are stopped
        this.generateAllStaticPreviews();
    }


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
            separation: field.separation
        };
    }


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

    update() {
        // Early exit if not visible or refreshing is disabled
        if (!this.isVisible || this.refreshingDisabled) {
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
                if (this.selectedPattern && !this._inRefreshSelectedPreview) {
                    this.refreshSelectedPreview();
                }
            }
        }

        // Check if it's time for a frame update based on target FPS
        if (elapsedSinceLastFrame > (1000 / this.selectedFps)) {
            // Always prioritize selected pattern refresh
            if (!this._inRefreshSelectedPreview) {
                this.refreshSelectedPreview();
            }
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


    refreshSelectedPreview(forceStart = false) {
        if (!this.selectedPattern || this.refreshingDisabled) return;

        // Add debug logging
        if (this.turbulenceField && this.turbulenceField.debug) {
            console.log(`Refreshing preview for ${this.selectedPattern}, visible: ${this.isVisible}, contrast: ${this.turbulenceField.contrast.toFixed(2)}, blur: ${this.turbulenceField.blurAmount.toFixed(2)}`);
        }

        // Add a guard to prevent circular calls
        this._inRefreshSelectedPreview = true;

        const element = this.previewElements.get(this.selectedPattern);
        if (!element) {
            this._inRefreshSelectedPreview = false;
            return;
        }

        const img = element.querySelector('img');
        if (!img) {
            this._inRefreshSelectedPreview = false;
            return;
        }

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

        // Reset the guard
        this._inRefreshSelectedPreview = false;
    }

    generatePreviewAnimation(width, height, patternStyle, callback) {
        // Get current pattern style
        const originalStyle = this.turbulenceField.patternStyle;

        // Temporarily switch pattern style for preview
        this.turbulenceField.patternStyle = patternStyle;

        // Special handling for Classic Drop pattern which is computationally expensive
        const isClassicDrop = patternStyle.toLowerCase() === "classicdrop";

        // For performance, use a slightly smaller render size for animation
        // Use an even smaller size for Classic Drop pattern
        const scaleFactor = isClassicDrop ? 0.5 : 0.7; // 50% size for Classic Drop vs 70% for others
        const renderWidth = Math.max(32, Math.floor(width * scaleFactor));
        const renderHeight = Math.max(32, Math.floor(height * scaleFactor));

        // Track performance for dynamic scaling
        let lastPerformanceWarning = 0;
        let performanceIssueCount = 0;
        let dynamicScaleFactor = isClassicDrop ? 0.7 : 1.0; // Start with reduced scaling for Classic Drop

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
        // Use lower FPS for Classic Drop pattern to reduce CPU usage
        const frameInterval = isClassicDrop ?
            1000 / Math.min(this.selectedFps, 12) : // Cap at 12 FPS for Classic Drop
            1000 / this.selectedFps; // Normal FPS for other patterns

        // Only apply blur for the selected pattern, but with special handling for Classic Drop
        const applyBlur = patternStyle === this.selectedPattern && (!isClassicDrop || this.turbulenceField.blurAmount < 0.5);

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

            // Reduce workload when browser reports performance issues
            const startTime = performance.now();

            // Apply dynamic scaling based on performance
            const effectiveWidth = Math.max(16, Math.floor(renderWidth * dynamicScaleFactor));
            const effectiveHeight = Math.max(16, Math.floor(renderHeight * dynamicScaleFactor));

            // Use bigger skip factor for Classic Drop pattern
            const skipFactor = isClassicDrop ?
                Math.max(2, Math.floor(3 / dynamicScaleFactor)) : // More aggressive skipping for Classic Drop
                Math.max(1, Math.floor(2 / dynamicScaleFactor));  // Normal skipping for others

            // Generate preview using current time (don't manipulate the field's time)
            for (let y = 0; y < effectiveHeight; y++) {
                for (let x = 0; x < effectiveWidth; x++) {
                    // Map to full resolution coordinates
                    const nx = x / effectiveWidth;
                    const ny = 1 - (y / effectiveHeight);
                    const noiseValue = this.turbulenceField.noise2D(nx, ny, this.turbulenceField.time, applyBlur);

                    // Map to the actual target position in our buffer
                    const targetX = Math.floor(x * (renderWidth / effectiveWidth));
                    const targetY = Math.floor(y * (renderHeight / effectiveHeight));
                    const index = (targetY * renderWidth + targetX) * 4;

                    data[index] = noiseValue * 255;     // R
                    data[index + 1] = noiseValue * 255; // G
                    data[index + 2] = noiseValue * 255; // B
                    data[index + 3] = 255;         // A

                    // Check if we're taking too long and need to break early
                    if ((x % skipFactor === 0) && (y % skipFactor === 0)) {
                        const currentTime = performance.now();
                        // Use a shorter time threshold for Classic Drop to bail out of rendering earlier
                        const timeThreshold = isClassicDrop ? 8 : 12; // 8ms for Classic Drop, 12ms for others
                        if (currentTime - startTime > timeThreshold) {
                            // Skip more pixels to finish faster
                            x += skipFactor;
                        }
                    }
                }
            }

            // Check if we need to adjust dynamic scale factor
            const renderTime = performance.now() - startTime;
            // Use a lower threshold for performance warnings with Classic Drop
            const performanceThreshold = isClassicDrop ? 12 : 15;
            if (renderTime > performanceThreshold) {
                // Performance warning
                performanceIssueCount++;
                lastPerformanceWarning = timestamp;
                if (performanceIssueCount > 3 && dynamicScaleFactor > 0.5) {
                    // Reduce resolution if we have persistent performance issues
                    // More aggressive reduction for Classic Drop
                    const reductionAmount = isClassicDrop ? 0.15 : 0.1;
                    dynamicScaleFactor = Math.max(0.3, dynamicScaleFactor - reductionAmount);
                    performanceIssueCount = 0;
                }
            } else if (timestamp - lastPerformanceWarning > 2000 && dynamicScaleFactor < 1.0) {
                // Gradually increase resolution if performance is good
                // More cautious increase for Classic Drop
                const increaseAmount = isClassicDrop ? 0.03 : 0.05;
                dynamicScaleFactor = Math.min(1.0, dynamicScaleFactor + increaseAmount);
                performanceIssueCount = Math.max(0, performanceIssueCount - 1);
            }

            ctx.putImageData(imageData, 0, 0);

            // Scale to final size if needed
            if (renderWidth !== width || renderHeight !== height) {
                finalCtx.clearRect(0, 0, width, height);
                finalCtx.drawImage(canvas, 0, 0, width, height);
                // Use lower JPEG quality for Classic Drop pattern
                const jpegQuality = isClassicDrop ? 0.75 : 0.85;
                callback(finalCanvas.toDataURL('image/jpeg', jpegQuality));
            } else {
                const jpegQuality = isClassicDrop ? 0.75 : 0.85;
                callback(canvas.toDataURL('image/jpeg', jpegQuality));
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


    setRefreshRate(fps) {
        if (fps > 0) {
            this.selectedFps = fps;
        }
    }

    isFolderOpenState() {
        return this.isFolderOpen;
    }

    dispose() {
        this.stopRefreshLoop();
        this.previewElements.clear();
        this.cleanupFunctions.clear();
        this.containerElement = null;
        this.turbulenceField = null;
    }

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

