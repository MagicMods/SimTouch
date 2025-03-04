import { socketManager } from "../network/socketManager.js";

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

  enableOnConnection() {
    // Set flag to auto-enable when connection is established
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
      console.log("WebSocket connected - enabling external input");
      this.enable();
    } else if (data.type === "disconnect") {
      console.log("WebSocket disconnected - disabling external input");
      this.disable();
    }
  }

  enable() {
    if (!this.enabled) {
      this.enabled = true;
      this.mouseForces.enableExternalInput();

      socketManager.addMouseHandler(this.handleMouseData);

      // If EMU forces are available, setup handlers
      if (this.emuForces && this.emuEnabled) {
        socketManager.addEmuHandler(this.handleEmuData);
      }
      console.log("External input connector enabled");
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

      console.log("External input connector disabled");
    }
    return this;
  }

  enableEmu() {
    if (this.emuForces && !this.emuEnabled) {
      this.emuEnabled = true;
      this.emuForces.enable();

      if (this.enabled) {
        socketManager.addEmuHandler(this.handleEmuData);
      }

      console.log("EMU input enabled");
    }
    return this;
  }

  disableEmu() {
    if (this.emuForces && this.emuEnabled) {
      this.emuEnabled = false;
      this.emuForces.disable();
      socketManager.removeEmuHandler(this.handleEmuData);
      console.log("EMU input disabled");
    }
    return this;
  }

  enableMic() {
    if (this.micForces && !this.micEnabled) {
      this.micForces.enable().then((success) => {
        if (success) {
          this.micEnabled = true;
          console.log("Microphone input enabled");
        } else {
          console.error("Failed to enable microphone input");
        }
      });
    }
    return this;
  }

  disableMic() {
    if (this.micForces && this.micEnabled) {
      this.micEnabled = false;
      this.micForces.disable();
      console.log("Microphone input disabled");
    }
    return this;
  }

  setMicSensitivity(value) {
    if (this.micForces) {
      this.micForces.setSensitivity(value);
    }
    return this;
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

  // Add this new method to handle setting mic targets
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

  // Add this method to clear mic targets
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

  setAudioInputDevice(constraints) {
    if (!this.micForces || !this.micForces.enabled) {
      console.warn("Audio input not enabled, can't change device");
      return;
    }

    console.log("Changing audio input device with constraints:", constraints);

    // Stop current stream if it exists
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
    }

    // Create new audio stream with the selected device
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        this.micStream = stream;

        // Reconnect the audio context
        if (this.audioContext && this.analyser) {
          const source = this.audioContext.createMediaStreamSource(stream);
          source.connect(this.analyser);
          console.log("Audio input device changed successfully");
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
