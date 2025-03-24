import GUI from "lil-gui";
import { GridGenRenderer } from "./renderer/gridGenRenderer.js";

// Initialize WebGL context
const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    console.error("WebGL not supported");
}

// Initialize renderer
const renderer = new GridGenRenderer(gl);

// Enhanced parameters
const params = {
    target: 341,
    gap: 1,
    aspectRatio: 1,
    scale: 0.95,
    cols: 0,
    rows: 0,
    width: 0,
    height: 0,
};

// Enhanced UI controls
const gui = new GUI();
gui
    .add(params, "target", 1, 500, 1)
    .name("Target Rect")
    .onChange(() => renderer.updateGrid(params));
gui
    .add(params, "gap", 0, 20, 1)
    .name("Gap (px)")
    .onChange(() => renderer.updateGrid(params));
gui
    .add(params, "aspectRatio", 0.5, 2, 0.01)
    .name("Aspect Ratio")
    .onChange(() => renderer.updateGrid(params));
gui
    .add(params, "scale", 0.1, 1, 0.001)
    .name("Grid Scale")
    .onChange(() => renderer.updateGrid(params));
gui.add(params, "cols").name("Columns").listen();
gui.add(params, "rows").name("Rows").listen();
gui.add(params, "width").name("Rect Width").listen();
gui.add(params, "height").name("Rect Height").listen();

// Initial render
renderer.updateGrid(params); 