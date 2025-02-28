import { WebSocketServer } from "ws";
import { createSocket } from "dgram";
import { NetworkConfig } from "../networkConfig.js";

/**
 * Starts WebSocket and UDP servers
 * @returns {Object} Server instances
 */
export const startServer = () => {
  console.log("Starting network servers...");

  // UDP client for sending data to external devices
  const udpClient = createSocket("udp4");

  // UDP server for receiving input data from external devices
  const udpServer = createSocket("udp4");

  // WebSocket server for browser client communication
  const wss = new WebSocketServer({
    port: NetworkConfig.WEBSOCKET_PORT,
  });

  // Set up UDP server to listen for incoming data
  udpServer.on("error", (err) => {
    console.error(`UDP Server error: ${err}`);
    udpServer.close();
  });

  // Enhanced message handler that only processes mouse data packets
  udpServer.on("message", (msg, rinfo) => {
    // Log all incoming packets
    // console.log(
    //   `Received UDP data: ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`
    // );

    try {
      // Process only 4-byte packets as mouse input
      if (msg.length === 4) {
        // Parse X and Y values from mouse data packet
        const x = msg.readInt16LE(0);
        const y = msg.readInt16LE(2);

        console.log(`Mouse input: x=${x}, y=${y}`);

        // Forward to all WebSocket clients
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            // OPEN
            client.send(
              JSON.stringify({
                type: "mouseMove",
                x: x,
                y: y,
              })
            );
          }
        });
      } else {
        // // Just log non-mouse packets without parsing them
        // console.log(`Skipping non-mouse packet (${msg.length} bytes)`);
        // // Optional: Add more detailed logging for debugging
        // if (process.env.DEBUG_ALL_PACKETS) {
        //   let packetDump = "Packet contents: ";
        //   for (let i = 0; i < Math.min(msg.length, 16); i++) {
        //     // Show max 16 bytes
        //     packetDump += msg[i].toString(16).padStart(2, "0") + " ";
        //   }
        //   if (msg.length > 16) packetDump += "...";
        //   console.log(packetDump);
        // }
      }
    } catch (error) {
      console.error(`Error processing UDP message: ${error.message}`);
    }
  });

  udpServer.on("listening", () => {
    const address = udpServer.address();
    console.log(`UDP Server listening on ${address.address}:${address.port}`);
  });

  // Bind UDP server to input port
  udpServer.bind(NetworkConfig.UDP_INPUT_PORT, NetworkConfig.UDP_INPUT_HOST);

  // Rest of the WebSocket server setup
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
      udpServer.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", cleanup);
};

startServer();
