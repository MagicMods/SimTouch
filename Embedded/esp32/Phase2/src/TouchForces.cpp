#include "TouchForces.h"

#include "SimCore.h"

void TouchForces::setTouchPixels(uint16_t x, uint16_t y, bool active)
{
  const float sw = (float)SCREEN_WIDTH;
  const float sh = (float)SCREEN_HEIGHT;
  touchX_ = sw > 1.0f ? ((float)x / sw) : 0.0f;
  touchY_ = sh > 1.0f ? ((float)y / sh) : 0.0f;
  if (touchX_ < 0.0f)
    touchX_ = 0.0f;
  if (touchX_ > 1.0f)
    touchX_ = 1.0f;
  if (touchY_ < 0.0f)
    touchY_ = 0.0f;
  if (touchY_ > 1.0f)
    touchY_ = 1.0f;
  touchActive_ = active;
}

void TouchForces::apply(SimCore &simCore)
{
  if (!touchActive_)
  {
    return;
  }
  const bool repulse = config_->touchMode == 1;
  simCore.addForceAtPoint(touchX_, touchY_, config_->touchRadius, config_->touchStrength, repulse);
}
