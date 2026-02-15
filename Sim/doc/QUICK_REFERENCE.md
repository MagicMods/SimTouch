# SimTouch Quick Reference

**Purpose**: Fast lookup for common commands, workflows, and troubleshooting.

---

## 🔧 Build & Deploy

### PlatformIO Command Notes

**If `pio` command is not found**, use one of these alternatives:

```bash
# Windows: Full path to PlatformIO executable
%USERPROFILE%\.platformio\penv\Scripts\platformio.exe run -t upload -e phase2_lilygo

# Linux/Mac: Python module invocation
python -m platformio run -t upload -e phase2_lilygo

# Or add PlatformIO to PATH (recommended)
# Windows: Add %USERPROFILE%\.platformio\penv\Scripts to PATH
# Linux/Mac: Typically already in PATH after installation
```

For brevity, the examples below use `pio` as shorthand. Replace with full path if needed.

### Build Commands
```bash
# LilyGo T-RGB 2.1 (primary target, LVGL v8)
pio run -e phase2_lilygo

# LilyGo T-RGB 2.1 (LVGL v9, experimental)
pio run -e phase2_lilygo_v9

# Waveshare ESP32-S3-Touch-LCD-1.28
pio run -e phase2_waveshare

# Clean build
pio run -t clean -e phase2_lilygo
```

### Upload Commands
```bash
# Upload firmware (auto-detects COM port)
pio run -t upload -e phase2_lilygo

# Upload to specific COM port (if auto-detect fails)
pio run -t upload -e phase2_lilygo --upload-port COM3

# Upload filesystem (LittleFS web UI assets)
pio run -t uploadfs -e phase2_lilygo

# Upload + monitor (serial output)
pio run -t upload -e phase2_lilygo && pio device monitor -b 115200
```

### Monitor Serial Output
```bash
# LilyGo (baud 115200)
pio device monitor -b 115200

# Waveshare (baud 250000, if configured)
pio device monitor -b 250000

# Monitor specific port
pio device monitor -p COM3 -b 115200

# Exit monitor: Ctrl+C
```

---

## 🌐 Web Configuration

### Connect to Device
1. **WiFi**: Connect to `ParticleSimulator` (password: `MagicMods`)
2. **Browser**: Navigate to `http://192.168.3.100`
3. **WebSocket**: Auto-connects to `/ws` on page load

### Common URLs
- Configuration UI: `http://192.168.3.100/`
- Parameter registry (JSON): `http://192.168.3.100/api/params`

### Reset to Defaults
- Web UI: Click "Reset to Defaults" button (if implemented)
- Code: Call `ResetConfigToDefaults()` in `ConfigWeb.cpp`

---

## 📝 Adding New Parameters

### 1. Add to SimConfig struct (SimConfig.h)
```cpp
struct SimConfig {
    // ... existing fields ...
    float myNewParam = 1.0f;  // Add your parameter with default value
};
```

### 2. Add to kParamRegistry (SimConfig.h)
```cpp
static const ParamDef kParamRegistry[] = {
    // ... existing entries ...
    {200, "My New Param", "My Group", PARAM_FLOAT, 0.0f, 10.0f, 0.1f, offsetof(SimConfig, myNewParam)},
};
```

**Index allocation**:
- 50-69: Simulation core
- 70-79: Boundary
- 80-89: Gravity
- 90-99: Collision
- 100-159: Turbulence
- 120-129: Touch
- 130-139: IMU
- 140-159: Grid/Rendering
- 160-189: (Reserved for future)
- 190-239: (Available)

### 3. Use in Code
```cpp
// Access in any module with SimConfig pointer
float value = config_->myNewParam;
```

### 4. Web UI Auto-Updates
- No manual UI code needed
- Restart browser (Ctrl+F5) to fetch new registry
- Control auto-generated based on type, range, step

---

## 🐛 Common Debugging

### Check FPS
```
[Phase2 FPS] sim 59.8 | render 60.1 | avg frame 16.52 ms | cells=338
```
- **Target**: 60 FPS for both sim and render
- **Problem**: FPS < 50 → reduce `particleCount`, `collisionGridSize`, or `targetCellCount`

### Check Validation
```
[Phase2A Validate] particles=1 touch=1 boundary=1
```
- All flags should be `1` after interaction
- `particles=0`: SimCore not initialized
- `touch=0`: Touch driver not working or no touch detected yet
- `boundary=0`: Particles escaping boundary (check `boundaryScale`)

### Serial Logging
```cpp
// Temporary debug output
Serial.printf("myValue: %.2f\n", myValue);

// ESP-IDF logging (level-controlled)
log_d("Debug message");    // Debug level
log_i("Info message");     // Info level
log_w("Warning message");  // Warning level
log_e("Error message");    // Error level
```

### Test Minimal Config
Disable expensive features to isolate issues:
```cpp
gConfig.turbStrength = 0.0f;      // Disable turbulence
gConfig.collisionEnabled = false; // Disable collision
gConfig.particleCount = 10;       // Minimal particles
```

---

## 🎨 Rendering

### FastLED Palettes (Themes)
```cpp
// Theme index in SimConfig
0 = Fire        // Red/orange/yellow
1 = Ocean       // Blue/cyan/green
2 = Rainbow     // Full spectrum
3 = Lava        // Dark red/orange
4 = Forest      // Green/yellow
5 = Party       // Multi-color
6 = Heat        // Yellow/white
7 = Cloud       // White/blue
8 = Sunset      // Orange/purple
9 = Aurora      // Teal/purple
10 = Plasma     // Pink/purple
```

### Change Palette
```cpp
// Via web UI: Adjust "Theme" slider (0-10)
// Via code:
gConfig.theme = 2;  // Rainbow
```

### Cell Value Mapping
```cpp
// GridModes computes cellValues[i] in range [0, 255]
// FastLED maps to color:
CRGB color = ColorFromPalette(Palettes[theme], cellValues[i], 255, BLEND);
```

---

## 🧪 Testing & Validation

### Compare with JS Sim
1. **Start JS Sim**:
   ```bash
   cd Sim
   npm run dev
   ```
   Open `http://localhost:8080/sim.html`

2. **Set Identical Parameters**:
   - JS Sim: Use lil-gui controls
   - Phase2: Use web UI at `http://192.168.3.100`
   - Match: `particleCount`, `boundaryShape`, `gravityX/Y`, `turbStrength`, etc.

3. **Visual Comparison**:
   - Particle motion should be similar (not identical due to timing)
   - Boundary enforcement should match
   - Grid output patterns should be comparable

### Test Touch Input
1. Touch screen while monitoring serial output
2. Check `[Phase2A Validate] touch=1`
3. Verify particles respond (attraction/repulsion)
4. Adjust `touchStrength`, `touchRadius` in web UI

### Test IMU Input
1. Enable IMU: Set `imuEnabled = true` in web UI
2. Tilt device, observe particles fall in direction of tilt
3. Adjust `imuSensitivity`, `imuSmoothing` for responsiveness

---

## 📊 Performance Optimization

### Reduce Particle Count
```cpp
// Via web UI: "Particle Count" slider (2-200)
// Reduces: Simulation cost, collision cost, grid computation cost
```

### Reduce Collision Grid Size
```cpp
// Via web UI: "Collision Grid Size" slider (4-16)
// Fewer cells = faster collision detection (but less precise)
```

### Disable Turbulence
```cpp
// Via web UI: "Turb Strength" slider to 0
// Turbulence is expensive (Perlin noise for every particle)
```

### Reduce Grid Density
```cpp
// Via web UI: "Target Cell Count" slider (32-512)
// Fewer cells = faster grid computation, faster rendering
```

### Frame Budget Analysis
```
[Phase2 FPS] sim 59.8 | render 60.1 | avg frame 16.52 ms | cells=338
```
- **avg frame < 16.67ms**: Good headroom
- **avg frame ≈ 16.67ms**: On target, no headroom
- **avg frame > 16.67ms**: Overbudget, FPS will drop

---

## 🔐 WiFi & Security

### WiFi AP Settings
- **SSID**: `ParticleSimulator` (defined in `platformio.ini`)
- **Password**: `MagicMods` (defined in `platformio.ini`)
- **IP Address**: `192.168.3.100` (ESP32 itself)
- **DHCP**: Clients get 192.168.3.x addresses

### Change WiFi Credentials
Edit `platformio.ini`:
```ini
build_flags =
  '-DSSID_AP="YourNetworkName"'
  '-DPASS_AP="YourPassword"'
```
Rebuild and upload firmware.

### Disable WiFi (for standalone testing)
Edit `platformio.ini`:
```ini
build_flags =
  -D WIFI=0  # Set to 0 to disable
```

---

## 📁 File Structure Quick Lookup

### Simulation Core
```
include/SimCore.h       → Particle system API
src/SimCore.cpp         → Particle system implementation
include/Boundary.h      → Boundary constraints
src/Boundary.cpp        → Circular/rectangular boundary logic
include/Collision.h     → Collision detection API
src/Collision.cpp       → Spatial grid collision
include/Turbulence.h    → Noise-driven forces API
src/Turbulence.cpp      → Perlin/Simplex noise implementation
```

### Force Inputs
```
include/TouchForces.h   → Touch input API
src/TouchForces.cpp     → Touch → force mapping
include/ImuForces.h     → IMU input API
src/ImuForces.cpp       → IMU → gravity mapping
include/GravityForces.h → (Inline, simple gravity)
src/GravityForces.cpp   → Gravity force application
```

### Output Processing
```
include/GridGeometry.h  → Grid layout API
src/GridGeometry.cpp    → Cell position computation
include/GridModes.h     → Grid algorithm API
src/GridModes.cpp       → Proximity/velocity/density modes
include/Graphics.h      → Display rendering API
src/Graphics.cpp        → LVGL + TFT + FastLED rendering
```

### Configuration
```
include/SimConfig.h     → Config struct + parameter registry
include/ConfigWeb.h     → Web server API
src/ConfigWeb.cpp       → AsyncWebServer + WebSocket implementation
data/index.html         → Configuration UI (HTML)
data/style.css          → UI styling
data/app.js             → WebSocket client + UI logic
```

### Hardware
```
include/Acc.h           → IMU driver API
src/Acc.cpp             → QMI8658 I2C communication
include/WifUdp.h        → WiFi + UDP API
src/WifUdp.cpp          → WiFi AP + UDP socket
include/Palettes.h      → FastLED palette declarations
src/Palettes.cpp        → 11 palette definitions
```

### Application
```
include/Main.h          → Global constants, helpers
src/Main.cpp            → setup(), loop(), main execution
platformio.ini          → Build configurations
```

---

## 🎯 Parameter Index Quick Reference

### Simulation Core (50-69)
- 50: Time Scale
- 51: Velocity Damping
- 52: Max Velocity
- 53: Particle Count
- 54: Time Step
- 55: Particle Radius

### Boundary (70-79)
- 70: Boundary Mode (0=Bounce, 1=Warp)
- 71: Boundary Shape (0=Circular, 1=Rectangular)
- 72: Boundary Scale
- 73: Boundary Damping

### Gravity (80-89)
- 80: Gravity X
- 81: Gravity Y

### Collision (90-99)
- 90: Collision Enabled (bool)
- 91: Collision Grid Size
- 92: Collision Repulsion

### Turbulence (100-159)
- 100: Turb Strength
- 101: Turb Rotation
- 109: Turb Pattern Style (0-14)
- 160: Turb Scale
- 161: Turb Speed

### Touch (120-129)
- 120: Touch Strength
- 121: Touch Radius
- 122: Touch Mode (0=Attract, 1=Repulse)

### IMU (130-139)
- 130: IMU Sensitivity
- 131: IMU Smoothing
- 132: IMU Enabled (bool)

### Grid/Rendering (140-159)
- 140: Grid Mode (0-8)
- 141: Max Density
- 142: Smooth In
- 143: Smooth Out
- 144: Target Cell Count
- 145: Grid Gap
- 146: Theme (0-10)

### Special Messages (240-255)
- 0xFD: Heartbeat/ping
- 0xFE: Preset select (future)
- 0xFF: Sync request (client → ESP32)

---

## 🆘 Troubleshooting

### Particles Not Moving
- Check `timeScale` > 0 (via web UI)
- Check `velocityDamping` < 1.0 (not over-damped)
- Add `turbStrength` > 0 or `gravityY` ≠ 0 to add forces
- Check serial output for FPS (should be ~60)

### Particles Escaping Boundary
- Check `boundaryScale` ≤ 1.0 (scale > 1 can cause escapes)
- Check `boundaryMode` = 0 (Bounce) not 1 (Warp)
- Verify `Boundary::enforce()` is being called (add logging)

### Touch Not Working
- Check WiFi connection (touch driver shares I2C/SPI bus)
- Verify `getTouching()` returns true when touching screen
- Check serial output: `[Phase2A Validate] touch=1`
- Adjust `touchStrength` higher (default 0.1 is subtle)

### WebSocket Disconnects
- Check WiFi signal strength
- Check browser console for errors (F12 DevTools)
- Check ESP32 serial output for WebSocket logs
- Try reducing parameter update rate (if sending many updates)

### Low FPS
1. Reduce `particleCount` to 50
2. Disable turbulence: `turbStrength = 0`
3. Disable collision: `collisionEnabled = false`
4. Reduce `targetCellCount` to 100
5. Check for serial spam (excessive logging slows loop)

### Display Not Updating
- Check `UiLoop()` is called in `loop()` (LVGL requires regular ticks)
- Verify rendering branch is reached (add logging before `renderGrid()`)
- Check `gLastRenderMs` timing (should trigger every ~16ms)

### Web UI Not Loading
- Check `http://192.168.3.100` (not `https`)
- Verify LittleFS uploaded: `pio run -t uploadfs`
- Check ESP32 serial for HTTP server init messages
- Try clearing browser cache (Ctrl+Shift+R)

---

## 📚 Additional Resources

### Documentation
- `START_HERE.md`: Project orientation
- `Sim/doc/ARCHITECTURE.md`: Detailed architecture
- `Sim/doc/GLOSSARY.md`: Terms and abbreviations
- `Sim/doc/migration/migration-plan.md`: Migration strategy
- `.cursor/rules/project-conventions.mdc`: Coding standards

### Libraries
- [FastLED](https://github.com/FastLED/FastLED): LED control library
- [LVGL](https://docs.lvgl.io/8.4/): Graphics library documentation
- [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer): Web server library
- [PlatformIO](https://docs.platformio.org/): Build system documentation

### Hardware Datasheets
- [ESP32-S3 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [QMI8658 IMU](https://www.qstcorp.com/upload/pdf/202206/QMI8658C%20Datasheet%20Rev.%20A.pdf)
- [LilyGo T-RGB](https://github.com/Xinyuan-LilyGO/T-RGB)
- [Waveshare ESP32-S3-Touch](https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-1.28)

---

**Quick Start**: Read `START_HERE.md` → Build → Upload → Connect WiFi → Open `http://192.168.3.100`
