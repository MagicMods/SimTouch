#ifndef PHASE2_GRAPHICS_H
#define PHASE2_GRAPHICS_H

#include <Arduino.h>

void SetupUI();
void UiLoop();
void renderGrid(const uint8_t *cells, uint16_t count, uint8_t cols, uint8_t rows);
bool isLilyGoBackend();

bool getTouching();
uint16_t getTouchX();
uint16_t getTouchY();

#endif
