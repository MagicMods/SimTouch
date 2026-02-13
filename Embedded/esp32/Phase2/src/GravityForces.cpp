#include "GravityForces.h"

namespace GravityForces
{
void apply(float gx, float gy, float dt, float *velX, float *velY, uint16_t count)
{
  for (uint16_t i = 0; i < count; ++i)
  {
    velX[i] += gx * dt;
    velY[i] += gy * dt;
  }
}
}
