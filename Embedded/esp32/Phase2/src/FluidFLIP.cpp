#include "FluidFLIP.h"

#include <string.h>

void FluidFLIP::clear()
{
  memset(pressure_, 0, sizeof(pressure_));
  memset(divergence_, 0, sizeof(divergence_));
}

void FluidFLIP::step(float dt)
{
  (void)dt;
  (void)config_;
}
