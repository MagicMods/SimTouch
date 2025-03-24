import { vsSource, fsSource } from "../shaders/basic.js";

export class BaseRenderer {
    constructor(gl) {
        this.gl = gl;
        this.programInfo = this.initShaderProgram();
    }

    initShaderProgram() {
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);

        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.error(
                "Unable to initialize the shader program:",
                this.gl.getProgramInfoLog(shaderProgram)
            );
            return null;
        }

        return {
            program: shaderProgram,
            attribLocations: {
                position: this.gl.getAttribLocation(shaderProgram, "aPosition"),
            },
            uniformLocations: {
                resolution: this.gl.getUniformLocation(shaderProgram, "uResolution"),
                color: this.gl.getUniformLocation(shaderProgram, "uColor"),
            },
        };
    }

    loadShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(
                "An error occurred compiling the shaders:",
                this.gl.getShaderInfoLog(shader)
            );
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    drawCircle(cx, cy, radius, color) {
        const numSegments = 100;
        const vertices = [];
        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * 2 * Math.PI;
            vertices.push(
                cx + radius * Math.cos(angle),
                cy + radius * Math.sin(angle)
            );
        }

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(vertices),
            this.gl.STATIC_DRAW
        );

        this.gl.vertexAttribPointer(
            this.programInfo.attribLocations.position,
            2,
            this.gl.FLOAT,
            false,
            0,
            0
        );
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        this.gl.uniform4fv(this.programInfo.uniformLocations.color, color);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);
    }

    drawRectangle(x, y, width, height, color) {
        const vertices = [
            x,
            y,
            x + width,
            y,
            x,
            y + height,
            x,
            y + height,
            x + width,
            y,
            x + width,
            y + height,
        ];

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(vertices),
            this.gl.STATIC_DRAW
        );

        this.gl.vertexAttribPointer(
            this.programInfo.attribLocations.position,
            2,
            this.gl.FLOAT,
            false,
            0,
            0
        );
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.position);
        this.gl.uniform4fv(this.programInfo.uniformLocations.color, color);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
} 