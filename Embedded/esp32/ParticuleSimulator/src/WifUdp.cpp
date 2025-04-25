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

const int channel = 1;        // WiFi Channel number between 1 and 13
const bool hide_SSID = false; // To disable SSID broadcast -> SSID will not appear in a basic WiFi scan
const int max_connection = 6; // Maximum simultaneous connected clients on the AP

IPAddress localIP(192, 168, 3, 100);
IPAddress gateway(192, 168, 3, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress nullIp(0, 0, 0, 0);
IPAddress senderIP(0, 0, 0, 0);
// IPAddress unityIP(192, 168, 3, 5);
IPAddress unityIP(192, 168, 3, 255);

// IPAddress localIP (192,168,4,1); // WO Wifi.softConfig

const uint16_t udpListenPort = 3000;
const uint16_t udpUnityPort = 3001;
// const uint16_t udpSendPort = 3333;

bool WEBSERIAL_INIT = false;

bool WIFI_CONNECTED = false;
bool SUIT_CONNECTED = false;
bool UNITY_CONNECTED = false;

bool newDataUnity = false;
bool newComUnity = false;

bool UNITY_INIT = false;

#define COM_COLORIDX 6
#define COM_BRIGHTNESS 7
#define COM_POWERMX 8

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
  WiFi.softAPsetHostname("Svibe_Suit");
  log_v("AP => Svibe_Suit");
  WiFi.softAPConfig(localIP, gateway, subnet);
  WiFi.softAP(ssid_AP, pass_AP, 11, 0);
  WiFi.status() ? log_v("WIFI OK!") : log_v("WIFI INIT FAILED!");
}
///////////////////////////////////////////////////////////

///////////////////    UPD   /////////////////////////

void SendUDP(uint8_t com[2])
{
  // udp.beginPacket(udp.remoteIP(), udpSendPort);
  udp.beginPacket(unityIP, udpUnityPort);
  // const uint8_t buf [2] = com;
  if (DEBUG_NET)
  {
    // log_v("Send UDP [" + String(com[0]) + "." + String(com[1]) + "] => " + unityIP.toString() + ":" + udpUnityPort);
  }
  udp.write(com, 2);
  udp.endPacket();
}

void SendUDP(int idx, int val)
{
  // udp.beginPacket(udp.remoteIP(), udpSendPort);
  udp.beginPacket(unityIP, udpUnityPort);
  // const uint8_t buf [2] = com;
  if (DEBUG_NET)
  {
    // log_v("Send UDP [" + String(idx) + "." + String(val) + "] => " + unityIP.toString() + ":" + udpUnityPort);
    // Serial.print("Send UDP [");
    // Serial.print(idx);
    // Serial.print('.');
    // Serial.print(val);
    // Serial.print("] ");
    // Serial.println(senderIP.toString());
  }
  byte data[2];
  data[0] = (byte)idx;
  data[1] = (byte)val;
  udp.write(data, 2);
  udp.endPacket();
}

void SendUDP(int idx, float val)
{
  // udp.beginPacket(udp.remoteIP(), udpSendPort);
  udp.beginPacket(unityIP, udpUnityPort);
  // const uint8_t buf [2] = com;
  if (DEBUG_NET)
  {
    // log_v("Send UDP [" + String(idx) + "." + String(val) + "] => " + unityIP.toString() + ":" + udpUnityPort);
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

void SEND_UDP_TouchArray(byte array[])
{
  if (WIFI_CONNECTED)
  {
    if (DEBUG_NET)
    {
      log_v("Sending TouchArray => %s port %u", unityIP.toString().c_str(), udpUnityPort);
    }
    udp.beginPacket(unityIP, udpUnityPort);
    udp.write(array, PIXEL_COUNT + 1);
    udp.endPacket();
  }
}

void SEND_UDP_SimTouchInput(int x, int y)
{
  byte array[4];
  array[0] = x & 0xFF;        // Low byte
  array[1] = (x >> 8) & 0xFF; // High byte
  // Store y (little-endian)
  array[2] = y & 0xFF;        // Low byte
  array[3] = (y >> 8) & 0xFF; // High byte

  //   memcpy(&array[0], &x, sizeof(x));  // First 2 bytes for x
  // memcpy(&array[2], &y, sizeof(y));  // Next 2 bytes for y

  if (WIFI_CONNECTED)
  {
    if (DEBUG_NET)
    {
      log_v("Sending Position(X:%d, Y:%d) to %s:%u",
            static_cast<int>(x),
            static_cast<int>(y),
            unityIP.toString().c_str(),
            udpUnityPort);
    }
    udp.beginPacket(unityIP, udpUnityPort);
    udp.write(array, 4);
    udp.endPacket();
  }
}

void SEND_UDP_SimAcc(IMUdata accel)
{
  byte array[13];
  memcpy(&array[0], &accel.x, sizeof(accel.x));
  memcpy(&array[4], &accel.y, sizeof(accel.y));
  memcpy(&array[8], &accel.z, sizeof(accel.z));

  // memcpy(&array[12], &gyro.x, sizeof(gyro.x));
  // memcpy(&array[16], &gyro.y, sizeof(gyro.y));
  // memcpy(&array[20], &gyro.z, sizeof(gyro.z));

  if (WIFI_CONNECTED)
  {
    // if (DEBUG_NET)
    // {
    //   log_v("Sending Accel&Gyro to %s:%u",
    //         unityIP.toString().c_str(),
    //         udpUnityPort);
    // }
    udp.beginPacket(unityIP, udpUnityPort);
    udp.write(array, 13);
    udp.endPacket();
  }
}

///////////////////////////////////////////
//////////////// UDP //////////////////////
//////////////////////////////////////////

void ProcessComSim(byte buffer[]) // buffer.Length == 2
{
  switch (buffer[0])
  {
  case 5:
    // PowerMax
    break;
  case COM_COLORIDX:
    ColorIncoming(buffer[1]);
    break;
  case COM_BRIGHTNESS:
    SetBrightnessLED(buffer[1]);
    break;

  default:
    break;
    log_d("Error: ProcessComSim");
  }
}

void SetBrightnessLED(uint8_t _)
{
  log_v("Brightness LED => %d", _);
  // TODO
}

void SetPOWERMX(uint8_t _)
{
  // FastLED.setBrightness(_);
  log_v("POWER MX=> %d", _);
}

void ColorIncoming(byte col)
{
  SetColorPaletteIdx((int)col);
}

//////////////////////////////////////////
/////////////// WIFI  ///////////////////
////////////////////////////////////////

void setWIFI_CONNECTED(bool _)
{
  WIFI_CONNECTED = _;
  WIFI_CONNECTED ? log_v("WIFI CONNECTED") : log_v("WIFI DISCONNECTED");
}

void WiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info)
{
  if (DEBUG)
    log_d("[WiFi-event] event: %d\n", event);
  switch (event)
  {
  case ARDUINO_EVENT_WIFI_READY:
    log_v("WIFI READY");
    // log_v("WiFi interface ready");
    break;
  case ARDUINO_EVENT_WIFI_SCAN_DONE:
    log_v("WIFI SCAN DONE");
    // log_v("Completed scan for AP");
    break;
  case ARDUINO_EVENT_WIFI_STA_START:
    log_v("WIFI STA STARTED");
    // log_v("WiFi STA started");
    break;
  case ARDUINO_EVENT_WIFI_STA_STOP:
    log_v("WIFI STA STOPPED");
    setWIFI_CONNECTED(false);
    // log_v("WiFi STA stopped");
    break;
  case ARDUINO_EVENT_WIFI_STA_CONNECTED:
    log_v("STA => %s", WiFi.SSID().c_str());
    setWIFI_CONNECTED(true);
    // log_v("STA Connected to AP");
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    log_v("STA DISCONNECTED");
    setWIFI_CONNECTED(false);
    // log_v("STA Disconnected from WiFi AP");
    break;
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    // String st = udp.remoteIP().toString();
    log_v("STA IP: %s", IPAddress(info.got_ip.ip_info.ip.addr).toString().c_str());

    // log_v("STA got IP address: %s\n", WiFi.localIP().toString());
    // log_v(WiFi.localIP().toString());
    break;
  case ARDUINO_EVENT_WIFI_STA_LOST_IP:
    log_v("STA Lost IP");
    // log_v("STA Lost IP address and IP address is reset to 0");
    break;
  case ARDUINO_EVENT_WIFI_AP_START:
    log_v("WIFI AP STARTED");
    // log_v("WiFi AP started");
    break;
  case ARDUINO_EVENT_WIFI_AP_STOP:
    log_v("WIFI AP STOPPED");
    // log_v("WiFi AP stopped");
    break;
  case ARDUINO_EVENT_WIFI_AP_STACONNECTED:
    log_v("AP_STA connected");
    // log_v("AP_STA connected");
    setWIFI_CONNECTED(true);
    // DrawAll();
    break;
  case ARDUINO_EVENT_WIFI_AP_STADISCONNECTED:
    // log_v("AP_STADISCONNECTED");
    // log_v("AP_STA disconnected");
    setWIFI_CONNECTED(false);
    break;
  case ARDUINO_EVENT_WIFI_AP_STAIPASSIGNED:
    // String s = udp.remoteIP().toString();
    log_v("Devices connected: %d", WiFi.softAPgetStationNum());
    log_v("Assigned IP %s", IPAddress(info.wifi_ap_staipassigned.ip.addr).toString().c_str());
    // log_v(udp.remoteIP().toString());
    // log_v("Assigned IP address to AP_STA %s\n", udp.remoteIP().toString());
    // DrawAll();
    break;
  case ARDUINO_EVENT_WIFI_AP_PROBEREQRECVED:
    log_v("AP Received probe request");
    // log_v("AP Received probe request");
    break;

  default:
    break;
  }
}

void ESPmessage(esp_err_t ret)
{
  switch (ret)
  {
  case ESP_OK:
    log_v("ESPmessage Success");
    break;
  case ESP_ERR_ESPNOW_BASE:
    log_v("ESP_ERR_ESPNOW_BASE");
    break;
  case ESP_ERR_ESPNOW_NOT_INIT:
    log_v("ESPNOW is not initialized");
    break;
  case ESP_ERR_ESPNOW_ARG:
    log_v("invalid argument");
    break;
  case ESP_ERR_ESPNOW_NO_MEM:
    log_v("out of memory");
    break;
  case ESP_ERR_ESPNOW_FULL:
    log_v("ESP_ERR_ESPNOW_FULL");
    break;
  case ESP_ERR_ESPNOW_NOT_FOUND:
    log_v("peer is not found");
    break;
  case ESP_ERR_ESPNOW_INTERNAL:
    log_v("ESP_ERR_ESPNOW_INTERNAL");
    break;
  case ESP_ERR_ESPNOW_EXIST:
    log_v("ESP_ERR_ESPNOW_EXIST");
    break;
  case ESP_ERR_ESPNOW_IF:
    log_v("current WiFi interface doesn’t match that of peer");
    break;
  default:
    break;
  }
}
