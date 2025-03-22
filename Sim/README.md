# Svibe FlipSim JS

A WebGL2-based fluid simulation for the Svibe project, implementing a FLIP (Fluid-Implicit-Particle) method with interactive features.

## Features

- Real-time particle-based fluid simulation
- WebGL2 rendering with custom shaders
- External input integration (EMU forces, microphone input)
- Interactive controls via mouse and touch
- Turbulence and Voronoi field effects
- Socket-based networking capabilities
- Modular design with separation of rendering, simulation, and UI

## Requirements

- Node.js (v14+)
- Modern web browser with WebGL2 support

## Installation

```bash
# Clone the repository
git clone [repository-url]

# Navigate to the simulation directory
cd Svibe_Firmware/Svibe_FlipSimJs/Sim

# Install dependencies
npm install
```

## Running the Simulation

```bash
# Start both server and client
npm run dev

# Or start them separately
npm run server  # Starts the WebSocket server
npm run client  # Starts the live-server for the client
```

Then open your browser to http://localhost:8080 to view the simulation.

## Project Structure

- `src/` - Source code
  - `main.js` - Main application entry point
  - `simulation/` - Core simulation logic
  - `renderer/` - WebGL rendering components
  - `shaders/` - GLSL shader code
  - `input/` - Input handling (mouse, EMU, microphone)
  - `ui/` - User interface components
  - `network/` - Socket-based networking

## License

MIT
