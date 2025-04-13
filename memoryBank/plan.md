IMPLEMENTATION CHECKLIST:

1.  [x] **Refine `BoundaryManager` Event Handler (`updateSimParams`)**
    - **File:** `Sim/src/coreGrid/boundaryManager.js`
    - **Action:** Store previous scale. Only call `_updateBoundaries` if scale changed. Apply other physics props directly.
2.  [x] **Refine `BoundaryRenderer` Event Handler**
    - **File:** `Sim/src/renderer/boundaryRenderer.js`
    - **Action:** Store previous scale and showBoundary flag. Only call `update` if scale or showBoundary changed.
3.  [x] **Update `memoryBank/notebook.md`**
    - **File:** `memoryBank/notebook.md`
    - **Action:** Add an entry explaining the boundary update optimization.
4.  [x] **Update `memoryBank/plan.md`**
    - **File:** `memoryBank/plan.md`
    - **Action:** Replace the content of `plan.md` with this checklist (marked as complete).
