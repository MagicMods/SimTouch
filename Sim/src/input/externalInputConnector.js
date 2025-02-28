import { socketManager } from "../network/socketManager.js";

export class ExternalInputConnector {
  constructor(mouseForces) {
    this.mouseForces = mouseForces;
    this.enabled = false;
    this.autoEnableOnConnection = false;

    // Bind methods to maintain correct 'this' context
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    this.handleMouseData = this.handleMouseData.bind(this);
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
      console.log("WebSocket connected - enabling external mouse input");
      this.enable();
    } else if (data.type === "disconnect") {
      console.log("WebSocket disconnected - disabling external mouse input");
      this.disable();
    }
  }

  enable() {
    if (!this.enabled) {
      this.enabled = true;
      this.mouseForces.enableExternalInput();

      // Always set button pressed state when enabling
      this.setMouseButton(0, true);

      socketManager.addMouseHandler(this.handleMouseData);
      console.log("External input connector enabled");
    }
    return this;
  }

  disable() {
    if (this.enabled) {
      this.enabled = false;
      this.mouseForces.disableExternalInput();
      socketManager.removeMouseHandler(this.handleMouseData);
      console.log("External input connector disabled");
    }
    return this;
  }

  handleMouseData(x, y) {
    if (!this.enabled) return;
    this.mouseForces.handleExternalMouseData(x, y);
  }

  setSensitivity(value) {
    this.mouseForces.setExternalSensitivity(value);
    return this;
  }

  setMouseButton(button, pressed) {
    this.mouseForces.setExternalMouseButton(button, pressed);
    return this;
  }

  cleanup() {
    socketManager.removeMouseHandler(this.handleMouseData);
    socketManager.removeMessageHandler(this.handleConnectionChange);
  }
}
