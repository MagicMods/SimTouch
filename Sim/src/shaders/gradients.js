import c0 from "./Gradients/c0.js";
import c1 from "./Gradients/c1.js";
import c2 from "./Gradients/c2.js";
import c3 from "./Gradients/c3.js";
import c4 from "./Gradients/c4.js";
import c5 from "./Gradients/c5.js";
import c6 from "./Gradients/c6.js";
import c7 from "./Gradients/c7.js";
import c8 from "./Gradients/c8.js";
import c9 from "./Gradients/c9.js";
import c10 from "./Gradients/c10.js";
import { socketManager } from "../network/socketManager.js";

export class Gradients {
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

  constructor(debugFlags, presetName = "c0") {

    this.debug = debugFlags;
    this.currentPreset = presetName;
    this.points = [];
    this.values = new Array(256).fill(0).map(() => ({ r: 0, g: 0, b: 0 }));
    this.socket = socketManager;
    this.applyPreset(presetName);
  }

  applyPreset(presetName) {
    if (this.debug.gradients) console.log(`>>> applyPreset called with presetName: ${typeof presetName}`, presetName);
    if (!Gradients.PRESETS[presetName]) {
      console.warn(`Preset "${presetName}" not found, using default`);
      presetName = "c0";
    }

    const oldPreset = this.currentPreset;
    this.currentPreset = presetName;

    // Deep clone the preset points to avoid modifying the original
    this.points = JSON.parse(JSON.stringify(Gradients.PRESETS[presetName]));
    this.update();

    // If preset actually changed, send notification over socket
    if (oldPreset !== presetName) {
      if (this.debug.gradients) console.log(`>>> applyPreset calling sendGradientsUpdate`);
      this.sendGradientsUpdate(presetName);
    }

    return this.points;
  }

  /**
   * Sets the gradient points from a custom array of color stops.
   * @param {Array<{pos: number, color: {r: number, g: number, b: number}}>} colorStopsArray - Array of color stops.
   * @returns {boolean} True if successful, false otherwise.
   */
  setColorStops(colorStopsArray) {
    // Validation
    if (!Array.isArray(colorStopsArray) || colorStopsArray.length < 2) {
      console.warn("setColorStops: Input must be an array with at least two color stops.");
      return false;
    }
    const isValid = colorStopsArray.every(stop =>
      typeof stop.pos === 'number' &&
      typeof stop.color === 'object' &&
      stop.color !== null &&
      typeof stop.color.r === 'number' &&
      typeof stop.color.g === 'number' &&
      typeof stop.color.b === 'number'
    );
    if (!isValid) {
      console.warn("setColorStops: Each color stop must have { pos: number, color: { r: number, g: number, b: number } }.");
      return false;
    }

    // Deep clone and sort
    this.points = JSON.parse(JSON.stringify(colorStopsArray));
    this.points.sort((a, b) => a.pos - b.pos);

    // Set state and update lookup table
    this.currentPreset = "custom"; // Use "custom" to indicate non-preset state
    this.update();

    console.log("setColorStops: Successfully applied custom color stops.");
    return true;
  }

  // Send Gradients update to hardware over WebSocket
  sendGradientsUpdate(presetName) {
    // Skip sending if using custom stops
    if (this.currentPreset === "custom") {
      console.log("sendGradientsUpdate: Skipping hardware sync for custom gradient.");
      return false;
    }
    const presetIndex = this.getPresetIndex(presetName);
    if (this.debug.gradients) console.log(`>>> sendGradientsUpdate: presetName="${presetName}", calculated index: ${presetIndex}`);
    // Check if presetIndex is valid before sending
    if (presetIndex === -1) {
      console.warn(`sendGradientsUpdate: Preset name "${presetName}" not found, cannot send update.`);
      return false;
    }
    // return this.socket.sendColor(presetIndex);
    return true;
  }

  // Get the numeric index of a preset (c0=0, c1=1, etc.)
  getPresetIndex(presetName) {
    const presetNames = this.getPresetNames();
    return presetNames.indexOf(presetName);
  }

  getPresetNames() {
    return Object.keys(Gradients.PRESETS);
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
