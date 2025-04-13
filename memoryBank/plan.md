IMPLEMENTATION CHECKLIST:

1.  [x] **File:** `Sim/src/renderer/gridGenRenderer.js`
    - **Action:** Move index-based gradient color calculation logic into `prepareInstanceData()`, ensuring `this.instanceData.colors` is populated correctly before the buffer upload (`gl.bufferData`).
2.  [x] **File:** `Sim/src/renderer/gridGenRenderer.js`
    - **Action:** Simplify the `draw()` method to remove color calculations/uploads, keeping only checks and the call to `renderCellsInstanced()`.
3.  [x] **File:** `Sim/src/renderer/gridGenRenderer.js`
    - **Action:** Remove the temporary property `this._tempColorArray`.
4.  [x] **File:** `memoryBank/notebook.md`
    - **Action:** Document moving index-based coloring to `prepareInstanceData`.
5.  [x] **File:** `memoryBank/plan.md`
    - **Action:** Update with this completed checklist.
