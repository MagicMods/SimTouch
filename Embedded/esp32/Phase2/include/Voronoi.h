#ifndef PHASE2_VORONOI_H
#define PHASE2_VORONOI_H

#include "SimConfig.h"

class Voronoi
{
public:
  explicit Voronoi(SimConfig *cfg) : config_(cfg) {}
  void step(float dt);

private:
  SimConfig *config_;
};

#endif
