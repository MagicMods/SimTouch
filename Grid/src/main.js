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
    showCenters: false,  // Show cell centers
    showIndices: false,  // Show cell indices
    showBoundary: false  // Highlight boundary cells
};

// Enhanced UI controls
const gui = new GUI();
const gridFolder = gui.addFolder('Grid Parameters');
gridFolder
    .add(params, "target", 1, 500, 1)
    .name("Target Rect")
    .onChange(() => renderer.updateGrid(params));
gridFolder
    .add(params, "gap", 0, 20, 1)
    .name("Gap (px)")
    .onChange(() => renderer.updateGrid(params));
gridFolder
    .add(params, "aspectRatio", 0.5, 2, 0.01)
    .name("Aspect Ratio")
    .onChange(() => renderer.updateGrid(params));
gridFolder
    .add(params, "scale", 0.1, 1, 0.001)
    .name("Grid Scale")
    .onChange(() => renderer.updateGrid(params));

const debugFolder = gui.addFolder('Debug');
debugFolder
    .add(params, "showCenters")
    .name("Show Centers")
    .onChange(() => renderer.updateGrid(params));
debugFolder
    .add(params, "showIndices")
    .name("Show Indices")
    .onChange(() => renderer.updateGrid(params));
debugFolder
    .add(params, "showBoundary")
    .name("Show Boundary")
    .onChange(() => renderer.updateGrid(params));

const infoFolder = gui.addFolder('Grid Info');
infoFolder.add(params, "cols").name("Columns").listen();
infoFolder.add(params, "rows").name("Rows").listen();
infoFolder.add(params, "width").name("Rect Width").listen();
infoFolder.add(params, "height").name("Rect Height").listen();

// Initial render
renderer.updateGrid(params); 