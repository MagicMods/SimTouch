# Development Plan: Statelessness Refactoring and Parameter Consolidation

<details>
<summary>UNDER REVIEW</summary>

## Phase 0: Validate Current Architecture Documentation

<details>
<summary>**Goal:** Systematically verify the accuracy of notebook.md content against the actual codebase</summary>

**IMPLEMENTATION CHECKLIST:**

1. - [ ] Validate Main Controller architecture:

   * Confirm event system implementation in `main.js`
   * Verify parameter structure (`gridParams` and `simParams`)
   * Document any discrepancies in component initialization flow

2. - [ ] Validate Core Systems:

   * Verify `DimensionManager` responsibilities and APIs
   * Confirm `BoundaryManager` implementation and boundary handling
   * Validate `ParticleSystem` integration points and data flow
   * Check `FluidFLIP` parameter usage and simulation integration

3. - [ ] Validate Rendering Pipeline:

   * Analyze `GridGenRenderer` implementation vs. documentation
   * Confirm `ParticleRenderer` capabilities and integration
   * Verify `OverlayManager` existence and functionality
   * Check `ShaderManager` protocol implementation

4. - [ ] Validate Physics Components:

   * Confirm `CollisionSystem` parameter structure and integration
   * Document force system implementations and interfaces
   * Verify boundary system implementation against documentation

5. - [ ] Validate UI Systems:

   * Confirm `UiManager` organization and event handling
   * Check UI panel organization and actual controls
   * Verify `PresetManager` implementation and capabilities
   * Validate event bus implementation (`uiControlChanged`, `simParamsUpdated`)

6. - [ ] Validate Event Flow:

   * Trace actual event propagation paths through the codebase
   * Document any additional events not captured in notebook
   * Verify component subscription patterns

7. - [ ] Validate Parameter Structure:

   * Map actual parameters in `gridParams` and `simParams`
   * Document any undocumented parameters or structures
   * Confirm persistence mechanisms for parameters

8. - [ ] Update notebook.md with verified information:
   - Correct any inaccuracies
   - Add missing details
   - Revise descriptions based on actual implementation
   </details>

## Phase 1: Component Analysis for Statelessness

<details>
<summary>**Goal:** Evaluate key Sim components for statelessness to identify refactoring candidates</summary>

**IMPLEMENTATION CHECKLIST:**

1. - [ ] Analyze `GridGenRenderer` for state dependencies:

   * Identify internal state maintained between method calls
   * Document method parameters vs. relied-upon instance properties
   * Evaluate event subscriptions and pattern of state updates

2. - [ ] Analyze `ParticleSystem` for state dependencies:

   * Map particle state flow (creation, update, retrieval)
   * Identify parameters passed vs. stored between update cycles
   * Evaluate options for more explicit state passing

3. - [ ] Analyze `GridRenderModes` for state dependencies:

   * Examine value calculation and caching mechanisms
   * Identify smoothing logic relying on previous state
   * Document data flow between calculation methods

4. - [ ] Analyze Force Components (`TurbulenceField`, `VoronoiField`, etc.):

   * Compare implementation patterns across force components
   * Identify state stored between update cycles
   * Evaluate options for consistent external parameter passing

5. - [ ] Synthesize findings and patterns:
   - Create a consistent model for stateless component design
   - Define clear patterns for necessary state management
   - Prioritize components for refactoring
   </details>

## Phase 2: Parameter Consolidation

<details>
<summary>**Goal:** Continue centralizing simulation parameters into coherent structures in `gridParams`</summary>

**IMPLEMENTATION CHECKLIST:**

1. - [ ] Create `gridParams.particles` object:

   * Add `count` parameter (decouple from grid cell count)
   * Add `radius` parameter
   * Modify `ParticleSystem` to use these parameters
   * Update UI controls to modify the new parameters

2. - [ ] Create `gridParams.collision` object:

   * Add parameters for `enabled`, `gridSize`, `repulsion`, `particleRestitution`
   * Modify `CollisionSystem` constructor to extract from `gridParams`
   * Update `ParticleSystem` to pass `gridParams` to `CollisionSystem`

3. - [ ] Evaluate `TurbulenceField` parameters:

   * Decide between full consolidation or dedicated config object
   * Implement the chosen approach
   * Update UI to interact with the new parameter structure

4. - [ ] Examine `VoronoiField` parameters:

   * Create parameter structure aligned with the pattern used for TurbulenceField
   * Implement consistent initialization and update pattern

5. - [ ] Create a centralized defaults system:
   - Implement a defaults registry for easy preset creation
   - Allow component-specific default overrides
   - Ensure backward compatibility with existing presets
   </details>

## Phase 3: Specific Component Refactoring

<details>
<summary>**Goal:** Refactor high-priority components toward increased statelessness</summary>

**IMPLEMENTATION CHECKLIST:**

1. - [ ] Refactor `GridRenderModes`:

   * Move smoothing state to an explicit cache object
   * Pass all dimensions and parameters explicitly to calculation methods
   * Make calculation methods pure functions where possible
   * Implement a clear pattern for necessary state updates

2. - [ ] Refactor `ParticleSystem`:

   * Extract state management into dedicated objects
   * Make update logic rely on passed parameters rather than instance state
   * Implement a clear data flow pattern for forces and constraints

3. - [ ] Refactor `GridGenRenderer`:

   * Make `draw` method rely on passed state rather than instance properties
   * Extract color calculation to a pure function
   * Separate buffer management from rendering logic

4. - [ ] Refactor Force Components:
   - Apply consistent patterns across all force components
   - Extract configuration from instance state
   - Provide explicit update methods that receive and return state
   </details>

## Phase 4: Testing and Verification

<details>
<summary>**Goal:** Ensure refactored components maintain functional equivalence</summary>

**IMPLEMENTATION CHECKLIST:**

1. - [ ] Develop a rendering comparison framework:

   * Create tools to compare visual output before/after changes
   * Implement frame-by-frame comparison capability

2. - [ ] Develop a physics consistency verification:

   * Log key physics parameters at specific time steps
   * Compare simulation trajectories before/after changes

3. - [ ] Test with different presets:

   * Verify all existing presets work correctly
   * Test boundary conditions and edge cases

4. - [ ] Performance evaluation:
   - Benchmark before/after refactoring
   - Identify any performance regressions
   - Optimize critical paths as needed
   </details>
   </details>

# Development Plan: Particle Collision Refactor Fix

<details>
<summary>**Goal:** Fix Issue with collision system and turbulence Affect Scale</summary>
