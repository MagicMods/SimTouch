#ifndef PHASE2_ACC_H
#define PHASE2_ACC_H

struct AccelData
{
  float x;
  float y;
  float z;
};

void SetupAcc();
void LoopAcc();
AccelData GetAccelData();

#endif
