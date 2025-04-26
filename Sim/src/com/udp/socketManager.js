import { eventBus } from '../../util/eventManager.js';

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
    this.port = 5501;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryTimeout = null;
    this.emuHandlers = [];
    this.expectingBinaryData = false;
    this.expectedBinaryLength = 0;
    this.explicitDisconnect = false;

    // Initialize command state tracking
    this.lastSentCommands = {};
    Object.values(SocketManager.COMMANDS).forEach(cmd => {
      this.lastSentCommands[cmd.debounceKey] = { value: null, time: 0 };
    });

    this.db = null;
  }

  connect(port = 5501) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      if (this.db?.udp) console.log(`SocketManager Connect: Already connected or connecting to ws://localhost:${this.port}. Ignoring call.`);
      return;
    }

    this.port = port;
    try {
      if (this.db?.udp) console.log(`Attempting WebSocket connection to ws://localhost:${port}`);

      this.ws = new WebSocket(`ws://localhost:${port}`);
      this.setupHandlers();
    } catch (err) {
      console.error("WebSocket creation failed:", err);
      this.isConnected = false;
    }
  }

  setDebugFlags(debugFlags) {
    this.db = debugFlags;
  }

  sendData(data) {
    if (!this.ws) {
      return false;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (this.db?.udp && this.db?.comSR) console.log("Socket Sending message:", data);

    this.ws.send(data);
    return true;
  }

  setupHandlers() {
    if (!this.ws) {
      throw new Error("Cannot setup handlers: WebSocket not initialized");
    }

    this.ws.onopen = () => {
      if (this.db?.udp) console.log("WebSocket connection established");
      this.isConnected = true;
      this.retryCount = 0;
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }

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
      const wasConnected = this.isConnected;
      if (this.db?.udp) console.log("WebSocket connection closed.", wasConnected ? "(Previously connected)" : "(Not connected)");
      this.isConnected = false;
      this.ws = null;

      if (this.explicitDisconnect) {
        this.explicitDisconnect = false;
        if (this.db?.udp) console.log("Skipping reconnect attempt due to explicit disconnect.");
      } else {
        if (wasConnected && !this.retryTimeout && this.retryCount < this.maxRetries) {
          this.retryCount++;
          if (this.db?.udp) console.log(`Retry attempt ${this.retryCount} of ${this.maxRetries} in 3 seconds...`);
          this.retryTimeout = setTimeout(() => this.reconnect(), 3000);
        } else if (wasConnected && this.retryCount >= this.maxRetries) {
          if (this.db?.udp) console.log("Max retry attempts reached. Stopping automatic reconnection.");
          this.retryCount = 0;
        }
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
      if (this.db?.udp) {
        console.error("WebSocket error:", error);
      }
      this.callbacks.forEach((cb) => cb({ type: "error", error }));
    };

    this.ws.onmessage = (event) => {
      let data = event.data;

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
    if (this.db?.udp) console.log("Attempting reconnect...");
    this.connect(this.port);
  }

  disconnect() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
      this.retryCount = 0;
      if (this.db?.udp) console.log("Cleared pending reconnect attempts due to explicit disconnect.");
    }

    if (!this.ws) {
      if (this.db?.udp) console.log("SocketManager Disconnect: Already disconnected or not initialized.");
      return;
    }

    if (this.db?.udp) console.log("Closing WebSocket connection explicitly.");
    try {
      this.explicitDisconnect = true;
      this.ws.close();
    } catch (e) {
      console.error("Error closing WebSocket:", e);
      this.ws = null;
      this.isConnected = false;
      this.explicitDisconnect = false;
      this.callbacks.forEach((cb) => cb({ type: "disconnect" }));
    }
  }

  processMessage(data) {
    if (data instanceof ArrayBuffer) {
      const byteLength = data.byteLength;

      if (byteLength === 4) {
        const view = new DataView(data);
        const x = view.getInt16(0, true);
        const y = view.getInt16(2, true);

        if (this.db?.comSR) console.log(`Received mouse data: x=${x}, y=${y}`);
        this.mouseCallbacks.forEach((callback) => callback(x, y));
      } else if (byteLength === 13) {
        if (this.db?.comSR) console.log(`Received EMU data: ${byteLength} bytes`);

        this.emuHandlers.forEach((handler) => handler(data));
      } else if (byteLength === 12) {
      } else if (byteLength === 16) {
      }
      return;
    }

    try {
      const jsonData = JSON.parse(data);
      this.callbacks.forEach((cb) => cb(jsonData));
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  sendCommand(commandType, value) {
    if (this.db?.udp) console.log(`>>> Socket sendCommand ENTERED with type: ${typeof commandType}`, commandType, ` | value: ${typeof value}`, value);
    const command = SocketManager.COMMANDS[commandType];
    if (!command) {
      console.error(`Invalid command type: ${commandType}`);
      return false;
    }

    if (!command.validate(value)) {
      console.error(`Invalid value for command ${commandType}: ${value}`);
      return false;
    }

    const now = Date.now();
    const lastSent = this.lastSentCommands[command.debounceKey];

    if (lastSent.value === value && now - lastSent.time < 500) {
      return false;
    }

    this.lastSentCommands[command.debounceKey] = { value, time: now };

    if (this.isConnected) {
      const byteArray = new Uint8Array([command.index, value]);

      this.send(byteArray);

      setTimeout(() => {
        if (this.isConnected) {
          this.send(byteArray);
        }
      }, 50);

      if (this.db?.udp) console.log(`Sending command ${commandType}:`, value);

      return true;
    }
    if (this.db?.udp) console.warn(`Socket sendCommand Failed: Not connected.`);
    return false;
  }
}

export const socketManager = SocketManager.getInstance();
