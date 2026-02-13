#ifndef PHASE2_SIMCORE_H
#define PHASE2_SIMCORE_H

#include "Boundary.h"
#include "Collision.h"
#include "SimConfig.h"
#include "Turbulence.h"

class SimCore
{
public:
  explicit SimCore(SimConfig *cfg);
  void init();
  void step(float dt, float timeSec);

  void addForceAtPoint(float x, float y, float radius, float strength, bool repulse);
  void setGravity(float gx, float gy);

  uint16_t getCount() const { return count_; }
  const float *getX() const { return x_; }
  const float *getY() const { return y_; }
  const float *getVx() const { return vx_; }
  const float *getVy() const { return vy_; }
  float *mutableVx() { return vx_; }
  float *mutableVy() { return vy_; }

private:
  SimConfig *config_;
  Boundary boundary_;
  Collision collision_;
  Turbulence turbulence_;

  float x_[MAX_PARTICLES];
  float y_[MAX_PARTICLES];
  float vx_[MAX_PARTICLES];
  float vy_[MAX_PARTICLES];
  uint16_t count_ = 0;
};

#endif
