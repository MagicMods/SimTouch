#ifndef PHASE2_FLUID_FLIP_H
#define PHASE2_FLUID_FLIP_H

#include "SimConfig.h"

static constexpr uint8_t FLIP_GRID = 16;

class FluidFLIP
{
public:
  explicit FluidFLIP(SimConfig *cfg) : config_(cfg) {}
  void clear();
  void step(float dt);

private:
  SimConfig *config_;
  float pressure_[FLIP_GRID * FLIP_GRID] = {0.0f};
  float divergence_[FLIP_GRID * FLIP_GRID] = {0.0f};
};

#endif
