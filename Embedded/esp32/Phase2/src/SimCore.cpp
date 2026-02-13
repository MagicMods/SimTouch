#include "SimCore.h"

#include "GravityForces.h"

#include <Arduino.h>
#include <math.h>

SimCore::SimCore(SimConfig *cfg) : config_(cfg), boundary_(cfg), collision_(cfg), turbulence_(cfg) {}

void SimCore::init()
{
  count_ = config_->particleCount;
  if (count_ > MAX_PARTICLES)
  {
    count_ = MAX_PARTICLES;
  }
  const bool circular = config_->boundaryShape == 0;
  if (circular)
  {
    const uint16_t rings = (uint16_t)ceilf(sqrtf((float)count_));
    const uint16_t particlesPerRing = (uint16_t)ceilf((float)count_ / (float)rings);
    const float spawnRadius = boundary_.getRadius() * 0.95f;
    uint16_t idx = 0;

    for (uint16_t ring = 0; ring < rings && idx < count_; ++ring)
    {
      const float ringRadius = spawnRadius * ((float)(ring + 1) / (float)rings);
      uint16_t ringParticles = (uint16_t)floorf((particlesPerRing * (ring + 1)) / 2.0f);
      if (ringParticles < 1)
        ringParticles = 1;
      if (ringParticles > (uint16_t)(count_ - idx))
        ringParticles = (uint16_t)(count_ - idx);

      for (uint16_t i = 0; i < ringParticles && idx < count_; ++i)
      {
        const float angle = ((float)i / (float)ringParticles) * 6.2831853f;
        x_[idx] = 0.5f + cosf(angle) * ringRadius;
        y_[idx] = 0.5f + sinf(angle) * ringRadius;
        vx_[idx] = 0.0f;
        vy_[idx] = 0.0f;
        ++idx;
      }
    }
    return;
  }

  const uint16_t side = (uint16_t)ceilf(sqrtf((float)count_));
  const float width = 0.95f;
  const float height = 0.95f;
  const float halfW = width * 0.5f;
  const float halfH = height * 0.5f;
  const float cellW = width / (float)side;
  const float cellH = height / (float)side;
  const float jitter = 0.2f;
  uint16_t idx = 0;
  for (uint16_t row = 0; row < side && idx < count_; ++row)
  {
    for (uint16_t col = 0; col < side && idx < count_; ++col)
    {
      const float jx = ((float)random(0, 10000) / 10000.0f - 0.5f) * jitter;
      const float jy = ((float)random(0, 10000) / 10000.0f - 0.5f) * jitter;
      const float cellX = (col + 0.5f + jx) * cellW;
      const float cellY = (row + 0.5f + jy) * cellH;
      x_[idx] = 0.5f - halfW + cellX;
      y_[idx] = 0.5f - halfH + cellY;
      vx_[idx] = 0.0f;
      vy_[idx] = 0.0f;
      ++idx;
    }
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
    init();
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
