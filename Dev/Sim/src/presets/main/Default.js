export const defaultPresets = {
  default: {
    left: {
      folders: {
        Simulation: {
          // Default simulation settings
          timeStep: 0.016,
          iterations: 1,
          gravity: -9.81,
        },
        Particles: {
          // Default particle settings
          count: 1000,
          size: 5,
          color: "#ffffff",
        },
      },
    },
    right: {
      folders: {
        Turbulence: {
          // Default turbulence settings
          strength: 1.0,
          scale: 100,
          speed: 1.0,
        },
      },
    },
  },
  minimal: {
    // Minimal configuration preset
    left: {
      folders: {
        Simulation: {
          timeStep: 0.016,
          iterations: 1,
          gravity: -9.81,
        },
      },
    },
    right: {
      folders: {
        Turbulence: {
          strength: 0.5,
          scale: 50,
          speed: 0.5,
        },
      },
    },
  },
};
