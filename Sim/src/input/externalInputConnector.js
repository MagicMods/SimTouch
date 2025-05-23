import { socketManager } from "../com/udp/socketManager.js";
import { debugManager } from "../util/debugManager.js";

export class ExternalInputConnector {
  constructor(mouseForces, emuForces = null, micForces = null) {
    this.mouseForces = mouseForces;
    this.emuForces = emuForces;
    this.micForces = micForces;
    this.enabled = false;
    this.emuEnabled = false;
    this.micEnabled = false;
    this.autoEnableOnConnection = false;


    // Bind methods to maintain correct 'this' context
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    this.handleMouseData = this.handleMouseData.bind(this);
    this.handleEmuData = this.handleEmuData.bind(this);
  }

  get db() {
    return debugManager.get('inputs');
  }

  enableOnConnection() {
    this.autoEnableOnConnection = true;

    // Register for connection state changes
    socketManager.addMessageHandler(this.handleConnectionChange);

    // If already connected, enable right away
    if (socketManager.isConnected) {
      this.enable();
    }

    return this;
  }

  handleConnectionChange(data) {
    if (data.type === "connect" && this.autoEnableOnConnection) {
      if (this.db) console.log("WebSocket connected - enabling external input");
      this.enable();
    } else if (data.type === "disconnect") {
      if (this.db) console.log("WebSocket disconnected - disabling external input");
      this.disable();
    }
  }

  enable() {
    if (!this.enabled) {
      this.enabled = true;
      this.mouseForces.enableExternalInput();

      socketManager.addMouseHandler(this.handleMouseData);

      if (this.emuForces && this.emuEnabled) {
        socketManager.addEmuHandler(this.handleEmuData);
      }
      if (this.db) console.log("External input connector enabled");
    }
    return this;
  }

  disable() {
    if (this.enabled) {
      this.enabled = false;
      this.mouseForces.disableExternalInput();
      socketManager.removeMouseHandler(this.handleMouseData);

      if (this.emuForces) {
        socketManager.removeEmuHandler(this.handleEmuData);
      }

      if (this.db) console.log("External input connector disabled");
    }
    return this;
  }

  enableEmu() {
    if (this.emuForces && !this.emuEnabled) {
      this.emuEnabled = true;
      this.emuForces.enable();

      // Register handler only if the main connector is enabled
      if (this.enabled) {
        socketManager.addEmuHandler(this.handleEmuData);
      }

      if (this.db) console.log("EMU input enabled");
    }
    return this;
  }

  disableEmu() {
    if (this.emuForces && this.emuEnabled) {
      this.emuEnabled = false;
      this.emuForces.disable();
      socketManager.removeEmuHandler(this.handleEmuData);
      if (this.db) console.log("EMU input disabled");
    }
    return this;
  }

  enableMic() {
    if (this.micForces && !this.micEnabled) {
      this.micForces.enable().then((success) => {
        if (success) {
          this.micEnabled = true;
          if (this.db) console.log("Microphone input enabled");
        } else {
          if (this.db) console.error("Failed to enable microphone input");
        }
      });
    }
    return this;
  }

  disableMic() {
    if (this.micForces && this.micEnabled) {
      this.micEnabled = false;
      this.micForces.disable();
      if (this.db) console.log("Microphone input disabled");
    }
    return this;
  }

  setMicSensitivity(value) {
    if (this.micForces) {
      this.micForces.sensitivity = value;

      // Debug audio levels
      // if (this.db) console.log(
      //   `Mic level: ${this.micForces.smoothedAmplitude.toFixed(
      //     3
      //   )} at sensitivity ${value}`
      // );
    }
  }

  setMicSmoothing(value) {
    if (this.micForces) {
      this.micForces.setSmoothing(value);
    }
    return this;
  }

  calibrateMic() {
    if (this.micForces) {
      this.micForces.calibrate();
    }
    return this;
  }

  handleMouseData(x, y) {
    if (!this.enabled) return;

    // Auto-press button when receiving data, but PRESERVE the selected button type
    if (!this.mouseForces.externalMouseState.isPressed) {
      // Get the current button selection instead of hardcoding to 0
      const currentButtonType = this.mouseForces.externalMouseState.button;
      this.setMouseButton(currentButtonType, true);
    }
    // Process the data
    this.mouseForces.handleExternalMouseData(x, y);
  }

  handleEmuData(data) {
    if (!this.enabled || !this.emuEnabled || !this.emuForces) return;

    // Handle different data formats
    if (typeof data === "string") {
      this.emuForces.handleStringData(data);
    } else if (data instanceof ArrayBuffer) {
      // Handle the 13-byte format (3 floats, 4 bytes each + 1 ghost byte)
      const view = new DataView(data);

      // Skip the ghost byte and read accelerometer data (12 bytes)
      const accelX = view.getFloat32(0, true); // true = little endian
      const accelY = view.getFloat32(4, true);
      const accelZ = view.getFloat32(8, true);

      this.emuForces.handleEmuData(accelX, accelY, accelZ);
    } else if (typeof data === "object") {
      const { accelX, accelY, accelZ } = data;
      this.emuForces.handleEmuData(accelX, accelY, accelZ);
    }
  }

  setSensitivity(value) {
    this.mouseForces.setExternalSensitivity(value);
    return this;
  }

  setGyroSensitivity(value) {
    // Remove this method or leave as empty stub
    return this;
  }

  setAccelSensitivity(value) {
    if (this.emuForces) {
      this.emuForces.setAccelSensitivity(value);
    }
    return this;
  }

  calibrateEmu() {
    if (this.emuForces) {
      this.emuForces.calibrate();
    }
    return this;
  }

  setMouseButton(button, pressed) {
    this.mouseForces.setExternalMouseButton(button, pressed);
    return this;
  }

  setMicTarget(controller, min, max, sensitivity = 1.0, frequency = null) {
    if (this.micForces) {
      this.micForces.addTarget(
        controller,
        min,
        max,
        null,
        sensitivity,
        frequency
      );
    }
    return this;
  }

  clearMicTargets() {
    if (this.micForces) {
      this.micForces.clearTargets();
    }
    return this;
  }

  cleanup() {
    socketManager.removeMouseHandler(this.handleMouseData);
    socketManager.removeMessageHandler(this.handleConnectionChange);

    if (this.emuForces) {
      socketManager.removeEmuHandler(this.handleEmuData);
    }

    if (this.micForces && this.micEnabled) {
      this.disableMic();
    }
  }

  setAudioInputDevice(deviceId) {
    if (!this.micForces || !this.micEnabled) {
      console.warn("Audio input not enabled, can't change device");
      return;
    }

    if (this.db) console.log("Changing audio input device:", deviceId);

    this.micForces
      .changeDevice(deviceId)
      .then((success) => {
        if (success) {
          if (this.db) console.log("Audio input device changed successfully");
        } else {
          console.error("Failed to change audio input device");
          alert(
            "Could not access the selected audio device. Please check permissions."
          );
        }
      })
      .catch((err) => {
        console.error("Error accessing selected audio device:", err);
        alert(
          "Could not access the selected audio device. Please check permissions."
        );
      });
  }
}
