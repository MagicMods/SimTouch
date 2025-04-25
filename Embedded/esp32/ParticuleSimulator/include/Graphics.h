#ifndef GRAPHICS_H
#define GRAPHICS_H

#include "FastLED.h"

void SetupUI();
void UiLoop();

void SimGraph(const uint8_t *payload);

void SetDisplayBrightness(uint8_t newBrightness);

void ClearScreen();
bool getWifiEnable();

bool getTouchEnabled();
bool getTouching();
bool getReleased();
bool getReleasing();

void setTouchEnabled(bool _);
void setTouching(bool _);
void setReleased(bool _);
void setReleasing(bool _);
void Cpu();

int Distance(uint16_t x, uint16_t y, int centerX, int centerY);
uint32_t CRGBToUint32(const CRGB &color);
uint32_t ColorValue(uint8_t value);

#endif
