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
    this.currentBehavior = "Fluid";

    // Default parameters for each behavior
    this.params = {
      Fluid: {
        radius: 20,
        surfaceTension: 0.5,
        viscosity: 0.2,
        damping: 0.98,
        mode: "Fluid",
      },
      Swarm: {
        radius: 30,
        cohesion: 0.4,
        alignment: 0.3,
        separation: 0.5,
        maxSpeed: 2.0,
        mode: "Swarm",
      },
      Automata: {
        radius: 15,
        repulsion: 0.3,
        attraction: 0.2,
        threshold: 0.5,
        mode: "Automata",
      },
    };

    // Force scales
    this.forceScales = {
      Fluid: {
        base: 0.1,
        surfaceTension: 0.5,
        viscosity: 0.2,
      },
      Swarm: {
        base: 0.05,
        cohesion: 0.3,
        separation: 0.4,
      },
      Automata: {
        base: 0.02,
      },
    };

    // Initialize components
    this.forces = new OrganicForces(this.forceScales);
    this.neighborSearch = new NeighborSearch({ resolution: 240 });

    // Debug settings
    this.debug = false;

    console.log(
      "OrganicBehavior initialized:",
      JSON.stringify(
        {
          currentBehavior: this.currentBehavior,
          params: this.params,
        },
        null,
        2
      )
    );
  }

  updateParticles(particleSystem, dt) {
    if (!this.enabled) return;

    const currentParams = this.params[this.currentBehavior];
    if (!currentParams) return;

    // Create particle objects with proper coordinates
    const particleObjects = [];
    for (let i = 0; i < particleSystem.particles.length; i += 2) {
      particleObjects.push({
        x: particleSystem.particles[i],
        y: particleSystem.particles[i + 1], // Keep original Y
        vx: particleSystem.velocitiesX[i / 2],
        vy: particleSystem.velocitiesY[i / 2],
        index: i / 2,
      });

      // Debug bottom half particles
      if (particleObjects[particleObjects.length - 1].y > 0.5 && this.debug) {
        // Only log every 60 frames (about 1 second at 60fps)
        if (Math.floor(performance.now() / 1000) % 1 === 0) {
          console.log(
            "Bottom half particle:",
            JSON.stringify(particleObjects[particleObjects.length - 1], null, 2)
          );
        }
      }
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

  // logUpdate(particleSystem, neighbors, forces) {
  //   const stats = {
  //     behavior: this.currentBehavior,
  //     particles: particleSystem.getParticles().length,
  //     activeNeighborhoods: neighbors.size,
  //     maxForce: Math.max(
  //       ...Array.from(forces.values()).map((f) => Math.hypot(f.x, f.y))
  //     ),
  //   };
  //   console.log("Behavior Update:", stats);
  // }
}

export { OrganicBehavior };
