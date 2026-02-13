#ifndef PHASE2_BOUNDARY_H
#define PHASE2_BOUNDARY_H

#include "SimConfig.h"

enum BoundaryType : uint8_t
{
  BOUNDARY_CIRCULAR = 0,
  BOUNDARY_RECTANGULAR = 1
};

class Boundary
{
public:
  explicit Boundary(SimConfig *config) : config_(config) {}

  void enforce(float &x, float &y, float &vx, float &vy) const;
  BoundaryType getBoundaryType() const;
  float getRadius() const;

private:
  SimConfig *config_;
};

#endif
