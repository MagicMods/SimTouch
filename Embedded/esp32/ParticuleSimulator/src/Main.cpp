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

byte packetBuffer[BUFFER_SIZE];

bool SIM_FLAG = false;

/////////////////////////////////////
///////       SETUP       //////////
///////////////////////////////////

void setup()
{
  Serial.begin(250000);
#if WIFI
  SetupWifi();
#endif

  SetupUI();
}

void loop()
{
  LoopAcc();
  EVERY_N_MILLISECONDS(1000) { TimerResetArray(); }
  // EVERY_N_MILLISECONDS(275) { Cpu(); }
  EVERY_N_MILLISECONDS(1000 / 60) { UiLoop(); }

  ProcessIncomingData();
}

void ProcessIncomingData()
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

  if (GetPayloadSize(packetBuffer) != packetSize)
  {
    log_e("Payload size mismatch: %d != %d", GetPayloadSize(packetBuffer), packetSize);
    return;
  }

#if DEBUG_NET_STREAM
  String message = String(packetSize) + " => ";
  int max = packetSize > 40 ? 40 : packetSize;
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

  SimGraph(packetBuffer + 2);

  ARRAY_RESETTED = false;
  // if (POWER_ON)
  // {
  //   FastLED.show();
  // }
}

void TimerResetArray()
{
  if (ARRAY_RESETTED)
  {
    ResetArray();
    ClearScreen();
  }
  else
  {
    ARRAY_RESETTED = true;
  }
}

void ResetArray()
{
  memset(packetBuffer, 0, BUFFER_SIZE);
  ClearScreen();
  ARRAY_RESETTED = true;
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

int GetPayloadSize(byte buffer[])
{
  return (buffer[0]) | buffer[1] << 8;
}
