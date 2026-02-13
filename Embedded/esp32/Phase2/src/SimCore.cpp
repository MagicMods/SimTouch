#include "SimCore.h"

#include "GravityForces.h"

#include <math.h>

SimCore::SimCore(SimConfig *cfg) : config_(cfg), boundary_(cfg), collision_(cfg), turbulence_(cfg) {}

void SimCore::init()
{
  count_ = config_->particleCount;
  if (count_ > MAX_PARTICLES)
  {
    count_ = MAX_PARTICLES;
  }
  for (uint16_t i = 0; i < count_; ++i)
  {
    float t = (float)i / (float)count_;
    float a = t * 6.2831853f;
    float r = 0.1f + 0.35f * t;
    x_[i] = 0.5f + cosf(a) * r;
    y_[i] = 0.5f + sinf(a) * r;
    vx_[i] = 0.0f;
    vy_[i] = 0.0f;
  }
}

void SimCore::setGravity(float gx, float gy)
{
  config_->gravityX = gx;
  config_->gravityY = gy;
}

void SimCore::addForceAtPoint(float tx, float ty, float radius, float strength, bool repulse)
{
  const float r2 = radius * radius;
  const float signedStrength = repulse ? -strength : strength;
  for (uint16_t i = 0; i < count_; ++i)
  {
    float dx = tx - x_[i];
    float dy = ty - y_[i];
    float d2 = dx * dx + dy * dy;
    if (d2 > r2 || d2 < 1e-8f)
    {
      continue;
    }
    float dist = sqrtf(d2);
    float nx = dx / dist;
    float ny = dy / dist;
    float falloff = 1.0f - (dist / radius);
    vx_[i] += nx * signedStrength * falloff;
    vy_[i] += ny * signedStrength * falloff;
  }
}

void SimCore::step(float dt, float timeSec)
{
  if (count_ != config_->particleCount && config_->particleCount <= MAX_PARTICLES)
  {
    count_ = config_->particleCount;
  }

  GravityForces::apply(config_->gravityX, config_->gravityY, dt, vx_, vy_, count_);
  turbulence_.apply(x_, y_, vx_, vy_, count_, dt, timeSec);
  collision_.resolve(x_, y_, vx_, vy_, count_, config_->particleRadius);

  const float damping = config_->velocityDamping;
  const float vmax = config_->maxVelocity;
  const float vmax2 = vmax * vmax;
  for (uint16_t i = 0; i < count_; ++i)
  {
    vx_[i] *= damping;
    vy_[i] *= damping;
    float v2 = vx_[i] * vx_[i] + vy_[i] * vy_[i];
    if (v2 > vmax2)
    {
      float inv = vmax / sqrtf(v2);
      vx_[i] *= inv;
      vy_[i] *= inv;
    }
    x_[i] += vx_[i] * dt * config_->timeScale;
    y_[i] += vy_[i] * dt * config_->timeScale;
    boundary_.enforce(x_[i], y_[i], vx_[i], vy_[i]);
  }
}
