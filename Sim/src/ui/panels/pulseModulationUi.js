import { BaseUi } from "./baseUi.js";
import { PulseModulatorManager } from "../../input/pulseModulator.js";

export class PulseModulationUi extends BaseUi {
  constructor(main, container) {
    super(main, container);
    this.main = main;

    // Change the GUI title
    this.gui.title("Pulse Modulation");

    // Create pulse modulator manager
    this.pulseModManager = new PulseModulatorManager();

    // Store folders for modulators
    this.modulatorFolders = [];

    // Add basic controls
    this.initBasicControls();
  }

  initBasicControls() {
    // Add button to add a new modulator
    const addButton = { add: () => this.addPulseModulator() };
    this.gui.add(addButton, "add").name("Add Modulator");
  }

  // Called after other UI panels are initialized
  initializeWithUiPanels(leftUi, rightUi) {
    this.leftUi = leftUi;
    this.rightUi = rightUi;

    // Check if we have the getControlTargets method
    if (this.leftUi && typeof this.leftUi.getControlTargets === "function") {
      // Register available targets based on LeftUI's implementation
      this.registerAvailableTargets();
    } else {
      console.warn(
        "Left UI doesn't have getControlTargets method - using direct implementation"
      );
    }
  }

  // Register available targets from other UI panels
  registerAvailableTargets() {
    // Get target names from leftUI (which has the comprehensive list)
    const targetNames = this.leftUi.getControlTargets();

    // For each target, get the controller and register it
    targetNames.forEach((name) => {
      if (name !== "None") {
        const target = this.leftUi.getControllerForTarget(name);
        if (target && target.controller) {
          const controller = target.controller;

          // Add getValue and setValue methods if they don't exist
          if (!controller.getValue) {
            controller.getValue = function () {
              return this.object[this.property];
            };
          }

          if (!controller.setValue) {
            controller.setValue = function (value) {
              this.object[this.property] = value;
              if (this.updateDisplay) this.updateDisplay();
            };
          }

          // Register the controller with min/max/step ranges
          this.pulseModManager.addTargetWithRangeFull(
            name,
            controller,
            target.min,
            target.max,
            target.step || 0.01 // Default step if not provided
          );
        }
      }
    });
  }

  // Add a new pulse modulator
  addPulseModulator() {
    // Check if we have any targets
    const targetNames = this.pulseModManager.getTargetNames();
    if (targetNames.length === 0) {
      console.warn("No targets available for modulation");
      alert("No modulatable targets found. Please check console for details.");
      return null;
    }

    const modulator = this.pulseModManager.createModulator();

    // Create folder for this modulator
    const index = this.pulseModManager.modulators.length - 1;
    const folder = this.gui.addFolder(`Modulator ${index + 1}`);

    // Store the folder reference
    this.modulatorFolders.push(folder);

    // Add enable/disable toggle
    folder
      .add(modulator, "enabled")
      .name("Enabled")
      .onChange((value) => {
        modulator.enabled = value;
      });

    // Add target selector
    const targetController = folder
      .add(modulator, "targetName", targetNames)
      .name("Target")
      .onChange((value) => {
        modulator.setTarget(value);

        // Update min/max controllers with the target's range if available
        const target = this.pulseModManager.getTargetInfo(value);
        if (target && target.min !== undefined && target.max !== undefined) {
          modulator.min = target.min;
          modulator.max = target.max;
          minController.updateDisplay();
          maxController.updateDisplay();
        }
      });

    // Add modulation type
    folder
      .add(modulator, "type", ["sine", "square", "triangle", "sawtooth"])
      .name("Wave Type");

    // Add frequency control
    folder.add(modulator, "frequency", 0.01, 3, 0.01).name("Frequency (Hz)");

    // Add min/max controls
    const minController = folder
      .add(modulator, "min", -10, 10)
      .name("Min Value");
    const maxController = folder
      .add(modulator, "max", -10, 10)
      .name("Max Value");

    // Add phase control
    folder.add(modulator, "phase", 0, Math.PI * 2, 0.01).name("Phase");

    // Add auto-range button
    const autoRangeControl = {
      autoRange: () => {
        const target = this.pulseModManager.getTargetInfo(modulator.targetName);
        if (target && target.min !== undefined && target.max !== undefined) {
          // Get the target controller info
          const controllerInfo = this.leftUi.getControllerForTarget(
            modulator.targetName
          );

          // Use the specified min, max, and step values if available
          if (controllerInfo) {
            modulator.min = controllerInfo.min;
            modulator.max = controllerInfo.max;

            // Set step value if available
            if (controllerInfo.step !== undefined) {
              // Find the step controller in the folder and update it
              for (const controller of folder.controllers) {
                if (
                  controller.property === "min" ||
                  controller.property === "max"
                ) {
                  controller.step(controllerInfo.step);
                }
              }
            }

            minController.updateDisplay();
            maxController.updateDisplay();
            console.log(
              `Set range automatically: ${modulator.min} to ${
                modulator.max
              } (step: ${controllerInfo.step || "default"})`
            );
          } else {
            // Fallback to stored range values
            modulator.min = target.min;
            modulator.max = target.max;
            minController.updateDisplay();
            maxController.updateDisplay();
            console.log(
              `Set range from stored values: ${target.min} to ${target.max}`
            );
          }
        } else {
          console.warn("No range information available for this target");
        }
      },
    };
    folder.add(autoRangeControl, "autoRange").name("Auto Range");

    // Add remove button - FIXED using the correct method for lil-gui
    const removeButton = {
      remove: () => {
        // Disable the modulator first to stop affecting the target
        modulator.enabled = false;

        // Remove the modulator from the manager
        this.pulseModManager.removeModulator(index);

        // Remove the folder using the correct method for lil-gui
        folder.destroy();

        // Remove from our tracking array
        const folderIndex = this.modulatorFolders.indexOf(folder);
        if (folderIndex > -1) {
          this.modulatorFolders.splice(folderIndex, 1);
        }
      },
    };
    folder.add(removeButton, "remove").name("Remove");

    // Open the folder by default
    folder.open();

    return modulator;
  }

  // Get available control targets - directly from the LeftUi implementation
  getControlTargets() {
    const targets = ["None"];

    // Basic targets (already implemented)
    targets.push("Particle Size");
    targets.push("Gravity Strength");
    targets.push("Repulsion");

    // Global section
    targets.push("Max Density");
    targets.push("Animation Speed");

    // Boundary section
    targets.push("Boundary Size");
    targets.push("Wall Repulsion");

    // Turbulence section
    targets.push("Turbulence Strength");
    targets.push("Turbulence Speed");
    targets.push("Scale Strength");
    targets.push("Inward Pull");

    // Voronoi section
    targets.push("Voronoi Strength");
    targets.push("Edge Width");
    targets.push("Attraction");
    targets.push("Cell Count");
    targets.push("Cell Speed");

    // Force controls
    targets.push("Fluid Force");
    targets.push("Swarm Force");
    targets.push("Automata Force");

    return targets;
  }

  // Find the actual controller for a given target name - directly from the LeftUi implementation
  getControllerForTarget(targetName) {
    switch (targetName) {
      // Existing controls
      case "Particle Size":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "particleRadius",
            getValue: () => this.main.particleSystem.particleRadius,
            setValue: (value) => {
              this.main.particleSystem.particleRadius = value;
              this.main.particleSystem.collisionSystem.particleRadius =
                value * 2;
              this.main.particleSystem.particleRadii.fill(value);
            },
            updateDisplay: () => {},
          },
          property: "particleRadius",
          min: 0.005,
          max: 0.03,
        };

      case "Gravity Strength":
        return {
          controller: {
            object: this.main.particleSystem.gravity,
            property: "strength",
            getValue: () => this.main.particleSystem.gravity.strength,
            setValue: (value) =>
              this.main.particleSystem.gravity.setStrength(value),
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 20,
        };

      case "Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.collisionSystem,
            property: "repulsion",
            getValue: () => this.main.particleSystem.collisionSystem.repulsion,
            setValue: (value) =>
              (this.main.particleSystem.collisionSystem.repulsion = value),
            updateDisplay: () => {},
          },
          property: "repulsion",
          min: 0,
          max: 5,
        };

      // Global section
      case "Max Density":
        return {
          controller: {
            object: this.main.gridRenderer,
            property: "maxDensity",
            updateDisplay: () => {},
          },
          property: "maxDensity",
          min: 0.1,
          max: 10,
        };

      case "Animation Speed":
        return {
          controller: {
            object: this.main.particleSystem,
            property: "timeScale",
            updateDisplay: () => {},
          },
          property: "timeScale",
          min: 0,
          max: 2,
        };

      // Boundary section
      case "Boundary Size":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "radius",
            updateDisplay: () => {
              // Update the boundary visually when radius changes
              this.main.particleSystem.boundary.update({
                radius: this.main.particleSystem.boundary.radius,
              });
            },
          },
          property: "radius",
          min: 0.3,
          max: 0.55,
        };

      case "Wall Repulsion":
        return {
          controller: {
            object: this.main.particleSystem.boundary,
            property: "boundaryRepulsion",
            updateDisplay: () => {},
          },
          property: "boundaryRepulsion",
          min: 0,
          max: 20,
        };

      // Turbulence section
      case "Turbulence Strength":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "strength",
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 10,
        };

      case "Turbulence Speed":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "speed",
            updateDisplay: () => {},
          },
          property: "speed",
          min: 0,
          max: 20,
        };

      case "Scale Strength":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "scaleStrength",
            updateDisplay: () => {},
          },
          property: "scaleStrength",
          min: 0,
          max: 1,
        };

      case "Inward Pull":
        return {
          controller: {
            object: this.main.turbulenceField,
            property: "inwardFactor",
            updateDisplay: () => {},
          },
          property: "inwardFactor",
          min: 0,
          max: 5,
        };

      // Voronoi section
      case "Voronoi Strength":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "strength",
            updateDisplay: () => {},
          },
          property: "strength",
          min: 0,
          max: 10,
        };

      case "Edge Width":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "edgeWidth",
            updateDisplay: () => {},
          },
          property: "edgeWidth",
          min: 0.1,
          max: 50,
        };

      case "Attraction":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "attractionFactor",
            updateDisplay: () => {},
          },
          property: "attractionFactor",
          min: 0,
          max: 8,
        };

      case "Cell Count":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "cellCount",
            updateDisplay: () => {
              // Regenerate cells when count changes
              if (this.main.voronoiField.regenerateCells) {
                this.main.voronoiField.regenerateCells();
              }
            },
          },
          property: "cellCount",
          min: 1,
          max: 10,
        };

      case "Cell Speed":
        return {
          controller: {
            object: this.main.voronoiField,
            property: "cellMovementSpeed",
            updateDisplay: () => {},
          },
          property: "cellMovementSpeed",
          min: 0,
          max: 4,
        };

      // Force controls
      case "Fluid Force":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.forceScales.Fluid,
            property: "base",
            updateDisplay: () => {},
          },
          property: "base",
          min: 0,
          max: 5,
        };

      case "Swarm Force":
        return {
          controller: {
            object: this.main.particleSystem.organicBehavior.forceScales.Swarm,
            property: "base",
            updateDisplay: () => {},
          },
          property: "base",
          min: 0,
          max: 5,
        };

      case "Automata Force":
        return {
          controller: {
            object:
              this.main.particleSystem.organicBehavior.forceScales.Automata,
            property: "base",
            updateDisplay: () => {},
          },
          property: "base",
          min: 0,
          max: 5,
        };

      default:
        return null;
    }
  }

  update() {
    if (this.pulseModManager) {
      this.pulseModManager.update();
    }
  }
}
