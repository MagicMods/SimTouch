import GUI from "lil-gui";
import { GridGenRenderer } from "./renderer/gridGenRenderer.js";

// Initialize WebGL context with stencil buffer
const canvas = document.getElementById("myCanvas");
const gl = canvas.getContext("webgl", { stencil: true });

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
    scale: 0.978,
    cols: 0,
    rows: 0,
    width: 0,
    height: 0,
    allowCut: 1,            // 0-3: Controls how many corners can be outside the circle
    displayMode: 'masked',  // Default to masked view
    showIndices: false,     // Show cell indices
    showCellCounts: true,   // Enable cell counts by default
    cellCount: {
        total: 0,
        inside: 0,
        boundary: 0
    }
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
    .add(params, "scale", 0.8, 1.1, 0.001)
    .name("Grid Scale")
    .onChange(() => renderer.updateGrid(params));
gridFolder
    .add(params, "allowCut", 0, 3, 1)
    .name("Allow Cut")
    .onChange(() => renderer.updateGrid(params));

const displayFolder = gui.addFolder('Display');
displayFolder
    .add(params, "displayMode", ['all', 'inside', 'boundary', 'masked'])
    .name("Display Mode")
    .onChange(() => renderer.updateGrid(params));
displayFolder
    .add(params, "showIndices")
    .name("Show Indices")
    .onChange(() => renderer.updateGrid(params));
displayFolder
    .add(params, "showCellCounts")
    .name("Show Cell Counts")
    .onChange(() => renderer.updateGrid(params));

const infoFolder = gui.addFolder('Grid Info');
infoFolder.add(params, "cols").name("Columns").listen();
infoFolder.add(params, "rows").name("Rows").listen();
infoFolder.add(params, "width").name("Rect Width").listen();
infoFolder.add(params, "height").name("Rect Height").listen();
infoFolder.add(params.cellCount, "total").name("Total Cells").listen();
infoFolder.add(params.cellCount, "inside").name("Inside Cells").listen();
infoFolder.add(params.cellCount, "boundary").name("Boundary Cells").listen();

// Initial render
renderer.updateGrid(params); 