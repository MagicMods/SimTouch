import { NeighborSearch } from "./neighborSearch.js";
import { OrganicForces } from "../forces/organicForces.js";
import { AutomataRules } from "./automataRules.js";

export const Behaviors = {
  FLUID: "Fluid",
  SWARM: "Swarm",
  AUTOMATA: "Automata",
};

class OrganicBehavior {
  constructor() {
    this.enabled = false;
    this.behaviors = Behaviors;
    this.currentBehavior = this.behaviors.FLUID;
    this.debug = false;

    // Initialize subsystems
    this.neighborSearch = new NeighborSearch();
    this.forces = new OrganicForces();
    this.automata = new AutomataRules();

    // Behavior parameters
    this.params = {
      [this.behaviors.FLUID]: {
        radius: 20,
        surfaceTension: 0.1,
        viscosity: 0.05,
        damping: 0.98,
        mode: this.behaviors.FLUID,
      },
      [this.behaviors.SWARM]: {
        radius: 30,
        cohesion: 0.4,
        separation: 0.8,
        alignment: 0.3,
        maxSpeed: 2.0,
        mode: this.behaviors.SWARM,
      },
      [this.behaviors.AUTOMATA]: {
        radius: 15,
        birthThreshold: 0.3,
        deathThreshold: 0.7,
        stateChangeRate: 0.1,
        mode: this.behaviors.AUTOMATA,
      },
    };

    if (this.debug) {
      console.log("OrganicBehavior initialized:", {
        currentBehavior: this.currentBehavior,
        params: this.params,
      });
    }
  }

  updateParticles(particleSystem, dt) {
    if (!this.enabled) return;

    // Get current behavior parameters
    const currentParams = this.params[this.currentBehavior];
    if (!currentParams) {
      console.warn("No parameters for behavior:", this.currentBehavior);
      return;
    }

    // Create particle objects for neighbor search
    const particleObjects = [];
    for (let i = 0; i < particleSystem.particles.length; i += 2) {
      particleObjects.push({
        x: particleSystem.particles[i],
        y: particleSystem.particles[i + 1],
        vx: particleSystem.velocitiesX[i / 2],
        vy: particleSystem.velocitiesY[i / 2],
        index: i / 2,
      });
    }

    // Debug initial state
    if (this.debug) {
      console.log("Initial particle state:", {
        first: particleObjects[0],
        total: particleObjects.length,
      });
    }

    // Find neighbors
    const neighbors = this.neighborSearch.findNeighbors(
      particleObjects,
      currentParams.radius
    );

    // Debug neighbors
    if (this.debug) {
      console.log("Neighbor count:", neighbors.size);
    }

    // Calculate forces
    const forces = this.forces.calculateForces(
      particleObjects,
      neighbors,
      currentParams
    );

    // Debug forces
    if (this.debug) {
      console.log("Force calculation:", {
        totalForces: forces.size,
        firstForce: Array.from(forces.values())[0],
      });
    }

    // Apply forces
    let maxForce = 0;
    forces.forEach((force, idx) => {
      particleSystem.velocitiesX[idx] += force.x * dt;
      particleSystem.velocitiesY[idx] += force.y * dt;

      maxForce = Math.max(maxForce, Math.hypot(force.x, force.y));
    });

    // Debug final state
    if (this.debug) {
      console.log("Force application:", {
        maxForce,
        firstVelocity: {
          x: particleSystem.velocitiesX[0],
          y: particleSystem.velocitiesY[0],
        },
      });
    }
  }

  logUpdate(particleSystem, neighbors, forces) {
    const stats = {
      behavior: this.currentBehavior,
      particles: particleSystem.getParticles().length,
      activeNeighborhoods: neighbors.size,
      maxForce: Math.max(
        ...Array.from(forces.values()).map((f) => Math.hypot(f.x, f.y))
      ),
    };
    console.log("Behavior Update:", stats);
  }
}

export { OrganicBehavior };
