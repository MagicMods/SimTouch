import { WebSocketServer } from "ws";
import { createSocket } from "dgram";
import { NetworkConfig } from "../networkConfig.js";

const startServer = () => {
  const udpClient = createSocket("udp4");

  // Create WebSocket server correctly
  const wss = new WebSocketServer({
    port: NetworkConfig.WEBSOCKET_PORT,
  });

  wss.on("listening", () => {
    console.log(
      `WebSocket server running on port ${NetworkConfig.WEBSOCKET_PORT}`
    );
  });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (data) => {
      const message = Buffer.from(data);
      udpClient.send(
        message,
        NetworkConfig.UDP_PORT,
        NetworkConfig.UDP_HOST,
        (err) => {
          if (err) {
            console.error("UDP send error:", err);
            ws.send(JSON.stringify({ error: err.message }));
          } else {
            ws.send(
              JSON.stringify({
                status: "sent",
                bytes: message.length,
              })
            );
          }
        }
      );
    });

    ws.on("close", () => console.log("Client disconnected"));
    ws.on("error", (error) => console.error("Client error:", error));
  });

  // Handle server errors
  wss.on("error", (error) => {
    console.error("WebSocket Server Error:", error);
  });

  // Cleanup on shutdown
  const cleanup = () => {
    console.log("\nShutting down server...");
    wss.clients.forEach((client) => client.close());
    wss.close(() => {
      udpClient.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", cleanup);
};

startServer();
