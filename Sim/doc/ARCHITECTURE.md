# Phase2 Architecture: SimTouch Embedded Implementation

**Status**: Phase 2 Active Development (Autonomous ESP32-S3)  
**Last Updated**: 2026-02-15  
**Target Hardware**: LilyGo T-RGB 2.1 (primary), Waveshare ESP32-S3-Touch-LCD-1.28 (secondary)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Module Architecture](#module-architecture)
3. [Data Flow](#data-flow)
4. [Module Reference](#module-reference)
5. [Memory Layout](#memory-layout)
6. [Configuration System](#configuration-system)
7. [Execution Flow](#execution-flow)
8. [Integration Points](#integration-points)

---

## System Overview

Phase2 is a **standalone, autonomous particle simulation** running natively on ESP32-S3. It replaces the Phase1 UDP-slave architecture where a JavaScript simulation controlled the display.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       ESP32-S3 Firmware                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │   Input    │  │ Simulation  │  │   Output     │            │
│  │   Layer    │→ │   Engine    │→ │   Layer      │            │
│  └────────────┘  └─────────────┘  └──────────────┘            │
│       ↓               ↓                  ↓                      │
│  Touch/IMU      Physics (60Hz)     Grid+Display                │
│  WebSocket      Particles→Cells     FastLED Render             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Configuration Layer (AsyncWebServer + WebSocket)        │  │
│  │  • HTTP Server → serves data/* (HTML/CSS/JS)             │  │
│  │  • WebSocket /ws → binary parameter updates              │  │
│  │  • SimConfig (81 parameters, registry-based)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Fixed-time simulation**: 60Hz physics tick (16.67ms), decoupled from rendering
2. **Normalized coordinate space**: All simulation in `[0,1]`, pixel conversion at render boundary
3. **Fixed-size allocation**: No `new`/`malloc`, all arrays are `float arr[MAX_SIZE]`
4. **Registry-driven configuration**: 81 parameters with metadata for type-safe WebSocket updates
5. **Modular force system**: Forces (touch, IMU, turbulence, gravity) are additive, applied each tick

---

## Module Architecture

### Layer Breakdown

```
Application Layer (Main.cpp)
    ↓
Simulation Core (SimCore.cpp)
    ├─ Boundary.cpp (constraint enforcement)
    ├─ Collision.cpp (spatial grid-based particle collisions)
    ├─ Turbulence.cpp (noise-driven force fields)
    └─ GravityForces.cpp (uniform acceleration)
    ↓
Force Inputs
    ├─ TouchForces.cpp (screen touch → attraction/repulsion)
    ├─ ImuForces.cpp (accelerometer → gravity direction)
    └─ (Future: Audio, Modulator, Organic behaviors)
    ↓
Output Processing
    ├─ GridGeometry.cpp (compute grid cell layout)
    ├─ GridModes.cpp (particles → cell values via proximity/velocity/density)
    └─ Graphics.cpp (render cells to display with FastLED palettes)
    ↓
Configuration Layer
    └─ ConfigWeb.cpp (AsyncWebServer + WebSocket parameter sync)
```

### File Organization

```
Embedded/esp32/Phase2/
├── include/                    # Module headers
│   ├── SimConfig.h            # Central config struct + parameter registry
│   ├── SimCore.h              # Particle system API
│   ├── Boundary.h             # Boundary physics
│   ├── Collision.h            # Collision detection
│   ├── Turbulence.h           # Noise-driven forces
│   ├── GravityForces.h        # Uniform gravity
│   ├── TouchForces.h          # Touch input → forces
│   ├── ImuForces.h            # IMU → gravity mapping
│   ├── GridGeometry.h         # Grid cell layout computation
│   ├── GridModes.h            # Particle → cell value algorithms
│   ├── Graphics.h             # Display rendering (LVGL + FastLED)
│   ├── ConfigWeb.h            # Web configuration interface
│   ├── WifUdp.h               # WiFi AP + UDP (legacy Phase1 compat)
│   ├── Acc.h                  # QMI8658 IMU driver
│   ├── Palettes.h             # 11 FastLED gradient palettes
│   ├── Main.h                 # Global constants + helpers
│   ├── Voronoi.h              # (Scaffold) Voronoi field
│   ├── FluidFLIP.h            # (Scaffold) FLIP fluid solver
│   ├── Modulator.h            # (Scaffold) LFO modulation
│   └── OrganicBehavior.h      # (Scaffold) Swarm/automata
│
├── src/                       # Implementation files (1:1 with headers)
│   ├── Main.cpp               # Application entry (setup/loop)
│   ├── ConfigWeb.cpp          # WebSocket + HTTP server
│   ├── SimCore.cpp            # Particle system implementation
│   ├── Boundary.cpp           # Circular/rectangular boundary logic
│   ├── Collision.cpp          # Spatial grid collision detection
│   ├── Turbulence.cpp         # Perlin/Simplex noise force generation
│   ├── GravityForces.cpp      # Gravity application
│   ├── TouchForces.cpp        # Touch → force mapping
│   ├── ImuForces.cpp          # IMU → gravity + smoothing
│   ├── GridGeometry.cpp       # Cell position/size computation
│   ├── GridModes.cpp          # Proximity/velocity/density modes
│   ├── Graphics.cpp           # LVGL + TFT + FastLED rendering
│   ├── WifUdp.cpp             # WiFi AP setup + UDP send/receive
│   ├── Acc.cpp                # QMI8658 I2C communication
│   ├── Palettes.cpp           # FastLED palette definitions
│   ├── Voronoi.cpp            # (Scaffold)
│   ├── FluidFLIP.cpp          # (Scaffold)
│   ├── Modulator.cpp          # (Scaffold)
│   └── OrganicBehavior.cpp    # (Scaffold)
│
├── data/                      # LittleFS web assets
│   ├── index.html             # Configuration UI (single-page app)
│   ├── style.css              # Mobile-first dark theme
│   └── app.js                 # WebSocket client + dynamic UI generation
│
├── platformio.ini             # Build configurations (3 envs: lilygo, lilygo_v9, waveshare)
└── boards/
    └── waveshare_esp32s3.json # Custom board definition for Waveshare
```

---

## Data Flow

### Input → Simulation → Output Pipeline

```
┌─────────────┐
│   Inputs    │
├─────────────┤
│ Touch       │──┐
│ (pixels)    │  │
└─────────────┘  │
                 │  Normalize to [0,1]
┌─────────────┐  │  ┌──────────────────┐
│ IMU         │──┼─→│  Force Inputs    │
│ (g units)   │  │  │  (TouchForces,   │
└─────────────┘  │  │   ImuForces)     │
                 │  └──────────────────┘
┌─────────────┐  │           ↓
│ WebSocket   │──┘  ┌──────────────────┐
│ (param idx) │     │   SimCore        │
└─────────────┘     │   • Turbulence   │
                    │   • Collision    │
                    │   • Boundary     │
                    │   • Gravity      │
                    │   • Integration  │
                    └──────────────────┘
                             ↓
                    ┌──────────────────┐
                    │  Particle State  │
                    │  x[50], y[50]    │
                    │  vx[50], vy[50]  │
                    │  (in [0,1] space)│
                    └──────────────────┘
                             ↓
                    ┌──────────────────┐
                    │  GridModes       │
                    │  (proximity/     │
                    │   velocity/      │
                    │   density calc)  │
                    └──────────────────┘
                             ↓
                    ┌──────────────────┐
                    │  Cell Values     │
                    │  uint8[338]      │
                    │  (0-255 range)   │
                    └──────────────────┘
                             ↓
         ┌───────────────────┴───────────────────┐
         ↓                                       ↓
┌─────────────────┐                    ┌─────────────────┐
│  Display        │                    │  Future: Suit   │
│  (FastLED       │                    │  (338 haptic    │
│   palette       │                    │   modules)      │
│   rendering)    │                    └─────────────────┘
└─────────────────┘
```

### Coordinate Space Transformations

1. **Touch Input**: `240×240` pixels → `[0,1]` normalized (in `TouchForces.cpp`)
2. **Simulation**: All physics in `[0,1]` space (position, velocity, forces)
3. **Grid Computation**: Particles `[0,1]` → cell indices (via proximity check)
4. **Display Output**: Cell grid rendered at screen resolution (pixel space conversion in `Graphics.cpp`)

---

## Module Reference

### Core Simulation

#### SimCore.cpp
**Purpose**: Central particle system orchestrator  
**Key Functions**:
- `init()`: Initialize particles in random positions
- `step(dt, timeSec)`: Execute one physics tick
  1. Apply turbulence forces
  2. Apply gravity
  3. Integrate velocities → positions
  4. Detect & resolve collisions
  5. Enforce boundary constraints
  6. Apply damping & velocity clamping
- `addForceAtPoint(x, y, radius, strength, repulse)`: External force injection (used by TouchForces)
- `setGravity(gx, gy)`: Update gravity vector (used by ImuForces)

**Dependencies**:
- `Boundary` (constraint enforcement)
- `Collision` (particle-particle interactions)
- `Turbulence` (noise-driven forces)

**Data**:
```cpp
float x_[MAX_PARTICLES];    // Position X in [0,1]
float y_[MAX_PARTICLES];    // Position Y in [0,1]
float vx_[MAX_PARTICLES];   // Velocity X
float vy_[MAX_PARTICLES];   // Velocity Y
uint16_t count_;            // Active particle count
```

---

#### Boundary.cpp
**Purpose**: Enforce circular or rectangular boundary constraints  
**Key Functions**:
- `enforce(x, y, vx, vy)`: Clamp particle position to boundary, apply damping/restitution/friction
- `getBoundaryType()`: Returns `BOUNDARY_CIRCULAR` or `BOUNDARY_RECTANGULAR`
- `getRadius()`: Get effective boundary radius (for circular mode)

**Modes**:
- `BOUNCE` (mode 0): Reflect velocity when hitting boundary
- `WARP` (mode 1): Wrap-around to opposite side (toroidal topology)

**Parameters** (from `SimConfig`):
- `boundaryMode`: 0=BOUNCE, 1=WARP
- `boundaryShape`: 0=CIRCULAR, 1=RECTANGULAR
- `boundaryScale`: Boundary size multiplier (1.0 = full `[0,1]` space)
- `boundaryDamping`: Velocity reduction on bounce (0-1)
- `boundaryRestitution`: Elasticity (0=sticky, 1=perfectly elastic)
- `boundaryFriction`: Tangential velocity reduction

---

#### Collision.cpp
**Purpose**: Spatial grid-based particle-particle collision detection  
**Algorithm**: 
1. Partition `[0,1]` space into `gridSize × gridSize` cells (default 8×8 = 64 cells)
2. Assign particles to cells based on position
3. For each cell, check collisions only within that cell + neighbors (9 cells max)
4. Apply repulsion force between overlapping particles

**Key Functions**:
- `detect(particleCount, x, y, vx, vy)`: Build spatial grid, resolve collisions

**Parameters**:
- `collisionEnabled`: Master on/off switch
- `collisionGridSize`: Spatial grid resolution (4-16, default 8)
- `collisionRepulsion`: Force strength for overlapping particles
- `particleRestitution`: Collision elasticity
- `collisionDamping`: Velocity reduction after collision

**Performance**: O(N) average (vs O(N²) brute-force), critical for 50+ particles

---

#### Turbulence.cpp
**Purpose**: Noise-driven force field generation  
**Algorithm**: Ported from `turbulenceField.js`, uses Perlin/Simplex noise with rotation, scaling, pattern styles

**Key Functions**:
- `apply(count, x, y, vx, vy, timeSec)`: Compute noise-based forces for all particles
- Internal: `sampleNoiseValue(x, y, timeSec)` → noise value in `[-1, 1]`
- Internal: Pattern styles (Checkerboard, Waves, Spiral, Vortex, etc.)

**Parameters** (18 params in `SimConfig`):
- `turbStrength`: Force magnitude (0=off)
- `turbScale`: Noise frequency (larger = coarser patterns)
- `turbSpeed`: Time-based animation speed
- `turbRotation`: Field rotation angle
- `turbPatternStyle`: 0-14 (Checkerboard, Waves, Spiral, Vortex, Radial, etc.)
- Advanced: `turbDomainWarp`, `turbSymmetryAmount`, `turbBlurAmount`, bias/contrast controls

**Ported from**: `Sim/src/simulation/forces/turbulenceField.js` (~1456 lines)

---

#### GravityForces.cpp
**Purpose**: Apply uniform gravity to all particles  
**Simple acceleration**: `vx += gravityX * dt`, `vy += gravityY * dt`

**Parameters**:
- `gravityX`: Horizontal gravity (-2 to +2, default 0)
- `gravityY`: Vertical gravity (-2 to +2, default 0)

---

### Force Inputs

#### TouchForces.cpp
**Purpose**: Convert screen touch to attraction/repulsion forces  
**Mapping**: Touch pixels → `[0,1]` normalized → radial force field

**Key Functions**:
- `setTouchPixels(pixelX, pixelY, active)`: Update touch state
- `apply(SimCore&)`: Call `SimCore::addForceAtPoint()` if touch is active

**Parameters**:
- `touchStrength`: Force magnitude
- `touchRadius`: Influence radius in `[0,1]` space
- `touchMode`: 0=attract, 1=repulse

**Coordinate Transform**:
```cpp
float normX = pixelX / SCREEN_WIDTH;   // 240 or 480
float normY = pixelY / SCREEN_HEIGHT;
```

---

#### ImuForces.cpp
**Purpose**: Map IMU accelerometer data to gravity direction  
**Device Orientation**: X=right, Y=forward, Z=up (device flat, screen up)

**Key Functions**:
- `setAccel(ax, ay, az)`: Update raw accelerometer data
- `apply()`: Smooth and map to `SimCore::setGravity()`

**Mapping**:
```cpp
// Low-pass filtered tilt → gravity direction
gravityX = -accelX * imuSensitivity;  // Tilt right → particles fall right
gravityY = accelY * imuSensitivity;   // Tilt forward → particles fall down
```

**Parameters**:
- `imuSensitivity`: Accel → gravity scale factor (0-2, default 0.5)
- `imuSmoothing`: Low-pass filter alpha (0-1, default 0.12)
- `imuEnabled`: Master on/off (default false, UI gravity is authoritative)

---

### Output Processing

#### GridGeometry.cpp
**Purpose**: Compute grid cell positions and dimensions based on config  
**Output**: Array of cell center coordinates in pixel space, cell dimensions

**Key Functions**:
- `rebuild()`: Recalculate cell layout (called on config change)
- `getCellCount()`: Total cells generated
- `getCols()`, `getRows()`: Grid dimensions
- `getCellW()`, `getCellH()`: Individual cell size in pixels

**Algorithm**:
1. Calculate target cell size from `targetCellCount` and screen size
2. Fit grid to screen (with `gridGap` spacing, `gridAspectRatio` adjustment)
3. Generate cell center positions (supports circular masking for round displays)

**Parameters**:
- `targetCellCount`: Desired number of cells (32-512, default 338)
- `gridGap`: Spacing between cells (0-8 pixels)
- `gridAspectRatio`: Width/height ratio (0.2-5.0)
- `gridScale`: Overall size multiplier
- `gridCenterOffsetX/Y`: Manual position adjustment

---

#### GridModes.cpp
**Purpose**: Convert particle state to per-cell values  
**Modes**:
1. **Proximity** (mode 0): Cell value = sum of particle proximity weights
2. **Velocity** (mode 1): Cell value = average particle velocity magnitude near cell
3. **Density** (mode 2): Cell value = particle count in cell region
4. **VelocityDirection** (mode 3): Cell value encodes velocity angle
5. ... (modes 4-8 reserved for future: Flow, Pressure, Vorticity, etc.)

**Key Functions**:
- `compute(SimCore, GridGeometry, cellValues[], maxCells)`: Main computation
- Internal: Per-mode algorithms (proximity distance calculations, velocity averaging, etc.)

**Parameters**:
- `gridMode`: Algorithm selection (0-8)
- `maxDensity`: Scaling factor for density → `[0,255]` mapping
- `smoothRateIn`: Exponential smoothing for increasing values
- `smoothRateOut`: Exponential smoothing for decreasing values

**Output**: `uint8_t cellValues[338]` (or `targetCellCount`)

---

#### Graphics.cpp
**Purpose**: Display rendering (LVGL + TFT drivers + FastLED palette mapping)  
**Platform Abstraction**: Handles both LilyGo (ST7701 RGB 480×480) and Waveshare (GC9A01 240×240)

**Key Functions**:
- `SetupUI()`: Initialize display, LVGL, touch driver
- `UiLoop()`: LVGL tick (must be called every loop)
- `renderGrid(cellValues[], count, cols, rows, gap, theme)`: Draw grid with FastLED colors
- `getTouchX()`, `getTouchY()`, `getTouching()`: Read touch state

**Rendering**:
- Fetch FastLED palette (11 themes: Fire, Ocean, Rainbow, etc.)
- Map `cellValues[i]` → palette color via `ColorFromPalette(palette, value, brightness)`
- Draw filled rectangles/circles at cell positions

---

### Configuration

#### ConfigWeb.cpp
**Purpose**: HTTP + WebSocket configuration interface  
**Libraries**: `ESPAsyncWebServer`, `AsyncWebSocket`, `LittleFS`

**HTTP Endpoints**:
- `GET /` → Serve `data/index.html` (configuration UI)
- `GET /api/params` → JSON parameter registry (for UI auto-generation)

**WebSocket Protocol** (`/ws`):
- **Client → ESP32**: `[paramIndex, ...valueBytes]` (binary, type-aware)
  - Example: `[80, 0x3F, 0x00, 0x00, 0x00]` = Set param 80 (gravityX) to float `0.5`
- **ESP32 → Client**: Sync response on connect (`0xFF` → send all params)
- **Special messages**: 
  - `0xFF`: Sync request (client sends on connect)
  - `0xFE`: Preset select (future: load preset by index)
  - `0xFD`: Heartbeat/ping

**Key Functions**:
- `SetupConfigWeb(SimConfig&)`: Initialize server + WebSocket handlers
- `LoopConfigWeb()`: Process WebSocket events (must be called every loop)
- `ConsumeConfigGridDirtyFlag()`: Check if grid rebuild needed
- `ConsumeConfigRestartFlag()`: Check if simulation reset requested
- `ResetConfigToDefaults()`: Restore default `SimConfig` values

**Parameter Update Flow**:
1. WebSocket receives `[paramIndex, ...bytes]`
2. Look up `kParamRegistry[paramIndex]`
3. Decode value based on `type` (FLOAT, UINT8, UINT16, INT8, BOOL)
4. Write to `SimConfig` at `offsetInConfig`
5. Set dirty flags if geometry-related params changed

---

#### SimConfig.h
**Purpose**: Central configuration struct + parameter registry  
**Design**: Single source of truth for all simulation parameters

**Structure**:
```cpp
struct SimConfig {
    // Simulation core (8 params)
    float timeStep, timeScale, velocityDamping, maxVelocity;
    uint16_t particleCount;
    float particleRadius, restDensity, picFlipRatio;
    
    // Boundary (7 params)
    uint8_t boundaryMode, boundaryShape;
    float boundaryScale, boundaryDamping, boundaryRestitution, boundaryRepulsion, boundaryFriction;
    
    // Gravity (2 params)
    float gravityX, gravityY;
    
    // Collision (5 params)
    bool collisionEnabled;
    uint8_t collisionGridSize;
    float collisionRepulsion, particleRestitution, collisionDamping;
    
    // Turbulence (25 params)
    float turbStrength, turbScale, turbSpeed, turbRotation, ...;
    uint8_t turbPatternStyle;
    
    // Grid/Rendering (15 params)
    uint8_t gridMode, theme, gridGap, gridAllowCut;
    uint16_t targetCellCount;
    float maxDensity, smoothRateIn, smoothRateOut, gridAspectRatio, gridScale, ...;
    
    // Touch (3 params)
    float touchStrength, touchRadius;
    uint8_t touchMode;
    
    // IMU (3 params)
    float imuSensitivity, imuSmoothing;
    bool imuEnabled;
    
    // Particle rendering (2 params, future)
    bool particleColorWhite;
    float particleOpacity;
};
```

**Parameter Registry**:
```cpp
struct ParamDef {
    uint8_t index;           // WebSocket parameter ID (50-255)
    const char* name;        // Human-readable name
    const char* group;       // UI grouping (e.g., "Turbulence", "Boundary")
    ParamType type;          // FLOAT, UINT8, UINT16, INT8, BOOL
    float minVal, maxVal, step;  // UI slider constraints
    uint16_t offsetInConfig; // offsetof(SimConfig, field)
};

static const ParamDef kParamRegistry[] = {
    {50, "Time Scale", "Simulation", PARAM_FLOAT, 0.1f, 8.0f, 0.01f, offsetof(SimConfig, timeScale)},
    {80, "Gravity X", "Gravity", PARAM_FLOAT, -2.0f, 2.0f, 0.01f, offsetof(SimConfig, gravityX)},
    // ... 81 total entries
};
```

**Index Allocation**:
- **0-49**: Reserved (Unity/system commands, DO NOT USE)
- **50-69**: Simulation core
- **70-79**: Boundary
- **80-89**: Gravity
- **90-99**: Collision
- **100-159**: Turbulence
- **120-129**: Touch
- **130-139**: IMU
- **140-159**: Grid/Rendering
- **240-255**: Meta/special messages

---

## Memory Layout

### SRAM Budget (320KB Total)

| Component | Size | Notes |
|-----------|------|-------|
| Particle arrays (50 × 4 floats × 4 bytes) | 800 B | x, y, vx, vy |
| Collision spatial grid (8×8 × 16 indices) | 1 KB | Particle index lists per cell |
| Grid cell values (338 × 1 byte) | 338 B | Output buffer |
| Grid smoothing state (338 × 4 bytes) | 1.4 KB | Previous frame values for exponential smoothing |
| Turbulence state | ~2 KB | Noise cache, rotation matrices |
| LVGL draw buffer | 5.7 KB | Display rendering buffer |
| FastLED palette data (11 palettes × 256 × 3) | 8.4 KB | Color gradients |
| WiFi/networking stack | ~40 KB | ESP-IDF WiFi + TCP/IP |
| AsyncWebServer + WebSocket + LittleFS | ~28 KB | HTTP server, WebSocket, filesystem |
| FreeRTOS + Arduino overhead | ~60 KB | OS + standard library |
| **Total Estimated** | **~158 KB** | ~162 KB free for stack + future features |

### Stack Allocation Strategy
- **Particle arrays**: Static arrays in `SimCore` class (stack or BSS segment)
- **Cell values**: Static global array in `Main.cpp`
- **Temporary buffers**: Stack allocation in functions (kept small, <1KB per function)
- **No heap allocation**: No `new`, `malloc`, `std::vector`, `String` (use `const char*` or fixed `char[]`)

### PSRAM Usage (2MB Available)
- Currently **unused** (not needed for 50-200 particles)
- Future: Large feature sets (e.g., FLIP fluid with 32×32 grid, Voronoi with 500+ sites)

---

## Configuration System

### Parameter Update Flow

```
┌──────────────┐
│ Web Browser  │
│ (JS Client)  │
└──────────────┘
       ↓ WebSocket /ws
       ↓ Binary: [paramIndex, ...valueBytes]
┌──────────────────────────────┐
│ ConfigWeb.cpp                │
│ • Decode param index         │
│ • Lookup kParamRegistry[idx] │
│ • Parse bytes → type-safe    │
│   value (float/uint8/etc.)   │
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│ SimConfig struct             │
│ • Write to offsetInConfig    │
│ • Set dirty flags if needed  │
│   (e.g., gridGeometry change)│
└──────────────────────────────┘
       ↓
┌──────────────────────────────┐
│ Main.cpp loop()              │
│ • Check ConsumeConfigGrid    │
│   DirtyFlag()                │
│ • Rebuild GridGeometry if    │
│   grid params changed        │
│ • Check ConsumeConfigRestart │
│   Flag()                     │
│ • Re-init SimCore if restart │
│   requested                  │
└──────────────────────────────┘
```

### Type Encoding

| ParamType | Wire Format | Example |
|-----------|-------------|---------|
| PARAM_UINT8 | `[idx, u8]` | `[70, 0x01]` = boundaryMode = 1 |
| PARAM_UINT16 | `[idx, u8_lo, u8_hi]` (LE) | `[53, 0x32, 0x00]` = particleCount = 50 |
| PARAM_INT8 | `[idx, i8]` (signed) | `[150, 0xFF]` = gridCenterOffsetX = -1 |
| PARAM_FLOAT | `[idx, f32_bytes_LE]` | `[80, 0x00, 0x00, 0x00, 0x3F]` = gravityX = 0.5 |
| PARAM_BOOL | `[idx, 0x00 or 0x01]` | `[90, 0x01]` = collisionEnabled = true |

### Web UI Auto-Generation

1. Browser fetches `GET /api/params` → JSON parameter registry
2. JavaScript parses registry, creates UI controls dynamically:
   - `FLOAT` → range slider (with `minVal`, `maxVal`, `step`)
   - `BOOL` → toggle switch
   - `UINT8` with small range → dropdown or segmented control
3. User adjusts control → JS encodes binary message → WebSocket send
4. ESP32 applies change, simulation updates **immediately** (no restart needed)

---

## Execution Flow

### Startup (setup() in Main.cpp)

```cpp
1. Serial.begin(250000)                  // Debug output
2. SetupWifi()                           // Start WiFi AP "ParticleSimulator"
3. SetupConfigWeb(gConfig)               // Initialize HTTP + WebSocket server
4. SetupUI()                             // Initialize LVGL + TFT + touch driver
5. SetupAcc()                            // Initialize QMI8658 IMU (I2C)
6. gGridGeometry.rebuild()               // Compute initial grid cell layout
7. gSimCore.init()                       // Initialize particles (random positions)
8. memset(gCellValues, 0, ...)           // Clear cell value buffer
9. gPerfWindowStartMs = millis()         // Start FPS counter
```

### Main Loop (loop() in Main.cpp)

```cpp
while (true) {
    // 1. Housekeeping (every loop iteration)
    LoopAcc();                           // Read IMU data
    UiLoop();                            // LVGL tick (touch, display refresh)
    LoopConfigWeb();                     // WebSocket event processing
    ProcessIncomingData();               // UDP remote config (Phase1 compat)
    
    if (ConsumeConfigGridDirtyFlag()) {
        gGridGeometry.rebuild();         // Rebuild grid if params changed
    }
    if (ConsumeConfigRestartFlag()) {
        gGridGeometry.rebuild();
        gSimCore.init();                 // Reset simulation
        memset(gCellValues, 0, ...);
    }
    
    // 2. Fixed-timestep simulation (accumulate delta, step at 60Hz)
    float loopDeltaMs = (nowUs - lastUs) / 1000.0f;
    gSimAccumMs += loopDeltaMs;
    
    while (gSimAccumMs >= 16.67ms && simStepsThisLoop < 4) {
        // Input processing
        gTouchForces.setTouchPixels(getTouchX(), getTouchY(), getTouching());
        gTouchForces.apply(gSimCore);
        
        if (gConfig.imuEnabled) {
            const AccelData a = GetAccelData();
            gImuForces.setAccel(a.x, a.y, a.z);
            gImuForces.apply();
        }
        
        // Core physics step
        gSimCore.step(gConfig.timeStep, nowSec);  // Turbulence, gravity, collision, boundary
        
        // Optional advanced modules (scaffold)
        gModulator.sample(nowSec);
        gVoronoi.step(dt);
        gFlip.step(dt);
        gOrganic.applySwarm(gSimCore, dt);
        
        validatePhase2A();               // Debug validation
        gSimAccumMs -= 16.67ms;
        ++simStepsThisLoop;
    }
    
    // 3. Rendering (decoupled, 60Hz target)
    if (nowMs - lastRenderMs >= 16ms) {
        gGridModes.compute(gSimCore, gGridGeometry, gCellValues, MAX_GRID_CELLS);
        renderGrid(gCellValues, cellCount, cols, rows, gap, theme);
        ++renderFrameCount;
    }
    
    // 4. Performance logging (every 1 second)
    if (nowMs - perfWindowStartMs >= 1000ms) {
        Serial.printf("[Phase2 FPS] sim %.1f | render %.1f | avg frame %.2f ms | cells=%u\n",
                      simFps, renderFps, avgFrameMs, cellCount);
        // Reset counters
    }
}
```

### Simulation Step Details (SimCore::step())

```cpp
void SimCore::step(float dt, float timeSec) {
    // 1. Turbulence forces (noise-driven, time-varying)
    turbulence_.apply(count_, x_, y_, vx_, vy_, timeSec);
    
    // 2. Gravity (uniform acceleration)
    for (uint16_t i = 0; i < count_; ++i) {
        vx_[i] += config_->gravityX * dt;
        vy_[i] += config_->gravityY * dt;
    }
    
    // 3. Velocity integration (Euler method)
    for (uint16_t i = 0; i < count_; ++i) {
        x_[i] += vx_[i] * dt;
        y_[i] += vy_[i] * dt;
    }
    
    // 4. Collision detection & response (spatial grid)
    if (config_->collisionEnabled) {
        collision_.detect(count_, x_, y_, vx_, vy_);
    }
    
    // 5. Boundary enforcement (circular or rectangular)
    for (uint16_t i = 0; i < count_; ++i) {
        boundary_.enforce(x_[i], y_[i], vx_[i], vy_[i]);
    }
    
    // 6. Damping & velocity clamping
    const float damping = config_->velocityDamping;
    const float maxVel = config_->maxVelocity;
    for (uint16_t i = 0; i < count_; ++i) {
        vx_[i] *= damping;
        vy_[i] *= damping;
        float speed = sqrtf(vx_[i]*vx_[i] + vy_[i]*vy_[i]);
        if (speed > maxVel) {
            float scale = maxVel / speed;
            vx_[i] *= scale;
            vy_[i] *= scale;
        }
    }
}
```

---

## Integration Points

### Phase 3: Svibe_Firmware_Slave Integration

When integrating Phase2 simulation into the production suit firmware:

1. **Library Packaging**: Move simulation modules to standalone library
   ```
   lib/SimTouch/
   ├── library.json
   └── src/
       ├── SimEngine.h/cpp      (top-level API wrapper)
       ├── SimConfig.h
       ├── SimCore.h/cpp
       └── ... (all simulation modules)
   ```

2. **API Surface** (SimEngine.h):
   ```cpp
   class SimEngine {
   public:
       SimConfig config;
       void init();
       void step(float dt);
       void setTouch(float x, float y, bool active);
       void setAccel(float ax, float ay, float az);
       const uint8_t* getCellValues();
       uint16_t getCellCount();
       void applyParam(uint8_t index, const uint8_t* data, size_t len);
   };
   ```

3. **Suit Integration Points**:
   - `Modules.cpp`: Add `UpdateModulesFromSim(SimEngine&)` function
     ```cpp
     void UpdateModulesFromSim(SimEngine& sim) {
         const uint8_t* cells = sim.getCellValues();
         uint16_t count = min(sim.getCellCount(), (uint16_t)NBR_MODULES);
         for (int i = 0; i < count; i++) {
             uint8_t motSpeed = cells[i];
             uint8_t motPwm = map(motSpeed, 0, 255, minPWM, maxPWM);
             modulesMotLeds[i*2] = ColorFromPalette(Palettes[idx], motSpeed, BRIGHTNESS_LED, BLEND);
             modulesMotLeds[i*2+1] = CRGB(motPwm, 1, 0);  // Motor control
         }
     }
     ```
   - `main.cpp`: Add `SIM_LOCAL` mode alongside `SIM_FLAG` (remote), `UNITY_CONNECTED`, `TOUCH_ENABLED`
   - `ui.cpp`: Route touch to `simEngine.setTouch()` in SIM_LOCAL mode
   - `Acc.cpp`: Route IMU to `simEngine.setAccel()` in SIM_LOCAL mode
   - `WifUdp.cpp`: Add WebSocket `/ws` endpoint for sim config (alongside existing OTA)

4. **Module Mapping**:
   - **Direct 1:1** (recommended): Set `targetCellCount = 338` → cell index maps directly to module index
   - **Spatial mapping** (future): Map body zones (Sig1/2/3/4, hands, feet) to grid regions

---

## Debugging & Validation

### Serial Output Format

```
[Phase2] target=LilyGo lvglMode=v8
[Phase2 FPS] sim 59.8 | render 60.1 | avg frame 16.52 ms | cells=338
[Phase2A Validate] particles=1 touch=1 boundary=1
```

### Common Debug Checks

1. **Particles not moving**: Check `timeScale`, `velocityDamping`, `turbStrength`, `gravityX/Y`
2. **Particles escaping boundary**: Add logging in `Boundary::enforce()`, verify `boundaryScale` < 1.1
3. **Collision too strong/weak**: Tune `collisionRepulsion`, `particleRestitution`
4. **Touch not registering**: Check `getTouching()`, verify touch driver init in `Graphics.cpp`
5. **WebSocket disconnects**: Check WiFi signal, browser console for errors, ESP32 serial for WebSocket logs

### Performance Profiling

- **Target FPS**: 60 sim + 60 render (shown in serial output every 1s)
- **Frame budget**: 16.67ms per frame (60Hz)
- **Bottlenecks**:
  - Simulation: `Turbulence::apply()` (noise computation), `Collision::detect()` (spatial grid)
  - Rendering: `renderGrid()` (LVGL draw calls), FastLED palette lookups
- **Optimization levers**: Reduce `particleCount`, `collisionGridSize`, `targetCellCount`

---

**End of Architecture Document**  
For quick start, see: `START_HERE.md`  
For migration strategy, see: `Sim/doc/migration/migration-plan.md`
