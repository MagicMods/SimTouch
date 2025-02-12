import { FluidSim } from "./simulation/fluidSim.js";
import { ParticleSystem } from "./simulation/particleSystem.js";
import { UI } from "./ui/ui.js";
import { ParticleRenderer } from "./renderer/particleRenderer.js";
import { LineRenderer } from "./renderer/lineRenderer.js";

class Main {
  constructor() {
    this.canvas = document.getElementById("glCanvas");
    if (!this.canvas) throw new Error("Canvas not found");

    const gl = this.canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");

    // Colors for different systems
    this.colors = {
      reference: [0.2, 0.4, 1.0, 0.8], // Blue
      test: [1.0, 0.4, 0.2, 0.8], // Orange
    };

    // Keep reference system
    this.simulation = new FluidSim(gl, this.canvas, 29, 14);

    // Add test system (in normalized space)
    this.particleSystem = new ParticleSystem({
      particleCount: 100,
      timeStep: 1 / 60,
      gravity: 9.81,
    });

    // // Add debug center particle
    // this.debugParticle = {
    //   x: 0.5, // Center in [0,1] space
    //   y: 0.5,
    //   vx: 0,
    //   vy: 0,
    // };

    // // Add mouse debug
    // this.setupMouseDebug();

    // console.log("Main constructor complete with debug additions");
  }

  setupMouseDebug() {
    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      console.table({
        "Mouse Click": {
          x: mouseX.toFixed(3),
          y: mouseY.toFixed(3),
        },
        "Relative to Center": {
          x: (mouseX - 0.5).toFixed(3),
          y: (mouseY - 0.5).toFixed(3),
        },
        "Debug Particle": {
          x: this.debugParticle.x.toFixed(3),
          y: this.debugParticle.y.toFixed(3),
        },
        "Canvas Pixels": {
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
        },
      });

      // Log boundary info from ParticleSystem
      console.log("Boundary:", {
        center: {
          x: this.particleSystem.centerX.toFixed(3),
          y: this.particleSystem.centerY.toFixed(3),
        },
        radius: this.particleSystem.radius.toFixed(3),
      });
    });
  }

  async init() {
    try {
      await this.simulation.initialize();

      // Initialize UI with main instance
      this.ui = new UI(this); // Pass main instance instead of simulation

      // Create test particle renderer
      this.testParticleRenderer = new ParticleRenderer(
        this.simulation.gl,
        this.simulation.shaderManager,
        "particles"
      );

      // Create line renderer for debug visualization
      this.lineRenderer = new LineRenderer(
        this.simulation.gl,
        this.simulation.shaderManager
      );

      this.animate();
      return true;
    } catch (error) {
      console.error("Failed to initialize:", error);
      throw error;
    }
  }

  animate() {
    // Update reference system's physics
    this.simulation.updateParticlePhysics();

    // Update test system
    this.particleSystem.step();

    // Clear and setup frame
    this.simulation.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.simulation.gl.clear(this.simulation.gl.COLOR_BUFFER_BIT);

    // Draw grid
    this.simulation.gridRenderer.draw();

    // // Draw debug center particle with new shader (green)
    // this.testParticleRenderer.draw([this.debugParticle], [0.0, 1.0, 0.0, 1.0]);

    // Draw reference particles (blue)
    this.simulation.particleRenderer.draw(
      this.simulation.particles,
      this.colors.reference
    );

    // Add detailed logging for particle data flow
    const testParticles = this.particleSystem.getParticles();
    const boundaryPoints = this.particleSystem.getBoundaryPoints();

    // console.log("Particle Systems Debug:", {
    //   testParticles: {
    //     count: testParticles?.length || 0,
    //     first: testParticles?.[0]
    //       ? {
    //           x: testParticles[0].x.toFixed(3),
    //           y: testParticles[0].y.toFixed(3),
    //         }
    //       : null,
    //     last: testParticles?.[testParticles.length - 1]
    //       ? {
    //           x: testParticles[testParticles.length - 1].x.toFixed(3),
    //           y: testParticles[testParticles.length - 1].y.toFixed(3),
    //         }
    //       : null,
    //   },
    //   boundaryPoints: {
    //     count: boundaryPoints?.length || 0,
    //     first: boundaryPoints?.[0]
    //       ? {
    //           x: boundaryPoints[0].x.toFixed(3),
    //           y: boundaryPoints[0].y.toFixed(3),
    //         }
    //       : null,
    //   },
    // });

    // Draw boundary with explicit check
    if (boundaryPoints && boundaryPoints.length > 0) {
      this.testParticleRenderer.draw(boundaryPoints, [1.0, 0.0, 0.0, 0.5]);
    }

    // Draw particles with explicit check
    if (testParticles && testParticles.length > 0) {
      this.testParticleRenderer.draw(testParticles, this.colors.test);
    }

    // Draw debug grid if enabled
    if (this.particleSystem.debugEnabled) {
      this.particleSystem.drawDebugGrid(this.lineRenderer);
    }

    // Log center particle position periodically
    if (this.frame % 60 === 0) {
      // Every second at 60fps
      console.log("Center Particle:", {
        position: this.debugParticle,
        normalized: {
          x: this.debugParticle.x,
          y: this.debugParticle.y,
        },
      });
    }

    // Continue animation
    requestAnimationFrame(() => this.animate());
  }

  static async create() {
    const main = new Main();
    await main.init();
    return main;
  }
}

window.onload = () => Main.create().catch(console.error);

export { Main };
