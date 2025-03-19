import c0 from "./gradients/c0.js";
import c1 from "./gradients/c1.js";
import c2 from "./gradients/c2.js";
import c3 from "./gradients/c3.js";
import c4 from "./gradients/c4.js";
import c5 from "./gradients/c5.js";
import c6 from "./gradients/c6.js";
import c7 from "./gradients/c7.js";
import c8 from "./gradients/c8.js";
import c9 from "./gradients/c9.js";
import c10 from "./gradients/c10.js";
import { socketManager } from "../network/socketManager.js";

export class Gradient {
  // Use FastLED palettes as presets
  static PRESETS = {
    c0,
    c1,
    c2,
    c3,
    c4,
    c5,
    c6,
    c7,
    c8,
    c9,
    c10,
  };

  constructor(presetName = "c0") {
    this.currentPreset = presetName;
    this.points = [];
    this.values = new Array(256).fill(0).map(() => ({ r: 0, g: 0, b: 0 }));
    this.socket = socketManager;
    this.applyPreset(presetName);
  }

  applyPreset(presetName) {
    if (!Gradient.PRESETS[presetName]) {
      console.warn(`Preset "${presetName}" not found, using default`);
      presetName = "c0";
    }

    const oldPreset = this.currentPreset;
    this.currentPreset = presetName;

    // Deep clone the preset points to avoid modifying the original
    this.points = JSON.parse(JSON.stringify(Gradient.PRESETS[presetName]));
    this.update();

    // If preset actually changed, send notification over socket
    if (oldPreset !== presetName) {
      this.sendGradientUpdate(presetName);
    }

    return this.points;
  }

  // Send gradient update to hardware over WebSocket
  sendGradientUpdate(presetName) {
    const presetIndex = this.getPresetIndex(presetName);
    return this.socket.sendColor(presetIndex);
  }

  // Get the numeric index of a preset (c0=0, c1=1, etc.)
  getPresetIndex(presetName) {
    const presetNames = this.getPresetNames();
    return presetNames.indexOf(presetName);
  }

  getPresetNames() {
    return Object.keys(Gradient.PRESETS);
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  update() {
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let lower = this.points[0];
      let upper = this.points[this.points.length - 1];

      for (let j = 0; j < this.points.length - 1; j++) {
        if (t * 100 >= this.points[j].pos && t * 100 < this.points[j + 1].pos) {
          lower = this.points[j];
          upper = this.points[j + 1];
          break;
        }
      }

      const range = upper.pos - lower.pos;
      const localT = (t * 100 - lower.pos) / range;

      this.values[i] = {
        r: this.lerp(lower.color.r, upper.color.r, localT),
        g: this.lerp(lower.color.g, upper.color.g, localT),
        b: this.lerp(lower.color.b, upper.color.b, localT),
      };
    }
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  getPoints() {
    return this.points;
  }

  getValues() {
    return this.values;
  }
}
