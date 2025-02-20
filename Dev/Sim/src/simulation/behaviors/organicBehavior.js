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
    this.neighborSearch = new NeighborSearch({ resolution: 24 });

    // Debug settings
    this.debug = false;
    this.debugEnabled = false;

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

    const particles = [];
    for (let i = 0; i < particleSystem.particles.length; i += 2) {
      const particle = {
        x: particleSystem.particles[i],
        y: particleSystem.particles[i + 1],
        vx: particleSystem.velocitiesX[i / 2],
        vy: particleSystem.velocitiesY[i / 2],
        index: i / 2,
      };
      particles.push(particle);

      // Debug particles in top region
      if (this.debugEnabled && particle.y > 0.7) {
        console.log(`Particle ${i / 2} at y=${particle.y.toFixed(3)}`);
      }
    }

    const neighbors = this.neighborSearch.findNeighbors(
      particles,
      currentParams.radius
    );

    if (this.debugEnabled) {
      console.log(`Total neighbors found: ${neighbors.size}`);
    }

    const forces = this.forces.calculateForces(
      particles,
      neighbors,
      currentParams
    );

    forces.forEach((force, idx) => {
      if (this.debugEnabled && particles[idx].y > 0.7) {
        console.log(
          `Force at y=${particles[idx].y.toFixed(3)}: (${force.x.toFixed(
            3
          )}, ${force.y.toFixed(3)})`
        );
      }
      particleSystem.velocitiesX[idx] += force.x * dt;
      particleSystem.velocitiesY[idx] += force.y * dt;
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
