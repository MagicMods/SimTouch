#include "Graphics.h"

#include <Arduino.h>
#include <math.h>
#include <string.h>
#include <stdlib.h>
#include "Palettes.h"
#include "GridGeometry.h"
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
static uint16_t sCellBuffer[32 * 32];
static uint8_t sPrevCellValues[MAX_GRID_CELLS];
static bool sPrevCellsInitialized = false;
static uint16_t sPrevDrawCount = 0;
static uint8_t sPrevCols = 0;
static uint8_t sPrevRows = 0;
static uint8_t sPrevGap = 0;

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

  // Fast path: single draw call per cell like Slave SimGraph style.
  const int maxCellW = 32;
  const int maxCellH = 32;
  if (rw <= maxCellW && rh <= maxCellH)
  {
    const int pixels = rw * rh;
    for (int i = 0; i < pixels; ++i)
    {
      sCellBuffer[i] = color;
    }
    gPanel.pushColors((uint16_t)sx, (uint16_t)sy, (uint16_t)ex, (uint16_t)ey, sCellBuffer);
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
  memset(sPrevCellValues, 0xFF, sizeof(sPrevCellValues));
  sPrevCellsInitialized = true;
  sPrevDrawCount = 0;
  sPrevCols = 0;
  sPrevRows = 0;
  sPrevGap = 0;
  drawSolidRect565(0, 0, gPanel.width(), gPanel.height(), 0x0000);
  Serial.println("[Phase2] UI init (LilyGo)");
#else
  Serial.println("[Phase2] UI init (Waveshare/sim stub)");
#endif
}

void UiLoop()
{
#if TARGET_LILYGO
  static uint32_t lastLvglMs = 0;
  int16_t x = 0;
  int16_t y = 0;
  gTouching = gPanel.getPoint(&x, &y, 1) > 0;
  if (gTouching)
  {
    gTouchX = (uint16_t)x;
    gTouchY = (uint16_t)y;
  }
  // Align with Slave cadence (avoid running LVGL every raw loop iteration).
  const uint32_t now = millis();
  if (now - lastLvglMs >= 33)
  {
    lastLvglMs = now;
    lv_timer_handler();
  }
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

void renderGrid(const uint8_t *cells, uint16_t count, uint8_t cols, uint8_t rows, uint8_t gapPx, uint8_t theme)
{
#if TARGET_LILYGO
  const uint8_t paletteIndex = (uint8_t)(theme % 11);
  if (cols > 0 && rows > 0)
  {
    const uint16_t totalSlots = (uint16_t)cols * (uint16_t)rows;
    const uint16_t drawCount = totalSlots > MAX_GRID_CELLS ? MAX_GRID_CELLS : totalSlots;
    if (!sPrevCellsInitialized)
    {
      memset(sPrevCellValues, 0xFF, sizeof(sPrevCellValues));
      sPrevCellsInitialized = true;
      sPrevDrawCount = 0;
    }
    if (drawCount != sPrevDrawCount || cols != sPrevCols || rows != sPrevRows || gapPx != sPrevGap)
    {
      memset(sPrevCellValues, 0xFF, sizeof(sPrevCellValues));
      sPrevDrawCount = drawCount;
      sPrevCols = cols;
      sPrevRows = rows;
      sPrevGap = gapPx;
      drawSolidRect565(0, 0, gPanel.width(), gPanel.height(), 0x0000);
    }

    const int panelW = (int)gPanel.width();
    const int panelH = (int)gPanel.height();
    const int totalGapW = (int)gapPx * (int)(cols - 1);
    const int totalGapH = (int)gapPx * (int)(rows - 1);
    int contentW = panelW - totalGapW;
    int contentH = panelH - totalGapH;
    if (contentW < cols)
      contentW = cols;
    if (contentH < rows)
      contentH = rows;

    for (uint16_t i = 0; i < drawCount; ++i)
    {
      const uint8_t v = (i < count) ? cells[i] : 0;
      if (sPrevCellValues[i] == v)
      {
        continue;
      }
      sPrevCellValues[i] = v;
      const CRGB color = ColorFromPalette(Palettes[paletteIndex], v, 255, NOBLEND);
      const uint16_t c565 = rgb565FromCRGB(color);
      const uint16_t r = i / cols;
      const uint16_t c = i % cols;
      const int x0 = ((int)c * contentW) / (int)cols + (int)c * (int)gapPx;
      const int x1 = ((int)(c + 1) * contentW) / (int)cols + (int)c * (int)gapPx;
      const int y0 = ((int)r * contentH) / (int)rows + (int)r * (int)gapPx;
      const int y1 = ((int)(r + 1) * contentH) / (int)rows + (int)r * (int)gapPx;
      drawSolidRect565(x0, y0, x1 - x0, y1 - y0, c565);
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
