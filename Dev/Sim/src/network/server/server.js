import WebSocket from "ws";
import dgram from "dgram";

const WS_PORT = 8080;
const UDP_PORT = 3000;
const UDP_HOST = "localhost";

// Create UDP socket
const udpSocket = dgram.createSocket("udp4");

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WebSocket server listening on port ${WS_PORT}`);
console.log(`Forwarding to UDP ${UDP_HOST}:${UDP_PORT}`);

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    const byteArray = data instanceof Uint8Array ? data : new Uint8Array(data);

    // Only process if data length matches expected density array
    if (byteArray.length === 341) {
      // Log first 10 bytes in a readable format
      console.log(
        "Received density data (first 10 bytes):",
        Array.from(byteArray.slice(0, 10))
          .map((b) => b.toString().padStart(3))
          .join(", ")
      );

      // Forward data to UDP
      udpSocket.send(data, UDP_PORT, UDP_HOST, (err) => {
        if (err) console.error("UDP send error:", err);
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

process.on("SIGINT", () => {
  udpSocket.close();
  wss.close();
  process.exit();
});
