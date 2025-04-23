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

void SimGraph(byte byteArray[], int nbrPixels, int screenWidth, int screenHeight, int gap, float scale)
{
  const int center = screenWidth / 2;
  const int radius = center * scale;

  // Use the same cell dimensions as in JS
  int cellWidth = 10;
  int cellHeight = 10;

  // Match the JavaScript algorithm
  int moduleCount = 0;
  int maxCols = radius / (cellWidth + gap);
  int maxRows = radius / (cellHeight + gap);

  // Similar algorithm to generateRectangles in JavaScript
  for (int r = -maxRows; r <= maxRows && moduleCount < 342; r++)
  {
    for (int c = -maxCols; c <= maxCols && moduleCount < 342; c++)
    {
      int dx = c * (cellWidth + gap);
      int dy = r * (cellHeight + gap);

      // Check if point is within circle
      if (sqrt(dx * dx + dy * dy) <= radius)
      {
        // First calculate mirrored coordinates
        int origX = center - dx - cellWidth / 2;  // Mirrored X (fixed from before)
        int origY = center + dy - cellHeight / 2; // Normal Y

        // Then rotate 90 degrees counterclockwise
        int cursorX = origY;
        int cursorY = screenWidth - origX - cellWidth;

        uint32_t colSpeed;
        uint32_t colDir;

        colSpeed = CRGB_UINT32(byteArray[moduleCount + 1]);

        // Swap width and height for the rotated rectangle
        tft.fillRect(cursorX, cursorY, cellHeight, cellWidth, colSpeed);
        moduleCount++;
      }
    }
  }
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
