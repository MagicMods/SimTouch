#include "Arduino.h"
#include <Wire.h>
#include <SPI.h>
#include "SensorQMI8658.hpp"
#include "WifUdp.h"
#include "Main.h"

#ifndef SENSOR_SDA
#define SENSOR_SDA 6
#endif

#ifndef SENSOR_SCL
#define SENSOR_SCL 7
#endif

#ifndef SENSOR_IRQ
#define SENSOR_IRQ -1
#endif

SensorQMI8658 qmi;

IMUdata acc;
IMUdata gyr;
IMUdata gyr_offset;
IMUdata heading;

float accelScale, gyroScale;

float pitch = 0, roll = 0, yaw = 0;
float alpha = 0.98;

float convertRawAcceleration(float aRaw)
{
    // since we are using 2G range
    // -2g maps to a raw value of -32768
    // +2g maps to a raw value of 32767

    float a = (aRaw * 4.0) / 32768.0;
    return a;
}

float convertRawGyro(float gRaw)
{
    // since we are using 250 degrees/seconds range
    // -250 maps to a raw value of -32768
    // +250 maps to a raw value of 32767

    float g = (gRaw * 256.0) / 32768.0;
    return g;
}

void calibrateGyro()
{
    const int samples = 100;
    float gx_bias = 0, gy_bias = 0, gz_bias = 0;

    // Collect average values while stationary
    for (int i = 0; i < samples; i++)
    {
        while (!qmi.getDataReady())
        {
        }
        qmi.getGyroscope(gyr.x, gyr.y, gyr.z);
        gx_bias += gyr.x;
        gy_bias += gyr.y;
        gz_bias += gyr.z;
    }

    // Calculate average bias
    gyr_offset.x = gx_bias / samples;
    gyr_offset.y = gy_bias / samples;
    gyr_offset.z = gz_bias / samples;
}

void SetupAcc()
{

#if IMU_INT > 0
    qmi.setPins(IMU_INT);
#endif

    if (!qmi.begin(Wire, QMI8658_L_SLAVE_ADDRESS, SENSOR_SDA, SENSOR_SCL))
    {
        Serial.println("Failed to find QMI8658 - check your wiring!");
        while (1)
        {
            delay(1000);
        }
    }

    /* Get chip id*/
    Serial.print("Device ID:");
    Serial.println(qmi.getChipID(), HEX);

    if (qmi.selfTestAccel())
    {
        Serial.println("Accelerometer self-test successful");
    }
    else
    {
        Serial.println("Accelerometer self-test failed!");
    }

    if (qmi.selfTestGyro())
    {
        Serial.println("Gyroscope self-test successful");
    }
    else
    {
        Serial.println("Gyroscope self-test failed!");
    }

    qmi.configAccelerometer(
        /*
         * ACC_RANGE_2G
         * ACC_RANGE_4G
         * ACC_RANGE_8G
         * ACC_RANGE_16G
         * */
        SensorQMI8658::ACC_RANGE_4G,
        /*
         * ACC_ODR_1000H
         * ACC_ODR_500Hz
         * ACC_ODR_250Hz
         * ACC_ODR_125Hz
         * ACC_ODR_62_5Hz
         * ACC_ODR_31_25Hz
         * ACC_ODR_LOWPOWER_128Hz
         * ACC_ODR_LOWPOWER_21Hz
         * ACC_ODR_LOWPOWER_11Hz
         * ACC_ODR_LOWPOWER_3H
         * */
        SensorQMI8658::ACC_ODR_125Hz,
        /*
         *  LPF_MODE_0     //2.66% of ODR
         *  LPF_MODE_1     //3.63% of ODR
         *  LPF_MODE_2     //5.39% of ODR
         *  LPF_MODE_3     //13.37% of ODR
         *  LPF_OFF        // OFF Low-Pass Fitter
         * */
        SensorQMI8658::LPF_MODE_0);

    qmi.configGyroscope(
        /*
         * GYR_RANGE_16DPS
         * GYR_RANGE_32DPS
         * GYR_RANGE_64DPS
         * GYR_RANGE_128DPS
         * GYR_RANGE_256DPS
         * GYR_RANGE_512DPS
         * GYR_RANGE_1024DPS
         * */
        SensorQMI8658::GYR_RANGE_256DPS,
        /*
         * GYR_ODR_7174_4Hz
         * GYR_ODR_3587_2Hz
         * GYR_ODR_1793_6Hz
         * GYR_ODR_896_8Hz
         * GYR_ODR_448_4Hz
         * GYR_ODR_224_2Hz
         * GYR_ODR_112_1Hz
         * GYR_ODR_56_05Hz
         * GYR_ODR_28_025H
         * */
        SensorQMI8658::GYR_ODR_112_1Hz,
        /*
         *  LPF_MODE_0     //2.66% of ODR
         *  LPF_MODE_1     //3.63% of ODR
         *  LPF_MODE_2     //5.39% of ODR
         *  LPF_MODE_3     //13.37% of ODR
         *  LPF_OFF        // OFF Low-Pass Fitter
         * */
        SensorQMI8658::LPF_MODE_3);

    /*
     * If both the accelerometer and gyroscope sensors are turned on at the same time,
     * the output frequency will be based on the gyroscope output frequency.
     * The example configuration is 896.8HZ output frequency,
     * so the acceleration output frequency is also limited to 896.8HZ
     * */
    qmi.enableGyroscope();
    qmi.enableAccelerometer();

    // Print register configuration information
    qmi.dumpCtrlRegister();

#if IMU_INT > 0
    // If you want to enable interrupts, then turn on the interrupt enable
    qmi.enableINT(SensorQMI8658::INTERRUPT_PIN_1, true);
    qmi.enableINT(SensorQMI8658::INTERRUPT_PIN_2, false);
#endif

    Serial.println("Read data now...");

    // Perform calibration at startup
    calibrateGyro();
}

void LoopAcc()
{

    // Only process when data is ready
    if (qmi.getDataReady() && SIM_FLAG)
    {
        // Read sensor data
        qmi.getAccelerometer(acc.x, acc.y, acc.z);
        // Send to Unity
        SEND_UDP_SimAcc(acc);
    }
}
