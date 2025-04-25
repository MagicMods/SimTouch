#ifndef MAIN_H_
#define MAIN_H_

void TimerResetArray();
extern unsigned int framesPerSecond;

extern bool flipMotDir;
extern bool SIM_FLAG;
void ProcessIncomingData();

int GetColorPaletteIdx();
int GetPayloadSize(byte buffer[]);

void SetColorPaletteIdx(int idx);
void TimerResetArray();
int GetColorPaletteIdx();
void SetColorPaletteIdx(int idx);
void ResetArray();
#endif