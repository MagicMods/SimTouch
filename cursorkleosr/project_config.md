# Project Configuration (LTM)

*This file contains the stable, long-term context for the project.*
*It should be updated infrequently, primarily when core goals, tech, or patterns change.*

---

## Core Goal

Create a particle-based physics simulation system with WebGL rendering, focusing on:

- Accurate particle physics simulation
- Multiple force field interactions
- Real-time user interaction
- Modular behavior system
- High-performance WebGL rendering

---

## Tech Stack

- **Core:** JavaScript (ES6+)
- **Graphics:** WebGL
- **UI:** lil-gui for parameter controls
- **Testing:** Jest (planned)
- **Linting/Formatting:** ESLint, Prettier

---

## Critical Patterns & Conventions

### Code Quality Standards

- **Direct Access Principle:**
  - No optional chaining or excessive type checks
  - Fail fast when dependencies are missing
  - Clear documentation of requirements

- **Explicit Failure Principle:**
  - Errors should be visible and traceable
  - No silent error handling
  - Clear error messages identifying failure points
- **Direct Responsibility Principle:**
  - Clear dependency documentation
  - Single source of truth for resources
  - Proper dependency injection

### Component Architecture

- **UI Components:**
  - Extend BaseUi class
  - Require main reference and container
  - Follow established folder/control patterns

- **Simulation Components:**
  - Clear dependency hierarchy
  - Explicit initialization requirements
  - Direct access to required resources

### Error Handling

- Throw explicit errors for missing dependencies

- Log errors with specific context
- No silent fallbacks or optional chaining

---

## Key Constraints

- Must maintain 60fps for smooth particle simulation
- WebGL context must be properly managed
- No silent failures in physics calculations
- Strict adherence to established UI patterns
- Direct dependency access without safety checks
- Clear error propagation for debugging
