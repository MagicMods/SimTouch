#ifndef PHASE2_IMU_FORCES_H
#define PHASE2_IMU_FORCES_H

#include "SimConfig.h"

class ImuForces
{
public:
  explicit ImuForces(SimConfig *cfg) : config_(cfg) {}
  void setAccel(float ax, float ay, float az);
  void apply();

private:
  SimConfig *config_;
  float rawAx_ = 0.0f;
  float rawAy_ = 0.0f;
  float rawAz_ = 0.0f;
  float smoothGx_ = 0.0f;
  float smoothGy_ = 0.0f;
};

#endif
