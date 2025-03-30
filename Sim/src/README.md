# Svibe Simulation Core

This simulation provides a particle-based physics simulation with various force fields, input modulation, and visual rendering.

## Core Architecture

The codebase follows a specific dependency hierarchy:

### Main Class

The `Main` class is the entry point and coordinates all simulation components. It:

1. Initializes the WebGL context
2. Creates simulation components (ParticleSystem, TurbulenceField, etc.)
3. Sets up renderers (ParticleRenderer, GridRenderer, etc.)
4. Manages input systems (MouseForces, EmuForces, etc.)
5. Coordinates the rendering and simulation loop

### Simulation Core

- **ParticleSystem**: Manages particle state, integration, and physics
  - Requires: `TurbulenceField`, `VoronoiField`, `CircularBoundary`
  - Provides: Particle positions, velocities, and radii

### Forces

- **TurbulenceField**: Applies noise-based forces to particles
  - Requires: `CircularBoundary`
  
- **VoronoiField**: Creates voronoi cell-based forces
  - Requires: `CircularBoundary`
  
- **MouseForces**: Handles user interaction with particles
  - Requires: Direct reference to `Main` and `ParticleSystem`

- **EmuForces**: Applies external EMU device forces
  - Requires: `ParticleSystem.gravity`

### Rendering

- **ShaderManager**: Manages WebGL shaders and programs
  - Requires: WebGL context

- **ParticleRenderer**: Draws particles
  - Requires: WebGL context, `ShaderManager`

- **GridRenderer**: Handles grid visualization modes
  - Requires: WebGL context, `ShaderManager`

- **DebugRenderer**: Visualizes force fields and debug info
  - Requires: WebGL context, `ShaderManager`

### UI System

- **UiManager**: Coordinates all UI components
  - Requires: `Main` reference
  - Manages: ModulatorManager, PresetManager

- **ModulatorManager**: Handles parameter modulation
  - Requires: UI component references

### Network

- **SocketManager**: Handles WebSocket communication
  - Singleton pattern, no direct dependencies

## Component Relationships

Main
├── ParticleSystem
│   ├── TurbulenceField
│   ├── VoronoiField
│   ├── CircularBoundary
│   ├── MouseForces
│   ├── CollisionSystem
│   └── GravityForces
├── Renderers
│   ├── ParticleRenderer
│   ├── GridRenderer
│   ├── DebugRenderer
│   └── EmuRenderer
├── Input
│   ├── ExternalInputConnector
│   ├── ModulatorManager
│   └── MicInputForces
└── UI
    └── UiManager
        ├── Various UI Panels
        └── PresetManager

## Error Handling

Components are designed to fail explicitly when required dependencies are missing. This approach:

1. Makes dependencies clear and explicit
2. Prevents silent failures and unexpected behavior
3. Provides clear error messages that identify the missing dependency

## Best Practices

1. **Direct Access**: Components directly access required dependencies without excessive safety checks
2. **Explicit Failure**: Components throw errors when critical dependencies are missing
3. **Clear Requirements**: Each component clearly documents its required dependencies
4. **Initialization Order**: Components are initialized in the correct dependency order

## Code Style Guidelines

### Anti-Patterns to Avoid

1. **Optional Chaining**: Do not use optional chaining (`?.`) to access properties or methods
   ```javascript
   // BAD
   this.main?.turbulenceField?.update();
   
   // GOOD
   this.main.turbulenceField.update();
   ```

2. **Silent Returns**: Do not use silent returns when dependencies are missing
   ```javascript
   // BAD
   if (!this.turbulence) return;
   
   // GOOD
   if (!this.turbulence) {
     throw new Error("TurbulenceField is required");
   }
   ```

3. **Type Checking**: Do not check types before calling methods
   ```javascript
   // BAD
   if (typeof controller.getValue === "function") {
     controller.getValue();
   }
   
   // GOOD
   controller.getValue(); // Validate at initialization time
   ```

4. **Multiple Fallbacks**: Do not try multiple paths to access the same object
   ```javascript
   // BAD
   const field = this.main?.turbulenceField || 
                 this.particleSystem?.main?.turbulenceField;
   
   // GOOD
   const field = this.main.turbulenceField; // Documented dependency
   ```

### Logging

The codebase uses a centralized logging utility (`logger.js`) instead of direct console calls:

```javascript
// BAD
console.log("Starting initialization");
console.error("Failed to load resource", error);

// GOOD
import { logger } from "../util/logger.js";
logger.info("Starting initialization");
logger.error("Failed to load resource", error);
```

Benefits of the logger:
- Configurable log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Consistent formatting
- Can be disabled in production
- Single point of control for all logging
