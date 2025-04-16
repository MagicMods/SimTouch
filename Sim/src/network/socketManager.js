import { eventBus } from '../util/eventManager.js';

class SocketManager {
  static instance;

  // Command types and their validation rules
  static COMMANDS = {
    COLOR: {
      index: 6,
      validate: (value) => typeof value === 'number' && value >= 0 && value <= 255,
      debounceKey: 'color'
    },
    BRIGHTNESS: {
      index: 7,
      validate: (value) => typeof value === 'number' && value >= 0 && value <= 100,
      debounceKey: 'brightness'
    },
    POWER: {
      index: 8,
      validate: (value) => typeof value === 'number' && value >= 0 && value <= 100,
      debounceKey: 'power'
    }
  };

  static getInstance() {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.callbacks = new Set();
    this.mouseCallbacks = new Set();
    this.enable = false;
    this.debugSend = false;
    this.debugReceive = false;
    this.port = 5501;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryTimeout = null;
    this.emuHandlers = [];
    this.expectingBinaryData = false;
    this.expectedBinaryLength = 0;

    // Initialize command state tracking
    this.lastSentCommands = {};
    Object.values(SocketManager.COMMANDS).forEach(cmd => {
      this.lastSentCommands[cmd.debounceKey] = { value: null, time: 0 };
    });

    // Subscribe to parameter updates
    eventBus.on('simParamsUpdated', this.handleParamsUpdate.bind(this));
  }

  // Add handler for simParams updates
  handleParamsUpdate({ simParams }) {
    if (simParams?.network) {
      const netParams = simParams.network;
      const previousEnable = this.enable; // Store previous state

      this.debugSend = netParams.debugSend ?? this.debugSend;
      this.debugReceive = netParams.debugReceive ?? this.debugReceive;
      this.enable = netParams.enabled ?? this.enable;

      // Connect or disconnect if enable state changed
      if (this.enable !== previousEnable) {
        if (this.debugSend) console.log(`SocketManager: Enable state changed to ${this.enable}.`);
        if (this.enable) {
          // Connect only if not already connected or trying to connect
          if (!this.isConnected && !this.retryTimeout && this.ws?.readyState !== WebSocket.CONNECTING) {
            this.connect();
          }
        } else {
          // Disconnect if connected
          if (this.isConnected || this.ws?.readyState === WebSocket.CONNECTING) {
            this.disconnect();
          }
          // Also clear any pending retry timeouts if disabling
          if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
            this.retryCount = 0; // Reset retries when manually disabled
          }
        }
      }
    }
  }

  connect(port = 5501) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.port = port;
    try {
      if (this.debugSend) console.log(`Attempting WebSocket connection to ws://localhost:${port}`);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
      if (this.connectTimeout) clearTimeout(this.connectTimeout);

      this.ws = new WebSocket(`ws://localhost:${port}`);
      this.setupHandlers();
    } catch (err) {
      console.error("WebSocket creation failed:", err);
      this.isConnected = false;
    }
  }

  send(data) {
    if (!this.ws) {
      return false;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (this.debugSend) console.log("Sending message:", data);

    this.ws.send(data);
    return true;
  }

  setupHandlers() {
    if (!this.ws) {
      throw new Error("Cannot setup handlers: WebSocket not initialized");
    }

    this.ws.onopen = () => {
      if (this.debugSend) console.log("WebSocket connection established");
      this.isConnected = true;
      this.retryCount = 0;

      // Notify all callbacks about connection
      this.callbacks.forEach((cb) => {
        try {
          cb({ type: "connect" });
        } catch (err) {
          console.error("Error in connection callback:", err);
        }
      });
    };

    this.ws.onclose = () => {
      if (this.debugSend) console.log("WebSocket connection closed");
      this.isConnected = false;

      if (this.enable && this.retryCount < this.maxRetries) {
        this.retryCount++;
        if (this.debugSend) console.log(`Retry attempt ${this.retryCount} of ${this.maxRetries}`);
        this.retryTimeout = setTimeout(() => this.reconnect(), 5000);
      } else if (this.retryCount >= this.maxRetries) {
        if (this.debugSend) console.log("Max retry attempts reached");
      }

      // Notify all callbacks about disconnection
      this.callbacks.forEach((cb) => {
        try {
          cb({ type: "disconnect" });
        } catch (err) {
          console.error("Error in disconnection callback:", err);
        }
      });
    };

    this.ws.onerror = (error) => {
      if (this.debugSend) {
        console.error("WebSocket error:", error);
      }
      this.callbacks.forEach((cb) => cb({ type: "error", error }));
    };

    this.ws.onmessage = (event) => {
      // Get the data
      let data = event.data;

      // If it's a blob, convert to ArrayBuffer
      if (data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          this.processMessage(reader.result);
        };
        reader.readAsArrayBuffer(data);
      } else {
        this.processMessage(data);
      }
    };
  }

  addMessageHandler(callback) {
    if (typeof callback !== 'function') {
      throw new Error("Message handler must be a function");
    }
    this.callbacks.add(callback);
    return this;
  }

  removeMessageHandler(callback) {
    this.callbacks.delete(callback);
    return this;
  }

  addMouseHandler(callback) {
    if (typeof callback !== 'function') {
      throw new Error("Mouse handler must be a function");
    }
    this.mouseCallbacks.add(callback);
    return this;
  }

  removeMouseHandler(callback) {
    this.mouseCallbacks.delete(callback);
    return this;
  }

  addEmuHandler(callback) {
    if (typeof callback !== 'function') {
      throw new Error("EMU handler must be a function");
    }
    this.emuHandlers.push(callback);
    return this;
  }

  removeEmuHandler(callback) {
    this.emuHandlers = this.emuHandlers.filter((h) => h !== callback);
    return this;
  }

  handleEmuData(data) {
    if (!data) {
      return;
    }

    if (this.emuHandlers.length === 0) {
      return;
    }

    this.emuHandlers.forEach((handler) => handler(data));
  }

  reconnect() {
    if (this.ws) {
      this.disconnect();
    }
    this.connect(this.port);
  }

  disconnect() {
    if (!this.ws) {
      return;
    }

    if (this.debugSend) console.log("Closing WebSocket connection");
    this.ws.close();
    this.ws = null;
  }

  processMessage(data) {
    // If binary data
    if (data instanceof ArrayBuffer) {
      const byteLength = data.byteLength;

      // Mouse data (4 bytes)
      if (byteLength === 4) {
        const view = new DataView(data);
        const x = view.getInt16(0, true); // true = little endian
        const y = view.getInt16(2, true);

        // Notify mouse handlers
        if (this.debugReceive) console.log(`Received mouse data: x=${x}, y=${y}`);
        this.mouseCallbacks.forEach((callback) => callback(x, y));
      }
      // EMU data (24 bytes)
      else if (byteLength === 13) {
        // Notify EMU handlers directly with the binary data
        if (this.debugReceive) console.log(`Received EMU data: ${byteLength} bytes`);

        this.emuHandlers.forEach((handler) => handler(data));
      } else if (byteLength === 12) {
      } else if (byteLength === 16) {
      }
      return;
    }

    // For any other (non-binary) messages that might exist
    try {
      const jsonData = JSON.parse(data);
      this.callbacks.forEach((cb) => cb(jsonData));
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  // Unified command sending system
  sendCommand(commandType, value) {
    if (this.debugSend) console.log(`>>> sendCommand ENTERED with type: ${typeof commandType}`, commandType, ` | value: ${typeof value}`, value);
    const command = SocketManager.COMMANDS[commandType];
    if (!command) {
      console.error(`Invalid command type: ${commandType}`);
      return false;
    }

    // Validate the value
    if (!command.validate(value)) {
      console.error(`Invalid value for command ${commandType}: ${value}`);
      return false;
    }

    // Check debouncing
    const now = Date.now();
    const lastSent = this.lastSentCommands[command.debounceKey];

    if (lastSent.value === value && now - lastSent.time < 500) {
      return false;
    }

    // Update last sent state
    this.lastSentCommands[command.debounceKey] = { value, time: now };

    if (this.isConnected) {
      const byteArray = new Uint8Array([command.index, value]);

      // Send immediately
      this.send(byteArray);

      // Send again after a short delay for reliability
      setTimeout(() => {
        if (this.isConnected) {
          this.send(byteArray);
        }
      }, 50);

      if (this.debugSend) console.log(`Sending command ${commandType}:`, value);


      return true;
    }
    return false;
  }

  // Convenience methods for specific commands
  sendColor(value) {
    if (this.debugSend) console.log(`>>> sendColor called with value: ${typeof value}`, value);
    return this.sendCommand("COLOR", value);
  }

  sendBrightness(value) {
    return this.sendCommand(SocketManager.COMMANDS.BRIGHTNESS, value);
  }

  sendPower(value) {
    return this.sendCommand(SocketManager.COMMANDS.POWER, value);
  }
}

export const socketManager = SocketManager.getInstance();
