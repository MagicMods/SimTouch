#ifndef ACC_H_
#define ACC_H_

float convertRawAcceleration(float aRaw);
float convertRawGyro(float gRaw);

void calibrateGyro();
void SetupAcc();
void LoopAcc();

#endif