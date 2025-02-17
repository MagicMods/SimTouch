import { NeighborSearch } from "./neighborSearch.js";
import { OrganicForces } from "../forces/organicForces.js";

class OrganicBehavior {
  constructor({ particleRadius = 0.01, gridSize = 32, enabled = false } = {}) {
    this.enabled = enabled;

    // Behavior strengths
    this.fluidBehavior = {
      surfaceTension: 0.4,
      viscosity: 0.8,
    };

    this.swarmBehavior = {
      cohesion: 0.5,
      separation: 0.3,
      alignment: 0.2,
    };

    this.automata = {
      birthRange: [4, 6], // Number of neighbors needed for birth
      survivalRange: [3, 7], // Number of neighbors needed for survival
      deathThreshold: 2, // Die if fewer neighbors
    };

    // Spatial search setup
    this.neighborSearch = new NeighborSearch(particleRadius * 4);
    this.behaviorForces = new OrganicForces();
  }

  updateParticles(particleSystem, dt) {
    // Update spatial partitioning
    this.neighborSearch.updateGrid(particleSystem);

    // Apply behaviors in sequence
    this.applyFluidBehaviors(particleSystem, dt);
    this.applyNeighborBehaviors(particleSystem, dt);
    this.enforceAutomataRules(particleSystem, dt);
  }

  applyFluidBehaviors(particleSystem, dt) {
    const { particles, velocitiesX, velocitiesY } = particleSystem;

    for (let i = 0; i < particles.length; i += 2) {
      const neighbors = this.neighborSearch.findNeighbors(
        particleSystem,
        i / 2
      );

      // Apply fluid dynamics
      this.behaviorForces.applySurfaceTension(
        [particles[i], particles[i + 1]],
        neighbors,
        this.fluidBehavior.surfaceTension
      );

      this.behaviorForces.applyViscosity(
        [velocitiesX[i / 2], velocitiesY[i / 2]],
        neighbors,
        this.fluidBehavior.viscosity
      );
    }
  }

  applyNeighborBehaviors(particleSystem, dt) {
    // Implementation for cohesion/separation/alignment
  }

  enforceAutomataRules(particleSystem, dt) {
    // Implementation for cellular automata rules
  }
}
export { OrganicBehavior };
