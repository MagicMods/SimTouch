import { BaseUi } from "../baseUi.js";
import { eventBus } from '../../util/eventManager.js';

// Define available screen types
const SCREEN_TYPES = {
  "240x240 Rnd": { width: 240, height: 240, shape: "circular" },
  "412x412 Rnd": { width: 412, height: 412, shape: "circular" },
  "360x360 Rnd": { width: 360, height: 360, shape: "circular" },
  "480x480 Rnd": { width: 480, height: 480, shape: "circular" },
  "72x420 Rect": { width: 72, height: 420, shape: "rectangular" },
  "170x320 Rect": { width: 170, height: 320, shape: "rectangular" },
  "172x320 Rect": { width: 172, height: 320, shape: "rectangular" },
  "240x280 Rect": { width: 240, height: 380, shape: "rectangular" },
  "320x170 Rect": { width: 320, height: 170, shape: "rectangular" },
  "368x448 Rect": { width: 368, height: 448, shape: "rectangular" },
  "480x480 Rect": { width: 480, height: 480, shape: "rectangular" },
  "800x480 Rect": { width: 800, height: 480, shape: "rectangular" },
  "1024x600 Rect": { width: 1024, height: 600, shape: "rectangular" },
  // Add more predefined types here as needed
};

export class GridUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.debug = this.main.debugFlags; // 

    try {
      this.gui.title("Grid");

      let initialScreenTypeName = Object.keys(SCREEN_TYPES)[0];
      let initialScreenSpec = SCREEN_TYPES[initialScreenTypeName];

      if (this.main.gridParams.screen) {
        const initialScreen = this.main.gridParams.screen;
        const foundName = Object.keys(SCREEN_TYPES).find((name) => {
          const type = SCREEN_TYPES[name];
          return type.width === initialScreen.width && type.height === initialScreen.height && type.shape === initialScreen.shape;
        });

        if (foundName) {
          initialScreenTypeName = foundName;
          initialScreenSpec = SCREEN_TYPES[initialScreenTypeName];
        }
      }

      // Initialize internal UI state with deep copies
      this.uiGridParams = {
        screen: { ...initialScreenSpec },
        gridSpecs: { ...main.gridParams.gridSpecs },
        shadow: { ...main.gridParams.shadow },
        flags: { ...main.gridParams.flags },
        renderSize: { ...main.gridParams.renderSize },
        colors: { ...main.gridParams.colors }
      };
      // Keep uiState separate for screen type dropdown
      this.uiState = { selectedScreen: initialScreenTypeName };


      this.initGridControls();

      this.gui.open(true);
    } catch (error) {
      console.error("Error initializing GridUi:", error);
    }
  }

  // Initialize grid configuration controls
  initGridControls() {
    const gridGenRenderer = this.main.gridGenRenderer;
    if (!gridGenRenderer) {
      console.error("NewGridUi: this.main.gridGenRenderer is not available. Cannot initialize controls.");
      return;
    }

    // Create main folders in a logical hierarchy
    const screenFolder = this.gui.addFolder("Screen Configuration");
    const gridParamFolder = this.gui.addFolder("Grid Parameters");
    const statsFolder = this.gui.addFolder("Grid Statistics");
    const displayFolder = this.gui.addFolder("Display Options");
    const shadowFolder = this.gui.addFolder("Shadow");
    displayFolder.open(false);



    const gradient = this.main.gridGenRenderer.gradient;

    // Add theme selector at the top level
    const presetOptions = {};
    gradient.getPresetNames().forEach((name) => {
      presetOptions[name] = name;
    });

    this.themeController = this.gui
      .add({ theme: gradient.getCurrentPreset() }, "theme", presetOptions)
      .name("Theme")
      .onChange((presetName) => {
        // Emit event to update central state
        eventBus.emit('gridChanged', { paramPath: 'colors.gradientPreset', value: presetName });
      });
    this.themeController.domElement.classList.add("full-width");


    // --- SCREEN CONFIGURATION ---

    const screenRezContainer = document.createElement("div");
    screenRezContainer.classList = "screenRez-container";
    screenFolder.domElement.appendChild(screenRezContainer);

    this.screenRezControllerWidth = screenFolder.add(this.uiGridParams.screen, "width").name("Screen Specs")
      .onChange((value) => { eventBus.emit('gridChanged', { paramPath: 'screen.width', value: value }); });
    this.screenRezControllerWidth.domElement.classList.add("left-input");
    screenRezContainer.appendChild(this.screenRezControllerWidth.domElement);

    this.screenRezControllerHeight = screenFolder.add(this.uiGridParams.screen, "height").name("X")
      .onChange((value) => { eventBus.emit('gridChanged', { paramPath: 'screen.height', value: value }); });
    this.screenRezControllerHeight.domElement.classList.add("right-input");
    screenRezContainer.appendChild(this.screenRezControllerHeight.domElement);

    this.screenShapeButton = document.createElement("button");
    this.screenShapeButton.classList = "screenShape-button";
    this.screenShapeButton.textContent = this.uiGridParams.screen.shape === "rectangular" ? "R" : "C";
    screenRezContainer.appendChild(this.screenShapeButton);

    this.screenShapeButton.addEventListener("click", () => {
      this.uiGridParams.screen.shape = this.uiGridParams.screen.shape === "rectangular" ? "circular" : "rectangular";
      eventBus.emit('gridChanged', { paramPath: 'screen.shape', value: this.uiGridParams.screen.shape });
      this.screenShapeButton.textContent = this.uiGridParams.screen.shape === "rectangular" ? "R" : "C";
    });





    // this.screenShapeController = screenFolder.add(this.uiGridParams.screen, "shape").name("ScreenShape")
    //   .onChange((value) => { eventBus.emit('gridChanged', { paramPath: 'screen.shape', value: value }); });
    // this.screenShapeController.domElement.classList.add("full-width");
    // screenRezContainer.appendChild(this.screenShapeController.domElement);


    this.screenTypeController = screenFolder.add(this.uiState, "selectedScreen", Object.keys(SCREEN_TYPES)).name("Screen Type")
      .onChange((value) => {
        const selectedSpec = SCREEN_TYPES[value];
        if (!selectedSpec) {
          console.error(`Selected screen type '${value}' not found in SCREEN_TYPES.`);
          return;
        }

        if (this.debug.grid) console.log(`Screen type changed to: ${value}`, selectedSpec);

        this.uiGridParams.screen = { ...selectedSpec };
        eventBus.emit('gridChanged', { paramPath: 'screen', value: this.uiGridParams.screen });
      });
    this.screenTypeController.domElement.classList.add("full-width");

    const offsetFolder = screenFolder.addFolder("Center Offset");

    this.centerOffsetXController = offsetFolder.add(this.uiGridParams.gridSpecs, "centerOffsetX", -100, 100, 1).name("X Offset")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.centerOffsetX', value: this.uiGridParams.gridSpecs.centerOffsetX }); });

    this.centerOffsetYController = offsetFolder.add(this.uiGridParams.gridSpecs, "centerOffsetY", -100, 100, 1).name("Y Offset")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.centerOffsetY', value: this.uiGridParams.gridSpecs.centerOffsetY }); });

    // --- GRID PARAMETERS ---

    const gridSpecs = this.uiGridParams.gridSpecs;

    const cellCountContainer = document.createElement("div");
    cellCountContainer.classList = "slider-cellCount-container";

    this.targetCellCountCellsController = gridParamFolder.add(gridSpecs, "targetCellCount", 1, 1200, 1).name("TargetCells")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.targetCellCount', value: this.uiGridParams.gridSpecs.targetCellCount }); });
    this.targetCellCountCellsController.domElement.classList.add("slider-dual-input-slider");
    cellCountContainer.appendChild(this.targetCellCountCellsController.domElement);

    const totalCellsController = gridParamFolder.add(gridGenRenderer.grid, "cellCount").name("CellCount").listen();
    totalCellsController.domElement.classList.add("noClick-slider");
    cellCountContainer.appendChild(totalCellsController.domElement);

    const cellsContainer = gridParamFolder.domElement.querySelector(".children");
    cellsContainer.appendChild(cellCountContainer);

    this.gapController = gridParamFolder.add(gridSpecs, "gap", 0, 8, 1).name("Grid Gap")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.gap', value: this.uiGridParams.gridSpecs.gap }); });

    this.aspectRatioController = gridParamFolder.add(gridSpecs, "aspectRatio", 0.2, 5, 0.01).name("Cell Ratio")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.aspectRatio', value: this.uiGridParams.gridSpecs.aspectRatio }); });

    this.scaleController = gridParamFolder.add(gridSpecs, "scale", 0.5, 1, 0.001).name("Grid Scale")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.scale', value: this.uiGridParams.gridSpecs.scale }); });

    // Add allowCut parameter - Bind to gridSpecs.allowCut
    this.allowCutController = gridParamFolder.add(this.uiGridParams.gridSpecs, "allowCut", 0, 3, 1).name("Allow Cut")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'gridSpecs.allowCut', value: this.uiGridParams.gridSpecs.allowCut }); });

    this.shadowIntensityController = shadowFolder.add(this.uiGridParams.shadow, "shadowIntensity", 0, 1, 0.01).name("Intensity")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'shadow.shadowIntensity', value: this.uiGridParams.shadow.shadowIntensity }); });

    this.shadowThresholdController = shadowFolder.add(this.uiGridParams.shadow, "shadowThreshold", 0, 0.5, 0.01).name("Threshold")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'shadow.shadowThreshold', value: this.uiGridParams.shadow.shadowThreshold }); });

    this.blurAmountController = shadowFolder.add(this.uiGridParams.shadow, "blurAmount", 0, 1, 0.01).name("Blur")
      .onChange(() => { eventBus.emit('gridChanged', { paramPath: 'shadow.blurAmount', value: this.uiGridParams.shadow.blurAmount }); });

    // --- DISPLAY OPTIONS ---

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "toggle-button-container";

    // Configuration for toggle buttons
    const toggleButtonsConfig = [
      { text: "Data Colors", flag: "showGridCells" },
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
      if (this.uiGridParams.flags[config.flag]) button.classList.add("active");

      // Add event listener
      button.addEventListener("click", (event) => {
        const clickedButton = event.currentTarget;
        const flagName = clickedButton.dataset.flag;

        // Update internal UI state first
        this.uiGridParams.flags[flagName] = !this.uiGridParams.flags[flagName];
        clickedButton.classList.toggle("active");

        // Notify change via event
        eventBus.emit('gridChanged', { paramPath: 'flags.' + flagName, value: this.uiGridParams.flags[flagName] });
      });
      buttonContainer.appendChild(button);
    });

    // Add button container to the folder
    const buttonContainerChildren = displayFolder.domElement.querySelector(".children");
    buttonContainerChildren.insertBefore(buttonContainer, buttonContainerChildren.firstChild);

    // --- STATISTICS ---

    const statsFlexContainer = document.createElement("div");
    statsFlexContainer.classList = "flex-container";

    const colsController = statsFolder.add(gridGenRenderer.grid, "cols").name("Columns").listen();
    const rowsController = statsFolder.add(gridGenRenderer.grid, "rows").name("Rows     ").listen();
    const cellWidthController = statsFolder.add(gridGenRenderer.grid, "calculatedCellWidth").name("Cell pxW").listen();
    const cellHeightController = statsFolder.add(gridGenRenderer.grid, "calculatedCellHeight").name("Cell pxH").listen();
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
    targets["Screen Type"] = this.screenTypeController;
    targets["Center X Offset"] = this.centerOffsetXController;
    targets["Center Y Offset"] = this.centerOffsetYController;

    // Grid controllers
    targets["Target Cells"] = this.targetCellCountCellsController;
    targets["Grid Gap"] = this.gapController;
    targets["Cell Ratio"] = this.aspectRatioController;
    targets["Grid Scale"] = this.scaleController;
    targets["Allow Cut"] = this.allowCutController;

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

    safeUpdateDisplay(this.screenTypeController);
    safeUpdateDisplay(this.centerOffsetXController);
    safeUpdateDisplay(this.centerOffsetYController);

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


  updateUIState(newGridParams) {

    // Update properties of existing objects instead of replacing them
    if (newGridParams.screen) {
      Object.assign(this.uiGridParams.screen, newGridParams.screen);
    }
    if (newGridParams.gridSpecs) {
      Object.assign(this.uiGridParams.gridSpecs, newGridParams.gridSpecs);
    }
    if (newGridParams.shadow) {
      Object.assign(this.uiGridParams.shadow, newGridParams.shadow);
    }
    if (newGridParams.flags) {
      Object.assign(this.uiGridParams.flags, newGridParams.flags);
    }
    if (newGridParams.renderSize) {
      Object.assign(this.uiGridParams.renderSize, newGridParams.renderSize);
    }
    if (newGridParams.colors) {
      Object.assign(this.uiGridParams.colors, newGridParams.colors);
    }
    // --- END REFACTOR ---

    // Update screen type dropdown selection
    const currentScreen = this.uiGridParams.screen;
    const foundName = Object.keys(SCREEN_TYPES).find(name => {
      const type = SCREEN_TYPES[name];
      return type.width === currentScreen.width && type.height === currentScreen.height && type.shape === currentScreen.shape;
    });
    this.uiState.selectedScreen = foundName || Object.keys(SCREEN_TYPES)[0]; // Fallback if not found

    // Refresh lil-gui controller displays
    this.screenTypeController?.updateDisplay();
    this.centerOffsetXController?.updateDisplay();
    this.centerOffsetYController?.updateDisplay();
    this.targetCellCountCellsController?.updateDisplay();
    this.gapController?.updateDisplay();
    this.aspectRatioController?.updateDisplay();
    this.scaleController?.updateDisplay();
    this.allowCutController?.updateDisplay();
    this.shadowIntensityController?.updateDisplay();
    this.shadowThresholdController?.updateDisplay();
    this.blurAmountController?.updateDisplay();

    // Update toggle button active states
    const buttons = this.gui.domElement.querySelectorAll('.toggle-button[data-flag]');
    buttons.forEach(button => {
      const flagName = button.dataset.flag;
      if (flagName && typeof this.uiGridParams.flags[flagName] === 'boolean') {
        button.classList.toggle('active', this.uiGridParams.flags[flagName]);
      }
    });
  }
}
