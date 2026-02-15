#include <Arduino.h>

#include "Acc.h"
#include "ConfigWeb.h"
#include "FluidFLIP.h"
#include "Graphics.h"
#include "GridGeometry.h"
#include "GridModes.h"
#include "ImuForces.h"
#include "Main.h"
#include "Modulator.h"
#include "OrganicBehavior.h"
#include "SimConfig.h"
#include "SimCore.h"
#include "TouchForces.h"
#include "Voronoi.h"
#include "WifUdp.h"
#include "FastLED.h"

static SimConfig gConfig;
static SimCore gSimCore(&gConfig);
static TouchForces gTouchForces(&gConfig);
static GridGeometry gGridGeometry(&gConfig);
static GridModes gGridModes(&gConfig);
static ImuForces gImuForces(&gConfig);

static Voronoi gVoronoi(&gConfig);
static FluidFLIP gFlip(&gConfig);
static Modulator gModulator;
static OrganicBehavior gOrganic;

static uint8_t gCellValues[MAX_GRID_CELLS];

static bool gValidatedParticles = false;
static bool gValidatedTouch = false;
static bool gValidatedBoundary = false;
static uint32_t gPerfSimFrameCount = 0;
static uint32_t gPerfRenderFrameCount = 0;
static uint32_t gPerfWindowStartMs = 0;
static uint32_t gLastFrameUs = 0;
static float gAvgFrameMs = 0.0f;
static uint32_t gLoopLastUs = 0;
static float gSimAccumMs = 0.0f;
static uint32_t gLastRenderMs = 0;

void setup()
{
  Serial.begin(250000);
  Serial.printf("[Phase2] target=%s lvglMode=%s\n",
#if TARGET_LILYGO
                "LilyGo",
#else
                "Waveshare",
#endif
#if LVGL_VERSION_9
                "v9");
#else
                "v8");
#endif
  SetupWifi();
  SetupConfigWeb(gConfig);
  SetupUI();
  SetupAcc();
  gGridGeometry.rebuild();
  gSimCore.init();
  memset(gCellValues, 0, sizeof(gCellValues));
  gPerfWindowStartMs = millis();
  gLastFrameUs = micros();
  gLoopLastUs = micros();
  gSimAccumMs = 0.0f;
  gLastRenderMs = millis();
}

void ProcessIncomingData()
{
  // Phase 2D remote config path (UDP from JS Sim acting as remote control).
  bool changed = ReceiveRemoteConfig(gConfig);
  if (changed)
  {
    gGridGeometry.rebuild();
  }
}

static void validatePhase2A()
{
  const uint16_t count = gSimCore.getCount();
  const float *x = gSimCore.getX();
  const float *y = gSimCore.getY();
  if (count > 0)
  {
    gValidatedParticles = true;
  }
  for (uint16_t i = 0; i < count; ++i)
  {
    if (x[i] < 0.0f || x[i] > 1.0f || y[i] < 0.0f || y[i] > 1.0f)
    {
      gValidatedBoundary = false;
      return;
    }
  }
  gValidatedBoundary = true;
  if (getTouching())
  {
    gValidatedTouch = true;
  }

  static uint32_t lastLogMs = 0;
  if (millis() - lastLogMs > 2500)
  {
    lastLogMs = millis();
    Serial.printf("[Phase2A Validate] particles=%u touch=%u boundary=%u\n",
                  (unsigned)gValidatedParticles,
                  (unsigned)gValidatedTouch,
                  (unsigned)gValidatedBoundary);
  }
}

void loop()
{
  LoopAcc();
  UiLoop();
  LoopConfigWeb();
  ProcessIncomingData();
  if (ConsumeConfigGridDirtyFlag())
  {
    gGridGeometry.rebuild();
  }
  if (ConsumeConfigRestartFlag())
  {
    gGridGeometry.rebuild();
    gSimCore.init();
    memset(gCellValues, 0, sizeof(gCellValues));
    Serial.println("[Phase2] Restart requested from ConfigWeb");
  }

  const uint32_t nowUs = micros();
  float loopDeltaMs = (nowUs - gLoopLastUs) / 1000.0f;
  gLoopLastUs = nowUs;
  if (loopDeltaMs < 0.0f)
  {
    loopDeltaMs = 0.0f;
  }
  if (loopDeltaMs > 100.0f)
  {
    loopDeltaMs = 100.0f;
  }
  gSimAccumMs += loopDeltaMs;

  const float simStepMs = 1000.0f / 60.0f;
  uint8_t simStepsThisLoop = 0;
  while (gSimAccumMs >= simStepMs && simStepsThisLoop < 4)
  {
    const uint32_t stepUs = micros();
    const float frameMs = (stepUs - gLastFrameUs) / 1000.0f;
    gLastFrameUs = stepUs;
    if (gPerfSimFrameCount == 0)
    {
      gAvgFrameMs = frameMs;
    }
    else
    {
      gAvgFrameMs = gAvgFrameMs * 0.92f + frameMs * 0.08f;
    }
    ++gPerfSimFrameCount;

    // Touch -> force mapping
    gTouchForces.setTouchPixels(getTouchX(), getTouchY(), getTouching());
    gTouchForces.apply(gSimCore);

    // IMU gravity is opt-in; UI gravity remains authoritative until IMU mode is enabled.
    if (gConfig.imuEnabled)
    {
      const AccelData a = GetAccelData();
      gImuForces.setAccel(a.x, a.y, a.z);
      gImuForces.apply();
    }

    // Core simulation step
    const float nowSec = millis() * 0.001f;
    gSimCore.step(gConfig.timeStep, nowSec);

    // Optional advanced blocks in Phase2 scaffold
    (void)gModulator.sample(nowSec);
    gVoronoi.step(gConfig.timeStep);
    gFlip.step(gConfig.timeStep);
    gOrganic.applySwarm(gSimCore, gConfig.timeStep);

    validatePhase2A();
    gSimAccumMs -= simStepMs;
    ++simStepsThisLoop;
  }

  // Render decoupled from sim; run independently at target cadence.
  const uint32_t nowMs = millis();
  if (nowMs - gLastRenderMs >= (1000 / 60))
  {
    gLastRenderMs = nowMs;
    gGridModes.compute(gSimCore, gGridGeometry, gCellValues, MAX_GRID_CELLS);
    renderGrid(gCellValues, gGridGeometry.getCellCount(), gGridGeometry.getCols(), gGridGeometry.getRows(), gConfig.gridGap, gConfig.theme);
    ++gPerfRenderFrameCount;
  }

  if (nowMs - gPerfWindowStartMs >= 1000)
  {
    const float seconds = (nowMs - gPerfWindowStartMs) / 1000.0f;
    const float simFps = seconds > 0.0f ? (gPerfSimFrameCount / seconds) : 0.0f;
    const float renderFps = seconds > 0.0f ? (gPerfRenderFrameCount / seconds) : 0.0f;
    Serial.printf("[Phase2 FPS] sim %.1f | render %.1f | avg frame %.2f ms | cells=%u\n",
                  simFps, renderFps, gAvgFrameMs, (unsigned)gGridGeometry.getCellCount());
    gPerfWindowStartMs = nowMs;
    gPerfSimFrameCount = 0;
    gPerfRenderFrameCount = 0;
  }
}
