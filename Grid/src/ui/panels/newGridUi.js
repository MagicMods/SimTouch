import { BaseUi } from "../baseUi.js";

// Define available screen types
const SCREEN_TYPES = {
  "240x240 Rnd": { width: 240, height: 240, shape: "circular" },
  "480x480 Rnd": { width: 480, height: 480, shape: "circular" },
  "170x320 Rect": { width: 170, height: 320, shape: "rectangular" },
  "320x170 Rect": { width: 320, height: 170, shape: "rectangular" },
  // Add more predefined types here as needed
};

export class NewGridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);

    try {
      this.gui.title("Grid");

      let initialScreenTypeName = Object.keys(SCREEN_TYPES)[0];

      if (this.main.gridParams.screen) {
        const initialScreen = this.main.gridParams.screen;
        const foundName = Object.keys(SCREEN_TYPES).find((name) => {
          const type = SCREEN_TYPES[name];
          return type.width === initialScreen.width && type.height === initialScreen.height && type.shape === initialScreen.shape;
        });

        if (foundName) initialScreenTypeName = foundName;
      }
      this.uiState = { selectedScreen: initialScreenTypeName };

      this.initGridControls();

      this.gui.open(true);
    } catch (error) {
      console.error("Error initializing GridUi:", error);
    }
  }

  // Initialize grid configuration controls
  initGridControls() {
    const gridRender = this.main.gridRender;
    if (!gridRender) return;

    // Create main folders in a logical hierarchy
    const screenFolder = this.gui.addFolder("Screen Configuration");
    const gridParamFolder = this.gui.addFolder("Grid Parameters");
    const statsFolder = this.gui.addFolder("Grid Statistics");
    const displayFolder = this.gui.addFolder("Display Options");
    const shadowFolder = this.gui.addFolder("Shadow");
    displayFolder.open(false);

    // --- SCREEN CONFIGURATION ---

    this.screenTypeController = screenFolder
      .add(this.uiState, "selectedScreen", Object.keys(SCREEN_TYPES))
      .name("Screen Type")
      .onChange((value) => {
        const selectedSpec = SCREEN_TYPES[value];
        if (!selectedSpec) {
          console.error(`Selected screen type '${value}' not found in SCREEN_TYPES.`);
          return;
        }

        console.debug(`Screen type changed to: ${value}`, selectedSpec);

        this.main.gridParams.screen = { ...selectedSpec };
        this.main.setGridParams(this.main.gridParams);
      });
    this.screenTypeController.domElement.classList.add("full-width");

    const offsetFolder = screenFolder.addFolder("Center Offset");

    this.centerOffsetXController = offsetFolder
      .add(this.main.gridParams.gridSpecs, "centerOffsetX", -100, 100, 1) // Updated path
      .name("X Offset")
      .onChange(() => {
        this.main.setGridParams(this.main.gridParams);
      });

    this.centerOffsetYController = offsetFolder
      .add(this.main.gridParams.gridSpecs, "centerOffsetY", -100, 100, 1) // Updated path
      .name("Y Offset")
      .onChange(() => {
        this.main.setGridParams(this.main.gridParams);
      });

    // --- GRID PARAMETERS ---

    const gridSpecs = this.main.gridParams.gridSpecs;

    const cellCountContainer = document.createElement("div");
    cellCountContainer.classList = "slider-cellCount-container";

    this.targetCellCountCellsController = gridParamFolder
      .add(gridSpecs, "targetCellCount", 1, 1000, 1) // Bind to gridSpecs.targetCellCount
      .name("TargetCells")
      .onChange(() => this.main.setGridParams(this.main.gridParams));
    this.targetCellCountCellsController.domElement.classList.add("slider-dual-input-slider");
    cellCountContainer.appendChild(this.targetCellCountCellsController.domElement);

    const totalCellsController = gridParamFolder.add(gridRender.grid, "cellCount").name("CellCount").listen();
    totalCellsController.domElement.classList.add("slider-dual-input-input");
    cellCountContainer.appendChild(totalCellsController.domElement);

    const cellsContainer = gridParamFolder.domElement.querySelector(".children");
    cellsContainer.appendChild(cellCountContainer);

    this.gapController = gridParamFolder
      .add(gridSpecs, "gap", 0, 20, 1) // Bind to gridSpecs.gap
      .name("Grid Gap")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    this.aspectRatioController = gridParamFolder
      .add(gridSpecs, "aspectRatio", 0.2, 5, 0.01) // Bind to gridSpecs.aspectRatio
      .name("Cell Ratio")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    this.scaleController = gridParamFolder
      .add(gridSpecs, "scale", 0.5, 1, 0.001) // Bind to gridSpecs.scale
      .name("Grid Scale")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    // Add allowCut parameter - Bind to gridSpecs.allowCut
    this.allowCutController = gridParamFolder
      .add(gridSpecs, "allowCut", 0, 3, 1) // Bind to gridSpecs.allowCut
      .name("Allow Cut")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    this.shadowIntensityController = shadowFolder
      .add(this.main.gridParams.shadow, "shadowIntensity", 0, 1, 0.01) // Bind to shadow.shadowIntensity
      .name("Intensity")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    this.shadowThresholdController = shadowFolder
      .add(this.main.gridParams.shadow, "shadowThreshold", 0, 0.5, 0.01) // Bind to shadow.shadowThreshold
      .name("Threshold")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    this.blurAmountController = shadowFolder
      .add(this.main.gridParams.shadow, "blurAmount", 0, 1, 0.01) // Bind to shadow.blurAmount
      .name("Blur")
      .onChange(() => this.main.setGridParams(this.main.gridParams));

    // --- DISPLAY OPTIONS ---

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "toggle-button-container";

    // Configuration for toggle buttons
    const toggleButtonsConfig = [
      { text: "Grid", flag: "showGridCells" },
      { text: "Centers", flag: "showCellCenters" },
      { text: "Indices", flag: "showIndices" },
      { text: "Boundary", flag: "showBoundary" },
    ];

    // Create buttons from config
    toggleButtonsConfig.forEach((config) => {
      const button = document.createElement("button");
      button.textContent = config.text;
      button.className = "toggle-button";
      button.dataset.flag = config.flag; // Store flag name on button

      // Set initial active state
      if (this.main.gridParams.flags[config.flag]) button.classList.add("active");

      // Add event listener
      button.addEventListener("click", (event) => {
        const clickedButton = event.currentTarget;
        const flagName = clickedButton.dataset.flag;

        this.main.gridParams.flags[flagName] = !this.main.gridParams.flags[flagName];

        this.main.setGridParams(this.main.gridParams);
        clickedButton.classList.toggle("active");
      });

      buttonContainer.appendChild(button);
    });

    // Add button container to the folder
    const buttonContainerChildren = displayFolder.domElement.querySelector(".children");
    buttonContainerChildren.insertBefore(buttonContainer, buttonContainerChildren.firstChild);

    // --- STATISTICS ---

    const statsFlexContainer = document.createElement("div");
    statsFlexContainer.classList = "flex-container";

    const colsController = statsFolder.add(gridRender.grid, "cols").name("Columns").listen();
    const rowsController = statsFolder.add(gridRender.grid, "rows").name("Rows").listen();
    const cellWidthController = statsFolder.add(gridRender.grid, "calculatedCellWidth").name("Cell pxW").listen();
    const cellHeightController = statsFolder.add(gridRender.grid, "calculatedCellHeight").name("Cell pxH").listen();
    const statsControllers = [colsController, rowsController, cellWidthController, cellHeightController];

    // Step 5: Iterate, style, and append controller elements
    statsControllers.forEach((controller) => {
      const element = controller.domElement;
      element.style.flexBasis = "calc(50% - 5px)"; // 2 columns, accounting for 10px gap
      statsFlexContainer.appendChild(element); // Move element to flex container
    });

    // Step 6: Append the flex container to the folder's element
    // Lil-gui folders have a specific structure, append to the '.children' div
    const childrenContainer = statsFolder.domElement.querySelector(".children");
    childrenContainer.appendChild(statsFlexContainer);
  }

  getControllers() {
    const targets = {};

    // Screen configuration controls
    if (this.screenTypeController) targets["Screen Type"] = this.screenTypeController;
    if (this.centerOffsetXController) targets["Center X Offset"] = this.centerOffsetXController;
    if (this.centerOffsetYController) targets["Center Y Offset"] = this.centerOffsetYController;

    // Grid controllers
    if (this.targetCellCountCellsController) targets["Target Cells"] = this.targetCellCountCellsController;
    if (this.gapController) targets["Grid Gap"] = this.gapController;
    if (this.aspectRatioController) targets["Cell Ratio"] = this.aspectRatioController;
    if (this.scaleController) targets["Grid Scale"] = this.scaleController;
    if (this.allowCutController) targets["Allow Cut"] = this.allowCutController;

    return targets;
  }

  updateControllerDisplays() {
    // Helper function to safely update controllers
    const safeUpdateDisplay = (controller) => {
      if (controller && typeof controller.updateDisplay === "function") {
        try {
          controller.updateDisplay();
        } catch (e) {
          console.warn("Error updating controller display:", controller.property, e);
        }
      }
    };

    // Update screen configuration controllers
    safeUpdateDisplay(this.screenTypeController);
    safeUpdateDisplay(this.centerOffsetXController);
    safeUpdateDisplay(this.centerOffsetYController);

    // Update grid controllers
    safeUpdateDisplay(this.targetCellCountCellsController);
    safeUpdateDisplay(this.gapController);
    safeUpdateDisplay(this.aspectRatioController);
    safeUpdateDisplay(this.scaleController);
    safeUpdateDisplay(this.allowCutController);

    // Update stats (listening controllers update automatically, but manual call ensures sync)
    safeUpdateDisplay(this.colsController);
    safeUpdateDisplay(this.rowsController);
    safeUpdateDisplay(this.cellWidthController);
    safeUpdateDisplay(this.cellHeightController);
    safeUpdateDisplay(this.totalCellsController);
  }
}
