#ifndef PHASE2_CONFIG_WEB_H
#define PHASE2_CONFIG_WEB_H

#include "SimConfig.h"

void SetupConfigWeb(SimConfig &config);
void LoopConfigWeb();
bool ConsumeConfigGridDirtyFlag();
bool ConsumeConfigRestartFlag();
void ResetConfigToDefaults();
void WebDebugLog(const char* message);
bool IsWebDebugEnabled();

#endif
