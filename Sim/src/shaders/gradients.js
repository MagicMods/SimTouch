export class Gradient {
  constructor() {
    this.points = [
      { pos: 0, color: { r: 0, g: 0, b: 0 } },
      { pos: 30, color: { r: 0.4, g: 0, b: 0 } },
      { pos: 60, color: { r: 1, g: 0, b: 0 } },
      { pos: 97, color: { r: 0.992, g: 1, b: 0.5 } },
      { pos: 100, color: { r: 1, g: 1, b: 1 } },
    ];
    this.values = new Array(256).fill(0).map(() => ({ r: 0, g: 0, b: 0 }));
    this.update();
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
