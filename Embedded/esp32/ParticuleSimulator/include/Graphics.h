#ifndef GRAPHICS_H
#define GRAPHICS_H

#include "FastLED.h"

void SetupUI();
void UiLoop();

void SimGraph(byte byteArray[], int nbrPixels, int screenWidth, int screenHeight, int gap, float scale);
uint32_t rainbow(uint8_t hue);
void RectGraph(int selector);

void SetDisplayBrightness(uint8_t newBrightness);

void ClearScreen();
void ColorBridge(uint8_t _);
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

uint32_t CRGB_UINT32(CRGB color);

void TouchGraph(uint16_t x, uint16_t y, int scale);
uint32_t ColorValue(uint8_t value);
#endif
