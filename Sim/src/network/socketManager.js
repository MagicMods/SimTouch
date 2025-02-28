class SocketManager {
  static instance;

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
      try {
        // Parse the message data
        const message = event.data;
        let parsedData;

        // Try to parse as JSON if it's a string
        if (typeof message === "string") {
          try {
            parsedData = JSON.parse(message);

            // Special handling for mouse movement data
            if (parsedData.type === "mouseMove") {
              if (this.debugReceive) {
                console.log(
                  `Received mouse move data: x=${parsedData.x}, y=${parsedData.y}`
                );
              }
              // Notify mouse-specific callbacks
              this.mouseCallbacks.forEach((callback) =>
                callback(parsedData.x, parsedData.y)
              );
              return; // Skip general callbacks for mouse data
            }
          } catch (e) {
            // Not JSON, treat as regular message
            parsedData = message;
          }
        } else {
          parsedData = message;
        }

        // Notify general callbacks
        this.callbacks.forEach((callback) => callback(parsedData));
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
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
}

export const socketManager = SocketManager.getInstance();
