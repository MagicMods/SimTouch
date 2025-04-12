# Architecture: Grid (Template - Verified 2024-08-01)

**Purpose:** Definitive state and principles of the `Grid` project, serving as the template for migration.

**Core Principles:**

- **Stateless Components:** Components receive necessary state via method parameters (e.g., `dimensions`, `gridConfig`) rather than relying heavily on internal state set at construction.
- **Clear Dependencies:** Dependencies like `ShaderManager`, `OverlayManager`, `GridGeometry` are managed explicitly (either injected or instantiated internally where appropriate).
- **Decoupled Rendering:** Visual boundary rendering is separated into `boundaryRenderer` (DOM-based). Grid rendering (`gridGenRenderer`) focuses on instanced cell drawing.
- **Centralized Configuration:** Uses `gridConfig` object for parameters.
- **Modern JS:** Uses ES6 classes, modules, `const`/`let`.

**Key Components & State:**

- **`main.js`:** Entry point, orchestrates component creation and updates.
- **`coreGrid/`:**
  - `dimensionManager.js`: Manages physical vs. render dimensions, aspect ratio, scaling.
  - `boundaryManager.js`: Manages `shapeBoundary` (visual, render coords) and `physicsBoundary` (simulation, normalized coords). Creates/updates boundaries based on config.
  - `gridGeometry.js`: Generates grid cell rectangles based on `gridConfig`, `shapeBoundary`, and `dimensions`. Stateless `generate` method.
  - `boundary/`: Contains `baseBoundaryShape.js`, `circularBoundaryShape.js`, `rectangularBoundaryShape.js` (visual grid boundary definitions).
- **`renderer/`:**
  - `gridGenRenderer.js`: Efficient instanced grid renderer. Takes `gridConfig`, boundaries, dimensions via `setGrid`. Uses `GridGeometry` and `OverlayManager` internally. _Current state: Uniform cell color._
  - `baseRenderer.js`: Minimal base class holding `gl` and `shaderManager`.
  - `boundaryRenderer.js`: Renders physics boundary using DOM elements, positioned relative to canvas.
- **`overlays/`:**
  - `overlayManager.js`: Manages DOM overlays (text, cell centers) positioned over the canvas. Takes `dimensions` for updates. Uses `getBoundingClientRect` for accurate positioning.
- **`simulation/boundary/`:**
  - Contains physics boundary definitions (`baseBoundaryPs.js`, `circularBoundaryPs.js`, `rectangularBoundaryPs.js`, `boundaryPsUtils.js`). No direct drawing logic.
- **`shader/`:**
  - `shaderManager.js`: Simplified manager. Loads shaders from JS modules.
  - `shaders/`: Contains `gridCell.js`, `particles.js` (shader source embedded in JS).
- **`ui/`, `util/`, `visualization/`:** Present but not deeply analyzed in this phase.

```mermaid
graph LR
    subgraph Grid Project
        Grid_Main[main.js] -- Manages/Updates --> Grid_Params[gridParams Object]
        Grid_Main -- Creates/Calls --> Grid_DimensionManager[DimensionManager]
        Grid_Main -- Creates/Calls --> Grid_BoundaryManager[BoundaryManager]
        Grid_Main -- Creates/Calls --> Grid_GridGenRenderer[GridGenRenderer]
        Grid_Main -- Creates/Calls --> Grid_ShaderManager[ShaderManager]
        Grid_Main -- Creates/Calls --> Grid_UiManager[UiManager]
        Grid_Main -- Creates/Calls --> Grid_BoundaryRenderer[BoundaryRenderer]

        Grid_BoundaryManager -- Creates/Manages --> Grid_ShapeBoundary[Shape Boundary]
        Grid_BoundaryManager -- Creates/Manages --> Grid_PhysicsBoundary[Physics Boundary]
        Grid_BoundaryManager -- Uses --> Grid_Params
        Grid_BoundaryManager -- Uses --> Grid_Dimensions(Dimensions Data)

        Grid_GridGenRenderer -- Uses --> Grid_GL(WebGL Context)
        Grid_GridGenRenderer -- Uses --> Grid_ShaderManager
        Grid_GridGenRenderer -- Uses --> Grid_Params
        Grid_GridGenRenderer -- Uses --> Grid_Dimensions(Dimensions Data)
        Grid_GridGenRenderer -- Instantiates/Uses --> Grid_GridGeometry[GridGeometry]
        Grid_GridGenRenderer -- Instantiates/Uses --> Grid_OverlayManager[OverlayManager]
        Grid_GridGenRenderer -- Uses --> Grid_ShapeBoundary

        Grid_GridGeometry -- Uses --> Grid_Params
        Grid_GridGeometry -- Uses --> Grid_Dimensions(Dimensions Data)
        Grid_GridGeometry -- Uses --> Grid_ShapeBoundary

        Grid_OverlayManager -- Uses --> Grid_Canvas(Canvas Element)
        Grid_OverlayManager -- Uses --> Grid_Dimensions(Dimensions Data)
        Grid_OverlayManager -- Uses --> Grid_Params

        Grid_BoundaryRenderer -- Uses --> Grid_Canvas(Canvas Element)
        Grid_BoundaryRenderer -- Uses --> Grid_PhysicsBoundary
        Grid_BoundaryRenderer -- Uses --> Grid_Params

        Grid_UiManager -- Creates --> Grid_GridUi[GridUi]
        Grid_GridUi -- Modifies --> Grid_Params
        Grid_GridUi -- Calls --> Grid_Main

        Grid_DimensionManager -- Calculates --> Grid_Dimensions(Dimensions Data)
        Grid_DimensionManager -- Uses --> Grid_Params
        Grid_DimensionManager -- Interacts --> Grid_Canvas(Canvas Element)
        Grid_DimensionManager -- Interacts --> Grid_GL(WebGL Context)

        Grid_ShaderManager -- Loads --> Grid_Shaders[Shaders]
    end
```
