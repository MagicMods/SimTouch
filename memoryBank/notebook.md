---

**Serial Data Sending Fix (YYYY-MM-DD HH:MM)**

- **Issue:** `comManager.sendData` was attempting to use `serialManager.sendData`, which expected a single value and command index based on `SerialManager.COMMANDS`. This was incorrect for sending raw `byteArray` data.
- **Fix:**
  - Added a new method `serialManager.sendRawData(byteArray)` specifically for sending `Uint8Array` data directly via Web Serial, bypassing the command index/value structure.
  - Updated `comManager.sendData` to call `serialManager.sendRawData` when the active channel is 'serial'.
  - Removed the obsolete `serialManager.sendData(value)` method.

**Debug System Refactor Analysis (YYYY-MM-DD HH:MM)**

- **Goal:** Refactor the debug system (`debugFlags`, `debugManager`).
- **Initial Findings (grep search for `debugFlags|debugManager` in `Sim/src`):**
  - **Wide Usage:** Found in `util`, `ui` (many panels), `simulation` (core, forces, behaviors), `shaders`, `renderer`, `presets`.
  - **Access Pattern:** Primarily direct property access (e.g., `main.debugFlags.someFlag`) or assignment to local property (`this.debug`, `this.db`). The `debugFlags` object itself is passed around, often via constructors.
  - **Central Origin:** Usage suggests a central `main` instance likely holds/manages the `debugFlags` object.
  - **`debugManager` Instance:** The exported `debugManager` singleton appears unused directly in most modules; access is via the passed `debugFlags` object.
  - **`DebugUi`:** Directly manipulates `main.debugFlags` properties.
- **Implication:** Refactoring should focus on managing the state and access to debug flags, potentially avoiding passing the entire raw object.
