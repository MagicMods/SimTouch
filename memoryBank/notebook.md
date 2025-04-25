---

**Serial Data Sending Fix (YYYY-MM-DD HH:MM)**

- **Issue:** `comManager.sendData` was attempting to use `serialManager.sendData`, which expected a single value and command index based on `SerialManager.COMMANDS`. This was incorrect for sending raw `byteArray` data.
- **Fix:**
  - Added a new method `serialManager.sendRawData(byteArray)` specifically for sending `Uint8Array` data directly via Web Serial, bypassing the command index/value structure.
  - Updated `comManager.sendData` to call `serialManager.sendRawData` when the active channel is 'serial'.
  - Removed the obsolete `serialManager.sendData(value)` method.

Current Time: 2024-08-17 15:50:00

[MODE: EXE] Executing plan from `memoryBank/plan.md`.
Action: Modified `Sim/src/com/comManager.js`.
Change: Added a check within `sendData` method. If `shouldSendData` is true but the active channel is disconnected, it logs a warning, attempts a UDP reconnect (if applicable) without waiting, and returns `false` for the current send attempt. Serial disconnections prompt a manual reconnect message.
