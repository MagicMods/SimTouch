#ifndef PHASE2_WIFUDP_H
#define PHASE2_WIFUDP_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiUdp.h>

#include "SimConfig.h"

extern WiFiUDP udp;

void SetupWifi();
bool ReceiveRemoteConfig(SimConfig &config);
bool IsWifiConnected();

#endif
