import { CircularBoundaryShape } from "./boundary/circularBoundaryShape.js"; // Needed for instanceof checks
import { RectangularBoundaryShape } from "./boundary/rectangularBoundaryShape.js"; // Needed for instanceof checks

export class GridGeometry {
  constructor() {
    this.rectangles = [];
    this.geomParams = {}; // Stores cols, rows, cell dimensions (visual and physical)
  }

  generate(gridParams, boundary, dimensions) {
    if (!boundary) {
      console.error("Cannot generate grid geometry: Boundary is missing.");
      this.rectangles = [];
      this.geomParams = {};
      return;
    }
    if (!dimensions) {
      console.error("GridGeometry.generate: dimensions object is missing.");
      this.rectangles = [];
      this.geomParams = {};
      return;
    }

    let bestRects = [];
    let calculatedGridParams = {}; // Local object to store results

    // Get the base center position (without offset) from the boundary
    const center = boundary.getCenter();
    const centerX = center.x;
    const centerY = center.y;
    // Store offsets separately to apply to cell positions only
    const offsetX = gridParams.gridSpecs.centerOffsetX || 0;
    const offsetY = gridParams.gridSpecs.centerOffsetY || 0;

    // Log center position used for grid generation
    console.debug("Grid geometry generation using:", {
      boundaryCenter: { x: centerX, y: centerY },
      offsets: { x: offsetX, y: offsetY },
    });

    // Get render scale from DimensionManager
    const renderScale = dimensions.renderScale;
    const physicalWidth = dimensions.physicalWidth;
    const physicalHeight = dimensions.physicalHeight;

    // Use boundary radius if circular, otherwise use boundary render dimensions
    const boundaryRadius = boundary instanceof CircularBoundaryShape ? boundary.getRadius() : null;
    const boundaryRenderWidth = boundary instanceof RectangularBoundaryShape ? boundary.width : null;
    const boundaryRenderHeight = boundary instanceof RectangularBoundaryShape ? boundary.height : null;

    // Determine allowCut value (now from gridSpecs)
    const allowCutConfig = gridParams.gridSpecs.allowCut !== undefined ? gridParams.gridSpecs.allowCut : 1;

    // Calculate maximum cell height based on physical dimensions
    const baseScreenSize = 240; // Reference screen size
    const physicalScaleFactor = Math.min(physicalWidth, physicalHeight) / baseScreenSize;
    const startCellHeight = Math.max(20, Math.round(60 * physicalScaleFactor));

    // Scale the maximum cell height to the canvas dimensions for visual consistency
    const maxVisualCellHeight = Math.max(30, Math.round(startCellHeight * renderScale));

    // Debug output to help diagnose issues
    console.debug("Grid Geometry Calculations:", {
      physicalWidth: physicalWidth,
      physicalHeight: physicalHeight,
      renderScale: renderScale,
      startCellHeight: startCellHeight,
      maxVisualCellHeight: maxVisualCellHeight,
      boundaryMode: allowCutConfig,
      allowCut: allowCutConfig,
    });

    // Store the best physical cell dimensions
    let bestPhysicalCellW = 0;
    let bestPhysicalCellH = 0;
    let bestVisualCellW = 0;
    let bestVisualCellH = 0;
    let bestCols = 0;
    let bestRows = 0;
    // --- Plan Step 1: Initialize Tracking Variables ---
    let bestStepX = 0;
    let bestStepY = 0;
    let bestValidCount = 0;
    let targetFound = false;

    // --- Plan Step 3: Remove Old Tracking ---
    // let bestRects = []; // Removed

    // --- Phase 1: Parameter Search ---
    for (let cellH = maxVisualCellHeight; cellH >= 6; cellH--) {
      // Convert visual cell height back to physical-relative size for calculations
      const physicalCellH = Math.max(1, Math.round(cellH / renderScale));

      // Apply user's scale factor to the physical-relative size
      const scaledH = Math.max(1, Math.round(physicalCellH * gridParams.gridSpecs.scale)); // Physical cell H
      const scaledW = Math.max(1, Math.round(gridParams.gridSpecs.aspectRatio * scaledH)); // Physical cell W

      // Scale back to visual dimensions for rendering
      const visualScaledH = Math.max(6, Math.round(scaledH * renderScale)); // Visual cell H
      const visualScaledW = Math.max(6, Math.round(scaledW * renderScale)); // Visual cell W

      // Calculate the corresponding PHYSICAL cell height based on renderScale
      const physicalCellH_ = visualScaledH / renderScale;
      // Calculate the PHYSICAL cell width based on physical height and aspect ratio (from gridSpecs)
      const scaledW_ = Math.max(1, Math.round(physicalCellH_ * gridParams.gridSpecs.scale)); // Physical cell W
      const scaledH_ = Math.max(1, Math.round(gridParams.gridSpecs.aspectRatio * scaledW_)); // Physical cell H

      // Scale back to visual dimensions for rendering
      const visualScaledW_ = Math.max(6, Math.round(scaledW_ * renderScale)); // Visual cell W
      const visualScaledH_ = Math.max(6, Math.round(scaledH_ * renderScale)); // Visual cell H

      // Calculate step distance including gap (from gridSpecs)
      const stepX = visualScaledW_ + gridParams.gridSpecs.gap; // Updated path
      const stepY = visualScaledH_ + gridParams.gridSpecs.gap; // Updated path

      if (stepX <= 0 || stepY <= 0) {
        console.warn("Skipping grid calculation due to zero or negative step size", { stepX, stepY });
        continue;
      }

      let maxCols = 0,
        maxRows = 0;

      // Calculate grid size based on boundary type using RENDER dimensions
      if (boundary instanceof CircularBoundaryShape) {
        // Use boundaryRadius (render space), adjusted by the grid scale parameter
        const scaledBoundaryRadius = boundaryRadius * gridParams.gridSpecs.scale; // Apply scale here
        while (((maxCols * 2 + 1) * stepX) / 2 <= scaledBoundaryRadius + stepX / 2)
          // Use scaled radius
          maxCols++;
        while (((maxRows * 2 + 1) * stepY) / 2 <= scaledBoundaryRadius + stepY / 2)
          // Use scaled radius
          maxRows++;
      } else if (boundary instanceof RectangularBoundaryShape) {
        // Use boundaryRenderWidth/Height (render space)
        const halfWidth = (boundaryRenderWidth * gridParams.gridSpecs.scale) / 2; // Apply scale to boundary size
        const halfHeight = (boundaryRenderHeight * gridParams.gridSpecs.scale) / 2;
        while (((maxCols * 2 + 1) * stepX) / 2 <= halfWidth + stepX / 2) maxCols++;
        while (((maxRows * 2 + 1) * stepY) / 2 <= halfHeight + stepY / 2) maxRows++;
      }

      // Determine start and end indices for cell placement (symmetric)
      let startCol = -maxCols;
      let endCol = maxCols;
      let startRow = -maxRows;
      let endRow = maxRows;

      const cols = endCol - startCol + 1;
      const rows = endRow - startRow + 1;

      // --- Plan Step 2.1: Initialize Counter ---
      let currentValidCount = 0;
      // --- Plan Step 2.2: Remove Old Array Init ---
      // const rectangles = []; // Removed

      // Create cells using row-by-row indexing
      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const dx = c * stepX;
          const dy = r * stepY;

          // Apply grid center offset to cell positions only
          const cellCenterX = centerX + dx + offsetX;
          const cellCenterY = centerY + dy + offsetY;

          // Cell corners (in render space)
          const left = cellCenterX - visualScaledW_ / 2;
          const right = cellCenterX + visualScaledW_ / 2;
          const top = cellCenterY - visualScaledH_ / 2;
          const bottom = cellCenterY + visualScaledH_ / 2;

          // Check if cell center is inside the boundary (using boundary center without offset)
          const cellRelativeToCenter = {
            x: cellCenterX - offsetX,
            y: cellCenterY - offsetY,
          };
          const centerInside = boundary.isPointInside(cellRelativeToCenter.x, cellRelativeToCenter.y);

          // Check corners for partial cells if allowing cuts
          let cornersOutside = 0;
          let cornersInside = 4; // Assume all inside initially

          // Calculate cornersInside/cornersOutside regardless of mode first
          const corners = [
            { x: left - offsetX, y: top - offsetY },
            { x: right - offsetX, y: top - offsetY },
            { x: right - offsetX, y: bottom - offsetY },
            { x: left - offsetX, y: bottom - offsetY },
          ];
          cornersInside = corners.filter((corner) => boundary.isPointInside(corner.x, corner.y)).length;
          cornersOutside = 4 - cornersInside;

          // --- Revised includeCell Logic (Simpler) ---
          let includeCell = false;
          const allowCut = gridParams.gridSpecs.allowCut; // Use directly

          if (allowCut === 0) {
            includeCell = cornersInside === 4;
          } else if (allowCut === 1) {
            includeCell = cornersInside >= 3;
          } else if (allowCut === 2) {
            includeCell = cornersInside >= 2;
          } else {
            // allowCut >= 3
            includeCell = cornersInside >= 1; // Any corner inside means overlap
          }
          // --- End Revised includeCell Logic ---

          if (includeCell) {
            // --- Plan Step 2.3: Replace push with increment ---
            currentValidCount++;

            // --- Plan Step 2.4: Add Target Found Logic ---
            if (gridParams.gridSpecs.targetCellCount && currentValidCount >= gridParams.gridSpecs.targetCellCount && !targetFound) {
              let isValidTarget = true;
              // Check validity for allowCut=0: the cell making us hit the target must be valid
              if (gridParams.gridSpecs.allowCut === 0 && cornersInside !== 4) {
                isValidTarget = false;
                console.debug(`Target count met, but cell not valid for allowCut=0 (cellH: ${cellH}). Skipping.`);
              }

              if (isValidTarget) {
                // console.info(`Found target solution params at cellH: ${cellH} with count: ${currentValidCount}`);
                bestPhysicalCellW = scaledW_;
                bestPhysicalCellH = scaledH_;
                bestVisualCellW = visualScaledW_;
                bestVisualCellH = visualScaledH_;
                bestCols = cols; // Store cols/rows calculated for this cellH
                bestRows = rows;
                bestStepX = stepX;
                bestStepY = stepY;
                bestValidCount = currentValidCount; // Store the count achieved
                targetFound = true;
                break; // Exit inner 'r' loop
              }
            }
            // --- Original rectData creation removed from here ---
          }
        } // end rows loop
        // --- Plan Step 2.5: Break 'c' loop if target found ---
        if (targetFound) break;
      } // end cols loop

      // --- Plan Step 2.6: Break 'cellH' loop if target found ---
      if (targetFound) break;

      // --- Plan Step 2.7: Update Best Fit Logic ---
      // If not targetCellCount-based, or target not met yet, track the best size achieved
      if (!targetFound && currentValidCount > bestValidCount) {
        // For non-target search, we accept any valid grid according to allowCut
        // No extra allowCut=0 check needed here, as individual cells already passed includeCell
        // console.debug(`New best rectangle count: ${currentValidCount} at cellH: ${cellH}`);
        // bestRects = []; // Placeholder cleared - not used anymore
        bestPhysicalCellW = scaledW_;
        bestPhysicalCellH = scaledH_;
        bestVisualCellW = visualScaledW_;
        bestVisualCellH = visualScaledH_;
        bestCols = cols;
        bestRows = rows;
        bestStepX = stepX;
        bestStepY = stepY;
        bestValidCount = currentValidCount;
      }
      // --- Old bestRects length check removed ---
    } // end cellH loop (End of Phase 1)

    // --- Phase 2: Grid Filling ---

    // --- Plan Step 4.1: Check if valid params found ---
    if (bestVisualCellW <= 0) {
      console.warn("GridGeometry: No valid grid parameters found.");
      this.rectangles = [];
      this.geomParams = {};
      return [];
    }

    // --- Plan Step 4.2: Initialize final array ---
    this.rectangles = [];

    // --- Plan Step 4.3: Determine final extent ---
    let finalMaxCols = 0,
      finalMaxRows = 0;
    const finalBoundaryRadius =
      boundary instanceof CircularBoundaryShape
        ? boundary.getRadius() * gridParams.gridSpecs.scale // Use radius * scale
        : null;
    const finalBoundaryWidth =
      boundary instanceof RectangularBoundaryShape
        ? boundaryRenderWidth * gridParams.gridSpecs.scale // Use width * scale
        : null;
    const finalBoundaryHeight =
      boundary instanceof RectangularBoundaryShape
        ? boundaryRenderHeight * gridParams.gridSpecs.scale // Use height * scale
        : null;

    if (boundary instanceof CircularBoundaryShape) {
      while (((finalMaxCols * 2 + 1) * bestStepX) / 2 <= finalBoundaryRadius + bestStepX / 2) finalMaxCols++;
      while (((finalMaxRows * 2 + 1) * bestStepY) / 2 <= finalBoundaryRadius + bestStepY / 2) finalMaxRows++;
    } else if (boundary instanceof RectangularBoundaryShape) {
      while (((finalMaxCols * 2 + 1) * bestStepX) / 2 <= finalBoundaryWidth / 2 + bestStepX / 2) finalMaxCols++;
      while (((finalMaxRows * 2 + 1) * bestStepY) / 2 <= finalBoundaryHeight / 2 + bestStepY / 2) finalMaxRows++;
    }
    const finalStartCol = -finalMaxCols;
    const finalEndCol = finalMaxCols;
    const finalStartRow = -finalMaxRows;
    const finalEndRow = finalMaxRows;

    // --- Plan Step 4.4: Add nested loops ---
    for (let c = finalStartCol; c <= finalEndCol; c++) {
      for (let r = finalStartRow; r <= finalEndRow; r++) {
        // --- Plan Step 4.5: Recalculate cell position ---
        const dx = c * bestStepX;
        const dy = r * bestStepY;

        // Apply grid center offset to cell positions only
        const cellCenterX = centerX + dx + offsetX;
        const cellCenterY = centerY + dy + offsetY;

        // Cell corners (in render space) using BEST dimensions
        const left = cellCenterX - bestVisualCellW / 2;
        const right = cellCenterX + bestVisualCellW / 2;
        const top = cellCenterY - bestVisualCellH / 2;
        const bottom = cellCenterY + bestVisualCellH / 2;

        // --- Plan Step 4.6: Perform includeCell check ---
        // Check if cell center is inside the boundary (using boundary center without offset)
        const cellRelativeToCenter = {
          x: cellCenterX - offsetX,
          y: cellCenterY - offsetY,
        };
        const centerInside = boundary.isPointInside(cellRelativeToCenter.x, cellRelativeToCenter.y);

        // Check corners for partial cells if allowing cuts
        let cornersOutside = 0;
        let cornersInside = 4; // Assume all inside initially

        // Calculate cornersInside/cornersOutside regardless of mode first
        const corners = [
          { x: left - offsetX, y: top - offsetY },
          { x: right - offsetX, y: top - offsetY },
          { x: right - offsetX, y: bottom - offsetY },
          { x: left - offsetX, y: bottom - offsetY },
        ];
        cornersInside = corners.filter((corner) => boundary.isPointInside(corner.x, corner.y)).length;
        cornersOutside = 4 - cornersInside;

        // Revised includeCell Logic (Simpler)
        let includeCell = false;
        const allowCut = gridParams.gridSpecs.allowCut; // Use directly

        if (allowCut === 0) {
          includeCell = cornersInside === 4;
        } else if (allowCut === 1) {
          includeCell = cornersInside >= 3;
        } else if (allowCut === 2) {
          includeCell = cornersInside >= 2;
        } else {
          // allowCut >= 3
          includeCell = cornersInside >= 1; // Any corner inside means overlap
        }

        // --- Plan Step 4.7: Create rectData if included ---
        if (includeCell) {
          const rectData = {
            x: Math.round(left), // Render position (left)
            y: Math.round(top), // Render position (top)
            width: bestVisualCellW, // Use BEST render width (No underscore)
            height: bestVisualCellH, // Use BEST render height (No underscore)
            physicalWidth: bestPhysicalCellW, // Use BEST physical width
            physicalHeight: bestPhysicalCellH, // Use BEST physical height
            cornersOutside: cornersOutside,
            cornersInside: cornersInside,
            xOffset: offsetX,
            yOffset: offsetY,
          };
          this.rectangles.push(rectData);
        }
      } // end rows loop
    } // end cols loop (End of Phase 2)

    // --- Plan Step 5.1: Remove Old Finalization Block ---
    // Block starting "// --- After the cellH loop ends ---" is removed

    // --- Plan Step 5.2: Set final geometry parameters ---
    this.geomParams = {
      cols: bestCols, // Store cols/rows from the best parameter set found
      rows: bestRows,
      width: bestVisualCellW,
      height: bestVisualCellH,
      physicalWidth: bestPhysicalCellW,
      physicalHeight: bestPhysicalCellH,
    };

    // --- Plan Step 5.3: Update final logging ---
    console.info(`Generated final grid with ${this.rectangles.length} cells using optimal parameters. Target: ${gridParams.gridSpecs.targetCellCount || "N/A"}`, this.geomParams);

    console.debug("Final Grid Geometry:", {
      rectanglesCount: this.rectangles.length,
      gridParams: this.geomParams, // Use the stored final params
    });

    console.debug(`Stored ${this.rectangles.length} final rectangles.`);
    // --- Plan Step 5.4: Ensure return ---
    return this.rectangles;
  }

  getGeometry() {
    return {
      rectangles: this.rectangles,
      gridParams: this.geomParams,
    };
  }
}
