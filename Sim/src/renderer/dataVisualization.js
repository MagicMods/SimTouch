import * as mat4 from "gl-matrix/mat4.js";
import { ShaderManager } from "../shader/shaderManager.js";
import { debugManager } from '../util/debugManager.js';
export class DataVisualization {
    constructor(container, main) {
        this.main = main;
        this.canvas = document.createElement("canvas");
        this.canvas.className = "data-visualization";

        container.appendChild(this.canvas);

        // Get WebGL context and extensions
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.error("DataVisualization: WebGL not supported or context creation failed!");
            // Potentially disable this component or throw an error
            return;
        }

        this.ext = this.gl.getExtension('ANGLE_instanced_arrays');
        if (!this.ext) {
            console.error("DataVisualization: Instancing extension (ANGLE_instanced_arrays) not supported!");
            // Fallback or disable
            return;
        }

        // Get VAO Extension
        this.vaoExt = this.gl.getExtension('OES_vertex_array_object');
        if (!this.vaoExt) {
            console.error("DataVisualization: VAO extension (OES_vertex_array_object) not supported!");
            // Fallback or disable
            return;
        }

        // Create its own ShaderManager using its own context
        this.shaderManager = new ShaderManager(this.gl);

        // Initialize storage for instance data
        this.instanceData = { matrices: null, colors: null, count: 0 };

        // Projection matrix for orthographic view
        this.projectionMatrix = mat4.create();

        // Initial visibility state
        this.isVisible = false;
        this.canvas.style.display = 'none';
    }

    get db() {
        return debugManager.get('dataViz');
    }

    async init() {
        if (!this.gl || !this.shaderManager) {
            console.error("DataVisualization cannot init: GL context or ShaderManager missing.");
            return false;
        }
        try {
            await this.shaderManager.init();
            this._initWebGLResources();
            if (this.db) console.log("DataVisualization initialized successfully.");
            return true;
        } catch (error) {
            console.error("DataVisualization failed to initialize:", error);
            return false;
        }
    }

    _initWebGLResources() {
        const gl = this.gl;
        const ext = this.ext;

        // 1. Define Base Quad (0,0 to 1,1) -> 2 triangles
        const vertices = new Float32Array([
            0, 0, // bottom-left
            1, 0, // bottom-right
            0, 1, // top-left
            0, 1, // top-left
            1, 0, // bottom-right
            1, 1, // top-right
        ]);

        this.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // 2. Create Instance VBOs (matrices, colors) - Dynamic
        this.matrixVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixVBO);
        gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW); // Initialize size 0

        this.colorVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVBO);
        gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW); // Initialize size 0

        // 3. Create and Bind VAO
        this.vao = this.vaoExt.createVertexArrayOES(); // Use VAO extension
        this.vaoExt.bindVertexArrayOES(this.vao);     // Use VAO extension

        // 4. Get Shader Program (ensure it's loaded by ShaderManager first)
        const programInfo = this.shaderManager.getProgram('barGraph');
        if (!programInfo) {
            console.error("DataVisualization: 'barGraph' shader program not found in ShaderManager.");
            this.vaoExt.bindVertexArrayOES(null); // Use VAO extension
            return;
        }

        const positionAttribLocation = programInfo.attributes.position;
        const instanceMatrixAttribLocation = programInfo.attributes.instanceMatrix;
        const instanceColorAttribLocation = programInfo.attributes.instanceColor;

        // 5. Setup Attributes

        // Base Quad Position Attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.enableVertexAttribArray(positionAttribLocation);
        gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0); // 2 floats per vertex

        // Instance Color Attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVBO);
        gl.enableVertexAttribArray(instanceColorAttribLocation);
        gl.vertexAttribPointer(instanceColorAttribLocation, 4, gl.FLOAT, false, 0, 0); // 4 floats per color (RGBA)
        ext.vertexAttribDivisorANGLE(instanceColorAttribLocation, 1); // Advance 1 per instance

        // Instance Matrix Attribute (mat4 = 4 x vec4)
        const bytesPerMatrix = 4 * 16; // 16 floats * 4 bytes/float
        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixVBO);
        for (let i = 0; i < 4; ++i) {
            const loc = instanceMatrixAttribLocation + i;
            const offset = i * 16; // 4 floats per row/column * 4 bytes/float
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, offset);
            ext.vertexAttribDivisorANGLE(loc, 1); // Advance 1 matrix per instance
        }

        // 6. Unbind VAO and Buffers
        this.vaoExt.bindVertexArrayOES(null); // Use VAO extension
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    updateData(byteArray) {
        if (this.db) console.log('Context Lost Check (updateData):', this.gl.isContextLost());
        const gl = this.gl;
        if (!gl || !this.ext || !this.vaoExt || !this.vao) return; // Not initialized properly

        if (!byteArray) {
            this.instanceData.count = 0;
            if (this.db) console.log('No byteArray');
            this.draw();
            return;
        }

        // Check if it's NOT a standard array AND NOT a TypedArray
        if (!(Array.isArray(byteArray) || ArrayBuffer.isView(byteArray))) {
            this.instanceData.count = 0;
            if (this.db) console.log('Data is not an Array or TypedArray');
            this.draw();
            return;
        }

        const numBars = byteArray.length;
        this.instanceData.count = numBars;

        if (numBars === 0) {
            this.draw();
            return;
        }

        // Update projection matrix based on current canvas dimensions
        // Maps drawing coordinates (0, width) -> (-1, 1) and (0, height) -> (-1, 1)
        mat4.ortho(this.projectionMatrix, 0, this.canvas.width, 0, this.canvas.height, -1, 1);

        const barPadding = 1; // Desired padding between bars
        const paddingX = 10;   // Padding on left/right edges
        const paddingY = 10;   // Padding on top/bottom edges

        const effectiveWidth = Math.max(0, this.canvas.width - 2 * paddingX);
        const effectiveHeight = Math.max(0, this.canvas.height - 2 * paddingY);

        // Calculate required padding and adjust if it exceeds available space
        const requiredTotalPaddingWidth = Math.max(0, (numBars - 1) * barPadding);
        const actualTotalPaddingWidth = (requiredTotalPaddingWidth >= effectiveWidth && numBars > 1) ? 0 : requiredTotalPaddingWidth;
        const actualBarPadding = (numBars > 1) ? actualTotalPaddingWidth / (numBars - 1) : 0;

        const totalBarAreaWidth = Math.max(0, effectiveWidth - actualTotalPaddingWidth); // Width available for bars within padded area
        const actualBarWidth = (numBars > 0) ? totalBarAreaWidth / numBars : 0; // Width of each bar (allow sub-pixel)

        // Allocate typed arrays for instance data
        const matrices = new Float32Array(numBars * 16);
        const colors = new Float32Array(numBars * 4);

        for (let i = 0; i < numBars; i++) {
            const byteValue = byteArray[i];
            // Scale byte value (0-100) to effective height
            const barHeight = Math.max(0, (byteValue / 100) * effectiveHeight);
            const xPos = paddingX + i * (actualBarWidth + actualBarPadding); // Calculate X position using actual padding
            const yPos = paddingY; // Y position starts at the bottom edge padding

            // Calculate model matrix (scale and translate the base quad)
            const modelMatrix = mat4.create();
            // Translate first to position the origin at (xPos, yPos)
            mat4.translate(modelMatrix, modelMatrix, [xPos, yPos, 0]);
            // Then scale the (0,0) to (1,1) quad
            mat4.scale(modelMatrix, modelMatrix, [actualBarWidth, barHeight, 1]);

            // Calculate final instance matrix (Projection * Model)
            const instanceMatrix = mat4.create();
            mat4.multiply(instanceMatrix, this.projectionMatrix, modelMatrix);

            // Set matrix data in the array
            matrices.set(instanceMatrix, i * 16);

            // Set color data (e.g., white)
            colors.set([1.0, 1.0, 1.0, 0.8], i * 4);
        }

        // Store and upload data to VBOs
        this.instanceData.matrices = matrices;
        this.instanceData.colors = colors;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.matrices, gl.DYNAMIC_DRAW);
        if (this.db) console.log('GL Error [after matrix upload]:', gl.getError());

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.colors, gl.DYNAMIC_DRAW);
        if (this.db) console.log('GL Error [after color upload]:', gl.getError());

        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.draw();
    }

    draw() {
        if (!this.isVisible) return;

        if (this.db) console.log('Context Lost Check (draw):', this.gl.isContextLost());
        const gl = this.gl;
        const ext = this.ext;
        if (!gl || !ext || !this.vaoExt || !this.vao || !this.shaderManager) return; // Ensure initialized

        // Basic GL setup
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Red background for debugging
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Check if there are instances to draw
        // if (!this.instanceData || this.instanceData.count === 0) {
        //     return; // Nothing to draw
        // }

        // Use the barGraph shader program
        const programInfo = this.shaderManager.use('barGraph');
        if (this.db) console.log('Returned programInfo:', programInfo);
        if (this.db) console.log('Returned programInfo.program:', programInfo?.program);
        if (!programInfo || !programInfo.program) {
            console.error("Failed to get valid program object from shaderManager.use");
            return;
        }
        const linkStatus = gl.getProgramParameter(programInfo.program, gl.LINK_STATUS);
        if (this.db) console.log(`Program [${'barGraph'}] Link Status:`, linkStatus);
        if (!linkStatus) {
            console.error('Shader program linking failed:', gl.getProgramInfoLog(programInfo.program));
            return;
        }
        if (this.db) console.log('GL Error [after shader use]:', gl.getError());
        if (this.db) console.log('GL Active Program Before VAO Bind:', gl.getParameter(gl.CURRENT_PROGRAM));

        // Bind the VAO containing all attribute configurations
        this.vaoExt.bindVertexArrayOES(this.vao); // Use VAO extension
        if (this.db) console.log('GL Error [after VAO bind]:', gl.getError());

        // Perform the instanced draw call
        // Draw 6 vertices (2 triangles) per instance
        if (this.db) console.log('Drawing instances:', this.instanceData.count);
        if (this.db) console.log('Actual GL Active Program Before Draw:', gl.getParameter(gl.CURRENT_PROGRAM));
        ext.drawArraysInstancedANGLE(
            gl.TRIANGLES,
            0, // offset
            6, // vertex count per instance (for the base quad)
            this.instanceData.count // number of instances
        );
        if (this.db) console.log('GL Error [after draw call]:', gl.getError());

        // Unbind VAO
        this.vaoExt.bindVertexArrayOES(null); // Use VAO extension
        if (this.db) console.log('GL Error [after VAO unbind]:', gl.getError());
    }



    showDataViz(doShow) {
        if (doShow) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        if (!this.canvas) return;
        this.isVisible = true;
        this.canvas.style.display = 'block';
        this.draw(); // Draw initial state if possible
    }

    hide() {
        if (!this.canvas) return;
        this.isVisible = false;
        this.canvas.style.display = 'none';
    }
    // --- End show/hide methods ---

    // Optional: Cleanup resources
    dispose() {
        const gl = this.gl;
        if (!gl) return;

        gl.deleteBuffer(this.quadVBO);
        gl.deleteBuffer(this.matrixVBO);
        gl.deleteBuffer(this.colorVBO);

        // Use VAO extension for check and deletion
        if (this.vaoExt && this.vao) {
            this.vaoExt.deleteVertexArrayOES(this.vao);
        }
        // Dispose internal shader manager
        if (this.shaderManager) {
            this.shaderManager.dispose();
        }
    }
}