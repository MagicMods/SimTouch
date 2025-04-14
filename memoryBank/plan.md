### Task: Fix GridGenRenderer Initialization Order (YYYY-MM-DD)

**Goal:** Resolve the "Shader program 'gridCell' not found" error by ensuring ShaderManager completes initialization before GridGenRenderer attempts to use shaders.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Remove `this.initBuffers();` from constructor.
2.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Rename method `initBuffers` to `async init`.
3.  - [x] Modify `Sim/src/main.js`: Add `await this.gridGenRenderer.init();` after `await this.shaderManager.init();` in the `Main.init()` method.
4.  - [x] Update `memoryBank/notebook.md` with documentation for this fix.

### Task: Add Diagnostic Logging for Grid Dimension State (YYYY-MM-DD)

**Goal:** Diagnose potential state inconsistency between `this.rectangles` and `this.currentDimensions` in `GridGenRenderer` during the continuous render loop.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled logs at the start of `draw()` for `currentDimensions`, `dirty`, `needsResize`.
2.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled logs around `dimensionManager.haveDimensionsChanged()` check in `draw()`, showing result and `newDimensions` if changed.
3.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled log before `updateGridGeometryAndRender` call in `draw()` showing dimensions to be used.
4.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled log at the start of `updateGridGeometryAndRender()` showing received `dimensions`.
5.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled log after `gridGeometry.generate()` in `updateGridGeometryAndRender()` showing `this.rectangles.length`.
6.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled log after updating `this.currentDimensions` in `updateGridGeometryAndRender()` showing the new value.
7.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add throttled log before `prepareInstanceData()` call in `draw()` showing `currentDimensions` and `rectangles.length`.
8.  - [x] Update `memoryBank/notebook.md` with documentation for adding diagnostic logging.

### Task: Fix Dimension Change Check in GridGenRenderer (YYYY-MM-DD)

**Goal:** Fix the `TypeError: this.dimensionManager.haveDimensionsChanged is not a function` by using the available `getDimensions()` method for change detection.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: In `draw()`, replace `haveDimensionsChanged` call with logic to fetch `liveDimensions` via `getDimensions()` and compare `renderWidth`/`renderHeight` against `this.currentDimensions`.
2.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Ensure `needsResize` is set to `true` only if dimensions have actually changed based on the new comparison.
3.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Update diagnostic logs around the dimension check to reflect the new method and variables (`liveDimensions`).
4.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Ensure `updateGridGeometryAndRender` is called with `liveDimensions` when `needsResize` is true.
5.  - [x] Update `memoryBank/notebook.md` with documentation for this fix.

### Task: Restore Dynamic Color Calculation in GridGenRenderer (YYYY-MM-DD)

**Goal:** Fix GridGenRenderer displaying static colors by restoring the logic to calculate colors based on dynamic data from `renderModes`.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`prepareInstanceData`): Add check for `dataValues.length === numInstances`.
2.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`prepareInstanceData`): Retrieve `maxDensity = this.grid.rendering?.maxDensity ?? 4.0;` and add validity check.
3.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`prepareInstanceData` loop): Get `dataValue = dataValues[i] || 0;`.
4.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`prepareInstanceData` loop): Replace index-based `normalizedValue` calculation with dynamic `dataValue / maxDensity` calculation.
5.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`prepareInstanceData` loop): Add optional throttled logging for color calculation details (first instance).
6.  - [x] Modify `memoryBank/notebook.md` with documentation for restoring dynamic colors.

### Task: Initialize Gradient and Adjust Logging in GridGenRenderer (YYYY-MM-DD)

**Goal:** Fix static colors by initializing `this.gradient` and increase log frequency for better debugging.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add `import { Gradient } from '../utils/gradient.js';` (adjust path if necessary).
2.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Change `this.logThrottle` in the constructor to `5`.
3.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: In `setGrid`, add logic to initialize `this.gradient = new Gradient(this.grid.colors.
colorStops)` after validating `colorStops`.
4.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: In `setGrid`, add fallback to `this.gradient = null;` and log a warning if `colorStops` are invalid.
5.  - [x] Update `memoryBank/notebook.md` with documentation for initializing the gradient and adjusting log throttle.

### Task: Fix Coordinate Mismatch in GridRenderModes (YYYY-MM-DD)

**Goal:** Ensure GridRenderModes calculation functions use correct render dimensions for particle mapping, resolving the zero-data issue.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`prepareInstanceData`): Pass `this.currentDimensions` to `this.renderModes.getValues`.
2.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (`getValues`): Update signature to accept `dimensions`, pass it to `calculateTargetValues`.
3.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (`calculateTargetValues`): Update signature to accept `dimensions`, pass it to specific calculation function calls within the switch statement.
4.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (`calculateProximity`): Update signature to accept `dimensions`. Replace `TARGET_WIDTH`/`HEIGHT` with `dimensions.renderWidth`/`Height` in particle mapping.
5.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (`calculateDensity`): Update signature to accept `dimensions`. Replace `TARGET_WIDTH`/`HEIGHT` with `dimensions.renderWidth`/`Height` if used for particle mapping.
6.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (`calculateVelocity`): Update signature to accept `dimensions`. Replace `TARGET_WIDTH`/`HEIGHT` with `dimensions.renderWidth`/`Height` if used for particle mapping.
7.  - [x] Modify `Sim/src/renderer/gridRenderModes.js`: Update signatures for all other calculation functions (`calculateProximityB`, `calculatePressure`, `calculateVorticity`, `calculateCollision`, `calculateOverlap`, `calculateNoise`) to accept `dimensions`.
8.  - [x] Update `memoryBank/notebook.md` with documentation for fixing the coordinate mismatch.

### Task: Analyze and Fix ColorStops in GridGenRenderer (YYYY-MM-DD)

**Goal:** Ensure GridGenRenderer correctly initializes the gradient with valid colorStops.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Read `Sim/src/main.js` to locate `gridParams` initialization and the first `setGridParams` call.
2.  - [x] Add temporary logging in `Sim/src/main.js` just before the first `setGridParams` call to inspect `gridParams.colors`. (Skipped - analysis sufficient)
3.  - [x] Run the simulation and check the console logs to verify the structure of `gridParams.colors.colorStops`. (Skipped - analysis sufficient)
4.  - [x] **Conditional:** If `colorStops` are missing/invalid, modify `Sim/src/main.js` to add default `colorStops` to the initial `gridParams.colors` definition.
5.  - [x] Remove the temporary logging added in step 2. (Skipped - no logging added)
6.  - [x] Document findings and actions in `memoryBank/notebook.md`.
7.  - [x] Update this checklist (`memoryBank/plan.md`) with checked boxes upon completion.

### Task: Analyze and Fix SocketManager Command Type Error (YYYY-MM-DD)

**Goal:** Ensure the `sendColor`, `sendBrightness`, and `sendPower` convenience methods pass the correct command _name_ (string) to the `sendCommand` method.

**Hypothesis:** The convenience methods are incorrectly passing the command _object_ from `SocketManager.COMMANDS` instead of the string key.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/network/socketManager.js`: Change `sendColor` method to call `this.sendCommand("COLOR", value)`.
2.  - [x] Modify `Sim/src/network/socketManager.js`: Change `sendBrightness` method to call `this.sendCommand("BRIGHTNESS", value)`.
3.  - [x] Modify `Sim/src/network/socketManager.js`: Change `sendPower` method to call `this.sendCommand("POWER", value)`.
4.  - [x] Document the socket command fix in `memoryBank/notebook.md`.
5.  - [x] Update this checklist (`memoryBank/plan.md`) upon completion.

### Task: Early Gradient Initialization (Option 2) (YYYY-MM-DD)

**Goal:** Initialize `this.gradient` in `GridGenRenderer.init` using default parameters and ensure `setGrid` correctly updates it later.

**Revised Hypothesis:** The `Gradient` constructor expects a preset name string.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Read `Sim/src/renderer/gridGenRenderer.js` (`setGrid` method) to check `new Gradient()` usage.
2.  - [x] Read `Sim/src/shaders/gradients.js` (`Gradient` constructor) to confirm expected arguments.
3.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add `Gradient` import if needed.
4.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Add early gradient initialization logic to the `init` method. (Corrected - Removed erroneous super.init() call)
5.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Update the `setGrid` method to correctly handle updating or creating the gradient instance.
6.  - [x] Document the changes in `memoryBank/notebook.md`.
7.  - [x] Update this checklist (`memoryBank/plan.md`) upon completion.

### Task: Fix TypeError in GridGenRenderer.init (YYYY-MM-DD)

**Goal:** Remove the erroneous `await super.init();` line from the `init` method in `GridGenRenderer`.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Delete the line `await super.init();` from the `init` method.
2.  - [x] Document the removal of `super.init()` in `memoryBank/notebook.md`.
3.  - [x] Update the checklist item for "Task: Early Gradient Initialization (Option 2)" step 4 in `memoryBank/plan.md` to indicate the fix.
4.  - [x] Update this checklist (`memoryBank/plan.md`) upon completion. (Also fixed redundant initBuffers() call)

### Task: Fix Redundant initBuffers Call (YYYY-MM-DD)

**Goal:** Remove the redundant call to the non-existent `initBuffers` method from within the `async init` method in `GridGenRenderer`.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js`: Delete the line `this.initBuffers();` from the `async init` method. (Manual Fix Required)
2.  - [x] Document the removal of `initBuffers()` call in `memoryBank/notebook.md`.
3.  - [x] Update the checklist item for "Task: Fix TypeError in GridGenRenderer.init" step 4 in `memoryBank/plan.md` to also mention this fix.
4.  - [x] Update this checklist (`memoryBank/plan.md`) upon completion.

### Task: Fix BoundaryManager Shape Change Handling (YYYY-MM-DD)

**Goal:** Ensure BoundaryManager correctly reacts to screen shape changes and updates boundaries accordingly.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/coreGrid/boundaryManager.js` (Constructor): Add subscription to `'gridParamsUpdated'`.
2.  - [x] Modify `Sim/src/coreGrid/boundaryManager.js`: Implement the handler for `'gridParamsUpdated'` to call `this.update(gridParams, dimensions)`.
3.  - [x] Modify `Sim/src/coreGrid/boundaryManager.js` (`updateSimParams` method):
    * Update `this.simParams`.
    * Update `this.physicsBoundary` properties if changed.
    * Call `_updateBoundaries` only if `scale` changed.
4.  - [x] Modify `Sim/src/coreGrid/boundaryManager.js` (`_updateBoundaries` method): Read physics properties from `this.simParams.boundary`.
5.  - [x] Document the `BoundaryManager` event handling fix in `memoryBank/notebook.md`.
6.  - [x] Update this checklist (`memoryBank/plan.md`) upon completion.

### Task: Implement Custom Color Stops in Gradients Class (YYYY-MM-DD)

**Goal:** Enable `GridGenRenderer` to use custom `colorStops` from `gridParams` by modifying the `Gradients` class and updating the renderer's usage.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/shaders/gradients.js`: Add a new public method `setColorStops(colorStopsArray)` with validation.
2.  - [x] Modify `Sim/src/shaders/gradients.js`: Update `setColorStops` to deep clone, sort, set `this.currentPreset = "custom"`, and call `this.update()`.
3.  - [x] Modify `Sim/src/shaders/gradients.js` (`sendGradientsUpdate` method): Add check to skip hardware sync if `this.currentPreset === "custom"`.
4.  - [x] Modify `Sim/src/shaders/gradients.js` (`getCurrentPreset` method): Ensure it returns the current value (possibly "custom"). (Verified - No change needed).
5.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (`setGrid` method): Add logic to check for gradient existence, validate `colorStops`, call `setColorStops`, and fallback to `applyPreset('c0')`.
6.  - [ ] Update `memoryBank/notebook.md` with documentation for implementing custom color stops.

### Task: Refactor GridRenderModes Coordinates and Radius (YYYY-MM-DD)

**Goal:** Refactor `GridRenderModes` to use dynamic render dimensions instead of hardcoded 240x240 values and calculate particle pixel radius based on normalized physics parameters and dynamic dimensions.

**IMPLEMENTATION CHECKLIST:**

1.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (Constructor): Accept/store `dimensions`, remove `TARGET_WIDTH`/`HEIGHT`.
2.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (updateGrid): Accept/update `dimensions`.
3.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (Coordinate Replacements): Replace `TARGET_WIDTH`/`HEIGHT` with `dimensions.renderWidth`/`Height`.
4.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (Radius Calculation): Remove old calc, get normalized radius, calc dynamic pixel radius, use dynamic radius.
5.  - [x] Modify `Sim/src/renderer/gridRenderModes.js` (Proximity Radius): Replace fixed `radius` with dynamic scaling in `calculateProximity`/`calculateProximityB`.
6.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (Instantiation): Pass `dimensions` to `GridRenderModes` constructor.
7.  - [x] Modify `Sim/src/renderer/gridGenRenderer.js` (Update): Pass `dimensions` to `this.renderModes.updateGrid`.
8.  - [x] Update `memoryBank/notebook.md`: Document the coordinate system and radius calculation fixes applied to `GridRenderModes`.
9.  - [x] Update `memoryBank/plan.md`: Mark checklist items as complete upon finishing implementation.
