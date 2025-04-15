import { BaseBoundary } from "./baseBoundary.js";

class RectangularBoundary extends BaseBoundary {
    constructor({
        centerX = 0.5,
        centerY = 0.5,
        width = 0.8,
        height = 0.8,
        cBoundaryRestitution = 0.8,
        damping = 0.95,
        boundaryRepulsion = 0.1,
        mode = "BOUNCE",
    } = {}) {
        // Call the parent constructor with shared parameters
        super({
            cBoundaryRestitution,
            damping,
            boundaryRepulsion,
            mode,
        });

        // Core parameters specific to rectangular boundary
        this.centerX = centerX;
        this.centerY = centerY;
        this.width = width;
        this.height = height;

        // Calculate half-width and half-height for convenience
        this.halfWidth = width / 2;
        this.halfHeight = height / 2;

        // Calculate bounds
        this.minX = centerX - this.halfWidth;
        this.maxX = centerX + this.halfWidth;
        this.minY = centerY - this.halfHeight;
        this.maxY = centerY + this.halfHeight;
    }

    // Drawing method for rectangular boundary
    drawBoundary(gl, shaderManager) {
        const program = shaderManager.use("rectangle");
        if (!program) return;

        // Full screen quad vertices
        const vertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);

        // Setup GL state
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Set attributes and uniforms
        const { attributes, uniforms } = program;
        gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributes.position);

        // Get canvas size and aspect ratio
        const width = gl.canvas.width;
        const height = gl.canvas.height;
        const aspect = width / height;

        // Set uniforms with proper aspect ratio correction
        gl.uniform2f(uniforms.resolution, width, height);
        gl.uniform2f(uniforms.center, this.centerX, this.centerY);
        gl.uniform2f(uniforms.dimensions, this.width, this.height);
        gl.uniform1f(uniforms.aspect, aspect); // Add aspect ratio correction
        gl.uniform4fv(uniforms.color, this.color);
        gl.uniform1f(uniforms.lineWidth, this.lineWidth / 100.0); // Scale line width appropriately

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Draw
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        // Cleanup
        gl.disable(gl.BLEND);
        gl.deleteBuffer(buffer);
    }

    // Collision resolution for rectangular boundary
    resolveCollision(
        position,
        velocity,
        particleRadius = 0,
        externalDamping = null
    ) {
        // Use provided damping if available, otherwise use internal damping
        const effectiveDamping =
            externalDamping !== null ? externalDamping : this.damping;

        // Adjusted bounds accounting for particle radius
        const minXWithRadius = this.minX + particleRadius;
        const maxXWithRadius = this.maxX - particleRadius;
        const minYWithRadius = this.minY + particleRadius;
        const maxYWithRadius = this.maxY - particleRadius;

        // Initial collision flag
        let collision = false;

        // Handle warp mode
        if (this.mode === this.BOUNDARY_MODES.WARP) {
            // X-axis warp
            if (position[0] < minXWithRadius) {
                position[0] = maxXWithRadius - 0.001;
                collision = true;
            } else if (position[0] > maxXWithRadius) {
                position[0] = minXWithRadius + 0.001;
                collision = true;
            }

            // Y-axis warp
            if (position[1] < minYWithRadius) {
                position[1] = maxYWithRadius - 0.001;
                collision = true;
            } else if (position[1] > maxYWithRadius) {
                position[1] = minYWithRadius + 0.001;
                collision = true;
            }

            return collision;
        }

        // Handle bounce mode
        // X-axis collision
        if (position[0] < minXWithRadius) {
            // Moving left into left wall
            if (velocity[0] < 0) {
                velocity[0] = -velocity[0] * this.cBoundaryRestitution;
            }
            position[0] = minXWithRadius + 0.001;
            collision = true;
        } else if (position[0] > maxXWithRadius) {
            // Moving right into right wall
            if (velocity[0] > 0) {
                velocity[0] = -velocity[0] * this.cBoundaryRestitution;
            }
            position[0] = maxXWithRadius - 0.001;
            collision = true;
        }

        // Y-axis collision
        if (position[1] < minYWithRadius) {
            // Moving down into bottom wall
            if (velocity[1] < 0) {
                velocity[1] = -velocity[1] * this.cBoundaryRestitution;
            }
            position[1] = minYWithRadius + 0.001;
            collision = true;
        } else if (position[1] > maxYWithRadius) {
            // Moving up into top wall
            if (velocity[1] > 0) {
                velocity[1] = -velocity[1] * this.cBoundaryRestitution;
            }
            position[1] = maxYWithRadius - 0.001;
            collision = true;
        }

        // Apply damping when collision occurs
        if (collision) {
            velocity[0] *= effectiveDamping;
            velocity[1] *= effectiveDamping;
        }

        // Handle repulsion near walls when no collision has occurred
        if (!collision && this.boundaryRepulsion > 0) {
            // Define repulsion zone as percentage of boundary size
            const repulsionZoneX = this.width * 0.1;
            const repulsionZoneY = this.height * 0.1;

            // Check distance to each wall and apply repulsion if within zone
            // Left wall repulsion
            if (position[0] - minXWithRadius < repulsionZoneX) {
                const strength = (1 - ((position[0] - minXWithRadius) / repulsionZoneX)) * this.boundaryRepulsion;
                velocity[0] += strength;
                collision = true;
            }
            // Right wall repulsion
            if (maxXWithRadius - position[0] < repulsionZoneX) {
                const strength = (1 - ((maxXWithRadius - position[0]) / repulsionZoneX)) * this.boundaryRepulsion;
                velocity[0] -= strength;
                collision = true;
            }
            // Bottom wall repulsion
            if (position[1] - minYWithRadius < repulsionZoneY) {
                const strength = (1 - ((position[1] - minYWithRadius) / repulsionZoneY)) * this.boundaryRepulsion;
                velocity[1] += strength;
                collision = true;
            }
            // Top wall repulsion
            if (maxYWithRadius - position[1] < repulsionZoneY) {
                const strength = (1 - ((maxYWithRadius - position[1]) / repulsionZoneY)) * this.boundaryRepulsion;
                velocity[1] -= strength;
                collision = true;
            }
        }

        return collision;
    }

    // FLIP fluid boundary resolution for rectangular boundary
    resolveFLIP(x, y, vx, vy) {
        // Apply FLIP boundary scale for consistent behavior with particle system
        const effectiveHalfWidth = this.halfWidth * this.flipBoundaryScale;
        const effectiveHalfHeight = this.halfHeight * this.flipBoundaryScale;

        // Calculate effective bounds
        const effectiveMinX = this.centerX - effectiveHalfWidth;
        const effectiveMaxX = this.centerX + effectiveHalfWidth;
        const effectiveMinY = this.centerY - effectiveHalfHeight;
        const effectiveMaxY = this.centerY + effectiveHalfHeight;

        // No changes needed if point is inside boundary
        if (
            x >= effectiveMinX &&
            x <= effectiveMaxX &&
            y >= effectiveMinY &&
            y <= effectiveMaxY
        ) {
            return { vx, vy };
        }

        // Outside boundary, determine which wall and handle appropriately
        let newVx = vx;
        let newVy = vy;

        // X-axis boundary
        if (x < effectiveMinX) {
            if (vx < 0) { // Moving further outside
                newVx = 0; // Stop or reflect
            }
        } else if (x > effectiveMaxX) {
            if (vx > 0) { // Moving further outside
                newVx = 0; // Stop or reflect
            }
        }

        // Y-axis boundary
        if (y < effectiveMinY) {
            if (vy < 0) { // Moving further outside
                newVy = 0; // Stop or reflect
            }
        } else if (y > effectiveMaxY) {
            if (vy > 0) { // Moving further outside
                newVy = 0; // Stop or reflect
            }
        }

        // Apply damping
        newVx *= this.damping;
        newVy *= this.damping;

        return { vx: newVx, vy: newVy };
    }

    // Update boundary parameters and notify dependents
    update(params) {
        let changed = false;

        if (params.width !== undefined && params.width !== this.width) {
            this.width = params.width;
            this.halfWidth = params.width / 2;
            this.minX = this.centerX - this.halfWidth;
            this.maxX = this.centerX + this.halfWidth;
            changed = true;
        }

        if (params.height !== undefined && params.height !== this.height) {
            this.height = params.height;
            this.halfHeight = params.height / 2;
            this.minY = this.centerY - this.halfHeight;
            this.maxY = this.centerY + this.halfHeight;
            changed = true;
        }

        if (params.centerX !== undefined && params.centerX !== this.centerX) {
            this.centerX = params.centerX;
            this.minX = this.centerX - this.halfWidth;
            this.maxX = this.centerX + this.halfWidth;
            changed = true;
        }

        if (params.centerY !== undefined && params.centerY !== this.centerY) {
            this.centerY = params.centerY;
            this.minY = this.centerY - this.halfHeight;
            this.maxY = this.centerY + this.halfHeight;
            changed = true;
        }

        if (changed) {
            // Update FLIP system boundary at same time
            this.flipBoundaryScale = 1.0;
            this.updateCallbacks.forEach((callback) => callback(this));
        }
        return changed;
    }

    // Get width and height for UI and other components
    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    // Get an equivalent radius for compatibility with circular-expecting code
    getRadius() {
        // Use the smallest dimension to ensure particles remain inside the boundary
        return Math.min(this.halfWidth, this.halfHeight);
    }

    // Return boundary type - required by base class
    getBoundaryType() {
        return "RECTANGULAR";
    }

    // Return boundary details for calculations
    getBoundaryDetails() {
        return {
            type: "RECTANGULAR",
            centerX: this.centerX,
            centerY: this.centerY,
            width: this.width,
            height: this.height,
            minX: this.minX,
            maxX: this.maxX,
            minY: this.minY,
            maxY: this.maxY
        };
    }
}

export { RectangularBoundary }; 