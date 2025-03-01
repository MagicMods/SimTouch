import { socketManager } from "../network/socketManager.js";

export class ExternalInputConnector {
  constructor(mouseForces, emuForces = null) {
    this.mouseForces = mouseForces;
    this.emuForces = emuForces;
    this.enabled = false;
    this.emuEnabled = false;
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
      // Handle the new 24-byte format (6 floats, 4 bytes each)
      // Floats are ordered: accelX, accelY, accelZ, gyroX, gyroY, gyroZ
      const view = new DataView(data);

      // Read accelerometer data (first 12 bytes)
      const accelX = view.getFloat32(0, true); // true = little endian
      const accelY = view.getFloat32(4, true);
      const accelZ = view.getFloat32(8, true);

      // Read gyroscope data (next 12 bytes)
      const gyroX = view.getFloat32(12, true);
      const gyroY = view.getFloat32(16, true);
      const gyroZ = view.getFloat32(20, true);

      this.emuForces.handleEmuData(gyroX, gyroY, gyroZ, accelX, accelY, accelZ);
    } else if (typeof data === "object") {
      const { gyroX, gyroY, gyroZ, accelX, accelY, accelZ } = data;
      this.emuForces.handleEmuData(gyroX, gyroY, gyroZ, accelX, accelY, accelZ);
    }
  }

  setSensitivity(value) {
    this.mouseForces.setExternalSensitivity(value);
    return this;
  }

  setGyroSensitivity(value) {
    if (this.emuForces) {
      this.emuForces.setGyroSensitivity(value);
    }
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

  cleanup() {
    socketManager.removeMouseHandler(this.handleMouseData);
    socketManager.removeMessageHandler(this.handleConnectionChange);

    if (this.emuForces) {
      socketManager.removeEmuHandler(this.handleEmuData);
    }
  }
}
