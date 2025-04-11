# Plan: LEGACY Component Isolation and Aligned Grid Integration (Corrected)

**Objective:** Isolate specified current Sim components (`overlayManager`, `gridRenderer`, `gridRenderModes`, `circularBoundaryPs`) under a LEGACY\_ prefix, introduce the aligned versions from the Grid template, and integrate the new aligned components into the Sim application flow.

**Phase A: Rename Legacy Sim Components**

1.  - [x] Rename `Sim/src/overlays/overlayManager.js` to `Sim/src/overlays/LEGACY_overlayManager.js`.
2.  - [x] Rename `Sim/src/renderer/gridRenderer.js` to `Sim/src/renderer/LEGACY_gridRenderer.js`.
3.  - [x] Rename `Sim/src/renderer/gridRenderModes.js` to `Sim/src/renderer/LEGACY_gridRenderModes.js`.
4.  - [x] Rename `Sim/src/simulation/boundary/circularBoundaryPs.js` to `Sim/src/simulation/boundary/LEGACY_circularBoundaryPs.js`.

**Phase B: Update Sim Imports**

5.  - [x] **Find and Update Imports:**
    * - [x] Search within `Sim/src/**/*.js` for imports referencing the original filenames from Phase A (`overlayManager.js`, `gridRenderer.js`, `gridRenderModes.js`, `circularBoundaryPs.js`).
    * - [x] Modify each found import statement to point to the corresponding `LEGACY_` filename (e.g., `../overlays/LEGACY_overlayManager.js`, `./LEGACY_gridRenderer.js`, `./LEGACY_circularBoundaryPs.js`).

**Phase C: Introduce Aligned Grid Components**

6.  - [x] **Copy Aligned OverlayManager:**
    * - [x] Copy `Grid/src/overlays/overlayManager.js` to `Sim/src/overlays/overlayManager.js`.
7.  - [x] **Copy Aligned Circular Physics Boundary:**
    * - [x] Copy `Grid/src/simulation/boundary/circularBoundaryPs.js` to `Sim/src/simulation/boundary/circularBoundaryPs.js`.
8.  - [x] **Copy Aligned Renderers:**
    * - [x] Copy `Grid/src/renderer/gridGenRenderer.js` to `Sim/src/renderer/gridGenRenderer.js`.
    * - [x] Copy `Grid/src/renderer/baseRenderer.js` to `Sim/src/renderer/baseRenderer.js`.

**Phase D: Integrate New Components**

9.  - [ ] **Adapt `Sim/src/renderer/gridGenRenderer.js`:**
    * - [ ] Update internal imports to use correct `Sim` project relative paths (`BaseRenderer`, `Sim/src/coreGrid/boundary/*`, `Sim/src/coreGrid/gridGeometry.js`, `Sim/src/overlays/overlayManager.js`).
10. - [ ] **Integrate New Components in `Sim/src/main.js`:**
    * - [ ] Import the _new_ `gridGenRenderer.js`.
    * - [ ] Modify `BoundaryManager` instantiation to use the _new_ `circularBoundaryPs.js` (and the existing aligned `baseBoundaryPs.js`, `rectangularBoundaryPs.js`). Ensure correct class names are imported/used.
    * - [ ] Modify `ParticleSystem` instantiation to receive the _new_ physics boundary instance resulting from the updated `BoundaryManager`.
    * - [ ] Instantiate the _new_ `gridGenRenderer`. Pass required dependencies (`gl`, `shaderManager`, _new_ boundaries from `boundaryManager`).
    * - [ ] Update `setGridParams` method to call `this.gridGenRenderer.setGrid(this.gridParams, currentDimensions, shapeBoundary, physicsBoundary)` (using the _new_ renderer instance).
    * - [ ] Update `render` method to call `this.gridGenRenderer.render()` (or its equivalent main render method).
    * - [ ] Keep the call to `this.LEGACY_gridRenderer.render()` active for parallel operation.

**Phase E: Adapt Renderer for Sim Data (Deferred)**

11. - [ ] **Adapt `gridGenRenderer.js` for Sim Data:**
    * - [ ] Introduce data-driven color mapping logic (likely requiring a new `Sim/src/renderer/gridRenderModes.js` based on the `LEGACY_` version but adapted for the new renderer).
    * - [ ] Ensure `ParticleSystem` data is accessible and used.

**Phase F: Cleanup (Deferred)**

12. - [ ] **Remove Legacy Components:**
    * - [ ] Remove calls to `this.LEGACY_gridRenderer.render()` in `main.js`.
    * - [ ] Delete `LEGACY_overlayManager.js`, `LEGACY_gridRenderer.js`, `LEGACY_gridRenderModes.js`, `LEGACY_circularBoundaryPs.js`.
    * - [ ] Remove UI elements related to the legacy components.
    * - [ ] Remove any remaining unused imports referencing legacy files.
