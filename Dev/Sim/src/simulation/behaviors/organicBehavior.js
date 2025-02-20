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

    // Force scaling factors
    this.forceScales = {
      [this.behaviors.FLUID]: {
        base: 0.1,
        surfaceTension: 0.5,
        viscosity: 0.2,
      },
      [this.behaviors.SWARM]: {
        base: 0.05,
        cohesion: 0.3,
        separation: 0.4,
      },
      [this.behaviors.AUTOMATA]: {
        base: 0.02,
      },
    };

    // Debug settings
    this.debug = false;
    this.debugForces = true; // Show force calculations
    this.debugNeighbors = true; // Show neighbor stats
    this.debugParticles = true; // Show particle updates

    if (this.debug) {
      console.log(
        "OrganicBehavior initialized:",
        JSON.stringify(
          {
            currentBehavior: this.currentBehavior,
            params: this.params,
            forceScales: this.forceScales,
          },
          null,
          2
        )
      );
    }
  }

  updateParticles(particleSystem, dt) {
    if (!this.enabled) return;

    const currentParams = this.params[this.currentBehavior];
    if (!currentParams) return;

    // Create particle objects for force calculation
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

    // Calculate forces
    const neighbors = this.neighborSearch.findNeighbors(
      particleObjects,
      currentParams.radius
    );
    const forces = this.forces.calculateForces(
      particleObjects,
      neighbors,
      currentParams
    );

    // Apply forces to velocities
    forces.forEach((force, idx) => {
      if (Math.abs(force.x) > 0 || Math.abs(force.y) > 0) {
        // Scale force by timestep
        const fx = force.x * dt;
        const fy = force.y * dt;

        // Apply to velocities
        particleSystem.velocitiesX[idx] += fx;
        particleSystem.velocitiesY[idx] += fy;
      }
    });
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
