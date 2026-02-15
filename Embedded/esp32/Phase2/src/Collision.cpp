#include "Collision.h"

#include <math.h>

void Collision::resolve(float *x, float *y, float *vx, float *vy, uint16_t count, float particleRadius) const
{
  if (!config_->collisionEnabled || count < 2)
  {
    return;
  }

  const uint8_t gridSize = config_->collisionGridSize > MAX_COLLISION_GRID ? MAX_COLLISION_GRID : config_->collisionGridSize;
  const float cellSize = 1.0f / (float)gridSize;
  static int16_t cells[MAX_COLLISION_GRID][MAX_COLLISION_GRID][MAX_CELL_PARTICLES];
  static uint8_t cellCounts[MAX_COLLISION_GRID][MAX_COLLISION_GRID];

  for (uint8_t gx = 0; gx < gridSize; ++gx)
  {
    for (uint8_t gy = 0; gy < gridSize; ++gy)
    {
      cellCounts[gx][gy] = 0;
    }
  }

  for (uint16_t i = 0; i < count; ++i)
  {
    int cx = (int)(x[i] / cellSize);
    int cy = (int)(y[i] / cellSize);
    if (cx < 0)
      cx = 0;
    if (cy < 0)
      cy = 0;
    if (cx >= gridSize)
      cx = gridSize - 1;
    if (cy >= gridSize)
      cy = gridSize - 1;

    uint8_t &slotCount = cellCounts[cx][cy];
    if (slotCount < MAX_CELL_PARTICLES)
    {
      cells[cx][cy][slotCount++] = (int16_t)i;
    }
  }

  const float minDist = particleRadius * 2.0f;
  const float minDistSq = minDist * minDist;
  const float strength = config_->collisionRepulsion;
  const float damping = config_->collisionDamping;

  for (uint16_t i = 0; i < count; ++i)
  {
    int cx = (int)(x[i] / cellSize);
    int cy = (int)(y[i] / cellSize);
    for (int ox = -1; ox <= 1; ++ox)
    {
      for (int oy = -1; oy <= 1; ++oy)
      {
        int nx = cx + ox;
        int ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize)
        {
          continue;
        }
        const uint8_t nCount = cellCounts[nx][ny];
        for (uint8_t k = 0; k < nCount; ++k)
        {
          const int16_t j = cells[nx][ny][k];
          if (j <= (int16_t)i)
          {
            continue;
          }
          const float dx = x[j] - x[i];
          const float dy = y[j] - y[i];
          const float dsq = dx * dx + dy * dy;
          if (dsq <= 1e-12f || dsq >= minDistSq)
          {
            continue;
          }
          const float dist = sqrtf(dsq);
          const float overlap = (minDist - dist) * 0.5f;
          const float nxn = dx / dist;
          const float nyn = dy / dist;
          x[i] -= nxn * overlap;
          y[i] -= nyn * overlap;
          x[j] += nxn * overlap;
          y[j] += nyn * overlap;
          const float impulse = overlap * strength;
          vx[i] -= nxn * impulse * damping;
          vy[i] -= nyn * impulse * damping;
          vx[j] += nxn * impulse * damping;
          vy[j] += nyn * impulse * damping;
        }
      }
    }
  }
}
