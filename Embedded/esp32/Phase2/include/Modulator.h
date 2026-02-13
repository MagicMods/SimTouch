#ifndef PHASE2_MODULATOR_H
#define PHASE2_MODULATOR_H

#include <Arduino.h>

enum LfoWave : uint8_t
{
  LFO_SINE = 0,
  LFO_SQUARE,
  LFO_TRIANGLE,
  LFO_SAW
};

class Modulator
{
public:
  void setWave(LfoWave wave) { wave_ = wave; }
  void setFrequency(float hz) { frequencyHz_ = hz; }
  void setDepth(float depth) { depth_ = depth; }
  float sample(float t) const;

private:
  LfoWave wave_ = LFO_SINE;
  float frequencyHz_ = 0.5f;
  float depth_ = 1.0f;
};

#endif
