#ifndef MAIN_H_
#define MAIN_H_

void TimerResetArray();
extern unsigned int framesPerSecond;

extern bool flipMotDir;
extern bool SIM_FLAG;
void ProcessIncomingData();

int GetPayloadSize(byte buffer[]);

void TimerResetArray();
void ResetArray();
#endif