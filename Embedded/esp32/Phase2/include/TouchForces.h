#ifndef PHASE2_TOUCH_FORCES_H
#define PHASE2_TOUCH_FORCES_H

#include "SimConfig.h"

class SimCore;

class TouchForces
{
public:
  explicit TouchForces(SimConfig *cfg) : config_(cfg) {}
  void setTouchPixels(uint16_t x, uint16_t y, bool active);
  void apply(SimCore &simCore);

private:
  SimConfig *config_;
  float touchX_ = 0.0f;
  float touchY_ = 0.0f;
  bool touchActive_ = false;
};

#endif
