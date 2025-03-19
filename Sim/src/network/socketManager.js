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
    this.mouseCallbacks = new Set(); // New: specific callbacks for mouse data
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
  }

  connect(port = 5501) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    if (!this.enable) {
      console.log("WebSocket disabled - not connecting");
      return;
    }

    this.port = port;
    try {
      console.log(`Attempting WebSocket connection to ws://localhost:${port}`);
      this.ws = new WebSocket(`ws://localhost:${port}`);
      this.setupHandlers();
    } catch (err) {
      console.error("WebSocket creation failed:", err);
    }
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (this.debugSend) {
        console.log("Sending message:", data);
      }
      this.ws.send(data);
      return true;
    }
    return false;
  }

  setupHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket connection established");
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
      console.log("WebSocket connection closed");
      this.isConnected = false;

      if (this.enable && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retry attempt ${this.retryCount} of ${this.maxRetries}`);
        this.retryTimeout = setTimeout(() => this.reconnect(), 5000);
      } else if (this.retryCount >= this.maxRetries) {
        console.log("Max retry attempts reached");
        this.enable = false;
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

  // Add method to register message handlers
  addMessageHandler(callback) {
    this.callbacks.add(callback);
  }

  // Add method to remove message handlers
  removeMessageHandler(callback) {
    this.callbacks.delete(callback);
  }

  // Add specialized handler for mouse movements
  addMouseHandler(callback) {
    this.mouseCallbacks.add(callback);
  }

  removeMouseHandler(callback) {
    this.mouseCallbacks.delete(callback);
  }

  // Add an EMU data handler function
  addEmuHandler(callback) {
    this.emuHandlers.push(callback);
    return this;
  }

  // Remove an EMU data handler function
  removeEmuHandler(callback) {
    this.emuHandlers = this.emuHandlers.filter((h) => h !== callback);
    return this;
  }

  // Call this from your message handling code when EMU data arrives
  handleEmuData(data) {
    if (this.emuHandlers && this.emuHandlers.length > 0) {
      this.emuHandlers.forEach((handler) => handler(data));
    }
  }

  reconnect() {
    if (this.ws) {
      this.disconnect();
    }
    this.connect(this.port);
  }

  disconnect() {
    console.log("Closing WebSocket connection");
    this.ws.close();
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
        if (this.debugReceive) {
          console.log(`Received mouse data: x=${x}, y=${y}`);
        }
        this.mouseCallbacks.forEach((callback) => callback(x, y));
      }
      // EMU data (24 bytes)
      else if (byteLength === 13) {
        // Notify EMU handlers directly with the binary data
        if (this.debugReceive) {
          console.log(`Received EMU data: ${byteLength} bytes`);
        }
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

      if (this.debugSend) {
        console.log(`Sending command ${commandType}:`, value);
      }

      return true;
    }
    return false;
  }

  // Convenience methods for specific commands
  sendColor(value) {
    return this.sendCommand('COLOR', value);
  }

  sendBrightness(value) {
    return this.sendCommand('BRIGHTNESS', value);
  }

  sendPower(value) {
    return this.sendCommand('POWER', value);
  }
}

export const socketManager = SocketManager.getInstance();
