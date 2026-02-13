#ifndef PHASE2_GRAVITY_FORCES_H
#define PHASE2_GRAVITY_FORCES_H

#include <stdint.h>

namespace GravityForces
{
void apply(float gx, float gy, float dt, float *velX, float *velY, uint16_t count);
}

#endif
