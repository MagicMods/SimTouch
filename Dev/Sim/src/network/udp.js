class UDPNetwork {
  constructor(config = {}) {
    this.config = {
      wsPort: config.wsPort || 8080,
      udpPort: config.udpPort || 3000,
      udpHost: config.udpHost || "localhost",
      ...config,
    };
    this.websocket = null;
    this.isConnected = false;

    this._enable = false;
    this._debug = false;
  }

  // Add getters/setters for enable/debug
  get enable() {
    return this._enable;
  }

  set enable(value) {
    this._enable = value;
    if (this._debug)
      console.log(`UDP Network ${value ? "enabled" : "disabled"}`);
    // If enabling, try to connect
    if (value && !this.isConnected) {
      this.init(this.config);
    }
  }

  get debug() {
    return this._debug;
  }

  set debug(value) {
    this._debug = value;
    console.log(`UDP Debug mode ${value ? "enabled" : "disabled"}`);
  }

  init() {
    try {
      this.websocket = new WebSocket(
        `ws://${this.config.udpHost}:${this.config.wsPort}`
      );

      this.websocket.onopen = () => {
        this.isConnected = true;
        if (this._debug && this._enable) {
          console.log("WebSocket connected");
        }
      };

      this.websocket.onclose = () => {
        this.isConnected = false;
        if (this._debug && this._enable) {
          console.log("WebSocket disconnected");
        }
      };

      this.websocket.onerror = (error) => {
        this.isConnected = false;
        if (this._debug && this._enable) {
          console.error("WebSocket error:", error);
        }
      };

      return true;
    } catch (error) {
      if (this._debug && this._enable) {
        console.error("Failed to initialize UDP Network:", error);
      }
      return false;
    }
  }

  sendUDPMessage(data) {
    if (!this._enable) {
      return false;
    }

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      if (this._debug && this._enable) {
        console.error("WebSocket not connected");
      }
      return false;
    }

    try {
      this.websocket.send(data);
      if (this._debug && this._enable) {
        console.log("UDP message sent:", data.byteLength, "bytes");
      }
      return true;
    } catch (error) {
      if (this._debug && this._enable) {
        console.error("Error sending message:", error);
      }
      return false;
    }
  }

  close() {
    if (this.websocket) {
      if (this._debug) console.log("Closing UDP Network connection");
      this.websocket.close();
    }
  }

  getStatus() {
    return {
      enabled: this._enable,
      debug: this._debug,
      connected: this.isConnected,
      ready: this.websocket?.readyState === WebSocket.OPEN,
    };
  }
}

// Export both the class and a singleton instance
export const udpNetwork = new UDPNetwork();
export { UDPNetwork };
