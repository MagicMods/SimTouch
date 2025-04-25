#include "Arduino.h"
#include "WifUdp.h"
#include <WiFi.h>
#include <WiFiUdp.h>
#include "Main.h"
#include <esp_wifi.h>
#include "Graphics.h"
#include "Acc.h"
#include "SensorQMI8658.hpp"
#include "FastLED.h"

WiFiUDP udp;

// List of desired SSIDs

static const char *ssid_AP = "SimTouchScreen";
static const char *pass_AP = "MagicMods";

const int channel = 11;
const bool hide_SSID = false;
const int max_connection = 1;

IPAddress localIP(192, 168, 3, 100);
IPAddress gateway(192, 168, 3, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress nullIp(0, 0, 0, 0);
IPAddress senderIP(0, 0, 0, 0);
IPAddress simIP(192, 168, 3, 255);

const uint16_t udpListenPort = 3000;
const uint16_t simPort = 3001;

bool WIFI_CONNECTED = false;

void SetupWifi()
{
  log_v("WIFI INIT");
  WiFi.setSleep(false);
  WiFi.onEvent(WiFiEvent);
  WiFi.disconnect();
  StartAP();
  udp.begin(udpListenPort);
  log_v("WIFI Initialised");
}

void StartAP()
{
  WiFi.mode(WIFI_MODE_AP);
  WiFi.softAPsetHostname("SimTouchScreen");
  log_v("AP => SimTouchScreen");
  WiFi.softAPConfig(localIP, gateway, subnet);
  WiFi.softAP(ssid_AP, pass_AP, 11, 0);
  log_v("WIFI %s", WiFi.status() ? "OK" : "FAILED");
}

// #region UDP

void SendUDP(uint8_t com[2])
{
  udp.beginPacket(simIP, simPort);
  if (DEBUG_NET)
    log_v("Send UDP [" + String(com[0]) + "." + String(com[1]) + "] => " + simIP.toString() + ":" + simPort);
    udp.write(com, 2);
  udp.endPacket();
}

void SendUDP(int idx, int val)
{
  udp.beginPacket(simIP, simPort);
  if (DEBUG_NET)
  {
    // log_v("Send UDP [" + String(idx) + "." + String(val) + "] => " + simIP.toString() + ":" + simPort);
  }
  byte data[2];
  data[0] = (byte)idx;
  data[1] = (byte)val;
  udp.write(data, 2);
  udp.endPacket();
}

void SendUDP(int idx, float val)
{
  udp.beginPacket(simIP, simPort);
  if (DEBUG_NET)
  {
    // log_v("Send UDP [" + String(idx) + "." + String(val) + "] => " + simIP.toString() + ":" + simPort);
    // Serial.print("Send UDP [");
    // Serial.print(idx);
    // Serial.print('.');
    // Serial.print(val);
    // Serial.print("] ");
    // Serial.println(senderIP.toString());
  }
  byte data[5];
  byte dataFloat[4];
  memcpy(dataFloat, &val, sizeof(float));
  data[0] = (byte)idx;
  data[1] = dataFloat[0];
  data[2] = dataFloat[1];
  data[3] = dataFloat[2];
  data[4] = dataFloat[3];

  udp.write(data, 5);
  udp.endPacket();
}

void SEND_UDP_SimTouchInput(int x, int y)
{
  if (WIFI_CONNECTED)
  {
    byte array[4];
    array[0] = x & 0xFF;        // Low byte
    array[1] = (x >> 8) & 0xFF; // High byte
    // Store y (little-endian)
    array[2] = y & 0xFF;        // Low byte
    array[3] = (y >> 8) & 0xFF; // High byte

    //   memcpy(&array[0], &x, sizeof(x));  // First 2 bytes for x
    // memcpy(&array[2], &y, sizeof(y));  // Next 2 bytes for y

    if (DEBUG_NET)
    {
      log_v("Sending Position(X:%d, Y:%d) to %s:%u",
            static_cast<int>(x),
            static_cast<int>(y),
            simIP.toString().c_str(),
            simPort);
    }
    udp.beginPacket(simIP, simPort);
    udp.write(array, 4);
    udp.endPacket();
  }
  else
  {
    return;
  }
}

void SEND_UDP_SimAcc(IMUdata accel)
{

  if (WIFI_CONNECTED)
  {
    byte array[13];
    memcpy(&array[0], &accel.x, sizeof(accel.x));
    memcpy(&array[4], &accel.y, sizeof(accel.y));
    memcpy(&array[8], &accel.z, sizeof(accel.z));

    // memcpy(&array[12], &gyro.x, sizeof(gyro.x));
    // memcpy(&array[16], &gyro.y, sizeof(gyro.y));
    // memcpy(&array[20], &gyro.z, sizeof(gyro.z));

    // if (DEBUG_NET)
    // {
    //   log_v("Sending Accel&Gyro to %s:%u",
    //         simIP.toString().c_str(),
    //         simPort);
    // }
    udp.beginPacket(simIP, simPort);
    udp.write(array, 13);
    udp.endPacket();
  }
  else
  {
    return;
  }
}

// #endregion

void SetBrightnessLED(uint8_t _)
{
  log_v("Brightness LED => %d", _);
  // TODO
}

//////////////////////////////////////////
/////////////// WIFI  ///////////////////
////////////////////////////////////////

void setWIFI_CONNECTED(bool _)
{
  WIFI_CONNECTED = _;
  log_v("WIFI %s", WIFI_CONNECTED ? "CONNECTED" : "DISCONNECTED");
}

void WiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info)
{
  if (DEBUG)
    log_d("[WiFi-event] event: %d\n", event);
  switch (event)
  {
  case ARDUINO_EVENT_WIFI_READY:
    log_v("WIFI READY");
    break;
  case ARDUINO_EVENT_WIFI_SCAN_DONE:
    log_v("WIFI SCAN DONE");
    break;
  case ARDUINO_EVENT_WIFI_STA_START:
    log_v("WIFI STA STARTED");
    break;
  case ARDUINO_EVENT_WIFI_STA_STOP:
    log_v("WIFI STA STOPPED");
    setWIFI_CONNECTED(false);
    break;
  case ARDUINO_EVENT_WIFI_STA_CONNECTED:
    log_v("STA => %s", WiFi.SSID().c_str());
    setWIFI_CONNECTED(true);
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    log_v("STA DISCONNECTED");
    setWIFI_CONNECTED(false);
    break;
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    log_v("STA IP: %s", IPAddress(info.got_ip.ip_info.ip.addr).toString().c_str());
    break;
  case ARDUINO_EVENT_WIFI_STA_LOST_IP:
    log_v("STA Lost IP");
    break;
  case ARDUINO_EVENT_WIFI_AP_START:
    log_v("WIFI AP STARTED");
    break;
  case ARDUINO_EVENT_WIFI_AP_STOP:
    log_v("WIFI AP STOPPED");
    break;
  case ARDUINO_EVENT_WIFI_AP_STACONNECTED:
    log_v("AP_STA connected");
    setWIFI_CONNECTED(true);
    break;
  case ARDUINO_EVENT_WIFI_AP_STADISCONNECTED:
    setWIFI_CONNECTED(false);
    break;
  case ARDUINO_EVENT_WIFI_AP_STAIPASSIGNED:
    log_v("Devices connected: %d", WiFi.softAPgetStationNum());
    log_v("Assigned IP %s", IPAddress(info.wifi_ap_staipassigned.ip.addr).toString().c_str());
    break;
  case ARDUINO_EVENT_WIFI_AP_PROBEREQRECVED:
    log_v("AP Received probe request");
    break;

  default:
    break;
  }
}