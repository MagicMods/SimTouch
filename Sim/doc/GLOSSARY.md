# SimTouch Project Glossary

**Purpose**: Define domain-specific terms, abbreviations, and concepts used throughout the SimTouch codebase and documentation.

---

## Project Phases

### Phase 1
The **JavaScript prototyping environment** that runs in a browser. Features:
- WebGL2 rendering for visualization
- Rapid parameter tuning via lil-gui
- UDP communication to external ESP32 slave display
- Acts as the reference implementation for porting to Phase2

Location: `Sim/src/`  
Status: Complete, stable, reference-only

### Phase 2
The **native C++ embedded implementation** running autonomously on ESP32-S3. Features:
- Self-contained particle simulation
- Direct touch/IMU input handling
- Web-based configuration interface (AsyncWebServer + WebSocket)
- Display rendering with FastLED color palettes

Location: `Embedded/esp32/Phase2/`  
Status: Active development (core features complete, advanced features scaffolded)

### Phase 3
**Integration into production suit firmware** (`Svibe_Firmware_Slave`). Features:
- SimTouch as a PlatformIO library
- 338-cell output mapped to 338 haptic modules
- Coexists with Unity control, local touch, and demo modes
- Unified LVGL UI with simulation configuration screen

Location: `Svibe_Firmware_Slave/` (separate repo/project)  
Status: Planned (integration after Phase2 completion)

---

## Hardware

### LilyGo T-RGB 2.1
**Primary development target** for Phase2.
- **Display**: ST7701 RGB interface, 480×480 half-circle
- **Touch**: Onboard capacitive touch (LilyGo library)
- **Form factor**: Larger screen, easier debugging/visualization
- **Build env**: `phase2_lilygo`, `phase2_lilygo_v9` (LVGL v8/v9)

### Waveshare ESP32-S3-Touch-LCD-1.28
**Secondary target** for Phase2, primary for Phase1 and planned Phase3.
- **Display**: GC9A01 SPI, 240×240 round
- **Touch**: CST816S I2C capacitive touch controller
- **Form factor**: Compact, wearable-friendly
- **Build env**: `phase2_waveshare`

### ESP32-S3
**Microcontroller** used in both hardware targets.
- **CPU**: Dual-core Xtensa LX7 @ 240MHz
- **RAM**: 320KB SRAM (internal, fast) + 2MB PSRAM (external, slower)
- **Flash**: 16MB (code + LittleFS filesystem)
- **WiFi**: 802.11 b/g/n, 2.4GHz (used for AP mode + WebSocket config)

### QMI8658
**6-axis IMU** (accelerometer + gyroscope) connected via I2C.
- Used to map device tilt → gravity direction (opt-in feature)
- Accelerometer range: ±8g or ±16g
- Location: Shared hardware across LilyGo and Waveshare

### CST816S
**I2C capacitive touch controller** used on Waveshare display.
- Single-touch only (no multi-touch)
- Reports pixel coordinates (0-240, 0-240)
- Handled by touch driver in `Graphics.cpp`

---

## Simulation Concepts

### Particle System
A collection of **50-200 simulated particles** (configurable via `particleCount` parameter).
- Each particle has: position (x, y), velocity (vx, vy)
- Stored as parallel arrays: `float x_[MAX_PARTICLES]`, etc.
- All positions in **normalized [0,1] coordinate space**

### Normalized Space
**Coordinate system** where all simulation physics occur.
- Origin (0, 0) = top-left
- (1, 1) = bottom-right
- Independent of screen resolution (240×240 or 480×480 pixels)
- Conversion to pixel space happens only at rendering boundary

### Fixed Timestep
**Simulation update strategy** where physics steps occur at a constant rate (60Hz = 16.67ms per step).
- Decoupled from rendering framerate
- Accumulated delta time ensures consistent physics regardless of loop speed
- Implementation: `gSimAccumMs` accumulator in `Main.cpp`

### Boundary
**Constraint system** that keeps particles within a defined region.
- **Circular**: Particles constrained to circle of radius `boundaryScale * 0.5`
- **Rectangular**: Particles constrained to rect `[0, boundaryScale] × [0, boundaryScale]`
- **Modes**: 
  - `BOUNCE` (0): Reflect velocity when hitting edge (with damping, restitution, friction)
  - `WARP` (1): Wrap-around to opposite side (toroidal topology)

### Collision Detection
**Particle-particle interaction system** using spatial grid optimization.
- Partitions [0,1] space into `gridSize × gridSize` cells (e.g., 8×8 = 64 cells)
- Only checks collisions within same cell + neighbors (9 cells max)
- Complexity: O(N) average vs O(N²) brute-force
- Applies repulsion force when particles overlap (radius check)

### Turbulence
**Noise-driven force field** that creates organic, flowing motion.
- Based on Perlin/Simplex noise algorithms
- 14 pattern styles: Checkerboard, Waves, Spiral, Vortex, Radial, Cellular, etc.
- Time-varying (animated) via `turbSpeed` parameter
- Expensive computation; set `turbStrength=0` to disable

### Forces
**External influences** applied to particle velocities each simulation step.
- **Gravity**: Uniform acceleration (configurable X/Y components)
- **Touch**: Radial attraction/repulsion from touch point
- **IMU**: Gravity direction driven by device tilt
- **Turbulence**: Noise-based spatially-varying forces
- All forces are **additive** and applied before velocity integration

---

## Grid System

### Grid
A **2D array of cells** that represents the output of the simulation.
- Typically 338 cells (to match 338 haptic modules in production suit)
- Each cell has a position (pixel space) and a value (0-255)
- Cell values computed from particle state via GridModes algorithms

### GridGeometry
**Module** that computes cell positions and dimensions.
- Input: `targetCellCount`, `gridGap`, `gridAspectRatio`, screen size
- Output: Array of cell center positions (pixel coords), cell width/height
- Supports circular masking (for round displays)
- Rebuild triggered when grid parameters change

### GridModes
**Algorithms** that convert particle state → per-cell values.
- **Proximity** (mode 0): Sum of distance-weighted particle influences
- **Velocity** (mode 1): Average particle velocity magnitude near cell
- **Density** (mode 2): Particle count in cell region
- **VelocityDirection** (mode 3): Velocity angle encoded as value
- Future modes: Flow, Pressure, Vorticity, Temperature

### Cell Value
**0-255 integer** representing the "intensity" or "activity" of a grid cell.
- Computed by GridModes algorithm
- Smoothed over time (exponential smoothing: `smoothRateIn`, `smoothRateOut`)
- Mapped to:
  - **Display**: FastLED palette color (in Phase2)
  - **Haptic module**: Motor PWM + LED color (in Phase3)

---

## Configuration

### SimConfig
**Central struct** containing all 81 simulation parameters.
- Single source of truth for configuration state
- Lives in `SimConfig.h` (struct definition)
- Instance passed to all modules via pointer (e.g., `SimCore(SimConfig* cfg)`)

### Parameter Registry
**Compile-time table** (`kParamRegistry` array) mapping parameter index → metadata.
- Each entry: index (50-255), name, group, type, range, offset in `SimConfig`
- Used by:
  - **ESP32**: Decode WebSocket messages, write to correct `SimConfig` field
  - **Web UI**: Auto-generate controls (sliders, toggles) with correct ranges

### ParamIndex
**Unique identifier** (0-255) for each configurable parameter.
- **0-49**: Reserved for Unity/system commands (DO NOT USE in SimTouch)
- **50-255**: SimTouch parameters (206 available)
- Examples: 
  - `50` = timeScale
  - `80` = gravityX
  - `100` = turbStrength
  - `0xFF` = sync request (special message)

### WebSocket Binary Protocol
**Communication format** between web UI and ESP32.
- Message: `[paramIndex, ...valueBytes]`
- Type-aware encoding:
  - `UINT8`: 1 byte (total 2 bytes)
  - `UINT16`: 2 bytes little-endian (total 3 bytes)
  - `FLOAT`: 4 bytes little-endian (total 5 bytes)
  - `BOOL`: 1 byte 0x00 or 0x01 (total 2 bytes)
- Example: `[80, 0x00, 0x00, 0x00, 0x3F]` = Set gravityX (index 80) to 0.5f

---

## Rendering

### FastLED
**Arduino library** for controlling addressable RGB LED strips.
- Used for color palette definitions (11 built-in themes)
- Provides `ColorFromPalette(palette, value, brightness)` function
- Palettes: Fire, Ocean, Rainbow, Lava, Forest, Party, Heat, etc.

### LVGL
**Lightweight graphics library** for embedded displays.
- Provides UI widgets, touch handling, draw buffer management
- Version 8.4.0 used in Phase2 (v9 support in `phase2_lilygo_v9` env)
- Configuration: `lv_conf.h` (included in project)

### Display Rendering
**Process** of drawing grid cells to screen.
1. GridModes computes `cellValues[]` (0-255 per cell)
2. GridGeometry provides cell positions (pixel coords)
3. For each cell:
   - Fetch color from FastLED palette based on `cellValues[i]`
   - Draw filled rect/circle at cell position with LVGL or TFT driver
4. Decoupled from simulation (independent 60Hz loop)

### Theme
**Color palette selection** (0-10, maps to FastLED palettes).
- 0 = Fire (red/orange/yellow)
- 1 = Ocean (blue/cyan/green)
- 2 = Rainbow (full spectrum)
- 3 = Lava (dark red/orange)
- ... (see `Palettes.cpp` for full list)

---

## Communication

### AsyncWebServer
**ESP32 library** for HTTP server functionality.
- Serves static files from LittleFS (`data/index.html`, etc.)
- Non-blocking (async) operation for responsiveness
- Endpoint: `GET /` → serve configuration web UI

### AsyncWebSocket
**WebSocket implementation** for real-time bidirectional communication.
- Endpoint: `/ws` (WebSocket upgrade from HTTP)
- Binary protocol (not text-based JSON for efficiency)
- Used for parameter updates (web UI → ESP32) and sync (ESP32 → web UI)

### LittleFS
**Filesystem** for storing files in ESP32 flash memory.
- Stores: `data/index.html`, `data/style.css`, `data/app.js`
- Mounted at boot, served by AsyncWebServer
- Upload via PlatformIO: `pio run -t uploadfs`

### WiFi AP Mode
**Access Point mode** where ESP32 creates its own WiFi network.
- SSID: `ParticleSimulator`
- Password: `MagicMods`
- IP: `192.168.3.100` (ESP32 itself)
- Clients connect to this network, then access `http://192.168.3.100`

### UDP
**User Datagram Protocol** used for:
- **Phase1**: JS Sim sends grid data to ESP32 slave display
- **Phase2**: Optional remote config (legacy compatibility path)
- **Phase3**: Unity sends module data to suit (separate use case)

---

## Code Organization

### Module
A **pair of files** (header + implementation) implementing a specific feature.
- Example: `Boundary.h` + `Boundary.cpp`
- Header: Class declaration, public API, minimal dependencies
- Implementation: All method definitions, private helpers, includes

### Application Layer
**Top-level code** in `Main.cpp` that orchestrates modules.
- `setup()`: Initialize all subsystems (WiFi, display, IMU, simulation)
- `loop()`: Main execution loop (input → simulation → rendering)

### Simulation Core
**Physics engine modules**: SimCore, Boundary, Collision, Turbulence, GravityForces.
- Operate in normalized [0,1] space
- Pure C++ (no Arduino/ESP32-specific code)
- Portable design (could run on other platforms)

### Hardware Layer
**Platform-specific code**: Graphics, WifUdp, Acc, Palettes.
- Graphics.cpp: LVGL + TFT drivers (different for LilyGo vs Waveshare)
- WifUdp.cpp: WiFi AP + UDP socket handling
- Acc.cpp: QMI8658 I2C communication
- Palettes.cpp: FastLED palette definitions

### Force Inputs
**Modules that inject forces into SimCore**: TouchForces, ImuForces.
- Read hardware state (touch coords, IMU accel)
- Convert to normalized forces in [0,1] space
- Call `SimCore::addForceAtPoint()` or `SimCore::setGravity()`

---

## Porting Concepts

### JS-to-C++ Translation
**Process** of converting JavaScript algorithms to C++.
- Replace `Float32Array(n)` → `float arr[MAX_N]`
- Replace `Math.sqrt/cos/sin` → `sqrtf/cosf/sinf`
- Replace `Math.random()` → `esp_random() / (float)UINT32_MAX`
- Replace `console.log()` → `Serial.printf()` or `log_d()`
- Replace `Array.push()` → Fixed-size array with count variable

### Reference Implementation
**JavaScript code** in `Sim/src/` that serves as the specification.
- Example: `Sim/src/simulation/forces/turbulenceField.js` → `Turbulence.cpp`
- JS Sim is feature-complete and validated; Phase2 ports from it
- Porting strategy: Copy algorithm logic, adapt to C++ constraints

### Validation
**Testing approach** where Phase2 output is compared to JS Sim.
- Set identical parameters in both systems
- Visually compare particle motion, grid output
- Check for boundary violations, collision artifacts, force application
- Goal: Phase2 behavior matches JS Sim within acceptable tolerance

---

## Performance

### FPS (Frames Per Second)
**Simulation update rate** and **rendering update rate**.
- Target: 60 FPS for both simulation and rendering
- Measured independently (decoupled loops)
- Serial output: `[Phase2 FPS] sim 59.8 | render 60.1 | avg frame 16.52 ms`

### Frame Budget
**Maximum time** allowed per simulation step to maintain 60 FPS.
- 60 FPS = 16.67ms per frame
- Typical breakdown: 10ms sim + 5ms render + 1.67ms margin
- Exceeding budget → FPS drop → simulation slowdown

### Bottlenecks
**Performance-critical sections**:
- **Turbulence**: Noise computation (Perlin/Simplex) for all particles
- **Collision**: Spatial grid population + neighbor checks
- **Rendering**: LVGL draw calls, FastLED palette lookups
- Mitigation: Reduce `particleCount`, `collisionGridSize`, `targetCellCount`

### SRAM vs PSRAM
**Memory types** on ESP32-S3:
- **SRAM**: 320KB, internal, fast (~1 cycle access)
- **PSRAM**: 2MB, external via QSPI, slower (~10-20 cycle access)
- Strategy: Keep hot data (particle arrays, collision grid) in SRAM

---

## Integration

### Svibe_Firmware_Slave
**Production haptic suit firmware** (separate project).
- Controls 338 haptic modules (motor + LED pairs)
- Receives commands from Unity via UDP
- LVGL UI with 10 screens (Intro, Main, Body, Colors, etc.)
- Phase3 target: Integrate SimTouch as local simulation mode

### Module
**Haptic actuator** in the production suit.
- Each module: 1 vibration motor + 1 RGB LED
- 338 total modules across 4 body zones (Sig1/2/3/4) + hands + feet
- Controlled via `modulesMotLeds[]` CRGB array (WS2812 protocol)

### Cell-to-Module Mapping
**Strategy** for connecting simulation grid → suit modules.
- **Direct 1:1**: Set `targetCellCount=338`, `cellValues[i]` maps to module `i`
- **Spatial**: Map body zones to grid regions (more complex, future)

### Unity
**Game engine** that controls the production suit in primary use case.
- Sends module data (speed/direction/color) via UDP
- SimTouch becomes an alternative control mode (autonomous simulation)
- Phase3: Add `SIM_LOCAL` mode alongside `UNITY_CONNECTED`, `SIM_FLAG` (remote), etc.

---

## Abbreviations

- **AP**: Access Point (WiFi mode)
- **BLE**: Bluetooth Low Energy (not currently used)
- **CRGB**: Color RGB (FastLED color type)
- **CST816S**: Capacitive touch controller IC
- **DMA**: Direct Memory Access (used by display drivers)
- **ESP32**: Espressif microcontroller family
- **FPS**: Frames Per Second
- **FLIP**: Fluid-Implicit Particle (advanced fluid simulation method)
- **FPU**: Floating Point Unit (ESP32-S3 has single-precision only)
- **GC9A01**: Round display driver IC (Waveshare)
- **GPIO**: General Purpose Input/Output (hardware pins)
- **GUI**: Graphical User Interface
- **HTTP**: Hypertext Transfer Protocol
- **I2C**: Inter-Integrated Circuit (serial bus protocol)
- **IMU**: Inertial Measurement Unit (accelerometer + gyroscope)
- **JSON**: JavaScript Object Notation
- **LFO**: Low-Frequency Oscillator (modulation source)
- **LVGL**: Light and Versatile Graphics Library
- **NVS**: Non-Volatile Storage (ESP32 key-value store, future use)
- **OTA**: Over-The-Air (firmware update method)
- **PIC**: Particle-In-Cell (fluid simulation method)
- **PWM**: Pulse Width Modulation (motor control)
- **QMI8658**: 6-axis IMU IC
- **QSPI**: Quad SPI (serial interface for PSRAM/flash)
- **RGB**: Red Green Blue (color model)
- **SRAM**: Static Random Access Memory
- **ST7701**: Display driver IC (LilyGo)
- **TFT**: Thin-Film Transistor (LCD display technology)
- **UDP**: User Datagram Protocol
- **URI**: Uniform Resource Identifier
- **WebGL**: Web Graphics Library (browser 3D API)
- **WebSocket**: Full-duplex communication protocol over HTTP
- **WiFi**: Wireless network protocol (802.11)
- **WS2812**: Addressable RGB LED protocol

---

## Special Terms

### Phase2A Validate
**Debug feature** that checks core functionality at startup.
- Validates: particles exist, touch is working, boundary is enforcing
- Serial output every 2.5s: `[Phase2A Validate] particles=1 touch=1 boundary=1`
- All flags should show `1` after a few seconds of interaction

### SIM_FLAG
**Legacy flag** from Phase1 indicating UDP-based remote sim mode.
- When set, firmware expects grid data from external source (JS Sim)
- Phase2: Mostly unused (autonomous mode), kept for UDP remote config path

### SIM_LOCAL
**Planned flag** for Phase3 integration.
- Indicates simulation is running locally on ESP32 (not Unity, not remote)
- Triggers routing of touch/IMU to SimCore instead of UDP transmission

### Dirty Flag
**Boolean flag** indicating configuration change requires rebuild.
- `ConfigGridDirtyFlag`: Grid parameters changed, rebuild GridGeometry
- `ConfigRestartFlag`: Core simulation parameters changed, reinit SimCore
- Consumed (cleared) by Main.cpp after handling

### Scaffold
**Placeholder implementation** for future features.
- Example: Voronoi.cpp, FluidFLIP.cpp, OrganicBehavior.cpp
- Contains basic structure (class, init, step methods) but no functional algorithm
- Compiled and linked but does nothing (called in Main.cpp, no effect)

---

**End of Glossary**  
For quick start: `START_HERE.md`  
For architecture: `Sim/doc/ARCHITECTURE.md`  
For migration strategy: `Sim/doc/migration/migration-plan.md`
