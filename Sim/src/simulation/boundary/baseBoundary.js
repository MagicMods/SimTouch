export class BaseBoundary {
    constructor({
        cBoundaryRestitution = 0.8,
        damping = 0.95,
        boundaryRepulsion = 0.1,
        mode = "BOUNCE",
    } = {}) {
        // Physics parameters
        this.cBoundaryRestitution = cBoundaryRestitution;
        this.damping = damping;
        this.boundaryRepulsion = boundaryRepulsion;

        // Visual properties
        this.color = [1.0, 1.0, 1.0, 0.5]; // White, semi-transparent
        this.lineWidth = 0.3;

        // Add FLIP-specific parameters
        this.flipBoundaryScale = 1.0; // Ensures FLIP boundary matches PIC

        // Notify systems that need updating
        this.updateCallbacks = new Set();

        // Add boundary mode
        this.BOUNDARY_MODES = {
            BOUNCE: "BOUNCE",
            WARP: "WARP",
        };
        this.mode = mode;
    }

    // Abstract methods that derived classes must implement
    resolveCollision(position, velocity, particleRadius = 0, externalDamping = null) {
        throw new Error("Method 'resolveCollision' must be implemented by derived class");
    }

    // Soft boundary for FLIP system
    resolveFLIP(x, y, vx, vy) {
        throw new Error("Method 'resolveFLIP' must be implemented by derived class");
    }

    drawBoundary(gl, shaderManager) {
        throw new Error("Method 'drawBoundary' must be implemented by derived class");
    }

    // Update boundary parameters and notify dependents
    update(params) {
        let changed = false;
        if (changed) {
            this.updateCallbacks.forEach((callback) => callback(this));
        }
        return changed;
    }

    addUpdateCallback(callback) {
        this.updateCallbacks.add(callback);
    }

    removeUpdateCallback(callback) {
        this.updateCallbacks.delete(callback);
    }

    // Return boundary type - to be implemented by derived classes
    getBoundaryType() {
        throw new Error("Method 'getBoundaryType' must be implemented by derived class");
    }

    // Add method to change boundary mode
    setBoundaryMode(mode) {
        if (this.BOUNDARY_MODES[mode]) {
            this.mode = mode;
            // Notify any systems that need updating
            this.updateCallbacks.forEach((callback) => callback(this));
        }
    }

    // Method to get boundary details for rendering/calculation
    getBoundaryDetails() {
        throw new Error("Method 'getBoundaryDetails' must be implemented by derived class");
    }
}