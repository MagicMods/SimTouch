export class ChainBehavior {
    constructor() {
        // Track all formed chains
        this.chains = [];
        // Map particle index to chain ID and position
        this.particleChainMap = new Map();

        // Constants
        this.TARGET_WIDTH = 240;
        this.TARGET_HEIGHT = 240;
        this.forceDamping = 0.85;
    }

    // Set parameters from outside
    setParams(params) {
        this.params = params;
    }

    // Convert particle to pixel space for calculations
    toPixelSpace(p) {
        return {
            x: p.x * this.TARGET_WIDTH,
            y: p.y * this.TARGET_HEIGHT,
            vx: p.vx * this.TARGET_WIDTH,
            vy: p.vy * this.TARGET_HEIGHT,
            index: p.index
        };
    }

    // Initialize or reset all chain structures
    reset() {
        this.chains = [];
        this.particleChainMap = new Map();
    }

    // Calculate chain forces for all particles
    calculateForces(particles, neighbors, baseForce = 1.0) {
        const forces = new Map();

        // First, update chain memberships
        this.updateChainMembership(particles, neighbors);

        // Then calculate forces for each particle
        particles.forEach((particle, idx) => {
            const force = { x: 0, y: 0 };

            // Calculate force based on chain membership
            this.calculateParticleForce(particle, neighbors.get(idx) || [], force, baseForce);

            forces.set(idx, force);
        });

        return forces;
    }

    // Update which particles belong to which chains
    updateChainMembership(particles, neighbors) {
        // Process free particles (not in chains)
        for (const particle of particles) {
            const idx = particle.index;

            // Skip if already in a chain
            if (this.particleChainMap.has(idx)) continue;

            const neighborList = neighbors.get(idx) || [];
            if (neighborList.length === 0) continue;

            // Check if any neighbors are in a chain
            const chainNeighbors = [];
            for (const neighbor of neighborList) {
                const neighborChainInfo = this.particleChainMap.get(neighbor.particle.index);

                // If neighbor is in a chain
                if (neighborChainInfo) {
                    // Add to potential chain connections
                    const chain = this.chains[neighborChainInfo.chainId];

                    // Check if chain has room and neighbor can branch
                    if (chain.particles.length < this.params.maxLinks &&
                        this.countBranches(neighbor.particle.index) < this.params.branchProb) {
                        chainNeighbors.push({
                            neighbor: neighbor.particle,
                            chainId: neighborChainInfo.chainId,
                            distance: neighbor.distance
                        });
                    }
                }
            }

            if (chainNeighbors.length > 0) {
                // Sort by distance and join closest chain
                chainNeighbors.sort((a, b) => a.distance - b.distance);

                // Join the chain
                const chainToJoin = chainNeighbors[0];
                this.addToChain(particle.index, chainToJoin.chainId, chainToJoin.neighbor.index);
            }
            // If no existing chains to join and we have room for a new chain
            else if (this.chains.length < this.params.maxChains) {
                // Start a new chain
                this.createNewChain(particle.index);
            }
        }
    }

    // Count how many branches a particle has spawned
    countBranches(particleIdx) {
        let branchCount = 0;

        // Look through all chains
        for (const chain of this.chains) {
            // For each particle in chain
            for (const chainParticleInfo of chain.links) {
                if (chainParticleInfo.parent === particleIdx) {
                    branchCount++;
                }
            }
        }

        return branchCount;
    }

    // Create a new chain starting with this particle
    createNewChain(particleIdx) {
        const chainId = this.chains.length;

        // Create the chain
        const chain = {
            id: chainId,
            particles: [particleIdx],
            links: [] // Stores parent-child relationships
        };

        // Add to chains collection
        this.chains.push(chain);

        // Add particle to chain map
        this.particleChainMap.set(particleIdx, {
            chainId: chainId,
            position: 0 // First particle in chain
        });

        return chain;
    }

    // Add a particle to an existing chain
    addToChain(particleIdx, chainId, parentIdx) {
        const chain = this.chains[chainId];
        if (!chain) return false;

        // Add particle to chain
        chain.particles.push(particleIdx);

        // Add link information
        chain.links.push({
            from: particleIdx,
            parent: parentIdx
        });

        // Add to particle-chain map
        this.particleChainMap.set(particleIdx, {
            chainId: chainId,
            position: chain.particles.length - 1
        });

        return true;
    }

    // Calculate force for a single particle
    calculateParticleForce(particle, neighbors, force, baseForce) {
        const idx = particle.index;
        const pixelParticle = this.toPixelSpace(particle);

        // Check if particle is in a chain
        const chainInfo = this.particleChainMap.get(idx);

        if (chainInfo) {
            // Particle is in a chain - apply chain forces
            const chain = this.chains[chainInfo.chainId];

            // Find chain neighbors
            const chainNeighbors = [];
            for (const neighbor of neighbors) {
                const neighborInfo = this.particleChainMap.get(neighbor.particle.index);

                // If neighbor is in same chain and directly connected
                if (neighborInfo && neighborInfo.chainId === chainInfo.chainId) {
                    // Check if directly connected in chain
                    const isConnected = chain.links.some(link =>
                        (link.from === idx && link.parent === neighbor.particle.index) ||
                        (link.from === neighbor.particle.index && link.parent === idx)
                    );

                    if (isConnected) {
                        chainNeighbors.push(neighbor);
                    }
                }
            }

            // Apply link distance constraint forces 
            for (const neighbor of chainNeighbors) {
                const other = this.toPixelSpace(neighbor.particle);
                const dx = other.x - pixelParticle.x;
                const dy = other.y - pixelParticle.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 0) {
                    const targetDist = this.params.linkDistance;
                    const distDiff = dist - targetDist;

                    // Calculate direction
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Calculate link force (stronger with higher linkStrength)
                    // This maintains the fixed distance between chain links
                    const linkForce = distDiff * this.params.linkStrength * 0.3;

                    // Add to total force
                    force.x += nx * linkForce;
                    force.y += ny * linkForce;
                }
            }

            // Apply alignment force when we have at least 3 particles in a chain
            if (chainNeighbors.length >= 2) {
                this.applyAlignmentForce(pixelParticle, chainNeighbors, force);
            }

            // Apply repulsion from non-chain particles
            for (const neighbor of neighbors) {
                const neighborInfo = this.particleChainMap.get(neighbor.particle.index);

                // Skip particles in same chain
                if (neighborInfo && neighborInfo.chainId === chainInfo.chainId) continue;

                const other = this.toPixelSpace(neighbor.particle);
                const dx = other.x - pixelParticle.x;
                const dy = other.y - pixelParticle.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 0 && dist < this.params.radius) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const repulsionStr = (1.0 - dist / this.params.radius) * 0.5;

                    force.x -= nx * repulsionStr;
                    force.y -= ny * repulsionStr;
                }
            }
        } else {
            // Free particle - try to join a chain
            let closestChainParticle = null;
            let minDist = Number.MAX_VALUE;

            // Find closest chain particle that can accept new connections
            for (const neighbor of neighbors) {
                const neighborInfo = this.particleChainMap.get(neighbor.particle.index);

                if (neighborInfo) {
                    const chain = this.chains[neighborInfo.chainId];

                    // Check if chain has room and neighbor can branch
                    if (chain.particles.length < this.params.maxLinks &&
                        this.countBranches(neighbor.particle.index) < this.params.branchProb) {

                        if (neighbor.distance < minDist) {
                            minDist = neighbor.distance;
                            closestChainParticle = neighbor.particle;
                        }
                    }
                }
            }

            if (closestChainParticle) {
                // Apply attraction to closest viable chain particle
                const other = this.toPixelSpace(closestChainParticle);
                const dx = other.x - pixelParticle.x;
                const dy = other.y - pixelParticle.y;
                const dist = Math.hypot(dx, dy);

                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const attractStr = Math.min(0.5, 0.3 * this.params.linkStrength);

                    force.x += nx * attractStr;
                    force.y += ny * attractStr;
                }
            }
        }

        // Apply base force
        force.x *= baseForce;
        force.y *= baseForce;

        // Apply damping
        force.x *= this.forceDamping;
        force.y *= this.forceDamping;
    }

    // Calculate and apply alignment force for chain particles
    applyAlignmentForce(particle, chainNeighbors, force) {
        // Only apply alignment when we have alignment parameter > 0
        if (this.params.alignment <= 0) return;

        // Get positions of neighboring particles
        const neighbors = chainNeighbors.map(n => this.toPixelSpace(n.particle));

        if (neighbors.length < 2) return;

        // Calculate vectors to neighbors
        const vectors = neighbors.map(n => ({
            x: n.x - particle.x,
            y: n.y - particle.y
        }));

        // Normalize vectors
        const normVectors = vectors.map(v => {
            const mag = Math.hypot(v.x, v.y);
            return mag > 0 ? { x: v.x / mag, y: v.y / mag } : { x: 0, y: 0 };
        });

        // Calculate alignment force
        for (let i = 0; i < normVectors.length; i++) {
            for (let j = i + 1; j < normVectors.length; j++) {
                const v1 = normVectors[i];
                const v2 = normVectors[j];

                // Calculate dot product between vectors
                const dot = v1.x * v2.x + v1.y * v2.y;

                // If alignment = 1, we want a straight line (dot = -1)
                // If alignment = 0, we don't care about angle
                const alignmentStrength = this.params.alignment;

                // Calculate how far we are from a straight line
                const straighteningNeeded = 1.0 + dot; // 0 when perfectly straight

                if (straighteningNeeded > 0.01) { // Only apply when not straight
                    // Calculate perpendicular direction to push particle
                    // This will push the middle particle to form a straight line
                    const perpX = v1.y - v2.y;
                    const perpY = v2.x - v1.x;

                    const perpMag = Math.hypot(perpX, perpY);
                    if (perpMag > 0) {
                        const normPerpX = perpX / perpMag;
                        const normPerpY = perpY / perpMag;

                        // Apply force stronger when alignment is high
                        const alignForce = straighteningNeeded * alignmentStrength * 0.3;

                        force.x += normPerpX * alignForce;
                        force.y += normPerpY * alignForce;
                    }
                }
            }
        }
    }
}