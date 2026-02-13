#ifndef PHASE2_SIMCONFIG_H
#define PHASE2_SIMCONFIG_H

#include <Arduino.h>
#include <stddef.h>

enum ParamType : uint8_t
{
  PARAM_UINT8,
  PARAM_UINT16,
  PARAM_FLOAT,
  PARAM_BOOL
};

struct SimConfig
{
  float timeStep = 1.0f / 60.0f;
  float timeScale = 1.0f;
  float velocityDamping = 0.995f;
  float maxVelocity = 2.0f;
  uint16_t particleCount = 200;
  float particleRadius = 0.01f;

  uint8_t boundaryMode = 0;
  uint8_t boundaryShape = 0;
  float boundaryScale = 1.03f;
  float boundaryDamping = 0.8f;

  float gravityX = 0.0f;
  float gravityY = 0.0f;

  bool collisionEnabled = true;
  uint8_t collisionGridSize = 8;
  float collisionRepulsion = 0.5f;

  uint8_t gridMode = 0;
  // Keep idle output darker; touch/forces should drive highlights.
  float maxDensity = 16.0f;
  float smoothRateIn = 0.15f;
  float smoothRateOut = 0.08f;

  uint16_t targetCellCount = 338;
  uint8_t gridGap = 0;
  uint8_t theme = 1;

  float touchStrength = 0.1f;
  float touchRadius = 0.6f;
  uint8_t touchMode = 0;

  float imuSensitivity = 0.5f;
  float imuSmoothing = 0.12f;
  // UI gravity is authoritative by default in Phase2.
  bool imuEnabled = false;

  // Turbulence defaults to off so idle scene is calm.
  float turbStrength = 0.0f;
  float turbScale = 6.0f;
  float turbSpeed = 0.8f;
};

struct ParamDef
{
  uint8_t index;
  const char *name;
  const char *group;
  ParamType type;
  float minVal;
  float maxVal;
  float step;
  uint16_t offsetInConfig;
};

static const ParamDef kParamRegistry[] = {
    {50, "Time Scale", "Simulation", PARAM_FLOAT, 0.1f, 8.0f, 0.01f, (uint16_t)offsetof(SimConfig, timeScale)},
    {51, "Velocity Damping", "Simulation", PARAM_FLOAT, 0.8f, 1.0f, 0.001f, (uint16_t)offsetof(SimConfig, velocityDamping)},
    {52, "Max Velocity", "Simulation", PARAM_FLOAT, 0.1f, 8.0f, 0.1f, (uint16_t)offsetof(SimConfig, maxVelocity)},
    {53, "Particle Count", "Simulation", PARAM_UINT16, 50.0f, 500.0f, 1.0f, (uint16_t)offsetof(SimConfig, particleCount)},
    {70, "Boundary Mode", "Boundary", PARAM_UINT8, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, boundaryMode)},
    {71, "Boundary Shape", "Boundary", PARAM_UINT8, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, boundaryShape)},
    {72, "Boundary Scale", "Boundary", PARAM_FLOAT, 0.6f, 1.2f, 0.01f, (uint16_t)offsetof(SimConfig, boundaryScale)},
    {73, "Boundary Damping", "Boundary", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, boundaryDamping)},
    {80, "Gravity X", "Gravity", PARAM_FLOAT, -2.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, gravityX)},
    {81, "Gravity Y", "Gravity", PARAM_FLOAT, -2.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, gravityY)},
    {90, "Collision Enabled", "Collision", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, collisionEnabled)},
    {91, "Collision Grid Size", "Collision", PARAM_UINT8, 4.0f, 16.0f, 1.0f, (uint16_t)offsetof(SimConfig, collisionGridSize)},
    {92, "Collision Repulsion", "Collision", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, collisionRepulsion)},
    {120, "Touch Strength", "Touch", PARAM_FLOAT, 0.0f, 0.2f, 0.001f, (uint16_t)offsetof(SimConfig, touchStrength)},
    {121, "Touch Radius", "Touch", PARAM_FLOAT, 0.01f, 1.2f, 0.005f, (uint16_t)offsetof(SimConfig, touchRadius)},
    {122, "Touch Mode", "Touch", PARAM_UINT8, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, touchMode)},
    {130, "IMU Sensitivity", "IMU", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, imuSensitivity)},
    {131, "IMU Smoothing", "IMU", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, imuSmoothing)},
    {132, "IMU Enabled", "IMU", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, imuEnabled)},
    {140, "Grid Mode", "Rendering", PARAM_UINT8, 0.0f, 8.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridMode)},
    {141, "Max Density", "Rendering", PARAM_FLOAT, 0.1f, 8.0f, 0.01f, (uint16_t)offsetof(SimConfig, maxDensity)},
    {142, "Smooth In", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, smoothRateIn)},
    {143, "Smooth Out", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, smoothRateOut)},
    {144, "Target Cell Count", "Rendering", PARAM_UINT16, 32.0f, 512.0f, 1.0f, (uint16_t)offsetof(SimConfig, targetCellCount)},
    {145, "Grid Gap", "Rendering", PARAM_UINT8, 0.0f, 8.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridGap)},
    {146, "Theme", "Rendering", PARAM_UINT8, 0.0f, 10.0f, 1.0f, (uint16_t)offsetof(SimConfig, theme)},
};

static constexpr size_t kParamRegistryCount = sizeof(kParamRegistry) / sizeof(kParamRegistry[0]);

#endif
