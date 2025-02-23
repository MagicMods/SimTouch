import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import dgram from "dgram";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Constants
const WS_PORT = 5501;
const HTTP_PORT = 5502;
const UDP_PORT = 3000;

// Setup paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const presetsDir = path.resolve(__dirname, "../../presets");

console.log("Presets directory:", presetsDir);

// Express setup
const app = express();
app.use(
  cors({
    origin: ["http://127.0.0.1:8080", "http://localhost:8080"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// Preset endpoints
app.get("/list-presets/:type", (req, res) => {
  const { type } = req.params;
  const presetDir = path.join(presetsDir, type);

  try {
    if (!fs.existsSync(presetDir)) {
      return res.json({ presets: [] });
    }
    const files = fs
      .readdirSync(presetDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
    res.json({ presets: files });
  } catch (error) {
    console.error("List presets error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/save-preset", (req, res) => {
  const { name, type, data } = req.body;
  const presetDir = path.join(presetsDir, type);
  const filename = `${name}.json`;
  const filepath = path.join(presetDir, filename);

  try {
    if (!fs.existsSync(presetDir)) {
      fs.mkdirSync(presetDir, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Saved preset to: ${filepath}`);
    res.json({ success: true, filename });
  } catch (error) {
    console.error("Save preset error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/load-preset/:type/:name", (req, res) => {
  const { type, name } = req.params;
  const filepath = path.join(presetsDir, type, `${name}.json`);

  try {
    if (!fs.existsSync(filepath)) {
      return res
        .status(404)
        .json({ error: `Preset ${name} not found at ${filepath}` });
    }
    const preset = JSON.parse(fs.readFileSync(filepath, "utf8"));
    res.json(preset);
  } catch (error) {
    console.error("Load preset error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
  console.log(`HTTP server listening on port ${HTTP_PORT}`);
});

// WebSocket setup
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`WebSocket server listening on port ${WS_PORT}`);

// UDP setup
const udpSocket = dgram.createSocket("udp4");
console.log(`Forwarding to UDP localhost:${UDP_PORT}`);

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    const byteArray = data instanceof Uint8Array ? data : new Uint8Array(data);

    if (byteArray.length === 341) {
      console.log(
        "Received density data (first 10 bytes):",
        Array.from(byteArray.slice(0, 10))
          .map((b) => b.toString().padStart(3))
          .join(", ")
      );

      udpSocket.send(data, UDP_PORT, "localhost", (err) => {
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
