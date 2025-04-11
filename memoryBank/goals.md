# Project Goals

## Overarching Vision: Embedded Hardware Particle Simulator

**The ultimate goal is to create a core particle simulation engine suitable for deployment on CPU-only embedded systems. This engine will be used to animate and drive external hardware devices based on simulation state and modulated inputs.**

## Development Strategy: JS Prototyping -> C# Embedded

The project follows a two-phase strategy:

- **Phase 1: JavaScript Prototyping Environment (`Sim` Project)**

  - **Objective:** Develop and rapidly iterate on simulation mechanics, force interactions, input modulation, and core algorithms within a browser-based JavaScript application (`Sim/src/`).
  - **Purpose:** This JS application serves primarily as a functional specification, a fast prototyping tool, and a visual debugger for the logic intended for the embedded system.

- **Phase 2: C# Embedded Implementation**
  - **Objective:** Create a C# version of the core simulation engine, derived from the validated JS prototype, suitable for embedded deployment.

## Core Architectural Principles (for Embedded Target & JS Prototype)

To ensure the JS prototype (Phase 1) can effectively inform and transition to the C# implementation (Phase 2), the **core logic** developed in JavaScript MUST adhere to the following principles:

1.  **Strict Separation of Concerns:** Core computational logic (simulation, physics, forces, algorithms) MUST remain independent of platform specifics (Browser APIs, DOM, WebGL) and presentation layers (UI, Rendering).
2.  **Modularity & Reusability:** Design components with clear responsibilities and minimal, well-defined interfaces, enabling independent testing and eventual C# translation.
3.  **Minimize Core Dependencies:** Core logic MUST avoid reliance on external JavaScript libraries or frameworks that are not easily replicated or replaced in a C# embedded environment.
4.  **Statelessness & Pure Functions:** Favor stateless components and pure functions for calculations and transformations where feasible, enhancing predictability and simplifying porting.
5.  **Data-Oriented Design:** Consider data structures and transformations that are efficient for CPU-bound computation and easily representable in C#.

## Scope Definition (Core Logic vs. Platform/Presentation)

_(This section clarifies what constitutes the "core logic" targeted for eventual porting)_

- **Inclusions (Core Logic - Portable):**
  - Particle System (`ParticleSystem.js`)
  - Collision System (`CollisionSystem.js`)
  - Fluid Simulation (`FluidFLIP.js`)
  - Force Fields (e.g., `TurbulenceField.js`, `VoronoiField.js`, `GravityForces.js`)
  - Boundary Physics Logic (`...BoundaryPs.js` classes)
  - Core Grid Geometry Calculation (`GridGeometry.js`)
  - Parameter Management Strategy (Central `gridParams` structure)
  - Core Input Mapping Logic (Mapping external input types to simulation forces/parameters)
  - Audio Analysis & Modulation Logic (Core algorithms, excluding Web Audio API specifics)
- **Exclusions (Platform/Presentation - JS Only):**
  - WebGL Rendering (`SimGridRendererInstanced`, `ParticleRenderer`, `DebugRenderer`, etc.)
  - Shader Management (`ShaderManager.js`) & GLSL Shaders
  - HTML/CSS UI (`UiManager`, `lil-gui` panels)
  - Direct DOM Manipulation (e.g., `OverlayManager.js`, `BoundaryRenderer.js`)
  - Browser APIs (WebSockets, Web Audio API implementation details, etc.)
  - Platform-Specific Input Handlers (`ExternalInputConnector.js`)
  - Audio/Other Visualizations (`SoundVisualizer.js`)
  - Network Communication (`socketManager.js`)

## Refactoring Methodology (Future Goal)

**Aspiration:** Explore methods for automating or streamlining the process of refactoring or translating the core JavaScript logic into C#, potentially via build tools, code generation, or specialized translation layers. This remains a long-term research item, secondary to establishing a clean, portable JS core architecture.
