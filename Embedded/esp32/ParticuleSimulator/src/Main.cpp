// Wemos LOLIN32 _ MH ET LIVE ESP32MiniKit
#include <Arduino.h>
#include "Main.h"
#include "WifUdp.h"
#include <TFT_eSPI.h>
#include "Pin_config.h"
#include "Graphics.h"
#include "Wire.h"
#include "Acc.h"
#include "FastLED.h"

#define PIXEL_COUNT 341
#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 240
#define GAP 1
#define SCALE 1.0f

uint8_t BRIGHTNESS_LED = 255;
uint8_t BRIGHTNESS_POWMX = 255;
int colorPaletteIdx = 0;

unsigned long nowTimerReset = 0;
unsigned long lastMillisArray = 0;
unsigned long lastMillisNewData = 0;

const float nullDataTime = 0.5f;
int consoleTimerSecond = 4;
int newDataEspNowTimerSecond = 2;
bool wifiBoot = true;

unsigned long previousMillis = 0;
long sleepTime = 1000;

bool BLE_CONNECTED = false;
bool REMOTE_CONNECTED = false;
bool ARRAY_RESETTED = false;

bool DEMO = false;

bool SEND_DATA = false;

byte packetBuffer[PIXEL_COUNT + 1];
byte simBuffer[PIXEL_COUNT];

bool SIM_FLAG = false;

/////////////////////////////////////
///////       SETUP       //////////
///////////////////////////////////

void setup()
{

#if DEBUG
  Serial.begin(115200);

#endif
  Serial1.begin(115200);

  SetupUI();
  // #if DEBUG
  //   DebugConsole("DEBUG MODE => Waiting for Serial...");
  // #endif
  // SetupFastLed();

  SetupWifi();

  // #if DEBUG
  //   SetupCpuLoad();
  // #endif
  // pinMode(4, OUTPUT);
  // pinMode(2, OUTPUT);
  // digitalWrite(4, LOW);
  log_d("sketch size : %d kb\r\n", ESP.getSketchSize() / 1024);
  log_d("Free sketch size : %d kb\r\n", ESP.getFreeSketchSpace() / 1024);
  log_d("flash size : %d kb\r\n", ESP.getFlashChipSize() / 1024);
  log_d("Total heap: %d kb\r\n", ESP.getHeapSize() / 1024);
  log_d("Free heap: %d kb\r\n", ESP.getFreeHeap() / 1024);
  log_d("Total PSRAM: %d kb\r\n", ESP.getPsramSize() / 1024);
  log_d("Free PSRAM: %d kb\r\n", ESP.getFreePsram() / 1024);
}

void loop()
{
  LoopAcc();
  // EVERY_N_MILLISECONDS(1000) { TimerResetArray(); }
  // EVERY_N_MILLISECONDS(275) { Cpu(); }
  EVERY_N_MILLISECONDS(1000 / 60) { UiLoop(); }

  FromSim();
  SimGraph(simBuffer, PIXEL_COUNT, SCREEN_WIDTH, SCREEN_HEIGHT, GAP, SCALE);
}

void FromSim()
{
  int packetSize = 0;
  if (WIFI)
  {
    packetSize = udp.parsePacket();
    if (!packetSize)
      return;

    udp.read(packetBuffer, packetSize);
  }
  else
  {
    packetSize = Serial.available();
    if (!packetSize)
      return;

    Serial.readBytes(packetBuffer, packetSize);
  }

#if DEBUG_NET_STREAM
  String message = String(packetSize) + " => ";
  int max = packetSize > 20 ? 20 : packetSize;
  for (int i = 0; i < max; i++)
  {
    // Using String::format if available or snprintf to append formatted data
    message += String(packetBuffer[i], DEC);
    if (i < (packetSize - 1))
    {
      message += ".";
    }
  }
  message += ".[...]";
  // Finally, log the constructed message. Note: log_d does not directly support String objects.
  log_d("%s", message.c_str());
#endif

  if (packetSize <= PIXEL_COUNT + 1)
  {
    switch (packetSize)
    {
    case 2: // COM
    {
      ProcessComSim(packetBuffer);
    }
    break;
    case PIXEL_COUNT + 1:
    {
      memcpy(simBuffer, packetBuffer + 1, PIXEL_COUNT);
      ARRAY_RESETTED = false;
    }
    break;
    default:
    {
      log_e("IN OUT OF RANGE => %d", packetSize);
    }
    break;
    }
    // if (POWER_ON)
    // {
    //   FastLED.show();
    // }
  }
}

void TimerResetArray()
{
}

int GetColorPaletteIdx()
{
  return colorPaletteIdx;
}

void SetColorPaletteIdx(int idx)
{
  colorPaletteIdx = idx;
  log_v("Colour Set: %d", colorPaletteIdx);
}

void ResetArray()
{
  memset(packetBuffer, 0, PIXEL_COUNT + 1);
  ARRAY_RESETTED = true;
}
