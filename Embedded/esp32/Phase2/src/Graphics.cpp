#include "Graphics.h"

#include <Arduino.h>
#include <math.h>
#include <string.h>
#include "Palettes.h"
#include <FastLED.h>

#if TARGET_LILYGO
#include <LilyGo_RGBPanel.h>
#include <LV_Helper.h>
#include <lvgl.h>
#endif

static uint16_t gTouchX = 120;
static uint16_t gTouchY = 120;
static bool gTouching = false;

#if TARGET_LILYGO
static LilyGo_RGBPanel gPanel;
static uint16_t sRowBuffer[512];

static inline uint16_t rgb565FromCRGB(const CRGB &c)
{
  return (uint16_t)(((c.r & 0xF8) << 8) | ((c.g & 0xFC) << 3) | (c.b >> 3));
}

static void drawSolidRect565(int x, int y, int w, int h, uint16_t color)
{
  if (w <= 0 || h <= 0)
  {
    return;
  }
  const int panelW = (int)gPanel.width();
  const int panelH = (int)gPanel.height();
  if (x >= panelW || y >= panelH || x + w <= 0 || y + h <= 0)
  {
    return;
  }

  int sx = x < 0 ? 0 : x;
  int sy = y < 0 ? 0 : y;
  int ex = (x + w) > panelW ? panelW : (x + w);
  int ey = (y + h) > panelH ? panelH : (y + h);
  int rw = ex - sx;
  int rh = ey - sy;
  if (rw <= 0 || rh <= 0)
  {
    return;
  }

  for (int i = 0; i < rw; ++i)
  {
    sRowBuffer[i] = color;
  }
  for (int yy = 0; yy < rh; ++yy)
  {
    gPanel.pushColors((uint16_t)sx, (uint16_t)(sy + yy), (uint16_t)(sx + rw), (uint16_t)(sy + yy + 1), sRowBuffer);
  }
}
#endif

bool isLilyGoBackend()
{
#if TARGET_LILYGO
  return true;
#else
  return false;
#endif
}

void SetupUI()
{
#if TARGET_LILYGO
  // Primary board path: LilyGo T-RGB 2.1 half-circle panel.
  bool ok = gPanel.begin(LILYGO_T_RGB_2_1_INCHES_HALF_CIRCLE);
  if (!ok)
  {
    Serial.println("[Phase2] LilyGo panel init failed");
    return;
  }
  beginLvglHelper(gPanel, false);
  gPanel.setBrightness(16);
  drawSolidRect565(0, 0, gPanel.width(), gPanel.height(), 0x0000);
  Serial.println("[Phase2] UI init (LilyGo)");
#else
  Serial.println("[Phase2] UI init (Waveshare/sim stub)");
#endif
}

void UiLoop()
{
#if TARGET_LILYGO
  int16_t x = 0;
  int16_t y = 0;
  gTouching = gPanel.getPoint(&x, &y, 1) > 0;
  if (gTouching)
  {
    gTouchX = (uint16_t)x;
    gTouchY = (uint16_t)y;
  }
  lv_timer_handler();
#else
  // Non-LilyGo fallback touch pattern for board-agnostic simulation testing.
  const float t = millis() * 0.001f;
  gTouchX = (uint16_t)(120 + 80 * sinf(t * 0.7f));
  gTouchY = (uint16_t)(120 + 80 * cosf(t * 0.8f));
  gTouching = ((millis() / 2000) % 2) == 0;
#endif
}

bool getTouching()
{
  return gTouching;
}

uint16_t getTouchX()
{
  return gTouchX;
}

uint16_t getTouchY()
{
  return gTouchY;
}

void renderGrid(const uint8_t *cells, uint16_t count, uint8_t cols, uint8_t rows)
{
#if TARGET_LILYGO
  const int screenW = (int)gPanel.width();
  const int screenH = (int)gPanel.height();
  if (cols > 0 && rows > 0 && count > 0)
  {
    const int gap = 1;
    int cellW = (screenW - ((int)cols - 1) * gap) / (int)cols;
    int cellH = (screenH - ((int)rows - 1) * gap) / (int)rows;
    if (cellW < 1)
      cellW = 1;
    if (cellH < 1)
      cellH = 1;
    const int gridW = (cellW * cols) + gap * ((int)cols - 1);
    const int gridH = (cellH * rows) + gap * ((int)rows - 1);
    const int originX = (screenW - gridW) / 2;
    const int originY = (screenH - gridH) / 2;

    uint16_t idx = 0;
    for (uint8_t r = 0; r < rows; ++r)
    {
      for (uint8_t c = 0; c < cols; ++c)
      {
        if (idx >= count)
        {
          break;
        }
        uint8_t v = cells[idx++];
        const CRGB color = ColorFromPalette(Palettes[0], v, 255, NOBLEND);
        const uint16_t c565 = rgb565FromCRGB(color);
        int x = originX + (int)c * (cellW + gap);
        int y = originY + (int)r * (cellH + gap);
        drawSolidRect565(x, y, cellW, cellH, c565);
      }
      if (idx >= count)
      {
        break;
      }
    }
  }
#endif

  static uint32_t lastPrint = 0;
  if (millis() - lastPrint < 500)
  {
    return;
  }
  lastPrint = millis();
  uint32_t sum = 0;
  for (uint16_t i = 0; i < count; ++i)
  {
    sum += cells[i];
  }
  Serial.printf("[Phase2] grid %ux%u cells=%u avg=%u touch=%u backend=%s\n",
                cols, rows, count,
                (unsigned)(count ? (sum / count) : 0),
                (unsigned)getTouching(),
                isLilyGoBackend() ? "LilyGo" : "Waveshare");
}
