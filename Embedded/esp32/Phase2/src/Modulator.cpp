#include "Modulator.h"

#include <math.h>

float Modulator::sample(float t) const
{
  const float phase = t * frequencyHz_;
  const float f = phase - floorf(phase);
  float v = 0.0f;
  switch (wave_)
  {
  case LFO_SINE:
    v = sinf(phase * 6.2831853f);
    break;
  case LFO_SQUARE:
    v = f < 0.5f ? 1.0f : -1.0f;
    break;
  case LFO_TRIANGLE:
    v = 4.0f * fabsf(f - 0.5f) - 1.0f;
    break;
  case LFO_SAW:
    v = 2.0f * f - 1.0f;
    break;
  }
  return v * depth_;
}
