#ifndef PHASE2_ORGANIC_BEHAVIOR_H
#define PHASE2_ORGANIC_BEHAVIOR_H

#include "SimCore.h"

class OrganicBehavior
{
public:
  void applySwarm(SimCore &sim, float dt);
  void applyChain(SimCore &sim, float dt);
  void applyAutomata(SimCore &sim, float dt);
};

#endif
