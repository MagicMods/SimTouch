#include "GridModes.h"

#include <math.h>
#include <string.h>

uint16_t GridModes::activeCellCount(const GridGeometry &geom, uint16_t outCount) const
{
  const uint16_t geomCells = geom.getCellCount();
  const uint16_t cappedGeom = geomCells > MAX_GRID_CELLS ? MAX_GRID_CELLS : geomCells;
  return cappedGeom < outCount ? cappedGeom : outCount;
}

float GridModes::cellContribution(float px, float py, float cellX, float cellY, float cellHalfWidth, float cellHalfHeight, float radius) const
{
  if (radius <= 1e-6f)
  {
    return 0.0f;
  }

  float dx = fabsf(px - cellX) - cellHalfWidth;
  float dy = fabsf(py - cellY) - cellHalfHeight;
  if (dx > radius || dy > radius)
  {
    return 0.0f;
  }
  if (dx < 0.0f)
  {
    dx = 0.0f;
  }
  if (dy < 0.0f)
  {
    dy = 0.0f;
  }

  const float distSq = dx * dx + dy * dy;
  const float radiusSq = radius * radius;
  if (distSq >= radiusSq)
  {
    return 0.0f;
  }

  return 1.0f - (sqrtf(distSq) / radius);
}

void GridModes::smoothAndStore(const float *target, uint16_t cells, uint8_t *outValues, uint16_t outCount)
{
  for (uint16_t c = 0; c < cells; ++c)
  {
    float t = target[c];
    if (t < 0.0f)
    {
      t = 0.0f;
    }
    if (t > 1.0f)
    {
      t = 1.0f;
    }

    const float inRate = config_->smoothRateIn < 0.0f ? 0.0f : (config_->smoothRateIn > 1.0f ? 1.0f : config_->smoothRateIn);
    const float outRate = config_->smoothRateOut < 0.0f ? 0.0f : (config_->smoothRateOut > 1.0f ? 1.0f : config_->smoothRateOut);
    const float rate = t > smooth_[c] ? inRate : outRate;
    smooth_[c] += (t - smooth_[c]) * rate;
    if (smooth_[c] < 0.0f)
    {
      smooth_[c] = 0.0f;
    }
    if (smooth_[c] > 1.0f)
    {
      smooth_[c] = 1.0f;
    }

    outValues[c] = (uint8_t)(smooth_[c] * 255.0f);
  }

  for (uint16_t c = cells; c < outCount; ++c)
  {
    outValues[c] = 0;
  }
}

void GridModes::clearToZero(uint16_t cells, uint8_t *outValues, uint16_t outCount)
{
  static float zeroTarget[MAX_GRID_CELLS];
  memset(zeroTarget, 0, sizeof(zeroTarget));
  smoothAndStore(zeroTarget, cells, outValues, outCount);
}

void GridModes::compute(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  switch (config_->gridMode)
  {
  case 1:
    computeProximity(sim, geom, outValues, outCount);
    break;
  case 2:
    computeProximityB(sim, geom, outValues, outCount);
    break;
  case 3:
    computeDensity(sim, geom, outValues, outCount);
    break;
  case 4:
    computeVelocity(sim, geom, outValues, outCount);
    break;
  case 5:
    computePressure(sim, geom, outValues, outCount);
    break;
  case 7:
    computeCollision(sim, geom, outValues, outCount);
    break;
  case 8:
    computeOverlap(sim, geom, outValues, outCount);
    break;
  // 0=Noise and 6=Vorticity are intentionally deferred in Phase2.
  default:
    clearToZero(activeCellCount(geom, outCount), outValues, outCount);
    break;
  }
}

void GridModes::computeProximity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const uint16_t pCount = sim.getCount();
  const float maxDensity = config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity;
  const float sigma = 0.06f;
  const float invSigma2 = 1.0f / (sigma * sigma);
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));

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
    target[c] = density / maxDensity;
  }

  smoothAndStore(target, cells, outValues, outCount);
}

void GridModes::computeProximityB(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const uint16_t pCount = sim.getCount();
  const uint8_t cols = geom.getCols() == 0 ? 1 : geom.getCols();
  const uint8_t rows = geom.getRows() == 0 ? 1 : geom.getRows();
  const float halfW = 0.5f / (float)cols;
  const float halfH = 0.5f / (float)rows;
  const float baseRadius = config_->particleRadius * 3.0f;
  const float pairRadius = config_->particleRadius * 4.0f;
  const float pairRadiusSafe = pairRadius <= 1e-6f ? 1e-6f : pairRadius;
  const float maxDensity = config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity;
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));

  for (uint16_t c = 0; c < cells; ++c)
  {
    float sum = 0.0f;
    float weightSum = 0.0f;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      const float w = cellContribution(px[i], py[i], grid[c].x, grid[c].y, halfW, halfH, baseRadius);
      if (w <= 0.0f)
      {
        continue;
      }
      for (uint16_t j = i + 1; j < pCount; ++j)
      {
        const float dx = px[j] - px[i];
        const float dy = py[j] - py[i];
        const float d = sqrtf(dx * dx + dy * dy);
        if (d >= pairRadiusSafe)
        {
          continue;
        }
        const float closeness = 1.0f - (d / pairRadiusSafe);
        sum += closeness * w;
        weightSum += w;
      }
    }
    if (weightSum > 1e-6f)
    {
      target[c] = (sum / weightSum) * (2.0f / maxDensity);
    }
  }

  smoothAndStore(target, cells, outValues, outCount);
}

void GridModes::computeDensity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const uint16_t pCount = sim.getCount();
  const uint8_t cols = geom.getCols() == 0 ? 1 : geom.getCols();
  const uint8_t rows = geom.getRows() == 0 ? 1 : geom.getRows();
  const float halfW = 0.5f / (float)cols;
  const float halfH = 0.5f / (float)rows;
  const float radius = config_->particleRadius * 2.0f;
  const float maxDensity = config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity;
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));

  for (uint16_t c = 0; c < cells; ++c)
  {
    float density = 0.0f;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      density += cellContribution(px[i], py[i], grid[c].x, grid[c].y, halfW, halfH, radius);
    }
    target[c] = density / maxDensity;
  }

  smoothAndStore(target, cells, outValues, outCount);
}

void GridModes::computeVelocity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const float *vx = sim.getVx();
  const float *vy = sim.getVy();
  const uint16_t pCount = sim.getCount();
  const uint8_t cols = geom.getCols() == 0 ? 1 : geom.getCols();
  const uint8_t rows = geom.getRows() == 0 ? 1 : geom.getRows();
  const float halfW = 0.5f / (float)cols;
  const float halfH = 0.5f / (float)rows;
  const float radius = config_->particleRadius * 2.0f;
  const float maxVelocity = config_->maxVelocity <= 1e-6f ? 1.0f : config_->maxVelocity;
  const float norm = maxVelocity * (config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity);
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));

  for (uint16_t c = 0; c < cells; ++c)
  {
    float accum = 0.0f;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      const float w = cellContribution(px[i], py[i], grid[c].x, grid[c].y, halfW, halfH, radius);
      if (w <= 0.0f)
      {
        continue;
      }
      const float speed = sqrtf(vx[i] * vx[i] + vy[i] * vy[i]);
      accum += speed * w;
    }
    target[c] = accum / norm;
  }

  smoothAndStore(target, cells, outValues, outCount);
}

void GridModes::computePressure(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const uint16_t pCount = sim.getCount();
  const uint8_t cols = geom.getCols() == 0 ? 1 : geom.getCols();
  const uint8_t rows = geom.getRows() == 0 ? 1 : geom.getRows();
  const float halfW = 0.5f / (float)cols;
  const float halfH = 0.5f / (float)rows;
  const float radius = config_->particleRadius * 2.5f;
  const float maxDensity = config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity;
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));

  for (uint16_t c = 0; c < cells; ++c)
  {
    float coverage = 0.0f;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      coverage += cellContribution(px[i], py[i], grid[c].x, grid[c].y, halfW, halfH, radius);
    }
    float n = coverage / maxDensity;
    if (n > 1.0f)
    {
      n = 1.0f;
    }
    target[c] = n * n;
  }

  smoothAndStore(target, cells, outValues, outCount);
}

void GridModes::computeCollision(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const float *vx = sim.getVx();
  const float *vy = sim.getVy();
  const uint16_t pCount = sim.getCount();
  const uint8_t cols = geom.getCols() == 0 ? 1 : geom.getCols();
  const uint8_t rows = geom.getRows() == 0 ? 1 : geom.getRows();
  const float halfW = 0.5f / (float)cols;
  const float halfH = 0.5f / (float)rows;
  const float radius = config_->particleRadius * 2.0f;
  const float pairRadius = config_->particleRadius * 4.0f;
  const float pairRadiusSafe = pairRadius <= 1e-6f ? 1e-6f : pairRadius;
  const float norm = (config_->maxVelocity <= 1e-6f ? 1.0f : config_->maxVelocity) * (config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity);
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));
  static uint16_t nearIdx[MAX_PARTICLES];
  static float nearWeight[MAX_PARTICLES];

  for (uint16_t c = 0; c < cells; ++c)
  {
    uint16_t nearCount = 0;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      const float w = cellContribution(px[i], py[i], grid[c].x, grid[c].y, halfW, halfH, radius);
      if (w <= 0.0f)
      {
        continue;
      }
      if (nearCount < MAX_PARTICLES)
      {
        nearIdx[nearCount] = i;
        nearWeight[nearCount] = w;
        ++nearCount;
      }
    }

    float intensity = 0.0f;
    for (uint16_t a = 0; a < nearCount; ++a)
    {
      const uint16_t i = nearIdx[a];
      for (uint16_t b = a + 1; b < nearCount; ++b)
      {
        const uint16_t j = nearIdx[b];
        const float dx = px[j] - px[i];
        const float dy = py[j] - py[i];
        const float dist = sqrtf(dx * dx + dy * dy);
        if (dist >= pairRadiusSafe)
        {
          continue;
        }

        const float dvx = vx[j] - vx[i];
        const float dvy = vy[j] - vy[i];
        const float relSpeed = sqrtf(dvx * dvx + dvy * dvy);
        const float closeness = 1.0f - (dist / pairRadiusSafe);
        const float w = (nearWeight[a] + nearWeight[b]) * 0.5f;
        intensity += closeness * relSpeed * w;
      }
    }
    target[c] = intensity / norm;
  }

  smoothAndStore(target, cells, outValues, outCount);
}

void GridModes::computeOverlap(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount)
{
  const uint16_t cells = activeCellCount(geom, outCount);
  const GridCell *grid = geom.getCells();
  const float *px = sim.getX();
  const float *py = sim.getY();
  const uint16_t pCount = sim.getCount();
  const uint8_t cols = geom.getCols() == 0 ? 1 : geom.getCols();
  const uint8_t rows = geom.getRows() == 0 ? 1 : geom.getRows();
  const float halfW = 0.5f / (float)cols;
  const float halfH = 0.5f / (float)rows;
  const float radius = config_->particleRadius * 2.0f;
  const float maxDensity = config_->maxDensity <= 1e-6f ? 1.0f : config_->maxDensity;
  float target[MAX_GRID_CELLS];
  memset(target, 0, sizeof(target));

  for (uint16_t c = 0; c < cells; ++c)
  {
    float overlap = 0.0f;
    for (uint16_t i = 0; i < pCount; ++i)
    {
      const float w = cellContribution(px[i], py[i], grid[c].x, grid[c].y, halfW, halfH, radius);
      overlap += w * w;
    }
    target[c] = overlap / maxDensity;
  }

  smoothAndStore(target, cells, outValues, outCount);
}
