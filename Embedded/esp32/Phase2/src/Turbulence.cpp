#include "Turbulence.h"

#include <math.h>

static float fractf(float v)
{
  return v - floorf(v);
}

float Turbulence::noise2d(float x, float y) const
{
  float h = sinf(x * 12.9898f + y * 78.233f) * 43758.5453f;
  return fractf(h) * 2.0f - 1.0f;
}

void Turbulence::apply(float *x, float *y, float *vx, float *vy, uint16_t count, float dt, float tNow)
{
  const float strength = config_->turbStrength;
  if (strength <= 1e-6f)
  {
    return;
  }
  const float scale = config_->turbScale;
  const float speed = config_->turbSpeed;
  const float z = tNow * speed;
  for (uint16_t i = 0; i < count; ++i)
  {
    float n1 = noise2d(x[i] * scale + z, y[i] * scale - z);
    float n2 = noise2d(y[i] * scale - z, x[i] * scale + z);
    vx[i] += n1 * strength * dt;
    vy[i] += n2 * strength * dt;
  }
}
