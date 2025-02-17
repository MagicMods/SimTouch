class AutomataRules {
  constructor(params) {
    this.params = params;
    this.particleStates = new Map(); // Track particle states
  }

  updateStates(particleSystem, neighborSearch) {
    const newStates = new Map();
    const particles = particleSystem.particles;

    for (let i = 0; i < particles.length; i += 2) {
      const neighbors = neighborSearch.findNeighbors(particleSystem, i / 2);
      const currentState = this.particleStates.get(i / 2) || 1.0;
      const neighborCount = neighbors.length;

      // Apply Conway-like rules with continuous states
      let newState = currentState;
      if (neighborCount < this.params.survivalMin) {
        newState *= 0.8; // Gradual death
      } else if (neighborCount > this.params.survivalMax) {
        newState *= 0.9; // Overcrowding
      } else if (
        neighborCount >= this.params.birthMin &&
        neighborCount <= this.params.birthMax
      ) {
        newState = Math.min(1.0, newState * 1.2); // Growth
      }

      newStates.set(i / 2, newState);
    }

    this.particleStates = newStates;
  }
}
export { AutomataRules };
