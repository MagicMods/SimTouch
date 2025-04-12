import { BaseUi } from "../baseUi.js";
import { eventBus } from '../../util/eventManager.js';

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
        screen: { ...initialScreenSpec }, // Copy the spec found or default
        gridSpecs: { ...main.gridParams.gridSpecs },
        shadow: { ...main.gridParams.shadow },
        flags: { ...main.gridParams.flags },
        renderSize: { ...main.gridParams.renderSize }, // Add renderSize
        colors: { ...main.gridParams.colors } // Add colors
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

        this.uiGridParams.screen = { ...selectedSpec };
        eventBus.emit('uiControlChanged', { paramPath: 'screen', value: this.uiGridParams.screen });
      });
    this.screenTypeController.domElement.classList.add("full-width");

    const offsetFolder = screenFolder.addFolder("Center Offset");

    this.centerOffsetXController = offsetFolder
      .add(this.uiGridParams.gridSpecs, "centerOffsetX", -100, 100, 1) // Updated path
      .name("X Offset")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.centerOffsetX', value: this.uiGridParams.gridSpecs.centerOffsetX });
      });

    this.centerOffsetYController = offsetFolder
      .add(this.uiGridParams.gridSpecs, "centerOffsetY", -100, 100, 1) // Updated path
      .name("Y Offset")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.centerOffsetY', value: this.uiGridParams.gridSpecs.centerOffsetY });
      });

    // --- GRID PARAMETERS ---

    const gridSpecs = this.uiGridParams.gridSpecs;

    const cellCountContainer = document.createElement("div");
    cellCountContainer.classList = "slider-cellCount-container";

    this.targetCellCountCellsController = gridParamFolder
      .add(gridSpecs, "targetCellCount", 1, 1000, 1) // Bind to gridSpecs.targetCellCount
      .name("TargetCells")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.targetCellCount', value: this.uiGridParams.gridSpecs.targetCellCount });
      });
    this.targetCellCountCellsController.domElement.classList.add("slider-dual-input-slider");
    cellCountContainer.appendChild(this.targetCellCountCellsController.domElement);

    const totalCellsController = gridParamFolder.add(gridGenRenderer.grid, "cellCount").name("CellCount").listen();
    totalCellsController.domElement.classList.add("slider-dual-input-input");
    cellCountContainer.appendChild(totalCellsController.domElement);

    const cellsContainer = gridParamFolder.domElement.querySelector(".children");
    cellsContainer.appendChild(cellCountContainer);

    this.gapController = gridParamFolder
      .add(gridSpecs, "gap", 0, 20, 1) // Bind to gridSpecs.gap
      .name("Grid Gap")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.gap', value: this.uiGridParams.gridSpecs.gap });
      });

    this.aspectRatioController = gridParamFolder
      .add(gridSpecs, "aspectRatio", 0.2, 5, 0.01) // Bind to gridSpecs.aspectRatio
      .name("Cell Ratio")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.aspectRatio', value: this.uiGridParams.gridSpecs.aspectRatio });
      });

    this.scaleController = gridParamFolder
      .add(gridSpecs, "scale", 0.5, 1, 0.001) // Bind to gridSpecs.scale
      .name("Grid Scale")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.scale', value: this.uiGridParams.gridSpecs.scale });
      });

    // Add allowCut parameter - Bind to gridSpecs.allowCut
    this.allowCutController = gridParamFolder
      .add(this.uiGridParams.gridSpecs, "allowCut", 0, 3, 1) // Bind to uiGridParams
      .name("Allow Cut")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'gridSpecs.allowCut', value: this.uiGridParams.gridSpecs.allowCut });
      });

    this.shadowIntensityController = shadowFolder
      .add(this.uiGridParams.shadow, "shadowIntensity", 0, 1, 0.01) // Bind to uiGridParams
      .name("Intensity")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'shadow.shadowIntensity', value: this.uiGridParams.shadow.shadowIntensity });
      });

    this.shadowThresholdController = shadowFolder
      .add(this.uiGridParams.shadow, "shadowThreshold", 0, 0.5, 0.01) // Bind to uiGridParams
      .name("Threshold")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'shadow.shadowThreshold', value: this.uiGridParams.shadow.shadowThreshold });
      });

    this.blurAmountController = shadowFolder
      .add(this.uiGridParams.shadow, "blurAmount", 0, 1, 0.01) // Bind to uiGridParams
      .name("Blur")
      .onChange(() => {
        eventBus.emit('uiControlChanged', { paramPath: 'shadow.blurAmount', value: this.uiGridParams.shadow.blurAmount });
      });

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
      if (this.uiGridParams.flags[config.flag]) button.classList.add("active");

      // Add event listener
      button.addEventListener("click", (event) => {
        const clickedButton = event.currentTarget;
        const flagName = clickedButton.dataset.flag;

        // Update internal UI state first
        this.uiGridParams.flags[flagName] = !this.uiGridParams.flags[flagName];
        clickedButton.classList.toggle("active");

        // Notify change via event
        eventBus.emit('uiControlChanged', { paramPath: 'flags.' + flagName, value: this.uiGridParams.flags[flagName] });
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
    const rowsController = statsFolder.add(gridGenRenderer.grid, "rows").name("Rows").listen();
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

  // Add this new method
  updateUIState(newGridParams) {
    // --- START REFACTOR ---
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
