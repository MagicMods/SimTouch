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
    this.enable = false;
    this.debug = false;
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
      this.ws = new WebSocket(`ws://localhost:${port}`);
      this.setupHandlers();
      if (this.debug) {
        console.log(`Attempting connection to ws://localhost:${port}`);
      }
    } catch (err) {
      console.error("WebSocket creation failed:", err);
    }
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (this.debug) {
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
      this.isConnected = true;
      this.retryCount = 0;
      console.log("WebSocket connection established");
      this.callbacks.forEach((cb) => cb({ type: "connect" }));
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      console.log("WebSocket connection closed");

      if (this.enable && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retry attempt ${this.retryCount} of ${this.maxRetries}`);
        this.retryTimeout = setTimeout(() => this.reconnect(), 5000);
      } else if (this.retryCount >= this.maxRetries) {
        console.log("Max retry attempts reached");
        this.enable = false;
      }

      this.callbacks.forEach((cb) => cb({ type: "disconnect" }));
    };

    this.ws.onerror = (error) => {
      if (this.debug) {
        console.error("WebSocket error:", error);
      }
      this.callbacks.forEach((cb) => cb({ type: "error", error }));
    };

    this.ws.onmessage = (event) => {
      try {
        // Handle incoming messages
        const message = event.data;
        // Notify any registered callbacks
        this.callbacks.forEach((callback) => callback(message));
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
