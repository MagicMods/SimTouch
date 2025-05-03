# SimTouch: JS Prototyping Environment for Embedded Particle Simulation and Actuator Array Control.

## Overview

This project's aim is to develop a particle simulation engine designed to generate organic and coherent control signals for actuator arrays (servos, LEDs, etc.) on touch-enabled embedded systems. It serves as an addon to a parent Haptic/VR project but could be used for wildy different purpose such as a movement reactive pendant (emu/graphics), sound reactive art installation (hardware/audio/PWM) etc. But most importantly, it is a rapid protyping development/testing platform.

The development follows a **two-phase strategy**:

1.  **Phase 1 (Current): JavaScript Prototyping Environment (`Sim/`)**
    - This environment uses JavaScript and WebGL2 for rapid development and visualization of the core simulation algorithms. It leverages the immediate feedback loop ("causality") of web development for efficient tuning of physics and behaviors, which is difficult in typical embedded workflows (compile, flash, test).
    - The core simulation logic is written with portability in mind, minimizing external dependencies.
2.  **Phase 2 (Future): Embedded Deployment**
    - The validated core logic from Phase 1 will be ported to a target embedded system (likely C++/Arduino). The embedded device will run the simulation autonomously.

While the [Waveshare ESP32-S3-Touch-LCD-1.28](https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-1.28) is used as the default reference target for parameters, the simulation core is designed for any touch-enabled devices.

## Phase 1: JS Prototyping Environment Features

- **Purpose:** Rapidly develop, test, visualize, and tune core simulation algorithms intended for the embedded target. Acts as a functional specification.
- **Simulation:** Real-time particle-based simulation including:
  - Fluid dynamics (PIC/FLIP methods)
  - Collision detection and response
  - Force fields (Turbulence, Voronoi, Gravity)
  - Noise driven effect field.
  - Boundary interactions
  - Organic behaviors (Swarm, Automata, Chain - planned/experimental)
- **Rendering:** WebGL2 rendering for visualization and debugging (Particles, Grid, Boundaries, Data Vizu) and use instantiation for grid rendering performance.
- **Portability Focus:** Core simulation logic is separated from web-specific rendering/UI components. (See `memoLTM/goals.md` for detailed scope).
- **Input Handling:**
  - Mouse interaction (simulating touch input + receive UDP)
  - External Input Integration (EMU forces via UDP)
  - Microphone input processing with a comprehensive band filtering/visualisation + parameter modulation control
  - Joystick simulating gravity (act as an abstraction and tunning for external inputs)
- **UDP Communication:** Sends simulation state (grid specs + cells data) to an external device (acting as a "Slave" display in Phase 1). Each cell's data in the grid conceptually represents the state for a corresponding external actuator (potential 1:1 mapping), or specific cell indices can be selected for targeted data extraction. Also sends touch and Emu data back to Js Sim.
- **UI Controls:** Interactive UI (`lil-gui`) for real-time parameter tweaking.
- **Modulation:** Includes a Pulse Modulator system synced on a Beat Per Minutes.
- **Embedded device:** Simple firmware, acting as slave, mirroring Sim's grid and sending back Touch and Emu data via UDP. Serial is used for runtime debugging.

## Phase 2: Embedded System (Future Goal)

- **Objective:** Port the core simulation logic (developed in Phase 1) to a target embedded system (e.g., ESP32-S3).
- **Functionality:**
  - The embedded device runs the simulation natively.
  - Handles inputs directly (touchscreen, sensors like IMU, audio).
  - Outputs control signals for connected actuator arrays.
  - The JS application (`Sim/`) transitions to a remote control/configuration tool via UDP/API.

## Goals

- **Phase 1:** Develop and validate a portable, core particle simulation engine in JavaScript suitable for refactoring to C++/embedded environments.
- **Phase 2:** Deploy the simulation onto a touch-enabled microcontroller to create novel, organic control methods for actuator arrays (LEDs, servos, etc.).
- **Overall:** Provide a flexible system adaptable to various embedded targets and actuator types.

## Requirements (for Phase 1 JS Environment)

- Node.js (v14+)
- Modern web browser with WebGL2 support

## Installation (Phase 1 JS)

```bash
# Clone the repository
git clone https://github.com/MagicMods/SimTouch.git

# Navigate to the simulation directory
cd Sim

# Install dependencies
npm install
```

## Running the Simulation (Phase 1 JS)

```bash
# Start both server and client
npm run dev

# Or start them separately
npm run server  # Starts the WebSocket server
npm run client  # Starts the live-server for the client
```

Then open your browser to `http://localhost:8080/sim.html` to view the simulation.

## Project Structure

- `Sim/` - Phase 1: JavaScript Prototyping Environment
  - `src/` - Source code
    - `main.js` - Main application entry point
    - `simulation/` - Core simulation logic (portable)
    - `coreGrid/` - Core grid geometry and management (portable)
    - `input/` - Input handling and modulation
    - `com/` - Communication logic (UDP, Serial)
    - `renderer/` - WebGL rendering components (JS only)
    - `shader/` - GLSL shader code (JS only)
    - `ui/` - User interface components (JS only)
    - `sound/` - Sound processing and visualization
    - `util/` - Utility functions
    - `presets/` - Simulation parameter presets
  - `sim.html` - HTML entry point
  - `package.json` - Node.js dependencies
- `Embedded/esp32/Phase1` - Waveshare ESP32-S3-Touch 1.28 SLAVE firmware.
- `memoLTM/` - Internal AI collaboration and project documentation.
- `README.md` - This file
- `.cursor/rules` - Cursor IDE AI enabled specific rules, derived from [RIPER-5](https://forum.cursor.com/t/i-created-an-amazing-mode-called-riper-5-mode-fixes-claude-3-7-drastically/65516) and [cursorkleosr](https://github.com/kleosr/cursorkleosr/). Still under development but good base to start with. It enables tight control over AI model's behavior and agentic workflow effectively dramatically boosting productivity. You need to tune it to your own workflow and logic. Use the model to reflect on it's own failures and figure out a strategy to correct it's own behavior via rules and memoLTM/learnings.md. Experimental but very effective. Works great with geminy2.5 pro and Claude3.7

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0).
See the full license text here: [https://creativecommons.org/licenses/by-nc-sa/4.0/](https://creativecommons.org/licenses/by-nc-sa/4.0/)
