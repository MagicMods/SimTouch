# Project Learnings

## Learned Principle: Enhanced Verification from Phase 0 (2024-04-06)

**Objective:** Document process refinements based on the shader alignment refactoring experience.

**Experience:** During Phase 0 execution, multiple testing cycles were required due to:

1.  Incorrect assumptions about the export format of `Sim/src/shader/shaders/gridCell.js` based on prior analysis, leading to loading errors.
2.  An incorrect assumption about the specific shader (`basic` vs `gridCell`) being used by `Sim/src/renderer/gridRenderer.js::drawRectangle`, leading to visual rendering errors even after shader loading was fixed.

**Learnings & Refinements:**

1.  **Re-Verify Before Use:** Even if a file/component was analyzed previously, its specific implementation details (e.g., function signatures, export formats, dependencies used) MUST be re-read and verified _immediately before_ modifying code that relies on it or integrating it with new logic. Prior analysis notes provide context but should not replace direct pre-modification verification.
2.  **Explicit Interaction Checks:** Plans for future phases (especially involving integration like renderer migration) must include specific verification steps that check the direct interactions between the modified/new code and the existing code it depends on or calls (e.g., ensure shader uniforms/attributes expected match those provided by the calling renderer code).
3.  **Anticipate State Drift:** Recognize that code state might drift between analysis and execution. Build verification steps into the plan and the `[CHECK]` phase that explicitly confirm critical assumptions about the state of dependent code.

**Impact:** Applying these refinements will increase the rigor of the `[PLAN]` and `[CHECK]` modes, aiming to catch subtle integration issues earlier and reduce debugging cycles during complex phases, thereby supporting the goal of parallel integration without breaking the pipeline.

## Coordinate System Consistency (2024-08-01)

**Experience:** Debugging the `Sim` project integration revealed inconsistencies between the normalized [0,1] physics space, the pixel-based rendering space, and outlier components using fixed 240x240 pixel spaces (e.g., `neighborSearch.js`). This complicated data flow and debugging.

**Learning:** Explicitly analyze, document, and standardize coordinate systems early during integration. Define canonical spaces (e.g., simulation, render) and enforce consistent conversion logic. Refactor outlier components to conform. Mismatched coordinate systems lead to hard-to-trace bugs.

## Stateless Component Design for Portability (2024-08-01)

**Experience:** Comparing stateful (`Sim`) vs. stateless (`Grid`) `DimensionManager` implementations highlighted the benefits of statelessness for C# porting. Components tightly coupled to JS-specific context (canvas, GL context) are harder to port.

**Learning:** For core logic intended for reuse or porting (e.g., `GridGeometry`), favor stateless design. Pass required data (dimensions, config) explicitly into methods. Avoid storing external context (like canvas elements or GL contexts) within the component instance. This improves testability, reduces hidden dependencies, and simplifies cross-platform adaptation.

## Deceptive Module Loading Errors (404s) (2024-08-01)

**Experience:** A persistent 404 error for `gridRenderModes.js` occurred despite correct import paths in the source code. The browser requested the file from an incorrect path (`.../simulation/renderer/...` instead of `.../renderer/...`).

**Learning:** Persistent 404 errors for correctly located files, especially when requested via incorrect paths, often indicate issues external to the module's code (e.g., browser cache, server configuration, base URL resolution, build tool artifacts, source maps). Use browser network tools ("Initiator" tab) to trace the faulty request origin. Consider cache invalidation, server restarts, and build cleans as diagnostic steps.

## Parameter Centralization Scope (2024-08-01)

**Experience:** Consolidating parameters into `main.gridParams` showed that including highly specific configurations for complex components (like `TurbulenceField`'s ~30+ params) bloats the global state object.

**Learning:** Distinguish between globally relevant parameters (physics, screen size) and component-specific configuration. For complex components, prefer passing a dedicated configuration object during instantiation (e.g., `params.config`) rather than merging all their settings into the global state object (e.g., `gridParams.turbulence`). This maintains clarity and prevents the global state from becoming unmanageable.

## Explicit Update Cycles for Dependent Components (2024-08-01)

**Experience:** The DOM-based `BoundaryRenderer` failed to update because its `update()` method wasn't called in the main application loop (`main.js::setGridParams`) after its data source (`BoundaryManager`) was updated.

**Learning:** Components that passively visualize or react to state managed elsewhere must have their update logic explicitly triggered within the correct phase of the main application loop, _after_ their data dependencies have been updated. Document the required update order.

## Accurate DOM Element Positioning (getBoundingClientRect) (2024-08-01)

**Experience:** HTML overlays were incorrectly positioned/scaled because calculations relied on canvas `width`/`height` attributes or `offsetTop/offsetLeft`, which didn't reflect the actual rendered size influenced by CSS and aspect ratio changes.

**Learning:** To accurately position/scale DOM elements relative to a canvas, use `canvas.getBoundingClientRect()` to obtain the actual rendered dimensions and viewport position. Use these measurements for sizing containers and calculating scaling factors. Account for page scroll (`window.scrollX/Y`) when calculating absolute positions if necessary.
