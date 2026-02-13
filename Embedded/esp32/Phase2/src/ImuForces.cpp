#include "ImuForces.h"

void ImuForces::setAccel(float ax, float ay, float az)
{
  rawAx_ = ax;
  rawAy_ = ay;
  rawAz_ = az;
}

void ImuForces::apply()
{
  if (!config_->imuEnabled)
  {
    return;
  }
  const float alpha = config_->imuSmoothing;
  const float sens = config_->imuSensitivity;
  const float targetGx = -rawAx_ * sens;
  const float targetGy = rawAy_ * sens;
  smoothGx_ = smoothGx_ + (targetGx - smoothGx_) * alpha;
  smoothGy_ = smoothGy_ + (targetGy - smoothGy_) * alpha;
  config_->gravityX = smoothGx_;
  config_->gravityY = smoothGy_;
}
