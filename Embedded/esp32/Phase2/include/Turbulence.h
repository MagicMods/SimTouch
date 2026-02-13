#ifndef PHASE2_TURBULENCE_H
#define PHASE2_TURBULENCE_H

#include "SimConfig.h"

class Turbulence
{
public:
  explicit Turbulence(SimConfig *cfg) : config_(cfg) {}
  void apply(float *x, float *y, float *vx, float *vy, uint16_t count, float dt, float tNow);

private:
  float noise2d(float x, float y) const;
  SimConfig *config_;
};

#endif
