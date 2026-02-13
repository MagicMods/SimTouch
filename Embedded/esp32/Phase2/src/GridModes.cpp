#include "GridModes.h"

#include <math.h>

void GridModes::computeProximity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = geom.getCellCount() < outCount ? geom.getCellCount() : outCount;
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const uint16_t pCount = sim.getCount();
  const float maxDensity = config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity;
  const float sigma = 0.06f;
  const float invSigma2 = 1.0f / (sigma * sigma);

  for (uint16_t c = 0; c < cells; ++c)
  {
    float density = 0.0f;
    const float cx = grid[c].x;
    const float cy = grid[c].y;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      float dx = cx - px[i];
      float dy = cy - py[i];
      float d2 = dx * dx + dy * dy;
      density += expf(-d2 * invSigma2);
    }
    float target = density / maxDensity;
    if (target > 1.0f)
      target = 1.0f;
    if (target < 0.0f)
      target = 0.0f;

    float rate = target > smooth_[c] ? config_->smoothRateIn : config_->smoothRateOut;
    smooth_[c] += (target - smooth_[c]) * rate;
    if (smooth_[c] < 0.0f)
      smooth_[c] = 0.0f;
    if (smooth_[c] > 1.0f)
      smooth_[c] = 1.0f;
    outValues[c] = (uint8_t)(smooth_[c] * 255.0f);
  }
}
