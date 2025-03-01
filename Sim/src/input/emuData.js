export class EmuData {
  constructor() {
    // Accelerometer data (linear acceleration in g)
    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 0;

    // Sensitivity multiplier
    this.accelSensitivity = 1.0;

    // Calibration offsets
    this.accelOffsetX = 0;
    this.accelOffsetY = 0;
    this.accelOffsetZ = 0;
  }

  // Update EMU data from raw values
  update(accelX, accelY, accelZ) {
    this.accelX = (accelX - this.accelOffsetX) * this.accelSensitivity;
    this.accelY = (accelY - this.accelOffsetY) * this.accelSensitivity;
    this.accelZ = (accelZ - this.accelOffsetZ) * this.accelSensitivity;
  }

  // Update from binary data (13 bytes: 3 float32 values + 1 ghost byte)
  updateFromBinary(buffer) {
    // Skip the ghost byte
    const view = new DataView(buffer);

    // Read 3 float32 values (4 bytes each)
    const accelX = view.getFloat32(0, true); // true = little endian
    const accelY = view.getFloat32(4, true);
    const accelZ = view.getFloat32(8, true);

    this.update(accelX, accelY, accelZ);
  }

  // Parse string format like "ACCEL.x:-0.09,ACCEL.y:0.10,ACCEL.z:-1.01"
  updateFromString(dataString) {
    const values = {};
    const parts = dataString.split(",");

    parts.forEach((part) => {
      const [key, value] = part.split(":");
      values[key] = parseFloat(value);
    });

    this.update(
      values["ACCEL.x"] || 0,
      values["ACCEL.y"] || 0,
      values["ACCEL.z"] || 0
    );
  }

  calibrate() {
    // Store current values as offsets
    this.accelOffsetX = this.accelX / this.accelSensitivity + this.accelOffsetX;
    this.accelOffsetY = this.accelY / this.accelSensitivity + this.accelOffsetY;

    // Keep gravity in z-direction
    const gravityMagnitude =
      Math.sqrt(
        this.accelX * this.accelX +
          this.accelY * this.accelY +
          this.accelZ * this.accelZ
      ) / this.accelSensitivity;

    this.accelOffsetZ =
      this.accelZ / this.accelSensitivity +
      this.accelOffsetZ -
      gravityMagnitude;
  }

  setAccelSensitivity(value) {
    this.accelSensitivity = value;
  }
}
