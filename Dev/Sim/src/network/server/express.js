import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const HTTP_PORT = 5502;

// Configure CORS to allow requests from live-server
app.use(
  cors({
    origin: ["http://127.0.0.1:8080", "http://localhost:8080"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const presetsDir = path.join(__dirname, "../../../presets");

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
    console.log(`Saved preset: ${filepath}`);
    res.json({ success: true, filename });
  } catch (error) {
    console.error("Save preset error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Preset server running on port ${HTTP_PORT}`);
});
