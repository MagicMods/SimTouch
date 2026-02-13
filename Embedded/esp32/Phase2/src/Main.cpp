#include <Arduino.h>

#include "Acc.h"
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
  SetupUI();
  SetupAcc();
  gGridGeometry.rebuild();
  gSimCore.init();
  memset(gCellValues, 0, sizeof(gCellValues));
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
  ProcessIncomingData();

  EVERY_N_MILLISECONDS(1000 / 30)
  {
    // Touch -> force mapping
    gTouchForces.setTouchPixels(getTouchX(), getTouchY(), getTouching());
    gTouchForces.apply(gSimCore);

    // IMU -> gravity mapping
    const AccelData a = GetAccelData();
    gImuForces.setAccel(a.x, a.y, a.z);
    gImuForces.apply();

    // Core simulation step
    const float nowSec = millis() * 0.001f;
    gSimCore.step(gConfig.timeStep, nowSec);

    // Optional advanced blocks in Phase2 scaffold
    (void)gModulator.sample(nowSec);
    gVoronoi.step(gConfig.timeStep);
    gFlip.step(gConfig.timeStep);
    gOrganic.applySwarm(gSimCore, gConfig.timeStep);

    // Grid output
    gGridModes.computeProximity(gSimCore, gGridGeometry, gCellValues, MAX_GRID_CELLS);
    renderGrid(gCellValues, gGridGeometry.getCellCount(), gGridGeometry.getCols(), gGridGeometry.getRows());

    validatePhase2A();
  }
}
