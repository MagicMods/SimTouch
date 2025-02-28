class AutomataRules {
  constructor() {
    this.particleStates = new Map();
    this.stateColors = new Map();
    this.debugEnabled = false;
  }

  initializeStates(particles) {
    particles.forEach((p, idx) => {
      // Random initial states between 0 and 1
      this.particleStates.set(idx, Math.random());
    });
  }

  updateStates(particles, neighbors, params) {
    const newStates = new Map();

    particles.forEach((particle, idx) => {
      const currentState = this.particleStates.get(idx) || 0.5;
      const neighborList = neighbors.get(idx) || [];
      
      // Calculate average neighbor state
      let avgState = 0;
      neighborList.forEach(n => {
        avgState += this.particleStates.get(n.index) || 0.5;
      });
      avgState = neighborList.length > 0 ? avgState / neighborList.length : currentState;

      // Apply rules based on neighbor states
      let newState = currentState;
      if (Math.abs(avgState - currentState) > params.threshold) {
        // State transition
        newState += (avgState - currentState) * 0.1;
      }

      // Clamp state between 0 and 1
      newState = Math.max(0, Math.min(1, newState));
      newStates.set(idx, newState);
    });

    this.particleStates = newStates;
    return this.particleStates;
  }

  getParticleState(idx) {
    return this.particleStates.get(idx) || 0.5;
  }
}
export { AutomataRules };
