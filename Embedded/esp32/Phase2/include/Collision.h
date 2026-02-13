#ifndef PHASE2_COLLISION_H
#define PHASE2_COLLISION_H

#include "SimConfig.h"

static constexpr uint16_t MAX_PARTICLES = 300;
static constexpr uint8_t MAX_COLLISION_GRID = 16;
static constexpr uint8_t MAX_CELL_PARTICLES = 32;

class Collision
{
public:
  explicit Collision(SimConfig *cfg) : config_(cfg) {}

  void resolve(float *x, float *y, float *vx, float *vy, uint16_t count, float particleRadius) const;

private:
  SimConfig *config_;
};

#endif
