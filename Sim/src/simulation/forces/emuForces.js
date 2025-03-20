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
    this.accelGravityMultiplier = 1.0;
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
    if (!this.enabled) return;

    // When manually controlling EMU through the visualization,
    // set mouseForces.isActive to true to reduce other forces
    if (this.manualOverride && this.gravity?.particleSystem?.mouseForces) {
      this.gravity.particleSystem.mouseForces.isActive = true;
    }

    // Apply accelerometer data to gravity using raw values (not normalized)
    if (this.gravity && this.gravity.setRawDirection) {
      // We're using accelY for X and accelX for Y (after 90° rotation)
      const gravityX = this.emuData.accelY * this.accelGravityMultiplier;
      const gravityY = this.emuData.accelX * this.accelGravityMultiplier;
      const gravityZ = -this.emuData.accelZ * this.accelGravityMultiplier;

      // Use setRawDirection to control both direction and magnitude
      this.gravity.setRawDirection(gravityX, gravityY, gravityZ);
    }

    // DEBUG: Print object structure to find turbulence field
    if (this.enabled && !this._debuggedObjectStructure) {
      this._debuggedObjectStructure = true;

      console.log('DEBUG: EmuForces object structure:');
      console.log('this.simulation:', this.simulation);
      console.log('this.gravity:', this.gravity);
      console.log('Direct turbulenceField reference:', this.turbulenceField);

      if (this.gravity?.particleSystem) {
        console.log('this.gravity.particleSystem:', this.gravity.particleSystem);
      }

      if (this.gravity?.particleSystem?.main) {
        console.log('this.gravity.particleSystem.main:', this.gravity.particleSystem.main);
        console.log('Has turbulenceField?', !!this.gravity.particleSystem.main.turbulenceField);
        console.log('Has turbulenceUi?', !!this.gravity.particleSystem.main.turbulenceUi);
      }
    }

    // Also apply accelerometer data to turbulence bias if available
    // First check for the direct reference that might be set during enableEmu()
    let turbulenceField = this.turbulenceField;

    // If not found, check other paths
    if (!turbulenceField) {
      // Check first if we can directly access turbulenceField from the simulation object
      turbulenceField = this.simulation?.turbulenceField;

      // If not found through simulation, try to access it through gravity's particleSystem
      if (!turbulenceField && this.gravity?.particleSystem?.main) {
        turbulenceField = this.gravity.particleSystem.main.turbulenceField;
      }

      // If still not found, try other potential paths
      if (!turbulenceField) {
        // Try particleSystem directly (different structure than expected)
        turbulenceField = this.gravity?.particleSystem?.turbulenceField;

        // Try simulation.main if it exists
        if (!turbulenceField && this.simulation?.main) {
          turbulenceField = this.simulation.main.turbulenceField;
        }
      }
    }

    if (turbulenceField && typeof turbulenceField.setBiasSpeed === 'function') {
      // Use the same accelerometer values as gravity, but normalize to -1 to 1 range for bias
      // Divide by 10 since our accelerometer values are typically in the -10 to 10 range
      // Apply the same axis swapping as gravity (Y → X, X → Y)
      const biasX = Math.max(-1, Math.min(1, this.emuData.accelY / 10));
      const biasY = Math.max(-1, Math.min(1, this.emuData.accelX / 10));

      // Apply to turbulence field - the biasStrength will be applied internally via applyOffset
      turbulenceField.setBiasSpeed(biasX, biasY);

      // Try to find and update the turbulence UI if available
      let main = this.simulation?.main;
      if (!main && this.gravity?.particleSystem?.main) {
        main = this.gravity.particleSystem.main;
      }

      if (main?.turbulenceUi && typeof main.turbulenceUi.updateBiasControllers === 'function') {
        main.turbulenceUi.updateBiasControllers();
      }

      // console.log(`Applied EMU data to turbulence bias: X=${biasX.toFixed(2)}, Y=${biasY.toFixed(2)}`);
    } else {
      // Log once to help diagnose the issue
      // if (this.enabled && !this._loggedMissingTurbulence) {
      //   console.warn("Turbulence field not found for EMU control. Check application structure.");
      //   this._loggedMissingTurbulence = true;

      //   // Print some additional debug info about where we looked
      //   console.log('Looked for turbulenceField in:');
      //   console.log('- this.turbulenceField (direct):', this.turbulenceField);
      //   console.log('- this.simulation?.turbulenceField:', this.simulation?.turbulenceField);
      //   console.log('- this.gravity?.particleSystem?.main?.turbulenceField:', this.gravity?.particleSystem?.main?.turbulenceField);
      //   console.log('- this.gravity?.particleSystem?.turbulenceField:', this.gravity?.particleSystem?.turbulenceField);
      //   console.log('- this.simulation?.main?.turbulenceField:', this.simulation?.main?.turbulenceField);
      // }
    }
  }
}
