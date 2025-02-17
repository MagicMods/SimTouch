import { NeighborSearch } from "./neighborSearch.js";
import { OrganicForces } from "../forces/organicForces.js";
import { AutomataRules } from "./automataRules.js";

class OrganicBehavior {
  constructor({ particleRadius = 0.01, gridSize = 32, enabled = false } = {}) {
    this.enabled = false;

    // Core settings
    this.particleRadius = particleRadius;
    this.searchRadius = particleRadius * 4;
    this.gridSize = gridSize;

    // State tracking
    this.lastUpdateTime = 0;
    this.automataUpdateInterval = 0.1; // 100ms between rule updates

    // Initialize subsystems
    this.neighborSearch = new NeighborSearch(this.searchRadius, this.gridSize);
    this.forces = new OrganicForces();

    // Behavior parameters
    this.params = {
      fluid: {
        surfaceTension: 0.4,
        viscosity: 0.8,
        damping: 0.98,
      },
      swarm: {
        cohesion: 0.5,
        separation: 0.3,
        alignment: 0.2,
        maxSpeed: 2.0,
      },
      automata: {
        birthMin: 4,
        birthMax: 6,
        survivalMin: 3,
        survivalMax: 7,
        influence: 0.3,
      },
    };

    this.automata = new AutomataRules(this.params.automata);
  }

  updateParticles(particleSystem, dt) {
    if (!this.enabled) return;

    // Update spatial grid
    this.neighborSearch.updateGrid(particleSystem);

    // Apply continuous forces
    this.applyFluidForces(particleSystem, dt);
    this.applySwarmForces(particleSystem, dt);

    // Apply cellular automata rules periodically
    this.lastUpdateTime += dt;
    if (this.lastUpdateTime >= this.automataUpdateInterval) {
      this.applyAutomataRules(particleSystem);
      this.lastUpdateTime = 0;
    }
  }

  applyFluidForces(particleSystem, dt) {
    const { particles, velocitiesX, velocitiesY } = particleSystem;

    for (let i = 0; i < particles.length; i += 2) {
      const neighbors = this.neighborSearch.findNeighbors(
        particleSystem,
        i / 2
      );

      // Apply fluid dynamics
      this.forces.applySurfaceTension(
        [particles[i], particles[i + 1]],
        neighbors,
        this.params.fluid.surfaceTension
      );

      this.forces.applyViscosity(
        [velocitiesX[i / 2], velocitiesY[i / 2]],
        neighbors,
        this.params.fluid.viscosity
      );
    }
  }

  applySwarmForces(particleSystem, dt) {
    // Implementation for cohesion/separation/alignment
  }

  applyAutomataRules(particleSystem) {
    this.automata.updateStates(particleSystem, this.neighborSearch);

    // Apply state influence to particle behavior
    const particles = particleSystem.particles;
    for (let i = 0; i < particles.length; i += 2) {
      const state = this.automata.particleStates.get(i / 2) || 1.0;

      // Modify particle properties based on state
      particleSystem.velocitiesX[i / 2] *= state;
      particleSystem.velocitiesY[i / 2] *= state;

      // Optional: Modify particle appearance
      if (particleSystem.particleColors) {
        particleSystem.particleColors[i / 2] = state;
      }
    }
  }
}
export { OrganicBehavior };
