---

**Serial Data Sending Fix (YYYY-MM-DD HH:MM)**

- **Issue:** `comManager.sendData` was attempting to use `serialManager.sendData`, which expected a single value and command index based on `SerialManager.COMMANDS`. This was incorrect for sending raw `byteArray` data.
- **Fix:**
  - Added a new method `serialManager.sendRawData(byteArray)` specifically for sending `Uint8Array` data directly via Web Serial, bypassing the command index/value structure.
  - Updated `comManager.sendData` to call `serialManager.sendRawData` when the active channel is 'serial'.
  - Removed the obsolete `serialManager.sendData(value)` method.
