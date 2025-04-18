import { BaseRenderer } from "./baseRenderer.js";
import { eventBus } from '../util/eventManager.js'; // Added import

// Helper function (add outside the class or import)
function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export class ParticleRenderer extends BaseRenderer {
  showVelocityField = false;
  particleCount = 0; // Initialize particle count
  vertexArray = null;

  constructor(gl, shaderManager, debugFlags) {
    super(gl, shaderManager);
    if (!gl || !shaderManager) {
      throw new Error(
        "ParticleRenderer requires gl, shaderManager."
      );
    }
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.debug = debugFlags;
    this.shaderType = "particles";
    this.positionBuffer = gl.createBuffer();
    this.sizeBuffer = gl.createBuffer();
    this.velocityLineBuffer = gl.createBuffer(); // Add buffer for velocity lines
    this.config = {
      size: 10.0,
      color: [1, 1, 1, 0.1],
    };
    this.particleOpacity = 0.1;

    if (this.debug.particle) console.log("ParticleRenderer initialized");

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
  }

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (simParams?.particleRenderer) {
      const rendererParams = simParams.particleRenderer;

      this.particleOpacity = rendererParams.opacity ?? this.particleOpacity;

      // Update color based on hex string from simParams
      if (rendererParams.color !== undefined) {
        // Ensure config object exists
        if (!this.config) { this.config = { color: [1, 1, 1, 1] }; }
        const rgb = hexToRgb(rendererParams.color);
        if (rgb) {
          // Update the RGB part of the config color array
          this.config.color[0] = rgb.r / 255;
          this.config.color[1] = rgb.g / 255;
          this.config.color[2] = rgb.b / 255;
          // Note: Alpha is handled by particleOpacity, keep config.color[3] as 1 or default?
          // For consistency, let's set it, draw() will override with particleOpacity
          this.config.color[3] = 1.0;
        } else {
          console.warn(`Invalid hex color received: ${rendererParams.color}`);
        }
      }

      // Update velocity field visibility
      if (rendererParams.showVelocityField !== undefined) {
        this.showVelocityField = rendererParams.showVelocityField;
      }
    }
  }

  draw(particles) {
    if (!particles || !Array.isArray(particles)) {
      throw new Error("Invalid particles array provided to ParticleRenderer");
    }

    if (particles.length === 0) {
      return; // Nothing to draw, but not an error
    }

    // Unbind any VAO to ensure clean attribute state
    this.gl.bindVertexArray(null);

    const program = this.shaderManager.use(this.shaderType);
    if (!program) {
      throw new Error(`Failed to use shader "${this.shaderType}" for particle rendering`);
    }

    const defaultSize = this.config.size;

    // Update position buffer
    const vertices = new Float32Array(particles.flatMap((p) => [p.x, p.y]));
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);
    this.gl.enableVertexAttribArray(program.attributes.position);
    this.gl.vertexAttribPointer(program.attributes.position, 2, this.gl.FLOAT, false, 0, 0);

    // Extract individual sizes into a Float32Array
    const sizes = new Float32Array(particles.map((p) => Math.max(1.0, p.size || defaultSize)));

    // Send size data to GPU
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.DYNAMIC_DRAW);
    this.gl.enableVertexAttribArray(program.attributes.size);
    this.gl.vertexAttribPointer(program.attributes.size, 1, this.gl.FLOAT, false, 0, 0);
    // Explicitly set divisor to 0 for non-instanced attribute
    this.gl.vertexAttribDivisor(program.attributes.size, 0);

    // Enable blending for transparent particles
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Create color with opacity
    const finalColor = [...this.config.color];
    finalColor[3] = this.particleOpacity;

    // // Set particle color uniform with opacity
    this.gl.uniform4fv(program.uniforms.color, finalColor);

    // Draw the particles
    this.gl.drawArrays(this.gl.POINTS, 0, particles.length);

    // Cleanup GL state
    this.gl.disable(this.gl.BLEND);
    this.gl.disableVertexAttribArray(program.attributes.position);
    this.gl.disableVertexAttribArray(program.attributes.size);

    // --- START: Velocity Field Rendering ---
    if (this.showVelocityField && particles.length > 0) {
      const lineProgram = this.shaderManager.use('lines');
      if (!lineProgram) {
        console.error("Failed to use 'lines' shader for velocity field rendering");
      } else {
        const scale = 0.1; // Scale for velocity vectors
        const vertices = [];

        // Sample every nth particle to avoid too many arrows (optional, can be adjusted)
        // const stride = Math.max(1, Math.floor(particles.length / 1000));
        // for (let i = 0; i < particles.length; i += stride) {
        for (let i = 0; i < particles.length; i++) { // Render for all for now
          const p = particles[i];
          const x1 = p.x;
          const y1 = p.y;
          // NOTE: Original DebugRenderer had -p.vy. Assuming standard coordinate system now.
          const x2 = x1 + p.vx * scale;
          const y2 = y1 + p.vy * scale;
          vertices.push(x1, y1, x2, y2);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityLineBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.DYNAMIC_DRAW);

        this.gl.enableVertexAttribArray(lineProgram.attributes.position);
        this.gl.vertexAttribPointer(
          lineProgram.attributes.position,
          2,
          this.gl.FLOAT,
          false,
          0,
          0
        );

        this.gl.uniform4fv(lineProgram.uniforms.color, [1.0, 1.0, 0.0, 0.7]);
        this.gl.drawArrays(this.gl.LINES, 0, vertices.length / 2);
        this.gl.disableVertexAttribArray(lineProgram.attributes.position);
      }
    }
    // --- END: Velocity Field Rendering ---
  }

  dispose() {
    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }
    if (this.sizeBuffer) {
      this.gl.deleteBuffer(this.sizeBuffer);
      this.sizeBuffer = null;
    }
    // Add cleanup for velocity line buffer
    if (this.velocityLineBuffer) {
      this.gl.deleteBuffer(this.velocityLineBuffer);
      this.velocityLineBuffer = null;
    }
  }
}
