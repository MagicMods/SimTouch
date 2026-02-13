#include "Acc.h"

#include <Arduino.h>

static AccelData gAccel{0.0f, 0.0f, 1.0f};

void SetupAcc()
{
  gAccel = {0.0f, 0.0f, 1.0f};
}

void LoopAcc()
{
  // Placeholder IMU loop for Phase2 scaffold.
  // Real QMI8658 path from Phase1 can be dropped in directly.
  const float t = millis() * 0.001f;
  gAccel.x = 0.15f * sinf(t * 0.5f);
  gAccel.y = 0.10f * cosf(t * 0.4f);
  gAccel.z = 1.0f;
}

AccelData GetAccelData()
{
  return gAccel;
}
