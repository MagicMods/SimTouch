#ifndef WIFUDP_H_
#define WIFUDP_H_
#include <WiFi.h>
#include <WiFiUdp.h>
#include <esp_now.h>
#include "SensorQMI8658.hpp"

extern WiFiUDP udp;
extern IPAddress localIP;
extern IPAddress senderIP;

void SetupWifi();

void CheckAvailableNetworks();
bool IsDesiredNetwork(String ssid);
void StartAP();

void ProcessComSim(byte buffer[]);
void dataReceived(uint8_t *address, uint8_t *data, uint8_t len, signed int rssi, bool broadcast);

void WiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info);

void SendUDP(uint8_t com[2]);

void SendData();
void SEND_UDP_SimTouchInput(int x, int y);
void SEND_UDP_SimAcc(IMUdata accel);

/////////UDP////////
void LoopWifi();
void setWIFI_CONNECTED(bool _);
void SetBrightnessLED(uint8_t _);

void SetPOWERMX(uint8_t _);

void ColorIncoming(byte col);
#endif
