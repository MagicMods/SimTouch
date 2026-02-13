#ifndef PHASE2_GRID_MODES_H
#define PHASE2_GRID_MODES_H

#include "GridGeometry.h"
#include "SimCore.h"

class GridModes
{
public:
  explicit GridModes(SimConfig *cfg) : config_(cfg) {}

  void computeProximity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);

private:
  SimConfig *config_;
  float smooth_[MAX_GRID_CELLS] = {0.0f};
};

#endif
