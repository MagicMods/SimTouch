#include "Arduino.h"
#include "lvgl.h"
#include "TFT_eSPI.h"
#include "Graphics.h"
#include "Pin_config.h"
#include "Main.h"
#include "WifUdp.h"
#include "WiFi.h"
#include "math.h"
#include "Wire.h"
#include "CST816S.h"
#include "Palettes.h"
#include "FastLED.h"
#include <stdint.h> // For fixed-width types

// Define structure matching the 23-byte header layout
// Use __attribute__((packed)) to prevent compiler padding
struct __attribute__((packed)) PacketHeader
{
  uint8_t roundRect;     // Offset 0
  uint16_t screenWidth;  // Offset 1 (LE)
  uint16_t screenHeight; // Offset 3 (LE)
  uint16_t cellCount;    // Offset 5 (LE)
  uint8_t gridGap;       // Offset 7
  float cellRatio;       // Offset 8 (LE)
  uint8_t allowCut;      // Offset 12 (prev 16)
  uint8_t cols;          // Offset 13 (prev 17)
  uint8_t rows;          // Offset 14 (prev 18)
  uint8_t cellW;         // Offset 15 (prev 19)
  uint8_t cellH;         // Offset 16 (prev 20)
  uint8_t theme;         // Offset 17 (prev 21)
  uint8_t brightness;    // Offset 18 (prev 22)
};

// Runtime check for struct size (can't use static_assert in older C++ versions potentially used by Arduino)
// This check now validates against the new size (19) implicitly via sizeof()
void CheckHeaderSize()
{
  // Updated expected size implicitly via sizeof(PacketHeader) change
  const size_t EXPECTED_HEADER_SIZE = 19;
  if (sizeof(PacketHeader) != EXPECTED_HEADER_SIZE)
  {
    log_e("CRITICAL ERROR: PacketHeader size mismatch! Expected %d, got %d", EXPECTED_HEADER_SIZE, sizeof(PacketHeader));
    // Consider halting or other error handling here
  }
}

CST816S touch(PIN_I2C_SDA, PIN_I2C_SCL, PIN_TP_RST, PIN_TP_INT); //  sda, scl, rst, irq of T-DisplayS3 Touch.

#define off_pin 35
#define buf_size 24

static const uint16_t screenWidth = 240;
static const uint16_t screenHeight = 240;
int screen_rotation = 0; // display rotation angle for TFT_eSPI lib  0 = no rotation, 1 = 90dgr, 2 = 180dgr, 3 = 270dgr

static lv_disp_draw_buf_t draw_buf;
// static lv_color_t buf[screenWidth * screenHeight];
static lv_color_t buf[screenWidth * screenHeight / 10];
// static lv_color_t buf[screenWidth * screenHeight];

TFT_eSPI tft = TFT_eSPI(screenWidth, screenHeight); /* TFT instance */

int counter = 1;

bool graphV = true;
// int numCubePerCol = 15;
int numCubePerCol = 36;
int numCol = 40;

bool wifiEnable = true;

bool heartBitDisplay = true;

int ledBacklight = 80; // Initial TFT backlight intensity on a scale of 0 to 255. Initial value is 80.
int ledCtrl = LOW;     // Initial value for external connected led

TBlendType BLEND = NOBLEND;

int rowMain = 36;
int columnMain = 12;

float touchScale = 60;
int touchScaleReset = 40;
int touchScaleMax = 300;
int touchScaleMin = 20;
int touchScaleMultiplier = 5;
bool RELEASED = false;
bool RELEASING = false;
bool TOUCH = false;
bool TOUCHING = false;
int counterScale = 0;

unsigned long idleTimestamp = millis();
byte touchByteArray[PIXEL_COUNT];

#if LV_USE_LOG != 0
/* Serial debugging */
void my_print(const char *buf)
{
  Serial.printf(buf);
  Serial.flush();
}
#endif

/* Display flushing */
void my_disp_flush(lv_disp_drv_t *disp, const lv_area_t *area, lv_color_t *color_p)
{
  uint32_t w = (area->x2 - area->x1 + 1);
  uint32_t h = (area->y2 - area->y1 + 1);

  tft.startWrite();
  tft.setAddrWindow(area->x1, area->y1, w, h);
  tft.pushColors((uint16_t *)&color_p->full, w * h, true);
  tft.endWrite();

  lv_disp_flush_ready(disp);
}

///////////////////////////////////////

int counterRadial = 0;
int counterRadialCompare = 5;
bool WAS_TOUCHING = false;
bool DRAW_TOUCH_FLAG = false;
bool released = false;

bool getTouching()
{
  return TOUCHING;
}

bool getReleased()
{
  return RELEASED;
}

bool getReleasing()
{
  return RELEASING;
}

static void lv_touchpad_read(lv_indev_drv_t *indev_driver, lv_indev_data_t *data)
{
  if (touch.available())
  {
    setReleased(false);
    data->state = LV_INDEV_STATE_PRESSED;
    // setTouching(true);
#if DEBUG_TOUCH
    log_d("Gesture: %d  X: %d Y: %d", touch.gesture(), touch.data.x, touch.data.y);
#endif

    data->point.x = touch.data.x;
    data->point.y = touch.data.y;
    setTouching(true);
    SEND_UDP_SimTouchInput(touch.data.x, touch.data.y);
    setReleasing(true);
  }
  else if (getReleasing() && !getReleased())
  {
    data->state = LV_INDEV_STATE_RELEASED;
#if DEBUG_TOUCH
    DebugConsole("LV_INDEV_STATE_RELEASED");
#endif
    setReleased(true);
    setTouching(false);
    setReleasing(false);
    SEND_UDP_SimTouchInput(0, 0);
  }
}

////////////////////////////////////////////////////////////////////////

void SetupUI()
{
  lv_init();
  pinMode(3, OUTPUT);
  digitalWrite(3, HIGH);
  pinMode(0, INPUT);

#if LV_USE_LOG != 1
  lv_log_register_print_cb(my_print); /* register print function for debugging */
#endif

  tft.begin();
  tft.setRotation(0);

  lv_disp_draw_buf_init(&draw_buf, buf, NULL, screenWidth * screenHeight / 10);

  /*Initialize the display*/
  static lv_disp_drv_t disp_drv;
  lv_disp_drv_init(&disp_drv);
  /*Change the following line to your display resolution*/
  disp_drv.hor_res = screenWidth;
  disp_drv.ver_res = screenHeight;
  disp_drv.flush_cb = my_disp_flush;
  disp_drv.draw_buf = &draw_buf;
  lv_disp_drv_register(&disp_drv);

  // // Register touch brush with LVGL
  // Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  // scan();

  // touch.begin(Wire, PIN_LCD_RST, PIN_LCD_INT);
  touch.begin();

  /*Initialize the (dummy) input device driver*/
  static lv_indev_drv_t indev_drv;
  lv_indev_drv_init(&indev_drv);
  indev_drv.type = LV_INDEV_TYPE_POINTER;
  indev_drv.read_cb = lv_touchpad_read;
  lv_indev_drv_register(&indev_drv);

  tft.fillScreen(TFT_BLACK);
  log_v("Ui INIT DONE");
}

void UiLoop()
{
  lv_timer_handler(); /* let the GUI do its work */
  // delay(5);
}

/////////////////////////////////////////////////////////////////////

bool getWifiEnable()
{
  return wifiEnable;
}

void setTouching(bool _)
{
  TOUCHING = _;
#if DEBUG_TOUCH
  log_v(TOUCHING ? "TOUCHING => TRUE" : "TOUCHING => FALSE");
#endif
  // HapTouch();
}

void setReleased(bool _)
{
  RELEASED = _;
#if DEBUG_TOUCH
  log_v(RELEASED ? "RELEASED => TRUE" : "RELEASED => FALSE");
#endif
}

void setReleasing(bool _)
{
  RELEASING = _;
#if DEBUG_TOUCH
  log_v(RELEASING ? "RELEASING => TRUE" : "RELEASING => FALSE");
#endif
  // HapRelease();
}

void SetDisplayBrightness(uint8_t newBrightness)
{
  //   ledcWrite(0, uint32_t(newBrightness));
}

// Refactored to process the new network payload using a struct overlay
void SimGraph(const uint8_t *payload)
{
  // --- Cast payload to header struct ---
  // Assumes payload points to the start of the header (after length bytes)
  // Assumes ESP32 is little-endian, matching sender
  const PacketHeader *header = reinterpret_cast<const PacketHeader *>(payload);

  // --- Debug Log: Print parsed header values ---
  log_d("SimGraph Parsed Header: Rect=%d SW=%d SH=%d Cnt=%d Gap=%d CR=%.2f Cut=%d Cols=%d Rows=%d CW=%d CH=%d Thm=%d Bri=%d",
        header->roundRect,
        header->screenWidth,
        header->screenHeight,
        header->cellCount,
        header->gridGap,
        header->cellRatio,
        header->allowCut,
        header->cols,
        header->rows,
        header->cellW,
        header->cellH,
        header->theme,
        header->brightness);
  // --- End Debug Log ---

  // --- Detect Grid Spec Change & Clear Screen ---
  static bool first_run = true;
  static uint8_t prev_roundRect = 2; // Init impossible value
  static uint16_t prev_screenWidth = 0;
  static uint16_t prev_screenHeight = 0;
  static uint16_t prev_cellCount = 0;
  static uint8_t prev_gridGap = 255;
  static float prev_cellRatio = -1.0f;
  static uint8_t prev_allowCut = 255;
  static uint8_t prev_cols = 0;
  static uint8_t prev_rows = 0;
  static uint8_t prev_cellW = 0;
  static uint8_t prev_cellH = 0;

  // Check if any spec affecting geometry/layout changed
  bool spec_changed = first_run ||
                      prev_roundRect != header->roundRect ||
                      prev_screenWidth != header->screenWidth ||
                      prev_screenHeight != header->screenHeight ||
                      // prev_cellCount != header->cellCount || // Cell count change alone might not require full clear?
                      prev_gridGap != header->gridGap ||
                      abs(prev_cellRatio - header->cellRatio) > 0.001f ||
                      prev_allowCut != header->allowCut ||
                      prev_cols != header->cols ||
                      prev_rows != header->rows ||
                      prev_cellW != header->cellW ||
                      prev_cellH != header->cellH;

  if (spec_changed)
  {
    log_d("Grid spec changed, clearing screen.");
    tft.fillScreen(TFT_BLACK);
    first_run = false;
    // Update all previous values
    prev_roundRect = header->roundRect;
    prev_screenWidth = header->screenWidth;
    prev_screenHeight = header->screenHeight;
    prev_cellCount = header->cellCount; // Still update even if not triggering clear
    prev_gridGap = header->gridGap;
    prev_cellRatio = header->cellRatio;
    prev_allowCut = header->allowCut;
    prev_cols = header->cols;
    prev_rows = header->rows;
    prev_cellW = header->cellW;
    prev_cellH = header->cellH;
  }
  // --- End Grid Spec Change Check ---

  // Perform runtime size check once (or periodically if needed)
  static bool headerSizeChecked = false;
  if (!headerSizeChecked)
  {
    CheckHeaderSize();
    headerSizeChecked = true;
  }

  // --- Validation ---
  // Access fields via header pointer
  if (SCREEN_WIDTH != header->screenWidth || SCREEN_HEIGHT != header->screenHeight)
  {
    log_e("SimGraph Error: Received dimensions (%dx%d) mismatch device dimensions (%dx%d)",
          header->screenWidth, header->screenHeight, SCREEN_WIDTH, SCREEN_HEIGHT);
    return;
  }

  // --- Cell Data Setup ---
  const uint8_t *cellValues = payload + sizeof(PacketHeader); // Offset by struct size
  uint16_t numCellsToDraw = header->cellCount;                // Use value from header struct

  // Ensure theme index is valid (using header->theme)
  uint8_t theme = header->theme;
  if (theme >= 11)
  {
    log_w("SimGraph Warning: Received invalid theme index %d. Using theme 0.", theme);
    theme = 0;
  }

  // --- Drawing ---
  // tft.fillScreen(TFT_BLACK); // Ensure this is removed/commented

  uint16_t currentCellIndex = 0;
  float centerX = screenWidth / 2.0f;
  float centerY = screenHeight / 2.0f;
  // Use values from header struct
  float radius = centerX; // Radius is now just half the screen width

  // Loop through potential grid positions based on header cols/rows
  // Swap loops: Outer is now 'c', inner is now 'r'
  for (int c = -header->cols / 2; c <= header->cols / 2; ++c) // Outer loop: Columns
  {
    for (int r = -header->rows / 2; r <= header->rows / 2; ++r) // Inner loop: Rows
    {
      // Calculate center offsets for this potential cell using header values
      // dx depends on c, dy depends on r (CONFIRMED)
      float dx = c * (header->cellW + header->gridGap);
      float dy = r * (header->cellH + header->gridGap);

      // Check if this position is within the boundary defined by header
      bool inBounds;
      if (header->allowCut != 0)
      {
        // Original check (center point in radius) - allows partial cells
        inBounds = header->roundRect
                       ? (sqrt(dx * dx + dy * dy) <= radius)
                       : (abs(dx) <= radius && abs(dy) <= radius);
      }
      else
      {
        // Stricter check (entire cell must be within bounds) - disallows partial cells
        float halfW = header->cellW / 2.0f;
        float halfH = header->cellH / 2.0f;
        if (header->roundRect)
        {
          // Check all 4 corners against radius for circular boundary (approximation)
          bool corner1_in = sqrt(pow(dx - halfW, 2) + pow(dy - halfH, 2)) <= radius;
          bool corner2_in = sqrt(pow(dx + halfW, 2) + pow(dy - halfH, 2)) <= radius;
          bool corner3_in = sqrt(pow(dx - halfW, 2) + pow(dy + halfH, 2)) <= radius;
          bool corner4_in = sqrt(pow(dx + halfW, 2) + pow(dy + halfH, 2)) <= radius;
          inBounds = corner1_in && corner2_in && corner3_in && corner4_in;
        }
        else
        {
          // Check all 4 edges against radius for rectangular boundary
          inBounds = (abs(dx) + halfW <= radius) && (abs(dy) + halfH <= radius);
        }
      }

      if (inBounds)
      {
        // If this position is valid, check if we still need to draw cells
        if (currentCellIndex >= numCellsToDraw)
        {
          // Optimization: If we found all cells, no need to check remaining grid positions
          // This break exits the INNER loop (rows) for the current column.
          // The outer loop will continue to the next column. This is correct.
          break;
        }

        uint8_t cellValue = cellValues[currentCellIndex]; // Get value for this valid cell

        // --- Add Index Logging for Value 100 ---
        if (cellValue == 100)
        {
          log_d("Index with value 100 found: idx=%d (c=%d, r=%d)", currentCellIndex, c, r);
        }

        // Get color from palette using validated theme
        CRGB rgbColor = ColorFromPalette(Palettes[theme], cellValue, 255, NOBLEND);
        uint32_t fillColor = CRGBToUint32(rgbColor); // Convert to TFT format

        // Calculate final screen coordinates (using header values)
        int screenX = (int)(centerX + dx - header->cellW / 2.0f);
        int screenY = (int)(centerY + dy - header->cellH / 2.0f);

        // Draw the cell (using header values)
        tft.fillRect(screenX, screenY, header->cellW, header->cellH, fillColor);

        currentCellIndex++; // Move to the next cell value
      }
    }
    // Break outer loop (columns) if all cells drawn
    // CONFIRMED: This break still correctly exits the outer loop.
    if (currentCellIndex >= numCellsToDraw)
    {
      break;
    }
  }

  // No specific cleanup needed here
}

void ColorBridge(uint8_t _)
{
  // ColorIncoming(_);
  // // uint8_t msg[2];
  // // msg[0] = COM_COLORIDX;
  // // msg[1] = _;
  // SendUDP(COM_COLORIDX, _);
}

int Distance(uint16_t x, uint16_t y, int centerX, int centerY)
{
  int distance = sqrt(pow(x - centerX, 2) + pow(y - centerY, 2));
  return distance;
}

uint32_t ColorValue(uint8_t value)
{
  // CRGB rgb = ColorFromPalette(Palettes[colorPaletteIdx], value, 255, BLEND);
  // uint32_t colorBar = RGB_UINT32(rgb[0], rgb[1], rgb[2]);
  // return colorBar;

  return CRGBToUint32(ColorFromPalette(Palettes[GetColorPaletteIdx()], value, 255, BLEND));
}

uint32_t CRGBToUint32(const CRGB &color)
{
  return (((color[0] & 0xF8) << 8) | ((color[1] & 0xFC) << 3) | (color[2] >> 3));
}

uint32_t CRGB_UINT32(CRGB color)
{
  return (((color[0] & 0xF8) << 8) | ((color[1] & 0xFC) << 3) | (color[2] >> 3));
}

void ClearScreen()
{
  tft.fillScreen(TFT_BLACK);
}
