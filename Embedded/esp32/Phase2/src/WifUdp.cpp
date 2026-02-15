#include "WifUdp.h"

#include <math.h>
#include <string.h>

WiFiUDP udp;

static const char *WIFI_AP_SSID = "SimTouchScreen";
static const char *WIFI_AP_PASS = "MagicMods";
static const uint16_t kUdpListenPort = 3000;
static bool wifiConnected = false;

void SetupWifi()
{
#if WIFI
  WiFi.mode(WIFI_MODE_AP);
  WiFi.setSleep(false);
  WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS, 11, false, 4);
  udp.begin(kUdpListenPort);
  wifiConnected = true;
#endif
}

bool IsWifiConnected()
{
  return wifiConnected;
}

static bool applySimpleCommand(uint8_t idx, uint8_t value, SimConfig &cfg)
{
  switch (idx)
  {
  case 50:
    cfg.timeScale = 0.1f + (value / 255.0f) * 7.9f;
    return true;
  case 53:
    cfg.particleCount = 50 + (uint16_t)((value / 255.0f) * 450.0f);
    return true;
  case 70:
    cfg.boundaryMode = value > 0 ? 1 : 0;
    return true;
  case 71:
    cfg.boundaryShape = value > 0 ? 1 : 0;
    return true;
  case 80:
    cfg.gravityX = ((float)value / 127.5f) - 1.0f;
    return true;
  case 81:
    cfg.gravityY = ((float)value / 127.5f) - 1.0f;
    return true;
  case 120:
    cfg.touchStrength = (value / 255.0f) * 0.2f;
    return true;
  case 121:
    cfg.touchRadius = 0.01f + (value / 255.0f) * 1.19f;
    return true;
  case 140:
    cfg.gridMode = value > 8 ? 8 : value;
    return true;
  case 146:
    cfg.theme = value % 11;
    return true;
  default:
    return false;
  }
}

bool ReceiveRemoteConfig(SimConfig &config)
{
  int packetSize = udp.parsePacket();
  if (packetSize <= 0)
  {
    return false;
  }

  uint8_t buf[8];
  if (packetSize > (int)sizeof(buf))
  {
    packetSize = sizeof(buf);
  }
  udp.read(buf, packetSize);

  // JS remote tool fallback protocol:
  // 2-byte message: [index, value]
  if (packetSize == 2)
  {
    return applySimpleCommand(buf[0], buf[1], config);
  }

  // 5-byte typed float message: [index, floatLE]
  if (packetSize == 5)
  {
    float f = 0.0f;
    memcpy(&f, &buf[1], sizeof(float));
    switch (buf[0])
    {
    case 50:
      config.timeScale = f;
      return true;
    case 80:
      config.gravityX = f;
      return true;
    case 81:
      config.gravityY = f;
      return true;
    case 141:
      config.maxDensity = f;
      return true;
    default:
      return false;
    }
  }

  return false;
}
