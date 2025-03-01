export class EmuData {
  constructor() {
    // Gyroscope data (angular velocity in rad/s)
    this.gyroX = 0;
    this.gyroY = 0;
    this.gyroZ = 0;

    // Accelerometer data (linear acceleration in g)
    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 0;

    // Sensitivity multipliers
    this.gyroSensitivity = 1.0;
    this.accelSensitivity = 1.0;

    // Calibration offsets
    this.gyroOffsetX = 0;
    this.gyroOffsetY = 0;
    this.gyroOffsetZ = 0;
    this.accelOffsetX = 0;
    this.accelOffsetY = 0;
    this.accelOffsetZ = 0;
  }

  // Update EMU data from raw values
  update(gyroX, gyroY, gyroZ, accelX, accelY, accelZ) {
    this.gyroX = (gyroX - this.gyroOffsetX) * this.gyroSensitivity;
    this.gyroY = (gyroY - this.gyroOffsetY) * this.gyroSensitivity;
    this.gyroZ = (gyroZ - this.gyroOffsetZ) * this.gyroSensitivity;

    this.accelX = (accelX - this.accelOffsetX) * this.accelSensitivity;
    this.accelY = (accelY - this.accelOffsetY) * this.accelSensitivity;
    this.accelZ = (accelZ - this.accelOffsetZ) * this.accelSensitivity;
  }

  // Update from binary data (13 bytes: 1 header + 6 float16 values)
  updateFromBinary(buffer) {
    // Skip first byte (header)
    const view = new DataView(buffer, 1);

    // Read 6 float values (2 bytes each)
    const gyroX = view.getInt16(0, true) / 100;
    const gyroY = view.getInt16(2, true) / 100;
    const gyroZ = view.getInt16(4, true) / 100;
    const accelX = view.getInt16(6, true) / 100;
    const accelY = view.getInt16(8, true) / 100;
    const accelZ = view.getInt16(10, true) / 100;

    this.update(gyroX, gyroY, gyroZ, accelX, accelY, accelZ);
  }

  // Parse string format like "GYRO.x:2.17,GYRO.y:3.35,GYRO.z:0.64,ACCEL.x:-0.09,ACCEL.y:0.10,ACCEL.z:-1.01"
  updateFromString(dataString) {
    const values = {};
    const parts = dataString.split(",");

    parts.forEach((part) => {
      const [key, value] = part.split(":");
      values[key] = parseFloat(value);
    });

    this.update(
      values["GYRO.x"] || 0,
      values["GYRO.y"] || 0,
      values["GYRO.z"] || 0,
      values["ACCEL.x"] || 0,
      values["ACCEL.y"] || 0,
      values["ACCEL.z"] || 0
    );
  }

  calibrate() {
    // Store current values as offsets
    this.gyroOffsetX = this.gyroX / this.gyroSensitivity + this.gyroOffsetX;
    this.gyroOffsetY = this.gyroY / this.gyroSensitivity + this.gyroOffsetY;
    this.gyroOffsetZ = this.gyroZ / this.gyroSensitivity + this.gyroOffsetZ;

    // For accel, we want to keep gravity as -1.0 on Z typically
    const gravityMagnitude =
      Math.sqrt(
        this.accelX * this.accelX +
          this.accelY * this.accelY +
          this.accelZ * this.accelZ
      ) / this.accelSensitivity;

    this.accelOffsetX = this.accelX / this.accelSensitivity + this.accelOffsetX;
    this.accelOffsetY = this.accelY / this.accelSensitivity + this.accelOffsetY;
    // Keep gravity in z-direction
    this.accelOffsetZ =
      this.accelZ / this.accelSensitivity +
      this.accelOffsetZ -
      gravityMagnitude;
  }

  setGyroSensitivity(value) {
    this.gyroSensitivity = value;
  }

  setAccelSensitivity(value) {
    this.accelSensitivity = value;
  }
}
