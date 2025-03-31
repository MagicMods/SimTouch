import { EmuData } from "../../input/emuData.js";

export class EmuForces {
  constructor(simulation) {
    // Store reference to gravity
    this.gravity = simulation.gravity;

    // Store reference to simulation for accessing turbulenceField
    this.simulation = simulation;

    this.emuData = new EmuData();
    this.enabled = false;

    // Add flag for manual override
    this.manualOverride = false;

    // Force multiplier
    this.accelGravityMultiplier = 0.5;

    // Added for debugging
    this.debug = false;
  }

  enable() {
    this.enabled = true;
    return this;
  }

  disable() {
    this.enabled = false;
    return this;
  }

  // Set manual override flag when mouse input is active
  setManualOverride(override) {
    this.manualOverride = override;
    return this;
  }

  handleEmuData(accelX, accelY, accelZ) {
    // Only update if not in manual override mode
    if (!this.manualOverride) {
      this.emuData.update(accelX, accelY, accelZ);
    }
  }

  handleBinaryData(buffer) {
    // Only update if not in manual override mode
    if (!this.manualOverride) {
      this.emuData.updateFromBinary(buffer);
    }
  }

  handleStringData(dataString) {
    // Only update if not in manual override mode
    if (!this.manualOverride) {
      this.emuData.updateFromString(dataString);
    }
  }

  setAccelGravityMultiplier(value) {
    this.accelGravityMultiplier = value;
    return this;
  }

  setAccelSensitivity(value) {
    this.emuData.setAccelSensitivity(value);
    return this;
  }

  calibrate() {
    this.emuData.calibrate();
    return this;
  }

  apply(dt) {
    if (!this.enabled || !this.emuData) return;

    // For manual override mode, we let the joystick control the gravity
    if (this.manualOverride && this.gravity) {
      if (this.gravity.particleSystem && this.gravity.particleSystem.mouseForces) {
        // Manual override is handled separately via mouse forces
        return;
      }
    }

    // Apply acceleration to gravity if available
    if (this.gravity) {
      // Apply accelerometer data as gravity direction
      // Swap X/Y for more intuitive control and apply sensitivity
      const accelX = this.emuData.accelY * this.sensitivity * this.accelGravityMultiplier;
      const accelY = -this.emuData.accelX * this.sensitivity * this.accelGravityMultiplier;
      const accelZ = -1; // Keep Z pointing downward for stability

      // Set the gravity direction (normalized internally)
      this.gravity.setRawDirection(accelX, accelY, accelZ);
    } else if (this.debug) {
      console.log('Direct turbulenceField reference:', this.turbulenceField);

      if (this.gravity && this.gravity.particleSystem) {
        console.log('this.gravity.particleSystem:', this.gravity.particleSystem);
      }

      if (this.gravity && this.gravity.particleSystem && this.gravity.particleSystem.main) {
        console.log('this.gravity.particleSystem.main:', this.gravity.particleSystem.main);
        console.log('Has turbulenceField?', !!this.gravity.particleSystem.main.turbulenceField);
        console.log('Has turbulenceUi?', !!this.gravity.particleSystem.main.turbulenceUi);
      }
    }

    // Also apply accelerometer data to turbulence bias if available
    // First check for the direct reference that might be set during enableEmu()
    let turbulenceField = this.turbulenceField;
    let main = null;

    // If not found, check other paths
    if (!turbulenceField) {
      // Check first if we can directly access turbulenceField from the simulation object
      if (this.simulation && this.simulation.turbulenceField) {
        turbulenceField = this.simulation.turbulenceField;
      }

      // If not found through simulation, try to access it through gravity's particleSystem
      if (!turbulenceField && this.gravity && this.gravity.particleSystem &&
        this.gravity.particleSystem.main &&
        this.gravity.particleSystem.main.turbulenceField) {
        main = this.gravity.particleSystem.main;
        turbulenceField = main.turbulenceField;
      }

      // If still not found, try other potential paths
      if (!turbulenceField) {
        // Try particleSystem directly (different structure than expected)
        if (this.gravity && this.gravity.particleSystem &&
          this.gravity.particleSystem.turbulenceField) {
          turbulenceField = this.gravity.particleSystem.turbulenceField;
        }

        // Try simulation.main if it exists
        if (!turbulenceField && this.simulation && this.simulation.main &&
          this.simulation.main.turbulenceField) {
          main = this.simulation.main;
          turbulenceField = main.turbulenceField;
        }
      }
    }

    if (turbulenceField) {
      try {
        // Use the same accelerometer values as gravity, but normalize to -1 to 1 range for bias
        // Divide by 10 since our accelerometer values are typically in the -10 to 10 range
        // Apply the same axis swapping as gravity (Y → X, X → Y)
        const biasX = Math.max(-1, Math.min(1, this.emuData.accelY / 10));
        const biasY = Math.max(-1, Math.min(1, -this.emuData.accelX / 10));  // Invert Y for correct direction

        // Use the physics-based setBiasSpeed method which takes values in -1 to 1 range
        // and applies them as acceleration rather than direct position offsets
        turbulenceField.setBiasSpeed(biasX, biasY);

        // Try to find and update the turbulence UI if available
        if (!main) {
          if (this.simulation && this.simulation.main) {
            main = this.simulation.main;
          } else if (this.gravity && this.gravity.particleSystem &&
            this.gravity.particleSystem.main) {
            main = this.gravity.particleSystem.main;
          }
        }

        if (main && main.turbulenceUi) {
          try {
            main.turbulenceUi.updateBiasControllers();
          } catch (e) {
            // Fail silently - the UI update is not critical
          }
        }
      } catch (e) {
        console.warn("Error applying EMU forces to turbulence field:", e);
      }
    }
  }
}
