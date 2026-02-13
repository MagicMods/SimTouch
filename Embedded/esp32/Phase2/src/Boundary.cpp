#include "Boundary.h"

#include <math.h>

void Boundary::enforce(float &x, float &y, float &vx, float &vy) const
{
  const float damping = config_->boundaryDamping;
  if (config_->boundaryShape == BOUNDARY_RECTANGULAR)
  {
    const float minV = 0.0f;
    const float maxV = 1.0f;
    if (x < minV || x > maxV)
    {
      if (config_->boundaryMode == 0)
      {
        x = x < minV ? minV : maxV;
        vx = -vx * damping;
      }
      else
      {
        x = x < minV ? maxV : minV;
      }
    }
    if (y < minV || y > maxV)
    {
      if (config_->boundaryMode == 0)
      {
        y = y < minV ? minV : maxV;
        vy = -vy * damping;
      }
      else
      {
        y = y < minV ? maxV : minV;
      }
    }
    return;
  }

  const float cx = 0.5f;
  const float cy = 0.5f;
  const float radius = getRadius();
  const float dx = x - cx;
  const float dy = y - cy;
  const float dist = sqrtf(dx * dx + dy * dy);
  if (dist <= radius || dist <= 0.0f)
  {
    return;
  }

  if (config_->boundaryMode == 1)
  {
    x = cx - dx;
    y = cy - dy;
    return;
  }

  const float nx = dx / dist;
  const float ny = dy / dist;
  x = cx + nx * radius;
  y = cy + ny * radius;
  const float dot = vx * nx + vy * ny;
  vx = (vx - 2.0f * dot * nx) * damping;
  vy = (vy - 2.0f * dot * ny) * damping;
}

BoundaryType Boundary::getBoundaryType() const
{
  return config_->boundaryShape == 0 ? BOUNDARY_CIRCULAR : BOUNDARY_RECTANGULAR;
}

float Boundary::getRadius() const
{
  return 0.5f * config_->boundaryScale;
}
