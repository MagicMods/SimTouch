#ifndef PHASE2_GRID_MODES_H
#define PHASE2_GRID_MODES_H

#include "GridGeometry.h"
#include "SimCore.h"

class GridModes
{
public:
  explicit GridModes(SimConfig *cfg) : config_(cfg) {}

  void compute(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computeProximity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computeProximityB(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computeDensity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computeVelocity(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computePressure(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computeCollision(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);
  void computeOverlap(const SimCore &sim, const GridGeometry &geom, uint8_t *outValues, uint16_t outCount);

private:
  uint16_t activeCellCount(const GridGeometry &geom, uint16_t outCount) const;
  float cellContribution(float px, float py, float cellX, float cellY, float cellHalfWidth, float cellHalfHeight, float radius) const;
  void smoothAndStore(const float *target, uint16_t cells, uint8_t *outValues, uint16_t outCount);
  void clearToZero(uint16_t cells, uint8_t *outValues, uint16_t outCount);

  SimConfig *config_;
  float smooth_[MAX_GRID_CELLS] = {0.0f};
};

#endif
